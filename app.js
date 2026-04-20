const TABLES = [
    { id: 'slots_basic', name: 'Machine à Sous Alpha', description: 'Une machine classique pour débuter.', cost: 0, revenue: 1, type: 'slots', owned: true },
    { id: 'slots_neon', name: 'Neon Spinner', description: 'Génère plus de crédits par seconde.', cost: 500, revenue: 5, type: 'slots', owned: false },
    { id: 'roulette_cyber', name: 'Roulette Cybernétique', description: 'La roulette du futur.', cost: 2000, revenue: 25, type: 'roulette', owned: false },
    { id: 'poker_ai', name: 'Poker IA', description: 'Des robots jouent contre eux-mêmes.', cost: 10000, revenue: 150, type: 'poker', owned: false },
    { id: 'blackjack_vortex', name: 'Blackjack Vortex', description: 'Le summum du casino cyber.', cost: 50000, revenue: 1000, type: 'blackjack', owned: false }
];
const UPGRADES = [
    { id: 'fast_slots', name: 'Circuits Turbo', description: 'Augmente les revenus de 20%.', cost: 1000, multiplier: 1.2, owned: false },
    { id: 'neon_lights', name: 'Éclairage Néon', description: 'Attire plus de clients (+50% revenus).', cost: 5000, multiplier: 1.5, owned: false }
];
let state = { credits: 1000, revenue: 0, ownedTables: ['slots_basic'], ownedUpgrades: [], lastTick: Date.now() };
function init() { loadGame(); renderLobby(); updateStats(); setInterval(tick, 1000); }
function tick() {
    let totalRevenue = 0;
    TABLES.forEach(table => { if (state.ownedTables.includes(table.id)) totalRevenue += table.revenue; });
    let multiplier = 1;
    UPGRADES.forEach(upg => { if (state.ownedUpgrades.includes(upg.id)) multiplier *= upg.multiplier; });
    state.revenue = totalRevenue * multiplier;
    state.credits += state.revenue;
    updateStats(); saveGame();
}
function updateStats() {
    const credEl = document.getElementById('stat-credits');
    const revEl = document.getElementById('stat-revenue');
    if (credEl) credEl.innerText = Math.floor(state.credits);
    if (revEl) revEl.innerText = state.revenue.toFixed(1);
    renderLobby();
}
function renderLobby() {
    const tableGrid = document.getElementById('tables-grid');
    const upgradeGrid = document.getElementById('upgrades-grid');
    if (!tableGrid || !upgradeGrid) return;
    tableGrid.innerHTML = TABLES.map(table => {
        const isOwned = state.ownedTables.includes(table.id);
        return `<div class="card ${isOwned ? 'owned' : ''}">
            <h3>${table.name}</h3>
            <p>${table.description}</p>
            <p>Revenu: <span class="cyber-blue">${table.revenue} 🪙/s</span></p>
            ${isOwned ? `<button class="cyber-btn" onclick="openGame('${table.type}')">JOUER</button>` : `<button class="cyber-btn" onclick="buyTable('${table.id}')" ${state.credits < table.cost ? 'disabled' : ''}>ACHETER (${table.cost} 🪙)</button>`}
        </div>`;
    }).join('');
    upgradeGrid.innerHTML = UPGRADES.map(upg => {
        const isOwned = state.ownedUpgrades.includes(upg.id);
        return `<div class="card ${isOwned ? 'owned' : ''}">
            <h3>${upg.name}</h3>
            <p>${upg.description}</p>
            ${isOwned ? `<button class="cyber-btn" disabled>ACQUIS</button>` : `<button class="cyber-btn" onclick="buyUpgrade('${upg.id}')" ${state.credits < upg.cost ? 'disabled' : ''}>AMÉLIORER (${upg.cost} 🪙)</button>`}
        </div>`;
    }).join('');
}
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.remove('hidden');
}
function openGame(type) { if (type === 'slots') showScreen('slot-screen'); else showNotif("Bientôt disponible !", "#ff00ff"); }
function buyTable(id) {
    const table = TABLES.find(t => t.id === id);
    if (state.credits >= table.cost) {
        state.credits -= table.cost; state.ownedTables.push(id);
        showNotif("Table " + table.name + " achetée !", "#00ff00"); updateStats();
    }
}
function buyUpgrade(id) {
    const upg = UPGRADES.find(u => u.id === id);
    if (state.credits >= upg.cost) {
        state.credits -= upg.cost; state.ownedUpgrades.push(id);
        showNotif("Amélioration " + upg.name + " activée !", "#00ff00"); updateStats();
    }
}
const SYMBOLS = ['🍒', '🍋', '🔔', '7️⃣', '💎', '🍀'];
let spinning = false;
function spin() {
    if (spinning || state.credits < 10) return;
    state.credits -= 10; spinning = true; updateStats();
    const r1 = document.getElementById('reel1'), r2 = document.getElementById('reel2'), r3 = document.getElementById('reel3'), res = document.getElementById('slot-result');
    if (res) res.innerText = "LANCEMENT...";
    let iterations = 0;
    const interval = setInterval(() => {
        if (r1) r1.innerText = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        if (r2) r2.innerText = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        if (r3) r3.innerText = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        if (++iterations > 20) { clearInterval(interval); checkWin(r1.innerText, r2.innerText, r3.innerText); spinning = false; }
    }, 50);
}
function checkWin(s1, s2, s3) {
    let win = 0; const res = document.getElementById('slot-result');
    if (s1 === s2 && s2 === s3) { if (s1 === '💎') win = 1000; else if (s1 === '7️⃣') win = 200; else win = 50; }
    else if (s1 === s2 || s2 === s3 || s1 === s3) win = 20;
    if (win > 0) {
        state.credits += win;
        if (res) { res.innerText = "JACKPOT: +" + win + " 🪙"; res.style.color = "#00ff00"; }
        showNotif("GAGNÉ: " + win + " 🪙", "#00ff00");
    } else if (res) { res.innerText = "PERDU..."; res.style.color = "#ff00ff"; }
    updateStats();
}
function showNotif(text, color) {
    const container = document.getElementById('notif-container');
    if (!container) return;
    const notif = document.createElement('div');
    notif.className = 'notif'; notif.innerText = text; notif.style.borderLeftColor = color;
    container.appendChild(notif); setTimeout(() => notif.remove(), 3000);
}
function saveGame() { localStorage.setItem('cyber_casino_save', JSON.stringify(state)); }
function loadGame() {
    const saved = localStorage.getItem('cyber_casino_save');
    if (saved) { try { state = { ...state, ...JSON.parse(saved) }; } catch (e) {} }
}
window.onload = init;
