// Function to format timestamps in the user's local timezone
function convertTimeCode(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Ensures user's local timezone
  });
}

// Initialize Leaflet map
const map = L.map('map').setView([0, 0], 2);

// Base layers
const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

const aerialImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

const imageryStreets = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ'
});

// Layer groups
const boroughLines = L.geoJSON(null, {
  style: { color: '#000', weight: 3 }
}).addTo(map);

const earthquakeLayer = L.layerGroup().addTo(map);

// Layer control with radio buttons for base layers
const baseLayers = {
  'Street Map': streetMap,
  'Aerial Imagery': aerialImagery,
  'Imagery with Streets': imageryStreets
};

const overlayLayers = {
  'Borough Lines': boroughLines,
  'Seismic Activity': earthquakeLayer
};

L.control.layers(baseLayers, overlayLayers, { collapsed: false }).addTo(map);

// Function to add an earthquake marker to the map
function earthquakes(elat, elon, ename, magnitude, alert) {
  const size = magnitude ? Math.max(10, 8 + magnitude * 2) : 12;
  const color = alert === 'red' ? '#ff0000' : alert === 'yellow' ? '#ffff00' : alert === 'green' ? '#00ff00' : '#800080';

  L.marker([elat, elon], {
    icon: L.divIcon({
      className: 'earthquake-icon',
      html: `<div style="background: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    })
  })
    .bindPopup(ename)
    .addTo(earthquakeLayer);
}

// Fetch and process earthquake data
async function getEarthquakeData() {
  const loadingScreen = document.getElementById('loading-screen');
  const timestampElement = document.getElementById('fetch-timestamp');
  
  // Show loading screen
  loadingScreen.style.display = 'flex';
  timestampElement.textContent = 'Data fetched: Loading...';

  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const earthQuakeData = await response.json();

    // Update timestamp with metadata's generated time in user's local timezone
    const fetchTime = convertTimeCode(earthQuakeData.metadata.generated);
    timestampElement.textContent = `Data fetched: ${fetchTime}`;

    // Clear existing earthquake markers
    earthquakeLayer.clearLayers();

    // Process earthquake data
    const bounds = L.latLngBounds();
    for (const feature of earthQuakeData.features) {
      const quakeTime = convertTimeCode(feature.properties.updated);
      const lon = feature.geometry.coordinates[0];
      const lat = feature.geometry.coordinates[1];
      const place = feature.properties.place;
      const magnitude = feature.properties.mag;
      const alert = feature.properties.alert;
      const status = feature.properties.status;
      const earthId = feature.id;
      const earthUrl = feature.properties.url;
      const sysType = feature.properties.type;

      earthquakes(lat, lon, `<a href="${earthUrl}">ID: ${earthId}</a> <br>Location: ${place}<br>Magnitude: ${magnitude}<br>Time: ${quakeTime}<br>Alert: ${alert} <br><a href ="https://maps.google.com/?q=${lat},${lon}">Google Maps</a>`, magnitude, alert);
      bounds.extend([lat, lon]);
    }

    // Fit map to earthquake bounds
    if (bounds.isValid()) map.fitBounds(bounds);
  } catch (error) {
    console.error('Error fetching Data:', error);
    timestampElement.textContent = 'Data fetch failed';
  } finally {
    // Hide loading screen
    loadingScreen.style.display = 'none';
  }
}

// Load earthquake data on page load
getEarthquakeData();