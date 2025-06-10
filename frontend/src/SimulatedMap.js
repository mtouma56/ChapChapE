import React from 'react';

const SimulatedMap = ({ trafficZones, currentRoute, newIncident, showIncidentForm, onMapClick }) => {
  
  const getZoneStyle = (zone) => {
    const colors = {
      1: '#4CAF50', // Fluide - Vert
      2: '#8BC34A', // Bon - Vert clair  
      3: '#FFEB3B', // Modéré - Jaune
      4: '#FF9800', // Dense - Orange
      5: '#F44336'  // Bloqué - Rouge
    };
    
    return {
      position: 'absolute',
      left: `${((zone.coordinates.lng + 4.1) / 0.2) * 100}%`,
      top: `${((5.4 - zone.coordinates.lat) / 0.2) * 100}%`,
      width: `${(zone.coordinates.radius / 50)}px`,
      height: `${(zone.coordinates.radius / 50)}px`,
      backgroundColor: colors[zone.traffic_level] || '#9E9E9E',
      borderRadius: '50%',
      opacity: 0.7,
      border: '2px solid white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: 'bold',
      color: 'white',
      textShadow: '1px 1px 1px rgba(0,0,0,0.5)',
      cursor: 'pointer',
      transform: 'translate(-50%, -50%)'
    };
  };

  const handleMapClick = (event) => {
    if (showIncidentForm && onMapClick) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Conversion approximative en coordonnées lat/lng d'Abidjan
      const lng = -4.1 + (x / rect.width) * 0.2;
      const lat = 5.4 - (y / rect.height) * 0.2;
      
      onMapClick({
        latLng: {
          lat: () => lat,
          lng: () => lng
        }
      });
    }
  };

  const renderRoute = () => {
    if (!currentRoute || !currentRoute.simulationData) return null;
    
    return (
      <svg 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <polyline
          points={currentRoute.simulationData.polyline.map(point => 
            `${((point.lng + 4.1) / 0.2) * 100},${((5.4 - point.lat) / 0.2) * 100}`
          ).join(' ')}
          fill="none"
          stroke="#4285F4"
          strokeWidth="4"
          strokeDasharray="0"
        />
        {/* Marqueurs de départ et arrivée */}
        {currentRoute.simulationData.markers.map((marker, index) => (
          <circle
            key={index}
            cx={`${((marker.lng + 4.1) / 0.2) * 100}%`}
            cy={`${((5.4 - marker.lat) / 0.2) * 100}%`}
            r="8"
            fill={index === 0 ? '#34A853' : '#EA4335'}
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>
    );
  };

  const renderIncidentMarker = () => {
    if (!newIncident.location) return null;
    
    return (
      <div
        style={{
          position: 'absolute',
          left: `${((newIncident.location.lng + 4.1) / 0.2) * 100}%`,
          top: `${((5.4 - newIncident.location.lat) / 0.2) * 100}%`,
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#FF5722',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}
      >
        📍 Nouvel incident
      </div>
    );
  };

  return (
    <div 
      className="w-full h-full relative bg-gradient-to-br from-green-100 to-blue-100 overflow-hidden cursor-crosshair"
      onClick={handleMapClick}
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.05) 0%, transparent 70%)
        `
      }}
    >
      {/* Fond de carte stylisé représentant Abidjan */}
      <div className="absolute inset-0">
        {/* Lagune Ébrié */}
        <div 
          className="absolute bg-blue-300 opacity-60"
          style={{
            left: '10%',
            top: '70%',
            width: '80%',
            height: '20%',
            borderRadius: '20px 20px 5px 5px'
          }}
        />
        
        {/* Routes principales simulées */}
        <div className="absolute inset-0">
          {/* Autoroute du Nord */}
          <div 
            className="absolute bg-gray-400 opacity-40"
            style={{
              left: '45%',
              top: '0%',
              width: '4px',
              height: '60%'
            }}
          />
          
          {/* Boulevard de Marseille */}
          <div 
            className="absolute bg-gray-400 opacity-40"
            style={{
              left: '20%',
              top: '30%',
              width: '60%',
              height: '3px'
            }}
          />
          
          {/* Voie Express */}
          <div 
            className="absolute bg-gray-500 opacity-50"
            style={{
              left: '10%',
              top: '50%',
              width: '70%',
              height: '4px',
              transform: 'rotate(-10deg)'
            }}
          />
        </div>
      </div>

      {/* Zones de trafic */}
      {trafficZones.map((zone, index) => (
        <div
          key={index}
          style={getZoneStyle(zone)}
          title={`${zone.name} - Trafic ${zone.traffic_level}/5`}
        >
          {zone.traffic_level}
        </div>
      ))}

      {/* Route calculée */}
      {renderRoute()}

      {/* Marqueur d'incident en cours */}
      {renderIncidentMarker()}

      {/* Légendes */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
        <h3 className="font-bold text-sm mb-2">🗺️ Carte Simulée d'Abidjan</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Trafic fluide</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Trafic modéré</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Trafic dense</span>
          </div>
        </div>
      </div>

      {/* Instructions mode simulation */}
      <div className="absolute bottom-4 right-4 bg-orange-500 text-white p-3 rounded-lg shadow-lg max-w-xs">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">🎮</span>
          <span className="font-bold text-sm">Mode Simulation</span>
        </div>
        <p className="text-xs">
          Carte simulée d'Abidjan sans Google Maps. 
          {showIncidentForm && " Cliquez pour localiser un incident."}
        </p>
      </div>

      {/* Noms des quartiers */}
      <div className="absolute top-16 left-20 text-xs font-semibold text-gray-700">Plateau</div>
      <div className="absolute top-12 right-32 text-xs font-semibold text-gray-700">Cocody</div>
      <div className="absolute top-24 left-8 text-xs font-semibold text-gray-700">Yopougon</div>
      <div className="absolute bottom-32 left-24 text-xs font-semibold text-gray-700">Treichville</div>
      <div className="absolute bottom-32 right-20 text-xs font-semibold text-gray-700">Marcory</div>
    </div>
  );
};

export default SimulatedMap;