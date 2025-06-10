import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [config, setConfig] = useState(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [trafficZones, setTrafficZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [routeHistory, setRouteHistory] = useState([]);
  
  // Form states
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [currentRoute, setCurrentRoute] = useState(null);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [newIncident, setNewIncident] = useState({
    type: 'embouteillage',
    description: '',
    location: null
  });
  
  // UI states
  const [activeTab, setActiveTab] = useState('route');
  const [isLoading, setIsLoading] = useState(false);
  
  const mapRef = useRef(null);

  // Initialiser l'app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Récupérer la config
      const configResponse = await axios.get(`${API}/config`);
      setConfig(configResponse.data);
      
      // Charger Google Maps
      loadGoogleMaps(configResponse.data.google_maps_api_key);
      
      // Charger les données initiales
      await Promise.all([
        loadTrafficZones(),
        loadIncidents(),
        loadRouteHistory()
      ]);
      
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
    }
  };

  const loadGoogleMaps = (apiKey) => {
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded, initializing map...');
      initializeMap();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script already exists, waiting for load...');
      existingScript.onload = initializeMap;
      return;
    }

    console.log('Loading Google Maps API...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initMap`;
    script.async = true;
    script.defer = true;
    
    window.initMap = initializeMap;
    document.head.appendChild(script);
  };

  const initializeMap = () => {
    console.log('Initializing map...', { mapRef: !!mapRef.current, config: !!config });
    if (!mapRef.current || !config) {
      console.warn('Map initialization failed - missing mapRef or config');
      return;
    }

    console.log('Creating Google Maps instance...');
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: config.default_center,
      zoom: config.default_zoom,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    // Activer la couche de trafic
    console.log('Adding traffic layer...');
    const trafficLayer = new window.google.maps.TrafficLayer();
    trafficLayer.setMap(mapInstance);

    console.log('Setting up directions service...');
    const directionsServiceInstance = new window.google.maps.DirectionsService();
    const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
      draggable: true,
      panel: null
    });
    directionsRendererInstance.setMap(mapInstance);

    setMap(mapInstance);
    setDirectionsService(directionsServiceInstance);
    setDirectionsRenderer(directionsRendererInstance);

    // Listener pour les clics sur la carte (pour signaler des incidents)
    mapInstance.addListener('click', (event) => {
      if (showIncidentForm) {
        setNewIncident(prev => ({
          ...prev,
          location: {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          }
        }));
      }
    });

    console.log('Map initialization complete!');
  };

  const loadTrafficZones = async () => {
    try {
      const response = await axios.get(`${API}/traffic-zones`);
      setTrafficZones(response.data);
    } catch (error) {
      console.error('Erreur chargement zones trafic:', error);
    }
  };

  const loadIncidents = async () => {
    try {
      const response = await axios.get(`${API}/incidents`);
      setIncidents(response.data);
    } catch (error) {
      console.error('Erreur chargement incidents:', error);
    }
  };

  const loadRouteHistory = async () => {
    try {
      const response = await axios.get(`${API}/route-history`);
      setRouteHistory(response.data);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  const calculateRoute = async () => {
    if (!origin || !destination || !directionsService || !directionsRenderer) {
      console.warn('Missing required data for route calculation:', {
        origin: !!origin, 
        destination: !!destination, 
        directionsService: !!directionsService, 
        directionsRenderer: !!directionsRenderer
      });
      return;
    }
    
    console.log('Starting route calculation...', { origin, destination });
    setIsLoading(true);
    
    try {
      // Appel API pour la suggestion IA
      console.log('Calling backend API for AI suggestion...');
      const aiResponse = await axios.post(`${API}/route`, {
        origin,
        destination
      });
      
      console.log('AI Response received:', aiResponse.data);
      
      // Calcul Google Maps
      console.log('Calculating Google Maps route...');
      directionsService.route({
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        avoidHighways: false,
        avoidTolls: false
      }, (result, status) => {
        console.log('Google Maps response:', { status, result });
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          const routeData = {
            ...aiResponse.data,
            googleMapsResult: result
          };
          console.log('Setting current route:', routeData);
          setCurrentRoute(routeData);
        } else {
          console.error('Google Maps route calculation failed:', status);
          alert('Impossible de calculer l\'itinéraire: ' + status);
        }
        setIsLoading(false);
      });

    } catch (error) {
      console.error('Erreur calcul route:', error);
      alert('Erreur lors du calcul de l\'itinéraire. Veuillez réessayer.');
      setIsLoading(false);
    }
  };

  const reportIncident = async () => {
    if (!newIncident.location || !newIncident.description) {
      alert('Veuillez cliquer sur la carte et ajouter une description');
      return;
    }

    try {
      await axios.post(`${API}/incidents`, {
        ...newIncident,
        reporter_id: 'user_' + Date.now()
      });
      
      setNewIncident({
        type: 'embouteillage',
        description: '',
        location: null
      });
      setShowIncidentForm(false);
      
      // Recharger les incidents
      await loadIncidents();
      
    } catch (error) {
      console.error('Erreur signalement incident:', error);
    }
  };

  const getTrafficColor = (level) => {
    switch (level) {
      case 1: return '#4CAF50'; // Vert - Fluide
      case 2: return '#8BC34A'; // Vert clair
      case 3: return '#FFEB3B'; // Jaune - Modéré
      case 4: return '#FF9800'; // Orange - Dense
      case 5: return '#F44336'; // Rouge - Bloqué
      default: return '#9E9E9E';
    }
  };

  const getTrafficLabel = (level) => {
    switch (level) {
      case 1: return 'Fluide';
      case 2: return 'Bon';
      case 3: return 'Modéré';
      case 4: return 'Dense';
      case 5: return 'Bloqué';
      default: return 'Inconnu';
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-orange-800">Chargement de ChapChap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold text-xl">🚗</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">ChapChap</h1>
                <p className="text-orange-100 text-sm">Trafic d'Abidjan</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-orange-100">Temps réel</p>
              <p className="font-semibold">{new Date().toLocaleTimeString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panneau de contrôle */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Navigation par onglets */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="flex border-b">
                <button 
                  onClick={() => setActiveTab('route')}
                  className={`flex-1 py-3 px-4 text-center font-medium ${
                    activeTab === 'route' 
                      ? 'text-orange-600 border-b-2 border-orange-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🗺️ Itinéraire
                </button>
                <button 
                  onClick={() => setActiveTab('traffic')}
                  className={`flex-1 py-3 px-4 text-center font-medium ${
                    activeTab === 'traffic' 
                      ? 'text-orange-600 border-b-2 border-orange-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🚦 Trafic
                </button>
                <button 
                  onClick={() => setActiveTab('incidents')}
                  className={`flex-1 py-3 px-4 text-center font-medium ${
                    activeTab === 'incidents' 
                      ? 'text-orange-600 border-b-2 border-orange-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ⚠️ Incidents
                </button>
              </div>

              <div className="p-4">
                {/* Onglet Itinéraire */}
                {activeTab === 'route' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Point de départ
                      </label>
                      <input
                        type="text"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="Ex: Plateau, Abidjan"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Destination
                      </label>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Ex: Cocody, Abidjan"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    
                    <button
                      onClick={calculateRoute}
                      disabled={isLoading || !origin || !destination}
                      className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Calcul...
                        </>
                      ) : (
                        'Calculer l\'itinéraire'
                      )}
                    </button>

                    {/* Résultat de la route */}
                    {currentRoute && (
                      <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                        <h3 className="font-semibold text-orange-800 mb-2">Résultat</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Durée:</span> {currentRoute.duration_text}</p>
                          <p><span className="font-medium">Distance:</span> {currentRoute.distance_text}</p>
                          <p><span className="font-medium">Trafic:</span> 
                            <span className={`ml-1 px-2 py-1 rounded text-xs ${
                              currentRoute.traffic_level === 'Fluide' ? 'bg-green-100 text-green-800' :
                              currentRoute.traffic_level === 'Modéré' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {currentRoute.traffic_level}
                            </span>
                          </p>
                        </div>
                        <div className="mt-3 p-3 bg-white rounded border-l-4 border-orange-500">
                          <p className="text-sm text-gray-700">{currentRoute.ai_suggestion}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Onglet Trafic */}
                {activeTab === 'traffic' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">Zones de trafic</h3>
                      <button 
                        onClick={loadTrafficZones}
                        className="text-orange-600 hover:text-orange-700 text-sm"
                      >
                        🔄 Actualiser
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {trafficZones.map((zone, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{zone.name}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(zone.timestamp).toLocaleTimeString('fr-FR')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div 
                              className="w-3 h-3 rounded-full inline-block mr-2"
                              style={{backgroundColor: getTrafficColor(zone.traffic_level)}}
                            ></div>
                            <span className="text-sm font-medium">
                              {getTrafficLabel(zone.traffic_level)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Onglet Incidents */}
                {activeTab === 'incidents' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">Incidents actifs</h3>
                      <button 
                        onClick={() => setShowIncidentForm(!showIncidentForm)}
                        className={`px-3 py-1 rounded text-sm ${
                          showIncidentForm 
                            ? 'bg-gray-200 text-gray-700' 
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                        }`}
                      >
                        {showIncidentForm ? 'Annuler' : '+ Signaler'}
                      </button>
                    </div>

                    {showIncidentForm && (
                      <div className="p-4 bg-yellow-50 rounded-lg border">
                        <h4 className="font-medium text-sm mb-3">Signaler un incident</h4>
                        <div className="space-y-3">
                          <select
                            value={newIncident.type}
                            onChange={(e) => setNewIncident(prev => ({...prev, type: e.target.value}))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="embouteillage">Embouteillage</option>
                            <option value="accident">Accident</option>
                            <option value="police">Contrôle police</option>
                            <option value="travaux">Travaux</option>
                          </select>
                          
                          <textarea
                            value={newIncident.description}
                            onChange={(e) => setNewIncident(prev => ({...prev, description: e.target.value}))}
                            placeholder="Description de l'incident..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-20 resize-none"
                          />
                          
                          <p className="text-xs text-gray-600">
                            {newIncident.location ? '📍 Position sélectionnée' : 'Cliquez sur la carte pour localiser'}
                          </p>
                          
                          <button 
                            onClick={reportIncident}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 text-sm"
                          >
                            Signaler l'incident
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {incidents.map((incident, index) => (
                        <div key={index} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm capitalize">{incident.type}</p>
                              <p className="text-xs text-gray-600 mt-1">{incident.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(incident.timestamp).toLocaleString('fr-FR')}
                              </p>
                            </div>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Actif
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Historique des trajets */}
            {routeHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Trajets récents</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {routeHistory.slice(0, 5).map((route, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <p className="font-medium truncate">{route.origin} → {route.destination}</p>
                      <p className="text-xs text-gray-500">{route.duration_text} • {route.distance_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Carte */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div 
                ref={mapRef} 
                style={{ height: '600px', width: '100%' }}
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;