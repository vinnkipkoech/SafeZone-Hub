// SafeZone Hub - Kenya 
let map = L.map('map').setView([-1.0, 37.0], 6); // Kenya centered
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap | GDACS + Open-Meteo'
}).addTo(map);

let markers = [];
let userLat = null;
let userLon = null;

// Expanded Kenya-wide Resources with County Names
const kenyaResources = [
  // Nairobi County
  { name: "Kenyatta National Hospital", type: "hospital", lat: -1.3017, lon: 36.8083, county: "Nairobi County" },
  { name: "Nairobi Hospital", type: "hospital", lat: -1.2921, lon: 36.8219, county: "Nairobi County" },
  { name: "Aga Khan University Hospital", type: "hospital", lat: -1.2605, lon: 36.8034, county: "Nairobi County" },
  
  // Mombasa County
  { name: "Coast General Teaching Hospital", type: "hospital", lat: -4.0435, lon: 39.6682, county: "Mombasa County" },
  { name: "Mombasa County Referral Hospital", type: "hospital", lat: -4.0500, lon: 39.6700, county: "Mombasa County" },
  
  // Kisumu County
  { name: "Jaramogi Oginga Odinga Teaching Hospital", type: "hospital", lat: -0.1000, lon: 34.7500, county: "Kisumu County" },
  
  // Uasin Gishu County (Eldoret)
  { name: "Moi Teaching and Referral Hospital", type: "hospital", lat: 0.5200, lon: 35.2700, county: "Uasin Gishu County" },
  
  // Nakuru County
  { name: "Nakuru County Referral Hospital", type: "hospital", lat: -0.2800, lon: 36.0700, county: "Nakuru County" },
  
  // Kitui County
  { name: "Kitui County Referral Hospital", type: "hospital", lat: -1.3667, lon: 37.9833, county: "Kitui County" },
  
  // Shelters & Water Points
  { name: "Dandora Evacuation Shelter", type: "shelter", lat: -1.2500, lon: 36.9000, county: "Nairobi County" },
  { name: "Kibera Community Water Point", type: "water", lat: -1.3120, lon: 36.7850, county: "Nairobi County" },
  { name: "Mombasa Red Cross Shelter", type: "shelter", lat: -4.0600, lon: 39.6800, county: "Mombasa County" }
];

// Calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

function showUserOnMap() {
  if (!userLat || !userLon) return;
  L.marker([userLat, userLon]).addTo(map)
    .bindPopup("📍 You are here").openPopup();
  map.flyTo([userLat, userLon], 9);
}

// Update nearby resources with county names
function updateNearbyResources() {
  const div = document.getElementById('nearby-resources');
  div.innerHTML = '';

  if (!userLat || !userLon) {
    div.innerHTML = `<p>Enable Live Location Tracking to see nearest resources in your county.</p>`;
    return;
  }

  const sorted = kenyaResources
    .map(r => ({ 
      ...r, 
      distance: parseFloat(calculateDistance(userLat, userLon, r.lat, r.lon)) 
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);

  sorted.forEach(r => {
    const card = document.createElement('div');
    card.className = `resource-card ${r.type}`;
    card.innerHTML = `
      <strong>${r.name}</strong><br>
      <small>${r.county} • ${r.type.toUpperCase()} • ${r.distance} km away</small>
    `;
    div.appendChild(card);
  });
}

// Enhanced Weather with Local Weather Alerts
async function fetchWeather() {
  if (!userLat || !userLon) return;
  
  const panel = document.getElementById('weather-panel');
  panel.innerHTML = 'Loading weather & alerts...';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${userLat}&longitude=${userLon}&current=temperature_2m,relative_humidity_2m,rain,weather_code&daily=rain_sum,temperature_2m_max&timezone=Africa/Nairobi`;
    const res = await fetch(url);
    const data = await res.json();

    const now = data.current;
    const dailyRain = data.daily.rain_sum;

    let alertMessage = '';
    if (now.rain > 15) {
      alertMessage = `<span style="color:#d32f2f; font-weight:bold;">⚠️ HEAVY RAIN ALERT - High Flood Risk in your area!</span>`;
    } else if (now.rain > 5) {
      alertMessage = `<span style="color:#f57c00; font-weight:bold;">🟠 Moderate Rain - Possible flooding in low areas</span>`;
    } else if (dailyRain[0] > 10) {
      alertMessage = `<span style="color:#f57c00;">🟠 Heavy rain expected tomorrow - Stay alert</span>`;
    } else {
      alertMessage = `<span style="color:#388e3c;">✅ No immediate weather alerts</span>`;
    }

    let html = `
      <strong>Current Weather:</strong> ${now.temperature_2m}°C | Humidity: ${now.relative_humidity_2m}% | Rain: ${now.rain}mm<br>
      ${alertMessage}<br><br>
      <strong>3-Day Rain Forecast:</strong><br>
      Today: ${dailyRain[0]}mm | Tomorrow: ${dailyRain[1]}mm | Day 3: ${dailyRain[2]}mm
    `;
    panel.innerHTML = html;
  } catch (e) {
    panel.innerHTML = "Weather data temporarily unavailable";
  }
}

// GDACS Alerts (Kenya-focused)
async function fetchGDACSAlerts(query = '') {
  const feed = document.getElementById('alert-feed');
  feed.innerHTML = '🔄 Loading alerts across Kenya...';

  try {
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 6);
    let url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=FL;DR;EQ;TC;VO;WF&alertlevel=green;orange;red&fromdate=${fromDate.toISOString().split('T')[0]}`;

    if (query) url += `&query[value]=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    const data = await response.json();

    const events = data.features ? data.features.filter(event => {
      if (!event.geometry) return false;
      const lat = event.geometry.coordinates[1];
      const lon = event.geometry.coordinates[0];
      const title = (event.properties?.title || '').toLowerCase();
      const desc = (event.properties.description || '').toLowerCase();

      const inKenyaArea = (lat >= -5 && lat <= 5 && lon >= 33 && lon <= 42);
      const mentionsKenya = title.includes('kenya') || desc.includes('kenya');

      return inKenyaArea || mentionsKenya;
    }) : [];

    if (events.length === 0) {
      feed.innerHTML = `
        <p><strong>✅ No major active disasters across Kenya right now.</strong></p>
        <p>Monitor local weather closely during rainy seasons.</p>`;
    } else {
      renderAlerts(events);
      addMapMarkers(events);
    }

    updateRiskSummary(events);

  } catch (err) {
    feed.innerHTML = `<div id="error">Could not load alerts at the moment.</div>`;
  }
}

function renderAlerts(events) {
  const feed = document.getElementById('alert-feed');
  feed.innerHTML = '';
  events.forEach(event => {
    const props = event.properties || {};
    const level = (props.alertlevel || 'green').toLowerCase();
    const card = document.createElement('div');
    card.className = `alert-card ${level}`;
    card.innerHTML = `
      <strong>${props.title || 'Disaster Alert'}</strong><br>
      <small>${level.toUpperCase()} Alert</small>
      <p>${(props.description || '').substring(0, 140)}...</p>
    `;
    card.addEventListener('click', () => {
      const [lon, lat] = event.geometry.coordinates;
      map.flyTo([lat, lon], 8);
    });
    feed.appendChild(card);
  });
}

function addMapMarkers(events) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  events.forEach(event => {
    const [lon, lat] = event.geometry.coordinates;
    const color = (event.properties.alertlevel || 'green') === 'red' ? '#d32f2f' : '#f57c00';
    L.circleMarker([lat, lon], {
      radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.85
    }).addTo(map).bindPopup(`<b>${event.properties.title}</b>`);
  });
}

function updateRiskSummary(events) {
  const div = document.getElementById('risk-summary');
  const count = events ? events.length : 0;
  div.innerHTML = `<strong>Current National Risk Level:</strong> LOW ✅<br><small>${count} alerts detected nationwide</small>`;
}

// Live Location
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLon = pos.coords.longitude;
        showUserOnMap();
        updateNearbyResources();
        fetchWeather();
        fetchGDACSAlerts();
      },
      () => {
        alert("Location access denied.\nUsing default Kenya view.");
        updateNearbyResources();
        fetchWeather();
      }
    );
  }
}

function manualRefresh() {
  fetchGDACSAlerts();
  fetchWeather();
}

// Initialize
fetchGDACSAlerts();
updateNearbyResources();
setInterval(() => {
  fetchGDACSAlerts();
  if (userLat && userLon) fetchWeather();
}, 360000);

// Event Listeners
document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  fetchGDACSAlerts(document.getElementById('search-input').value.trim());
});

document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
});