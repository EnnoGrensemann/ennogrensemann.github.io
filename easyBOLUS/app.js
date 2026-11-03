// Globale App-Daten & Standardprofile
let appData = {
  profile: Array.from({ length: 24 }, (_, i) => ({ hour: i, khRatio: 12, isf: 50, target: 100 })),
  basalDose: 16,
  log: []
};

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  initNavigation();
  initCalculator();
  initProfileTable();
  initThemeToggle();
  renderLog();
});

// Navigation zwischen den Ansichten umschalten
function initNavigation() {
  document.querySelectorAll('.bottom-nav .nav-item').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.target).classList.add('active');
    });
  });
}

// Rechner-Logik (Berechnung von Mahlzeit, Korrektur und IOB)
function initCalculator() {
  const bzInput = document.getElementById('input-bz');
  const khInput = document.getElementById('input-kh');
  const resultVal = document.getElementById('result-value');
  const breakdownVal = document.getElementById('result-breakdown');

  function calculate(saveToLog = false) {
    const bz = parseFloat(bzInput.value) || 0;
    const kh = parseFloat(khInput.value) || 0;
    const currentHour = new Date().getHours();
    const prof = appData.profile[currentHour];

    // Mahlzeitenbolus
    const mealInsulin = kh > 0 ? kh / prof.khRatio : 0;
    // Korrekturbolus
    const correctionInsulin = bz > 0 ? (bz - prof.target) / prof.isf : 0;
    // Aktives Insulin (IOB) aus den letzten 3 Stunden berechnen
    const now = Date.now();
    const iob = appData.log
      .filter(entry => (now - entry.timestamp) < 3 * 3600 * 1000 && entry.type === 'bolus')
      .reduce((acc, entry) => acc + Math.max(0, entry.insulin - (now - entry.timestamp) / (3 * 3600 * 1000) * entry.insulin), 0);

    // Gesamtsumme abzgl. IOB
    let total = (mealInsulin + correctionInsulin) - iob;
    total = Math.max(0, Math.round(total * 2) / 2); // Kaufmännisch auf 0,5 IE runden

    resultVal.textContent = `${total.toFixed(1)} IE`;
    breakdownVal.textContent = `Essen: ${mealInsulin.toFixed(1)} | Korr: ${correctionInsulin.toFixed(1)} | IOB: ${iob.toFixed(1)}`;

    if (saveToLog && (kh > 0 || bz > 0)) {
      appData.log.unshift({ timestamp: now, type: 'bolus', bz, kh, insulin: total });
      saveToLocalStorage();
      renderLog();
      bzInput.value = '';
      khInput.value = '';
      resultVal.textContent = '0,0 IE';
    }
  }

  document.getElementById('btn-calc').addEventListener('click', () => calculate(false));
  document.getElementById('btn-calc-save').addEventListener('click', () => calculate(true));
  document.getElementById('btn-inject-basal').addEventListener('click', () => {
    appData.log.unshift({ timestamp: Date.now(), type: 'basal', insulin: appData.basalDose });
    saveToLocalStorage();
    renderLog();
    alert('Basalinsulin eingetragen!');
  });
}

// Stundenprofil-Tabelle generieren
function initProfileTable() {
  const container = document.getElementById('hourly-profile-container');
  container.innerHTML = appData.profile.map((p, i) => `
    <div class="profile-row">
      <span>${i}:00 Uhr</span>
      <input type="number" value="${p.khRatio}" onchange="updateProfile(${i}, 'khRatio', this.value)" placeholder="g/IE">
      <input type="number" value="${p.isf}" onchange="updateProfile(${i}, 'isf', this.value)" placeholder="ISF">
      <input type="number" value="${p.target}" onchange="updateProfile(${i}, 'target', this.value)" placeholder="Ziel">
    </div>
  `).join('');
}

window.updateProfile = function(hour, field, val) {
  appData.profile[hour][field] = parseFloat(val) || 0;
  saveToLocalStorage();
};

// Tagebuch rendern
function renderLog() {
  const list = document.getElementById('log-list');
  list.innerHTML = appData.log.map(entry => `
    <div class="log-item">
      <div>
        <strong>${entry.type === 'basal' ? 'Basalinsulin' : 'Bolus'}</strong>
        <p>${new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ${entry.bz ? `| BZ: ${entry.bz}` : ''} ${entry.kh ? `| KH: ${entry.kh}g` : ''}</p>
      </div>
      <strong>${entry.insulin.toFixed(1)} IE</strong>
    </div>
  `).join('');
}

// Theme Schalter (Dark / Light Mode)
function initThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  });
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}

// Lokale Speicherung (LocalStorage)
function saveToLocalStorage() {
  localStorage.setItem('easybolus_data', JSON.stringify(appData));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem('easybolus_data');
  if (saved) {
    appData = JSON.parse(saved);
  }
}