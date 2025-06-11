from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# CORS allowed origins
allowed_origins_env = os.getenv('ALLOWED_ORIGINS', '*')
ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_env.split(',') if origin]

# Create the main app without a prefix
app = FastAPI(title="ChapChap API", description="API pour l'optimisation du trafic à Abidjan")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class TrafficZone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    coordinates: dict  # {lat, lng, radius}
    traffic_level: int  # 1-5 (1=fluide, 5=bloqué)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class RouteRequest(BaseModel):
    origin: str
    destination: str
    departure_time: Optional[str] = None

class RouteResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    origin: str
    destination: str
    duration_text: str
    distance_text: str
    traffic_level: str
    ai_suggestion: str
    route_polyline: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class IncidentReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "accident", "embouteillage", "police", "travaux"
    location: dict  # {lat, lng}
    description: str
    reporter_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: str = "active"  # "active", "resolved"

class IncidentCreate(BaseModel):
    type: str
    location: dict
    description: str
    reporter_id: str

# Zones de trafic simulées pour Abidjan
ABIDJAN_TRAFFIC_ZONES = [
    {
        "name": "Plateau Centre",
        "coordinates": {"lat": 5.3198, "lng": -4.0200, "radius": 2000},
        "base_traffic": 4
    },
    {
        "name": "Cocody Riviera",
        "coordinates": {"lat": 5.3547, "lng": -3.9868, "radius": 3000},
        "base_traffic": 3
    },
    {
        "name": "Yopougon",
        "coordinates": {"lat": 5.3364, "lng": -4.0731, "radius": 4000},
        "base_traffic": 4
    },
    {
        "name": "Adjamé",
        "coordinates": {"lat": 5.3536, "lng": -4.0267, "radius": 2500},
        "base_traffic": 5
    },
    {
        "name": "Marcory",
        "coordinates": {"lat": 5.2889, "lng": -3.9947, "radius": 2000},
        "base_traffic": 3
    },
    {
        "name": "Treichville",
        "coordinates": {"lat": 5.2936, "lng": -4.0089, "radius": 1500},
        "base_traffic": 4
    },
    {
        "name": "Koumassi",
        "coordinates": {"lat": 5.2889, "lng": -3.9539, "radius": 2500},
        "base_traffic": 3
    },
    {
        "name": "Port-Bouët",
        "coordinates": {"lat": 5.2547, "lng": -3.9198, "radius": 3000},
        "base_traffic": 2
    }
]

def get_traffic_level_by_time():
    """Simule le niveau de trafic selon l'heure"""
    current_hour = datetime.now().hour
    
    # Heures de pointe matinales (6h-9h)
    if 6 <= current_hour <= 9:
        return 1.5
    # Heures de pointe du soir (17h-20h)
    elif 17 <= current_hour <= 20:
        return 1.8
    # Heures creuses nocturnes (22h-5h)
    elif current_hour >= 22 or current_hour <= 5:
        return 0.3
    # Heures normales
    else:
        return 1.0

def generate_ai_suggestion(origin: str, destination: str, traffic_multiplier: float):
    """Génère des suggestions IA basées sur les conditions de trafic"""
    current_hour = datetime.now().hour
    
    if traffic_multiplier > 1.5:
        if 6 <= current_hour <= 9:
            return "🕐 Trafic dense ce matin ! Envisagez de partir dans 20-30 minutes ou utilisez les transports en commun."
        elif 17 <= current_hour <= 20:
            return "🚗 Heure de pointe ! Attendez 15 minutes ou prenez la voie express si possible."
        else:
            return "⚠️ Trafic inhabituel détecté. Vérifiez les incidents sur votre itinéraire."
    elif traffic_multiplier < 0.5:
        return "✅ Excellent moment pour voyager ! Trafic très fluide actuellement."
    else:
        return "🟡 Conditions de circulation normales. Bon voyage !"

@api_router.get("/")
async def root():
    return {"message": "ChapChap API - Optimiseur de trafic d'Abidjan", "version": "1.0"}

@api_router.get("/config")
async def get_config():
    """Retourne la configuration Google Maps"""
    return {
        "google_maps_api_key": os.environ.get('GOOGLE_MAPS_API_KEY'),
        "default_center": {"lat": 5.3364, "lng": -4.0267},  # Centre d'Abidjan
        "default_zoom": 12
    }

@api_router.get("/traffic-zones")
async def get_traffic_zones():
    """Retourne les zones de trafic en temps réel simulé"""
    traffic_multiplier = get_traffic_level_by_time()
    zones = []
    
    for zone_data in ABIDJAN_TRAFFIC_ZONES:
        # Simulation d'un trafic variable
        import random
        random_factor = random.uniform(0.8, 1.2)
        current_traffic = min(5, max(1, int(zone_data["base_traffic"] * traffic_multiplier * random_factor)))
        
        zone = TrafficZone(
            name=zone_data["name"],
            coordinates=zone_data["coordinates"],
            traffic_level=current_traffic
        )
        zones.append(zone)
    
    return zones

@api_router.post("/route", response_model=RouteResponse)
async def calculate_route(route_request: RouteRequest):
    """Calcule un itinéraire optimisé avec suggestions IA"""
    traffic_multiplier = get_traffic_level_by_time()
    
    # Simulation de calcul de route (en réalité, Google Maps API ferait cela)
    import random
    base_duration = random.randint(15, 45)  # minutes de base
    traffic_duration = int(base_duration * traffic_multiplier)
    
    distance_km = random.randint(5, 25)
    
    # Génération de la suggestion IA
    ai_suggestion = generate_ai_suggestion(
        route_request.origin, 
        route_request.destination, 
        traffic_multiplier
    )
    
    # Niveau de trafic textuel
    if traffic_multiplier > 1.5:
        traffic_level = "Dense"
    elif traffic_multiplier > 1.0:
        traffic_level = "Modéré"
    else:
        traffic_level = "Fluide"
    
    route_response = RouteResponse(
        origin=route_request.origin,
        destination=route_request.destination,
        duration_text=f"{traffic_duration} min",
        distance_text=f"{distance_km} km",
        traffic_level=traffic_level,
        ai_suggestion=ai_suggestion
    )
    
    # Sauvegarder l'historique
    await db.routes.insert_one(route_response.dict())
    
    return route_response

@api_router.get("/route-history")
async def get_route_history():
    """Retourne l'historique des trajets"""
    history = await db.routes.find().sort("timestamp", -1).limit(20).to_list(20)
    return [RouteResponse(**route) for route in history]

@api_router.post("/incidents", response_model=IncidentReport)
async def report_incident(incident: IncidentCreate):
    """Signaler un incident de trafic"""
    incident_obj = IncidentReport(**incident.dict())
    await db.incidents.insert_one(incident_obj.dict())
    return incident_obj

@api_router.get("/incidents")
async def get_active_incidents():
    """Retourne les incidents actifs"""
    incidents = await db.incidents.find({"status": "active"}).sort("timestamp", -1).to_list(50)
    return [IncidentReport(**incident) for incident in incidents]

@api_router.put("/incidents/{incident_id}/resolve")
async def resolve_incident(incident_id: str):
    """Marquer un incident comme résolu"""
    result = await db.incidents.update_one(
        {"id": incident_id}, 
        {"$set": {"status": "resolved"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Incident non trouvé")
    return {"message": "Incident marqué comme résolu"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
