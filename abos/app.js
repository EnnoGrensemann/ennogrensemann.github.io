const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbySVCyB_kihUxxPqvSWu_fAj0W5NOu-znz-qkAyXJ_QRpzVaL7hrbkEns6P88qsK-g2/exec";

const CURRENT_YEAR = 2026;
const CURRENT_MONTH = new Date().getMonth() + 1;
const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni", 
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

let state = {
  activeSubId: null,
  activeMemberId: null,
  subscriptions: []
};

const defaultData = [];

function setSyncStatus(status) {
  const icon = document.getElementById("syncIcon");
  if (status === "syncing") {
    icon.innerText = "sync";
    icon.classList.add("sync-spin");
  } else if (status === "done") {
    icon.innerText = "cloud_done";
    icon.classList.remove("sync-spin");
  } else if (status === "error") {
    icon.innerText = "cloud_off";
    icon.classList.remove("sync-spin");
  }
}

async function loadDataFromCloud() {
  setSyncStatus("syncing");
  const local = localStorage.getItem("sub_manager_data_m3_v4");
  if (local) {
    state.subscriptions = JSON.parse(local);
    renderDashboard();
  }

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_URL_HERE")) {
    if (!local) {
      state.subscriptions = defaultData;
      localStorage.setItem("sub_manager_data_m3_v4", JSON.stringify(state.subscriptions));
      renderDashboard();
    }
    setSyncStatus("done");
    return;
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL);
    const data = await res.json();
    if (Array.isArray(data)) {
      state.subscriptions = data;
      localStorage.setItem("sub_manager_data_m3_v4", JSON.stringify(data));
    } 
    setSyncStatus("done");
  } catch (e) {
    setSyncStatus("error");
  }
  renderDashboard();
}

async function saveData() {
  localStorage.setItem("sub_manager_data_m3_v4", JSON.stringify(state.subscriptions));

  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_URL_HERE")) return;

  setSyncStatus("syncing");
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.subscriptions)
    });
    setSyncStatus("done");
  } catch (e) {
    setSyncStatus("error");
  }
}

function getMonthlyCost(cost, interval) {
  return interval === "yearly" ? cost / 12 : cost;
}

function getMemberShare(sub, memberInterval) {
  const count = sub.members.length || 1;
  const monthlyTotal = getMonthlyCost(sub.cost, sub.interval);
  const monthlyShare = monthlyTotal / count;
  return memberInterval === "yearly" ? monthlyShare * 12 : monthlyShare;
}

function getRelevantDueMonth() {
  return CURRENT_MONTH - 1;
}

function isMemberCurrentMonthPaid(member) {
  if (member.isDummy) return true;
  if (member.interval === "yearly") {
    return member.paidMonths && member.paidMonths.length === 12;
  }
  const dueMonth = getRelevantDueMonth();
  if (dueMonth === 0) return true;
  return member.paidMonths && member.paidMonths.includes(dueMonth);
}

function getMemberUnpaidMonthsCount(member) {
  if (member.isDummy) return 0;
  let unpaid = 0;
  const dueMonth = getRelevantDueMonth();
  for (let m = 1; m <= dueMonth; m++) {
    if (!member.paidMonths.includes(m)) unpaid++;
  }
  return unpaid;
}

function renderDashboard() {
  const list = document.getElementById("subsList");
  list.innerHTML = "";

  state.subscriptions.forEach(sub => {
    const payingMembers = sub.members.filter(m => !m.isDummy);
    const paidMembers = payingMembers.filter(m => isMemberCurrentMonthPaid(m));
    const isComplete = payingMembers.length > 0 && payingMembers.length === paidMembers.length;
    const unpaidCount = payingMembers.length - paidMembers.length;

    const totalCostStr = sub.cost.toFixed(2).replace(".", ",");
    const intervalLabel = sub.interval === "yearly" ? "Jahr" : "Monat";

    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => openSubscription(sub.id);

    card.innerHTML = `
      <div class="card-top">
        <h3>${escapeHtml(sub.name)}</h3>
        ${isComplete 
          ? `<span class="badge-status badge-paid"><span class="material-symbols-outlined" style="font-size:16px;">done_all</span> Alles bezahlt</span>`
          : `<span class="badge-status badge-unpaid">${unpaidCount} offen</span>`
        }
      </div>
      <div class="card-meta">
        <span class="card-meta-text"><strong>${totalCostStr} €</strong> / ${intervalLabel}</span>
      </div>
      <div class="card-meta">
        <span class="card-meta-text">Status: <strong>${paidMembers.length}/${payingMembers.length}</strong> gezahlt</span>
      </div>
    `;
    list.appendChild(card);
  });
}

function openSubscription(subId) {
  state.activeSubId = subId;
  state.activeMemberId = null;
  const sub = state.subscriptions.find(s => s.id === subId);
  if (!sub) return;

  document.getElementById("viewDashboard").classList.add("hidden");
  document.getElementById("viewMemberDetail").classList.add("hidden");
  document.getElementById("viewDetail").classList.remove("hidden");
  document.getElementById("fabBtn").classList.add("hidden");

  const appBar = document.getElementById("appBar");
  appBar.innerHTML = `
    <button class="icon-btn" onclick="showDashboard()">
      <span class="material-symbols-outlined">arrow_back</span>
    </button>
    <h1>${escapeHtml(sub.name)}</h1>
  `;

  const count = sub.members.length || 1;
  const intervalLabel = sub.interval === "yearly" ? "jährlich" : "monatlich";
  const totalCostStr = sub.cost.toFixed(2).replace(".", ",");
  const baseShare = (sub.cost / count).toFixed(2).replace(".", ",");

  document.getElementById("detailHero").innerHTML = `
    <span class="detail-hero-title">Gesamtkosten</span>
    <div class="detail-hero-val">${totalCostStr} € <span style="font-size:1.1rem;font-weight:400;color:var(--md-sys-color-on-surface-variant)">/ ${intervalLabel}</span></div>
    <div class="detail-hero-sub">Entspricht <strong>${baseShare} €</strong> pro Person bei gerader Verteilung (${count} Plätze).</div>
  `;

  renderMembers(sub);
}

function renderMembers(sub) {
  const membersList = document.getElementById("membersList");
  membersList.innerHTML = "";

  sub.members.forEach(member => {
    const item = document.createElement("div");
    item.className = "member-card";
    item.onclick = () => openMemberDetail(member.id);

    const memberIntervalLabel = member.interval === "yearly" ? "Zahlt jährlich" : "Zahlt monatlich";
    const initial = member.name.charAt(0).toUpperCase();

    let actionArea = "";
    if (member.isDummy) {
      actionArea = `<span class="chip-dummy">Dummy</span>`;
    } else {
      const share = getMemberShare(sub, member.interval);
      const shareStr = share.toFixed(2).replace(".", ",");
      const intervalSuffix = member.interval === "yearly" ? "/ Jahr" : "/ Mon.";
      const isPaid = isMemberCurrentMonthPaid(member);
      const checkedClass = isPaid ? "checked" : "";
      const unpaidCount = getMemberUnpaidMonthsCount(member);

      actionArea = `
        <div style="text-align:right;">
          <div class="member-amount">${shareStr} €</div>
          <div style="font-size:0.75rem; color:${unpaidCount > 0 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-on-surface-variant)'}">
            ${unpaidCount > 0 ? `${unpaidCount} Mon. im Rückstand` : intervalSuffix}
          </div>
        </div>
        <button class="check-btn-m3 ${checkedClass}" onclick="event.stopPropagation(); toggleTargetMonthPaid('${member.id}')">
          <span class="material-symbols-outlined" style="font-size:20px;">check</span>
        </button>
      `;
    }

    item.innerHTML = `
      <div class="member-info">
        <div class="avatar ${member.isDummy ? 'dummy' : ''}">${initial}</div>
        <div class="member-texts">
          <h4>${escapeHtml(member.name)}</h4>
          <span>${member.isDummy ? 'Keine Kostenbeteiligung' : memberIntervalLabel}</span>
        </div>
      </div>
      <div class="member-actions">
        ${actionArea}
      </div>
    `;
    membersList.appendChild(item);
  });
}

function toggleTargetMonthPaid(memberId) {
  const sub = state.subscriptions.find(s => s.id === state.activeSubId);
  if (!sub) return;

  const member = sub.members.find(m => m.id === memberId);
  if (!member || member.isDummy) return;

  const dueMonth = getRelevantDueMonth() || CURRENT_MONTH;

  if (member.interval === "yearly") {
    if (member.paidMonths.length === 12) {
      member.paidMonths = [];
    } else {
      member.paidMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  } else {
    if (member.paidMonths.includes(dueMonth)) {
      member.paidMonths = member.paidMonths.filter(m => m !== dueMonth);
    } else {
      member.paidMonths.push(dueMonth);
    }
  }

  saveData();
  renderMembers(sub);
}

function openMemberDetail(memberId) {
  state.activeMemberId = memberId;
  const sub = state.subscriptions.find(s => s.id === state.activeSubId);
  const member = sub.members.find(m => m.id === memberId);
  if (!member) return;

  document.getElementById("viewDetail").classList.add("hidden");
  document.getElementById("viewMemberDetail").classList.remove("hidden");

  const appBar = document.getElementById("appBar");
  appBar.innerHTML = `
    <button class="icon-btn" onclick="openSubscription('${sub.id}')">
      <span class="material-symbols-outlined">arrow_back</span>
    </button>
    <h1>${escapeHtml(member.name)}</h1>
  `;

  document.getElementById("yearSectionTitle").innerText = `Monatsübersicht ${CURRENT_YEAR}`;

  const share = getMemberShare(sub, member.interval);
  const shareStr = share.toFixed(2).replace(".", ",");
  const intervalSuffix = member.interval === "yearly" ? "jährlich" : "monatlich";
  const unpaidCount = getMemberUnpaidMonthsCount(member);

  document.getElementById("memberHero").innerHTML = `
    <span class="detail-hero-title">${member.isDummy ? 'Profil' : 'Kostenanteil'}</span>
    <div class="detail-hero-val">${member.isDummy ? '0,00 €' : `${shareStr} €`} <span style="font-size:1.1rem;font-weight:400;color:var(--md-sys-color-on-surface-variant)">(${intervalSuffix})</span></div>
    <div class="detail-hero-sub">${member.isDummy ? 'Dieser Nutzer ist als Dummy hinterlegt.' : `${unpaidCount} überfällige(r) Monat(e) aus der Vergangenheit.`}</div>
  `;

  renderMonthGrid(member);
}

function renderMonthGrid(member) {
  const grid = document.getElementById("monthGrid");
  grid.innerHTML = "";

  if (member.isDummy) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 16px; text-align: center; color: var(--md-sys-color-outline);">Keine Monatsabrechnung für Dummy-Profile nötig.</div>`;
    return;
  }

  const dueMonth = getRelevantDueMonth();

  MONTH_NAMES.forEach((name, index) => {
    const monthNum = index + 1;
    const isPaid = member.paidMonths.includes(monthNum);
    const isPast = monthNum <= dueMonth;
    const isCurrent = monthNum === CURRENT_MONTH;

    let cardClass = 'unpaid';
    let statusText = 'Geplant';
    let icon = 'schedule';

    if (isPaid) {
      cardClass = 'paid';
      statusText = 'Bezahlt';
      icon = 'check_circle';
    } else if (isPast) {
      cardClass = 'overdue';
      statusText = 'Rückstand';
      icon = 'error';
    } else if (isCurrent) {
      cardClass = 'unpaid';
      statusText = 'Laufend';
      icon = 'pending';
    }

    const card = document.createElement("div");
    card.className = `month-card ${cardClass}`;
    card.onclick = () => toggleMonthPaid(member.id, monthNum);

    card.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
      <div class="month-name">${name.slice(0, 3)}</div>
      <div class="month-status">${statusText}</div>
    `;
    grid.appendChild(card);
  });
}

function toggleMonthPaid(memberId, monthNum) {
  const sub = state.subscriptions.find(s => s.id === state.activeSubId);
  const member = sub.members.find(m => m.id === memberId);
  if (!member) return;

  if (member.paidMonths.includes(monthNum)) {
    member.paidMonths = member.paidMonths.filter(m => m !== monthNum);
  } else {
    member.paidMonths.push(monthNum);
  }

  saveData();
  openMemberDetail(member.id);
}

function deleteCurrentMember() {
  if (!confirm("Möchtest du diese Person wirklich aus dem Abo entfernen?")) return;
  const sub = state.subscriptions.find(s => s.id === state.activeSubId);
  if (!sub) return;

  sub.members = sub.members.filter(m => m.id !== state.activeMemberId);
  saveData();
  openSubscription(sub.id);
}

function showDashboard() {
  state.activeSubId = null;
  state.activeMemberId = null;
  document.getElementById("viewDashboard").classList.remove("hidden");
  document.getElementById("viewDetail").classList.add("hidden");
  document.getElementById("viewMemberDetail").classList.add("hidden");
  document.getElementById("fabBtn").classList.remove("hidden");

  const appBar = document.getElementById("appBar");
  appBar.innerHTML = `
    <h1>Abo-Übersicht</h1>
    <div class="sync-status" id="syncStatus">
      <span class="material-symbols-outlined" id="syncIcon" style="font-size: 18px;">cloud_done</span>
    </div>
  `;

  renderDashboard();
}

function openAddSubModal() {
  document.getElementById("subName").value = "";
  document.getElementById("subCost").value = "";
  document.getElementById("subInterval").value = "monthly";
  document.getElementById("subModal").classList.remove("hidden");
}

function openAddMemberModal() {
  document.getElementById("memberName").value = "";
  document.getElementById("memberInterval").value = "monthly";
  document.getElementById("memberType").value = "member";
  document.getElementById("memberModal").classList.remove("hidden");
}

function closeModals() {
  document.getElementById("subModal").classList.add("hidden");
  document.getElementById("memberModal").classList.add("hidden");
}

function saveSubscription() {
  const name = document.getElementById("subName").value.trim();
  const cost = parseFloat(document.getElementById("subCost").value);
  const interval = document.getElementById("subInterval").value;
  if (!name || isNaN(cost)) return;

  const newSub = {
    id: "sub-" + Date.now(),
    name: name,
    cost: cost,
    interval: interval,
    members: []
  };

  state.subscriptions.push(newSub);
  saveData();
  closeModals();
  renderDashboard();
}

function saveMember() {
  const name = document.getElementById("memberName").value.trim();
  const interval = document.getElementById("memberInterval").value;
  const isDummy = document.getElementById("memberType").value === "dummy";
  if (!name) return;

  const sub = state.subscriptions.find(s => s.id === state.activeSubId);
  if (!sub) return;

  sub.members.push({
    id: "m-" + Date.now(),
    name: name,
    interval: interval,
    isDummy: isDummy,
    paidMonths: isDummy ? [] : []
  });

  saveData();
  closeModals();
  openSubscription(sub.id);
}

function deleteCurrentSubscription() {
  if (!confirm("Möchtest du dieses Abo wirklich löschen?")) return;
  state.subscriptions = state.subscriptions.filter(s => s.id !== state.activeSubId);
  saveData();
  showDashboard();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}

window.onload = loadDataFromCloud;
