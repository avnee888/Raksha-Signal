const socket = io();

// ---------- State ----------
let token = localStorage.getItem('raksha_token') || null;
let currentUser = null;
let map, userMarker, watchId, sosId = null;
let lastPosition = null;
const placeMarkers = [];

// ---------- DOM refs ----------
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');

const showLoginBtn = document.getElementById('showLoginBtn');
const showSignupBtn = document.getElementById('showSignupBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');

const welcomeText = document.getElementById('welcomeText');
const logoutBtn = document.getElementById('logoutBtn');

const contactsList = document.getElementById('contactsList');
const addContactForm = document.getElementById('addContactForm');

const sosBtn = document.getElementById('sosBtn');
const endBtn = document.getElementById('endBtn');
const statusEl = document.getElementById('status');

const alertSection = document.getElementById('alertSection');
const alertButtons = document.getElementById('alertButtons');

// ---------- Auth UI ----------
showLoginBtn.addEventListener('click', () => {
  showLoginBtn.classList.add('active');
  showSignupBtn.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
});

showSignupBtn.addEventListener('click', () => {
  showSignupBtn.classList.add('active');
  showLoginBtn.classList.remove('active');
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setSession(data.token, data.user);
  } catch (err) {
    loginError.textContent = err.message;
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  signupError.textContent = '';
  const name = document.getElementById('signupName').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPassword').value;

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign up failed');

    setSession(data.token, data.user);
  } catch (err) {
    signupError.textContent = err.message;
  }
});

logoutBtn.addEventListener('click', () => {
  token = null;
  currentUser = null;
  localStorage.removeItem('raksha_token');
  appSection.classList.add('hidden');
  authSection.classList.remove('hidden');
});

function setSession(newToken, user) {
  token = newToken;
  currentUser = user;
  localStorage.setItem('raksha_token', token);
  authSection.classList.add('hidden');
  appSection.classList.remove('hidden');
  welcomeText.textContent = `Hi, ${user.name}`;
  renderContacts(user.emergencyContacts || []);
  initMapIfNeeded();
}

async function authedFetch(url, options = {}) {
  const headers = Object.assign({}, options.headers, {
    Authorization: `Bearer ${token}`
  });
  return fetch(url, Object.assign({}, options, { headers }));
}

// Try to resume a session on page load if a token was saved
(async function tryResumeSession() {
  if (!token) return;
  try {
    const res = await authedFetch('/api/user/me');
    if (!res.ok) throw new Error('Session expired');
    const user = await res.json();
    currentUser = user;
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
    welcomeText.textContent = `Hi, ${user.name}`;
    renderContacts(user.emergencyContacts || []);
    initMapIfNeeded();
  } catch (err) {
    token = null;
    localStorage.removeItem('raksha_token');
  }
})();

// ---------- Emergency contacts ----------
function renderContacts(contacts) {
  currentUser.emergencyContacts = contacts;
  contactsList.innerHTML = '';

  if (contacts.length === 0) {
    contactsList.innerHTML = '<p class="hint">No emergency contacts added yet.</p>';
    return;
  }

  contacts.forEach((c, i) => {
    const row = document.createElement('div');
    row.className = 'contact-row';
    row.innerHTML = `
      <span>${c.name} — ${c.phone}</span>
      <button data-index="${i}" class="removeContactBtn">Remove</button>
    `;
    contactsList.appendChild(row);
  });

  document.querySelectorAll('.removeContactBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.index);
      const updated = currentUser.emergencyContacts.filter((_, i) => i !== idx);
      await saveContacts(updated);
    });
  });
}

addContactForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('contactName').value.trim();
  const phone = document.getElementById('contactPhone').value.trim();
  if (!name || !phone) return;

  const updated = [...(currentUser.emergencyContacts || []), { name, phone }];
  await saveContacts(updated);
  addContactForm.reset();
});

async function saveContacts(contacts) {
  const res = await authedFetch('/api/user/contacts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contacts })
  });
  const user = await res.json();
  if (res.ok) renderContacts(user.emergencyContacts);
}

// ---------- Map (Leaflet + OpenStreetMap, no API key needed) ----------
function initMapIfNeeded() {
  if (map) return;
  map = L.map('map').setView([28.6139, 77.2090], 14); // default: New Delhi
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
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
  hospitalList.innerHTML = '<li class="loading">Loading nearby hospitals…</li>';
  policeList.innerHTML = '<li class="loading">Loading nearby police stations…</li>';
  placeMarkers.forEach(m => map.removeLayer(m));
  placeMarkers.length = 0;

  try {
    const [hospitalRes, policeRes] = await Promise.all([
      fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=hospital`),
      fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=police`)
    ]);

    const hospitals = await hospitalRes.json();
    const police = await policeRes.json();

    hospitalList.innerHTML = '';
    policeList.innerHTML = '';

    if (!hospitalRes.ok) {
      hospitalList.innerHTML = `<li class="error">${hospitals.error || 'Could not load hospitals.'}</li>`;
    } else if (hospitals.length === 0) {
      hospitalList.innerHTML = '<li class="empty">No hospitals found nearby.</li>';
    } else {
      hospitals.forEach(h => {
        const li = document.createElement('li');
        li.textContent = `${h.name} — ${h.address}`;
        hospitalList.appendChild(li);
        placeMarkers.push(
          L.marker([h.location.lat, h.location.lng], { icon: hospitalIcon, title: h.name }).addTo(map).bindPopup(h.name)
        );
      });
    }

    if (!policeRes.ok) {
      policeList.innerHTML = `<li class="error">${police.error || 'Could not load police stations.'}</li>`;
    } else if (police.length === 0) {
      policeList.innerHTML = '<li class="empty">No police stations found nearby.</li>';
    } else {
      police.forEach(p => {
        const li = document.createElement('li');
        li.textContent = `${p.name} — ${p.address}`;
        policeList.appendChild(li);
        placeMarkers.push(
          L.marker([p.location.lat, p.location.lng], { icon: policeIcon, title: p.name }).addTo(map).bindPopup(p.name)
        );
      });
    }
  } catch (err) {
    console.error('Failed to fetch nearby services:', err);
    hospitalList.innerHTML = '<li class="error">Could not load hospitals. Check your connection.</li>';
    policeList.innerHTML = '<li class="error">Could not load police stations. Check your connection.</li>';
  }
}

// ---------- SOS flow ----------
sosBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    lastPosition = { latitude, longitude };

    try {
      const res = await authedFetch('/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude })
      });
      const sos = await res.json();
      if (!res.ok) throw new Error(sos.error || 'Could not start SOS');
      sosId = sos._id;

      socket.emit('join-sos', sosId);
      statusEl.textContent = 'Status: SOS Active - tracking your location';
      sosBtn.disabled = true;
      endBtn.disabled = false;

      centerMap(latitude, longitude);
      fetchNearby(latitude, longitude);
      startTracking();
      showAlertButtons(latitude, longitude);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not start SOS.');
    }
  }, () => alert('Unable to fetch your location. Please allow location access.'));
});

endBtn.addEventListener('click', async () => {
  if (!sosId) return;
  await authedFetch(`/api/sos/${sosId}`, { method: 'DELETE' });
  stopTracking();
  statusEl.textContent = 'Status: Idle';
  sosBtn.disabled = false;
  endBtn.disabled = true;
  sosId = null;
  alertSection.classList.add('hidden');
  alertButtons.innerHTML = '';
});

function startTracking() {
  watchId = navigator.geolocation.watchPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;
    lastPosition = { latitude, longitude };

    try {
      await authedFetch(`/api/sos/${sosId}/location`, {
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

// Builds one tap-to-send WhatsApp + SMS button per emergency contact.
// No paid SMS API is used - this opens the user's own WhatsApp/Messages
// app with the alert text and a Google Maps link pre-filled; the user
// taps send themselves.
function showAlertButtons(lat, lng) {
  const contacts = currentUser.emergencyContacts || [];
  alertButtons.innerHTML = '';

  if (contacts.length === 0) {
    alertButtons.innerHTML = '<p class="hint">You have no emergency contacts saved. Add some above.</p>';
  } else {
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
    const message = `EMERGENCY: I need help. My live location: ${mapsLink}`;

    contacts.forEach(c => {
      const row = document.createElement('div');
      row.className = 'alert-row';

      const digitsOnly = c.phone.replace(/[^\d]/g, '');
      const waLink = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
      const smsLink = `sms:${c.phone}?body=${encodeURIComponent(message)}`;

      row.innerHTML = `
        <span>${c.name}</span>
        <a href="${waLink}" target="_blank" class="alert-btn whatsapp">WhatsApp</a>
        <a href="${smsLink}" class="alert-btn sms">SMS</a>
      `;
      alertButtons.appendChild(row);
    });
  }

  alertSection.classList.remove('hidden');
}

socket.on('location-broadcast', (data) => {
  console.log('Live location update:', data);
});
