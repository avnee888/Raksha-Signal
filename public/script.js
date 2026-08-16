const socket = io();

let map, userMarker, watchId, sosId = null;
const placeMarkers = [];

// Leaflet map, initialised once on page load (no external API key needed)
map = L.map('map').setView([28.6139, 77.2090], 14); // default: New Delhi

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

const sosBtn = document.getElementById('sosBtn');
const endBtn = document.getElementById('endBtn');
const statusEl = document.getElementById('status');

sosBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;

    try {
      const res = await fetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          latitude,
          longitude
        })
      });
      const sos = await res.json();
      sosId = sos._id;

      socket.emit('join-sos', sosId);
      statusEl.textContent = 'Status: SOS Active - tracking your location';
      sosBtn.disabled = true;
      endBtn.disabled = false;

      centerMap(latitude, longitude);
      fetchNearby(latitude, longitude);
      startTracking();
    } catch (err) {
      console.error(err);
      alert('Could not start SOS. Check the server logs.');
    }
  }, () => alert('Unable to fetch your location. Please allow location access.'));
});

endBtn.addEventListener('click', async () => {
  if (!sosId) return;
  await fetch(`/api/sos/${sosId}`, { method: 'DELETE' });
  stopTracking();
  statusEl.textContent = 'Status: Idle';
  sosBtn.disabled = false;
  endBtn.disabled = true;
  sosId = null;
});

function startTracking() {
  watchId = navigator.geolocation.watchPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;

    try {
      await fetch(`/api/sos/${sosId}/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude })
      });
    } catch (err) {
      console.error('Location update failed:', err);
    }

    centerMap(latitude, longitude);
  }, (err) => console.error(err), {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 10000
  });
}

function stopTracking() {
  if (watchId) navigator.geolocation.clearWatch(watchId);
}

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#4d7fd6;border:2px solid white;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const hospitalIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#e2483a;border:2px solid white;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const policeIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#7a4dd6;border:2px solid white;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

function centerMap(lat, lng) {
  const pos = [lat, lng];
  if (!map) return;
  map.setView(pos);

  if (userMarker) {
    userMarker.setLatLng(pos);
  } else {
    userMarker = L.marker(pos, { icon: userIcon, title: 'You' }).addTo(map);
  }
}

async function fetchNearby(lat, lng) {
  const hospitalList = document.getElementById('hospitalList');
  const policeList = document.getElementById('policeList');
  hospitalList.innerHTML = '';
  policeList.innerHTML = '';
  placeMarkers.forEach(m => map.removeLayer(m));
  placeMarkers.length = 0;

  try {
    const [hospitals, police] = await Promise.all([
      fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=hospital`).then(r => r.json()),
      fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=police`).then(r => r.json())
    ]);

    hospitals.forEach(h => {
      const li = document.createElement('li');
      li.textContent = `${h.name} — ${h.address}`;
      hospitalList.appendChild(li);
      placeMarkers.push(
        L.marker([h.location.lat, h.location.lng], { icon: hospitalIcon, title: h.name })
          .addTo(map)
          .bindPopup(h.name)
      );
    });

    police.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} — ${p.address}`;
      policeList.appendChild(li);
      placeMarkers.push(
        L.marker([p.location.lat, p.location.lng], { icon: policeIcon, title: p.name })
          .addTo(map)
          .bindPopup(p.name)
      );
    });
  } catch (err) {
    console.error('Failed to fetch nearby services:', err);
  }
}

socket.on('location-broadcast', (data) => {
  console.log('Live location update:', data);
});
