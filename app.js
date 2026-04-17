// SafeZone Hub - Kenya 
let map = L.map('map').setView([-1.0, 37.0], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap | GDACS + Open-Meteo'
}).addTo(map);

let markers = [];
let userLat = null;
let userLon = null;

// Kenya-wide Resources with County Names
const kenyaResources = [
  { name: "Kenyatta National Hospital", type: "hospital", lat: -1.3017, lon: 36.8083, county: "Nairobi County" },
  { name: "Nairobi Hospital", type: "hospital", lat: -1.2921, lon: 36.8219, county: "Nairobi County" },
  { name: "Aga Khan University Hospital", type: "hospital", lat: -1.2605, lon: 36.8034, county: "Nairobi County" },
  { name: "Coast General Teaching Hospital", type: "hospital", lat: -4.0435, lon: 39.6682, county: "Mombasa County" },
  { name: "Jaramogi Oginga Odinga Teaching Hospital", type: "hospital", lat: -0.1000, lon: 34.7500, county: "Kisumu County" },
  { name: "Moi Teaching and Referral Hospital", type: "hospital", lat: 0.5200, lon: 35.2700, county: "Uasin Gishu County" },
  { name: "Nakuru County Referral Hospital", type: "hospital", lat: -0.2800, lon: 36.0700, county: "Nakuru County" },
  { name: "Kitui County Referral Hospital", type: "hospital", lat: -1.3667, lon: 37.9833, county: "Kitui County" },
  { name: "Dandora Evacuation Shelter", type: "shelter", lat: -1.2500, lon: 36.9000, county: "Nairobi County" },
  { name: "Kibera Community Water Point", type: "water", lat: -1.3120, lon: 36.7850, county: "Nairobi County" }
];

// Distance calculator
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

// Update nearby resources
function updateNearbyResources() {
  const div = document.getElementById('nearby-resources');
  div.innerHTML = '';

  if (!userLat || !userLon) {
    div.innerHTML = `<p class="text-gray-500">Enable Live Location Tracking to see nearest resources in your area.</p>`;
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
    card.className = `resource-card p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mb-3`;
    card.innerHTML = `
      <div class="font-semibold text-gray-800">${r.name}</div>
      <div class="text-sm text-gray-600">${r.county}</div>
      <div class="text-xs text-blue-600 mt-1">${r.type.toUpperCase()} • ${r.distance} km away</div>
    `;
    div.appendChild(card);
  });
}

// Improved Weather with better rain logic
async function fetchWeather() {
  if (!userLat || !userLon) return;
  
  const panel = document.getElementById('weather-panel');
  panel.innerHTML = `
    <div class="animate-pulse flex space-x-4">
      <div class="flex-1 space-y-3">
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>`;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${userLat}&longitude=${userLon}&current=temperature_2m,relative_humidity_2m,rain,weather_code&daily=rain_sum,temperature_2m_max&timezone=Africa/Nairobi`;
    const res = await fetch(url);
    const data = await res.json();

    const current = data.current;
    const daily = data.daily;

    let rainStatus = '';
    let rainClass = '';

    if (current.rain > 15 || daily.rain_sum[0] > 20) {
      rainStatus = "HEAVY RAIN ALERT - High Flood Risk";
      rainClass = "text-red-600 font-bold";
    } else if (current.rain > 5 || daily.rain_sum[0] > 10) {
      rainStatus = "Moderate Rain - Possible flooding in low areas";
      rainClass = "text-orange-600 font-medium";
    } else {
      rainStatus = "No immediate rain alert";
      rainClass = "text-green-600";
    }

    panel.innerHTML = `
      <div class="space-y-4">
        <div>
          <div class="text-sm text-gray-500">Current Conditions</div>
          <div class="text-3xl font-bold text-gray-800">${current.temperature_2m}°C</div>
          <div class="text-sm">Humidity: ${current.relative_humidity_2m}% | Rain now: ${current.rain} mm</div>
        </div>

        <div class="${rainClass} text-sm font-medium">
          ${rainStatus}
        </div>

        <div>
          <div class="text-sm text-gray-500 mb-2">3-Day Rain Forecast</div>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-white p-3 rounded-xl">
              <div class="text-xs text-gray-500">Today</div>
              <div class="font-semibold">${daily.rain_sum[0]} mm</div>
            </div>
            <div class="bg-white p-3 rounded-xl">
              <div class="text-xs text-gray-500">Tomorrow</div>
              <div class="font-semibold">${daily.rain_sum[1]} mm</div>
            </div>
            <div class="bg-white p-3 rounded-xl">
              <div class="text-xs text-gray-500">Day 3</div>
              <div class="font-semibold">${daily.rain_sum[2]} mm</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    panel.innerHTML = `<p class="text-red-500">Weather data temporarily unavailable</p>`;
  }
}

// GDACS Alerts
async function fetchGDACSAlerts(query = '') {
  const feed = document.getElementById('alert-feed');
  feed.innerHTML = `<div class="text-gray-500">Loading alerts across Kenya...</div>`;

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
      return (lat >= -5 && lat <= 5 && lon >= 33 && lon <= 42) || title.includes('kenya');
    }) : [];

    if (events.length === 0) {
      feed.innerHTML = `
        <div class="bg-green-50 p-5 rounded-2xl text-center">
          <p class="font-medium text-green-700">No major active disasters across Kenya right now.</p>
          <p class="text-sm text-gray-600 mt-2">Monitor weather closely during rainy seasons.</p>
        </div>`;
    } else {
      renderAlerts(events);
      addMapMarkers(events);
    }

    updateRiskSummary(events);

  } catch (err) {
    feed.innerHTML = `<div class="text-red-500 p-4">Could not load alerts at the moment.</div>`;
  }
}

function renderAlerts(events) {
  const feed = document.getElementById('alert-feed');
  feed.innerHTML = '';
  events.forEach(event => {
    const props = event.properties || {};
    const level = (props.alertlevel || 'green').toLowerCase();
    const card = document.createElement('div');
    card.className = `alert-card p-4 rounded-2xl mb-4 cursor-pointer transition-all ${level === 'red' ? 'bg-red-50 border-l-4 border-red-600' : level === 'orange' ? 'bg-orange-50 border-l-4 border-orange-500' : 'bg-green-50 border-l-4 border-green-600'}`;
    card.innerHTML = `
      <div class="font-semibold">${props.title || 'Disaster Alert'}</div>
      <div class="text-xs uppercase tracking-widest mt-1 ${level === 'red' ? 'text-red-600' : level === 'orange' ? 'text-orange-600' : 'text-green-600'}">
        ${level.toUpperCase()} ALERT
      </div>
      <p class="text-sm text-gray-700 mt-2 line-clamp-3">${(props.description || '').substring(0, 160)}...</p>
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
      radius: 8,
      fillColor: color,
      color: '#fff',
      weight: 2,
      fillOpacity: 0.85
    }).addTo(map).bindPopup(`<b>${event.properties.title}</b>`);
  });
}

function updateRiskSummary(events) {
  const div = document.getElementById('risk-summary');
  const count = events ? events.length : 0;
  div.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <div class="text-sm text-gray-500">Current Risk Level</div>
        <div class="text-2xl font-bold text-green-600">LOW</div>
      </div>
      <div class="text-right">
        <div class="text-3xl font-bold text-gray-800">${count}</div>
        <div class="text-xs text-gray-500">alerts detected</div>
      </div>
    </div>
  `;
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
  document.documentElement.classList.toggle('dark');
});