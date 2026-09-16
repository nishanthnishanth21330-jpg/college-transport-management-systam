/* ==========================================================
   College Transport Management System — Frontend Logic
   Vanilla JS, talks to the Express/MySQL backend via REST API
   ========================================================== */

const API_BASE = '/api'; // frontend is served by the same Express server

/* ---------------- Session helpers ---------------- */
const Auth = {
  getToken() { return localStorage.getItem('ct_token'); },
  getUser() {
    const raw = localStorage.getItem('ct_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('ct_token', token);
    localStorage.setItem('ct_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('ct_token');
    localStorage.removeItem('ct_user');
  },
  isLoggedIn() { return !!this.getToken(); }
};

/* ---------------- API helper ---------------- */
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {}
  );
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error('Network error. Please check your connection and that the server is running.');
  }

  let data = null;
  try { data = await response.json(); } catch (_) { /* no body */ }

  if (response.status === 401) {
    Auth.clearSession();
    toast('Session expired. Please log in again.', 'error');
    setTimeout(() => (window.location.href = 'login.html'), 1200);
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const message = (data && data.message) || 'Something went wrong. Please try again.';
    throw new Error(message);
  }

  return data;
}

/* ---------------- Toast notifications ---------------- */
function toast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ---------------- Sidebar / Layout ---------------- */
const NAV_ITEMS = [
  { href: 'index.html', label: 'Home', icon: '🏠', page: 'home' },
  { href: 'login.html', label: 'Login', icon: '🔑', page: 'login', hideWhenLoggedIn: true },
  { href: 'add-bus.html', label: 'Add Bus', icon: '➕', page: 'add-bus', protected: true },
  { href: 'live-bus.html', label: 'Live Bus', icon: '🚌', page: 'live-bus', protected: true },
];

function renderSidebar(activePage) {
  const root = document.getElementById('sidebar-root');
  if (!root) return;

  const loggedIn = Auth.isLoggedIn();
  const user = Auth.getUser();

  const navLinks = NAV_ITEMS
    .filter(item => !(item.hideWhenLoggedIn && loggedIn))
    .map(item => `
      <a href="${item.href}" class="${activePage === item.page ? 'active' : ''}">
        <span>${item.icon}</span><span>${item.label}</span>
      </a>
    `).join('');

  const logoutLink = loggedIn
    ? `<a href="#" id="logout-link"><span>🚪</span><span>Logout</span></a>`
    : '';

  root.innerHTML = `
    <div class="mobile-topbar">
      <div style="display:flex;align-items:center;gap:8px;font-weight:700;">🚌 College Transport</div>
      <button class="menu-btn" id="menu-toggle" aria-label="Open menu">☰</button>
    </div>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand"><span class="icon">🚌</span><span>College Transport</span></div>
      <nav class="sidebar-nav">
        ${navLinks}
        ${logoutLink}
      </nav>
      ${user ? `<div class="sidebar-user"><strong>${escapeHtml(user.name)}</strong>${escapeHtml(user.phone)}</div>` : ''}
    </aside>
  `;

  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (toggle) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  const logoutBtn = document.getElementById('logout-link');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await apiFetch('/auth/logout', { method: 'POST' }); } catch (_) { /* ignore */ }
      Auth.clearSession();
      toast('Logged out successfully', 'success');
      setTimeout(() => (window.location.href = 'login.html'), 600);
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function requireAuthOrRedirect() {
  if (!Auth.isLoggedIn()) {
    toast('Please log in to continue', 'error');
    setTimeout(() => (window.location.href = 'login.html'), 800);
    return false;
  }
  return true;
}

/* ---------------- Page: Login ---------------- */
function initLoginPage() {
  if (Auth.isLoggedIn()) {
    window.location.href = 'index.html';
    return;
  }

  const form = document.getElementById('login-form');
  const nameInput = document.getElementById('login-name');
  const phoneInput = document.getElementById('login-phone');
  const nameError = document.getElementById('name-error');
  const phoneError = document.getElementById('phone-error');
  const submitBtn = document.getElementById('login-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    nameError.classList.remove('show');
    phoneError.classList.remove('show');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    let valid = true;

    if (!name) {
      nameError.textContent = 'Name cannot be empty.';
      nameError.classList.add('show');
      valid = false;
    }
    if (!phone || !/^\+?[0-9]{7,15}$/.test(phone)) {
      phoneError.textContent = 'Please enter a valid phone number (7-15 digits).';
      phoneError.classList.add('show');
      valid = false;
    }
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ name, phone })
      });
      Auth.setSession(data.token, data.user);
      toast('Login successful!', 'success');
      setTimeout(() => (window.location.href = 'index.html'), 500);
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'LOGIN';
    }
  });
}

/* ---------------- Page: Home ---------------- */
async function initHomePage() {
  const welcome = document.getElementById('welcome-user');
  const user = Auth.getUser();
  if (welcome) {
    welcome.textContent = user ? `Welcome back, ${user.name}!` : 'Welcome! Please log in to manage buses.';
  }

  if (!Auth.isLoggedIn()) {
    setStat('stat-total', '—');
    setStat('stat-active', '—');
    setStat('stat-live', '—');
    setStat('stat-completed', '—');
    return;
  }

  try {
    const data = await apiFetch('/dashboard/stats');
    setStat('stat-total', data.stats.totalBuses);
    setStat('stat-active', data.stats.activeBuses);
    setStat('stat-live', data.stats.liveBuses);
    setStat('stat-completed', data.stats.completedJourneys);
  } catch (err) {
    toast(err.message, 'error');
  }
}
function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ---------------- Page: Add Bus ---------------- */
function initAddBusPage() {
  if (!requireAuthOrRedirect()) return;

  const startBtn = document.getElementById('start-add-bus');
  const formWrap = document.getElementById('add-bus-form-wrap');
  const hero = document.getElementById('add-bus-hero');
  const form = document.getElementById('add-bus-form');
  const submitBtn = document.getElementById('add-bus-submit');

  startBtn.addEventListener('click', () => {
    hero.style.display = 'none';
    formWrap.style.display = 'block';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fields = {
      bus_name: document.getElementById('bus_name').value.trim(),
      bus_number: document.getElementById('bus_number').value.trim(),
      driver_name: document.getElementById('driver_name').value.trim(),
      driver_phone: document.getElementById('driver_phone').value.trim(),
      start_location: document.getElementById('start_location').value.trim(),
      destination: document.getElementById('destination').value.trim(),
      route_details: document.getElementById('route_details').value.trim(),
    };

    const liveLocation = document.getElementById('initial_live_location').value.trim();
    let latitude = null, longitude = null;
    if (liveLocation) {
      const parts = liveLocation.split(',').map(p => p.trim());
      if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
        latitude = parseFloat(parts[0]);
        longitude = parseFloat(parts[1]);
      }
    }

    // Basic validation
    for (const [key, val] of Object.entries(fields)) {
      if (key !== 'route_details' && !val) {
        toast('Please fill in all required fields.', 'error');
        return;
      }
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      await apiFetch('/buses', {
        method: 'POST',
        body: JSON.stringify({ ...fields, latitude, longitude })
      });
      toast('Bus Submitted Successfully!', 'success');
      form.reset();
      formWrap.style.display = 'none';
      hero.style.display = 'flex';
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'SUBMIT BUS';
    }
  });
}

/* ---------------- Page: Live Bus ---------------- */
let watchId = null;         // navigator.geolocation.watchPosition id
let trackingBusId = null;   // currently tracked bus id
let liveMap = null, liveMarker = null;
let mapModalBusId = null;
let mapAutoRefreshTimer = null;

async function initLiveBusPage() {
  if (!requireAuthOrRedirect()) return;
  await loadBuses();
}

async function loadBuses() {
  const grid = document.getElementById('bus-grid');
  const loader = document.getElementById('bus-loader');
  const empty = document.getElementById('bus-empty');
  loader.style.display = 'block';
  grid.innerHTML = '';
  empty.style.display = 'none';

  try {
    const data = await apiFetch('/buses');
    loader.style.display = 'none';

    if (!data.buses || data.buses.length === 0) {
      empty.style.display = 'block';
      return;
    }

    grid.innerHTML = data.buses.map(renderBusCard).join('');
    data.buses.forEach(attachBusCardHandlers);
  } catch (err) {
    loader.style.display = 'none';
    toast(err.message, 'error');
  }
}

function renderBusCard(bus) {
  const statusLower = bus.status;
  const isStopped = bus.status === 'STOPPED';
  const isLive = bus.status === 'LIVE';
  const isCompleted = bus.status === 'COMPLETED';

  return `
    <div class="card bus-card" data-bus-id="${bus.id}">
      <div class="bus-card-header">
        <div class="bus-card-title">
          <span class="emoji">🚌</span>
          <div>
            <h3 class="bus-name-display">${escapeHtml(bus.bus_name)}</h3>
            <div class="bus-number">${escapeHtml(bus.bus_number)}</div>
          </div>
        </div>
        <span class="status-badge ${statusLower}">${statusLower}</span>
      </div>

      <div class="bus-card-info">
        <div><span class="label">Driver:</span> ${escapeHtml(bus.driver_name)} (${escapeHtml(bus.driver_phone)})</div>
        <div><span class="label">Route:</span> ${escapeHtml(bus.start_location)} → ${escapeHtml(bus.destination)}</div>
        ${bus.route_details ? `<div><span class="label">Details:</span> ${escapeHtml(bus.route_details)}</div>` : ''}
      </div>

      <div class="inline-edit" style="display:none;" id="edit-wrap-${bus.id}">
        <input type="text" id="edit-input-${bus.id}" value="${escapeHtml(bus.bus_name)}" />
        <button class="btn btn-primary btn-sm save-name-btn" data-id="${bus.id}">SAVE</button>
      </div>

      <div class="bus-card-actions">
        <button class="btn btn-outline btn-sm change-name-btn" data-id="${bus.id}">CHANGE NAME</button>
        <button class="btn btn-outline btn-sm view-location-btn" data-id="${bus.id}">BUS LIVE LOCATION</button>
        <button class="btn btn-accent btn-sm start-journey-btn" data-id="${bus.id}" ${isStopped ? '' : 'style="display:none;"'}>START JOURNEY</button>
        <button class="btn btn-danger btn-sm stop-journey-btn" data-id="${bus.id}" ${isLive ? '' : 'style="display:none;"'}>STOP JOURNEY</button>
        <button class="btn btn-danger btn-sm delete-bus-btn" data-id="${bus.id}">DELETE BUS</button>
        ${isCompleted ? `<span style="font-size:0.78rem;color:var(--text-muted);align-self:center;">Journey completed</span>` : ''}
      </div>
    </div>
  `;
}

function attachBusCardHandlers(bus) {
  const id = bus.id;

  // Change name
  const changeBtn = document.querySelector(`.change-name-btn[data-id="${id}"]`);
  const editWrap = document.getElementById(`edit-wrap-${id}`);
  changeBtn.addEventListener('click', () => {
    editWrap.style.display = editWrap.style.display === 'none' ? 'flex' : 'none';
  });

  const saveBtn = document.querySelector(`.save-name-btn[data-id="${id}"]`);
  saveBtn.addEventListener('click', async () => {
    const input = document.getElementById(`edit-input-${id}`);
    const newName = input.value.trim();
    if (!newName) { toast('Bus name cannot be empty.', 'error'); return; }
    saveBtn.disabled = true;
    try {
      await apiFetch(`/buses/${id}/name`, {
        method: 'PUT',
        body: JSON.stringify({ bus_name: newName })
      });
      document.querySelector(`.bus-card[data-bus-id="${id}"] .bus-name-display`).textContent = newName;
      editWrap.style.display = 'none';
      toast('Bus Name Updated Successfully', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // View live location
  document.querySelector(`.view-location-btn[data-id="${id}"]`)
    .addEventListener('click', () => openLocationModal(bus));

  // Start journey
  const startBtn = document.querySelector(`.start-journey-btn[data-id="${id}"]`);
  if (startBtn) startBtn.addEventListener('click', () => startJourney(id));

  // Stop journey
  const stopBtn = document.querySelector(`.stop-journey-btn[data-id="${id}"]`);
  if (stopBtn) stopBtn.addEventListener('click', () => stopJourney(id));
const deleteBtn = document.querySelector(`.delete-bus-btn[data-id="${id}"]`);

if (deleteBtn) {
  deleteBtn.addEventListener('click', async () => {
    if (!confirm('Delete this bus?')) return;

    await apiFetch(`/buses/${id}`, {
      method: 'DELETE'
    });

    toast('Bus deleted successfully!', 'success');
    await loadBuses();
  });
}
}

function startJourney(busId) {
  if (!navigator.geolocation) {
    toast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        await apiFetch(`/buses/${busId}/start`, {
          method: 'POST',
          body: JSON.stringify({ latitude, longitude })
        });
        toast('Journey Started Successfully', 'success');

        // Begin watching position and pushing updates while LIVE
        trackingBusId = busId;
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = navigator.geolocation.watchPosition(
          async (pos) => {
            try {
              await apiFetch(`/buses/${busId}/location`, {
                method: 'PUT',
                body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
              });
              if (mapModalBusId === busId && liveMarker) {
                liveMarker.setLatLng([pos.coords.latitude, pos.coords.longitude]);
                liveMap.panTo([pos.coords.latitude, pos.coords.longitude]);
              }
            } catch (_) { /* keep watching even if a single update fails */ }
          },
          (err) => toast(`Location tracking error: ${err.message}`, 'error'),
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );

        await loadBuses();
      } catch (err) {
        toast(err.message, 'error');
      }
    },
    (err) => {
      if (err.code === err.PERMISSION_DENIED) {
        toast('Location permission denied. Please allow location access to start the journey.', 'error');
      } else {
        toast('Unable to retrieve your location. Please try again.', 'error');
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function stopJourney(busId) {
  try {
    await apiFetch(`/buses/${busId}/stop`, { method: 'POST' });

    if (watchId !== null && trackingBusId === busId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      trackingBusId = null;
    }

    toast('Journey Stopped Successfully — Tracking Stopped', 'success');
    await loadBuses();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ---------------- Live location modal + Leaflet map ---------------- */
function openLocationModal(bus) {
  mapModalBusId = bus.id;
  document.getElementById('modal-bus-name').textContent = bus.bus_name;
  document.getElementById('modal-bus-number').textContent = bus.bus_number;
  document.getElementById('map-modal').classList.add('open');

  updateMapMeta(bus);

  setTimeout(() => {
    const lat = bus.latitude || 20.5937;
    const lng = bus.longitude || 78.9629;

    if (!liveMap) {
      liveMap = L.map('map').setView([lat, lng], bus.latitude ? 15 : 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(liveMap);
      liveMarker = L.marker([lat, lng]).addTo(liveMap);
    } else {
      liveMap.setView([lat, lng], bus.latitude ? 15 : 5);
      liveMarker.setLatLng([lat, lng]);
      liveMap.invalidateSize();
    }
    liveMarker.bindPopup(`<strong>${escapeHtml(bus.bus_name)}</strong><br>${escapeHtml(bus.bus_number)}`).openPopup();
  }, 100);

  // Auto-refresh location from server every 5s while modal open (covers other viewers' live buses)
  if (mapAutoRefreshTimer) clearInterval(mapAutoRefreshTimer);
  mapAutoRefreshTimer = setInterval(async () => {
    if (!mapModalBusId) return;
    try {
      const data = await apiFetch(`/buses/${mapModalBusId}`);
      updateMapMeta(data.bus);
      if (liveMarker && data.bus.latitude && data.bus.longitude) {
        liveMarker.setLatLng([data.bus.latitude, data.bus.longitude]);
      }
    } catch (_) { /* ignore transient errors */ }
  }, 5000);
}

function updateMapMeta(bus) {
  document.getElementById('modal-lat').textContent = bus.latitude != null ? bus.latitude.toFixed(6) : '—';
  document.getElementById('modal-lng').textContent = bus.longitude != null ? bus.longitude.toFixed(6) : '—';
  document.getElementById('modal-updated').textContent = new Date().toLocaleTimeString();
}

function closeLocationModal() {
  document.getElementById('map-modal').classList.remove('open');
  mapModalBusId = null;
  if (mapAutoRefreshTimer) { clearInterval(mapAutoRefreshTimer); mapAutoRefreshTimer = null; }
}

/* ---------------- Bootstrapping ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  renderSidebar(page);

  if (page === 'home') initHomePage();
  if (page === 'login') initLoginPage();
  if (page === 'add-bus') initAddBusPage();
  if (page === 'live-bus') initLiveBusPage();

  const modalClose = document.getElementById('modal-close');
  if (modalClose) modalClose.addEventListener('click', closeLocationModal);
  const modalOverlay = document.getElementById('map-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeLocationModal();
    });
  }
});
