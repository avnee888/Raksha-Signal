const socket = io();

let map, userMarker, watchId, sosId = null;
const placeMarkers = [];

// Called by the Google Maps script tag once the API loads
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 28.6139, lng: 77.2090 }, // default: New Delhi
    zoom: 14,
    styles: [{ elementType: 'geometry', stylers: [{ color: '#1c252b' }] }]
  });
}

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
          userId: 'demo-user', // swap in a real logged-in user id
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

function centerMap(lat, lng) {
  const pos = { lat, lng };
  if (!map) return;
  map.setCenter(pos);

  if (userMarker) {
    userMarker.setPosition(pos);
  } else {
    userMarker = new google.maps.Marker({
      position: pos,
      map,
      title: 'You',
      icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    });
  }
}

async function fetchNearby(lat, lng) {
  const hospitalList = document.getElementById('hospitalList');
  const policeList = document.getElementById('policeList');
  hospitalList.innerHTML = '';
  policeList.innerHTML = '';
  placeMarkers.forEach(m => m.setMap(null));
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
      placeMarkers.push(new google.maps.Marker({
        position: h.location, map, title: h.name,
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
      }));
    });

    police.forEach(p => {
      const li = document.createElement('li');
      li.textContent = `${p.name} — ${p.address}`;
      policeList.appendChild(li);
      placeMarkers.push(new google.maps.Marker({
        position: p.location, map, title: p.name,
        icon: 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png'
      }));
    });
  } catch (err) {
    console.error('Failed to fetch nearby services:', err);
  }
}

// Fires when the server (or another connected client) pushes a new
// location for the SOS this browser has joined.
socket.on('location-broadcast', (data) => {
  console.log('Live location update:', data);
});
