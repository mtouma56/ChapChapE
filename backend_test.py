import requests
import unittest
import json
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://3ac39a04-dbbf-488e-8052-a6d26134c497.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

class ChapChapAPITest(unittest.TestCase):
    """Test suite for ChapChap API endpoints"""
    
    def test_01_root_endpoint(self):
        """Test the root API endpoint"""
        print("\n🔍 Testing root endpoint...")
        response = requests.get(f"{API_URL}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        self.assertIn("version", data)
        print(f"✅ Root endpoint response: {data}")
    
    def test_02_config_endpoint(self):
        """Test the config endpoint for Google Maps API key"""
        print("\n🔍 Testing config endpoint...")
        response = requests.get(f"{API_URL}/config")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("google_maps_api_key", data)
        self.assertIn("default_center", data)
        self.assertIn("default_zoom", data)
        print(f"✅ Config endpoint returned Google Maps API key and default settings")
    
    def test_03_traffic_zones(self):
        """Test the traffic zones endpoint"""
        print("\n🔍 Testing traffic zones endpoint...")
        response = requests.get(f"{API_URL}/traffic-zones")
        self.assertEqual(response.status_code, 200)
        zones = response.json()
        self.assertTrue(len(zones) > 0, "No traffic zones returned")
        
        # Check zone structure
        first_zone = zones[0]
        self.assertIn("name", first_zone)
        self.assertIn("coordinates", first_zone)
        self.assertIn("traffic_level", first_zone)
        
        # Verify all 8 zones of Abidjan are present
        zone_names = [zone["name"] for zone in zones]
        expected_zones = [
            "Plateau Centre", "Cocody Riviera", "Yopougon", "Adjamé",
            "Marcory", "Treichville", "Koumassi", "Port-Bouët"
        ]
        
        for zone in expected_zones:
            self.assertIn(zone, zone_names, f"Zone {zone} not found in response")
        
        print(f"✅ Traffic zones endpoint returned {len(zones)} zones with traffic levels")
        for zone in zones:
            print(f"  - {zone['name']}: Traffic Level {zone['traffic_level']} ({self._get_traffic_label(zone['traffic_level'])})")
    
    def test_04_route_calculation(self):
        """Test the route calculation endpoint with AI suggestions"""
        print("\n🔍 Testing route calculation endpoint...")
        payload = {
            "origin": "Plateau, Abidjan",
            "destination": "Cocody, Abidjan"
        }
        
        response = requests.post(f"{API_URL}/route", json=payload)
        self.assertEqual(response.status_code, 200)
        route = response.json()
        
        # Check route response structure
        self.assertEqual(route["origin"], payload["origin"])
        self.assertEqual(route["destination"], payload["destination"])
        self.assertIn("duration_text", route)
        self.assertIn("distance_text", route)
        self.assertIn("traffic_level", route)
        self.assertIn("ai_suggestion", route)
        
        print(f"✅ Route calculation successful:")
        print(f"  - Origin: {route['origin']}")
        print(f"  - Destination: {route['destination']}")
        print(f"  - Duration: {route['duration_text']}")
        print(f"  - Distance: {route['distance_text']}")
        print(f"  - Traffic: {route['traffic_level']}")
        print(f"  - AI Suggestion: {route['ai_suggestion']}")
    
    def test_05_incidents_endpoints(self):
        """Test the incidents endpoints (GET and POST)"""
        print("\n🔍 Testing incidents endpoints...")
        
        # First, get current incidents
        get_response = requests.get(f"{API_URL}/incidents")
        self.assertEqual(get_response.status_code, 200)
        initial_incidents = get_response.json()
        print(f"✅ GET incidents returned {len(initial_incidents)} active incidents")
        
        # Create a new incident
        new_incident = {
            "type": "embouteillage",
            "location": {"lat": 5.3364, "lng": -4.0267},
            "description": "Test incident from API test",
            "reporter_id": f"test_user_{datetime.now().strftime('%H%M%S')}"
        }
        
        post_response = requests.post(f"{API_URL}/incidents", json=new_incident)
        self.assertEqual(post_response.status_code, 200)
        created_incident = post_response.json()
        
        # Verify incident was created with correct data
        self.assertEqual(created_incident["type"], new_incident["type"])
        self.assertEqual(created_incident["description"], new_incident["description"])
        self.assertEqual(created_incident["reporter_id"], new_incident["reporter_id"])
        self.assertEqual(created_incident["status"], "active")
        
        # Get incidents again to verify the new one is included
        get_response_after = requests.get(f"{API_URL}/incidents")
        self.assertEqual(get_response_after.status_code, 200)
        updated_incidents = get_response_after.json()
        
        self.assertTrue(len(updated_incidents) >= len(initial_incidents), 
                        "Number of incidents should not decrease after adding a new one")
        
        print(f"✅ POST incident successful - created incident with ID: {created_incident['id']}")
    
    def test_06_route_history(self):
        """Test the route history endpoint"""
        print("\n🔍 Testing route history endpoint...")
        response = requests.get(f"{API_URL}/route-history")
        self.assertEqual(response.status_code, 200)
        history = response.json()
        
        print(f"✅ Route history endpoint returned {len(history)} routes")
        if history:
            print(f"  - Most recent route: {history[0]['origin']} → {history[0]['destination']}")
    
    def _get_traffic_label(self, level):
        """Helper to convert traffic level to text label"""
        labels = {
            1: "Fluide",
            2: "Bon",
            3: "Modéré",
            4: "Dense",
            5: "Bloqué"
        }
        return labels.get(level, "Inconnu")

if __name__ == "__main__":
    print("=" * 70)
    print(f"TESTING CHAPCHAP API AT: {API_URL}")
    print("=" * 70)
    unittest.main(verbosity=2)
