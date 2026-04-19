/** SCRATCH KING - OFFICIAL GAME LOGIC **/

const db = {
    get users() { return JSON.parse(localStorage.getItem('sk_users')) || []; },
    set users(v) { localStorage.setItem('sk_users', JSON.stringify(v)); },
    get session() { return localStorage.getItem('sk_session'); },
    set session(v) { localStorage.setItem('sk_session', v || ''); }
};

// Initialize Admin
(function initAdmin() {
    const users = db.users;
    if (!users.find(u => u.username === 'ADMIN')) {
        users.push({
            username: 'ADMIN',
            password: '135975',
            coins: 999999,
            xp: 0,
            level: 100,
            debt: 0,
            lastRoulette: 0,
            ticketsScratched: 0
        });
        db.users = users;
    }
})();

let player = null;
let currentTicket = null;
let currentPrize = 0;
let isScratching = false;

const TICKET_TYPES = [
    { id: 'bronze', name: 'Ticket Bronze', price: 10, maxPrize: 50, color: '#cd7f32', emoji: '🥉' },
    { id: 'silver', name: 'Ticket Argent', price: 50, maxPrize: 300, color: '#c0c0c0', emoji: '🥈' },
    { id: 'gold', name: 'Ticket Or', price: 200, maxPrize: 1500, color: '#ffd700', emoji: '🥇' },
    { id: 'diamond', name: 'Ticket Diamant', price: 1000, maxPrize: 10000, color: '#b9f2ff', emoji: '💎' }
];

const elements = {
    loading: document.getElementById('loading-screen'),
    auth: document.getElementById('auth-screen'),
    game: document.getElementById('game-screen'),
    ticketsGrid: document.getElementById('tickets-grid'),
    scratchModal: document.getElementById('scratch-modal'),
    canvas: document.getElementById('scratch-canvas'),
    result: document.getElementById('scratch-result'),
    collectBtn: document.getElementById('collect-btn'),
    hud: {
        coins: document.getElementById('hud-credits'),
        xp: document.getElementById('hud-xp'),
        level: document.getElementById('hud-level'),
        debt: document.getElementById('hud-debt')
    },
    adminModal: document.getElementById('admin-modal'),
    adminTbody: document.getElementById('admin-tbody'),
    shopModal: document.getElementById('shop-modal'),
    loanModal: document.getElementById('loan-modal')
};

function savePlayer() {
    const users = db.users;
    const idx = users.findIndex(u => u.username === player.username);
    if (idx !== -1) {
        users[idx] = player;
        db.users = users;
    }
}

function updateUI() {
    if (!player) return;
    elements.hud.coins.innerHTML = `💰 ${player.coins}`;
    elements.hud.xp.innerHTML = `⭐ XP: ${player.xp}`;
    elements.hud.level.innerHTML = `🏆 Niv. ${player.level}`;
    
    if (player.debt > 0) {
        elements.hud.debt.classList.remove('hidden');
        elements.hud.debt.innerHTML = `💳 Dette: ${player.debt}`;
    } else {
        elements.hud.debt.classList.add('hidden');
    }

    // Auto-repay debt
    if (player.debt > 0 && player.coins >= player.debt * 2) {
        player.coins -= player.debt;
        showToast(`Dette de ${player.debt} 💰 remboursée !`);
        player.debt = 0;
        savePlayer();
        updateUI();
    }
}

function login(u, p) {
    const users = db.users;
    const user = users.find(x => x.username === u && x.password === p);
    if (!user) return alert(\"Identifiants incorrects\");
    player = user;
    db.session = u;
    startApp();
}

function register(u, p) {
    if (u.length < 3 || p.length < 4) return alert(\"Pseudo (min 3) ou Pass (min 4) trop court\");
    const users = db.users;
    if (users.find(x => x.username === u)) return alert(\"Pseudo déjà pris\");
    const newUser = {
        username: u, password: p, coins: 500, xp: 0, level: 1, debt: 0, lastRoulette: 0, ticketsScratched: 0
    };
    users.push(newUser);
    db.users = users;
    login(u, p);
}

function startApp() {
    elements.auth.classList.add('hidden');
    elements.loading.classList.add('hidden');
    elements.game.classList.remove('hidden');
    updateUI();
    renderTickets();
}

function renderTickets() {
    elements.ticketsGrid.innerHTML = TICKET_TYPES.map(t => \`
        <div class=\"ticket-card\" onclick=\"buyTicket('\${t.id}')\">
            <div class=\"t-emoji\">\${t.emoji}</div>
            <div class=\"t-name\">\${t.name}</div>
            <div class=\"t-price\">\${t.price} 💰</div>
            <div class=\"t-desc\">Gagnez jusqu'à \${t.maxPrize} !</div>
        </div>
    \`).join('');
}

function buyTicket(id) {
    const t = TICKET_TYPES.find(x => x.id === id);
    if (player.coins < t.price) {
        elements.loanModal.classList.remove('hidden');
        return;
    }
    player.coins -= t.price;
    currentTicket = t;
    openScratch();
    savePlayer();
    updateUI();
}

function openScratch() {
    currentPrize = calculatePrize(currentTicket);
    elements.result.innerHTML = \"\";
    elements.collectBtn.classList.add('hidden');
    initCanvas(currentTicket.color);
    elements.scratchModal.classList.remove('hidden');
}

function calculatePrize(t) {
    const rand = Math.random();
    if (rand > 0.4) return 0;
    return Math.floor(Math.random() * t.maxPrize) + 1;
}

function initCanvas(color) {
    const canvas = elements.canvas;
    const ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 200;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some \"scratch\" texture
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for(let i=0; i<100; i++) ctx.fillRect(Math.random()*canvas.width, Math.random()*canvas.height, 2, 2);
}

function scratch(e) {
    if (!isScratching) return;
    const rect = elements.canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    const ctx = elements.canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
    checkProgress();
}

function checkProgress() {
    const ctx = elements.canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, 320, 200);
    let clear = 0;
    for (let i = 3; i < imgData.data.length; i += 4) {
        if (imgData.data[i] === 0) clear++;
    }
    if ((clear / (320 * 200)) > 0.65) {
        reveal();
    }
}

function reveal() {
    if (elements.collectBtn.classList.contains('hidden')) {
        elements.canvas.getContext('2d').clearRect(0,0,320,200);
        elements.result.innerHTML = currentPrize > 0 ? \`<div class=\"scratch-result win\">GAGNÉ: \${currentPrize} 💰</div>\` : \`<div class=\"scratch-result lose\">PERDU...</div>\`;
        elements.collectBtn.classList.remove('hidden');
    }
}

function collect() {
    player.coins += currentPrize;
    player.xp += 10;
    player.ticketsScratched++;
    if (player.xp >= player.level * 100) {
        player.level++;
        player.xp = 0;
        showToast(\`Niveau Supérieur ! Bienvenue au Niv. \${player.level}\`);
    }
    savePlayer();
    updateUI();
    elements.scratchModal.classList.add('hidden');
}

function takeLoan() {
    player.debt += 100;
    player.coins += 100;
    savePlayer();
    updateUI();
    elements.loanModal.classList.add('hidden');
    showToast(\"Prêt de 100 💰 accordé !\");
}

function showAdmin() {
    if (player.username !== 'ADMIN') return;
    elements.adminTbody.innerHTML = db.users.map(u => \`
        <tr>
            <td>\${u.username}</td>
            <td>\${u.coins}</td>
            <td>\${u.xp}</td>
            <td>\${u.level}</td>
            <td>\${u.debt}</td>
            <td>\${u.password}</td>
        </tr>
    \`).join('');
    elements.adminModal.classList.remove('hidden');
}

function spinRoulette() {
    const now = Date.now();
    if (now - player.lastRoulette < 24 * 3600 * 1000) {
        return alert(\"Revenez demain !\");
    }
    const wins = [50, 100, 200, 500, 0, 20, 10];
    const win = wins[Math.floor(Math.random() * wins.length)];
    player.coins += win;
    player.lastRoulette = now;
    savePlayer();
    updateUI();
    alert(win > 0 ? \`Bravo ! Tu gagnes \${win} 💰\` : \"Pas de chance cette fois...\");
}

function showToast(m) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = m;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

// Events
document.getElementById('btn-login').onclick = () => login(document.getElementById('login-user').value, document.getElementById('login-pass').value);
document.getElementById('btn-register').onclick = () => register(document.getElementById('reg-user').value, document.getElementById('reg-pass').value);
document.getElementById('btn-logout').onclick = () => { db.session = ''; location.reload(); };
document.getElementById('btn-admin').onclick = showAdmin;
document.getElementById('btn-shop').onclick = () => elements.shopModal.classList.remove('hidden');
document.getElementById('roulette-btn').onclick = spinRoulette;
document.getElementById('btn-accept-loan').onclick = takeLoan;
document.getElementById('btn-decline-loan').onclick = () => elements.loanModal.classList.add('hidden');
elements.collectBtn.onclick = collect;

document.querySelectorAll('.btn-close').forEach(b => b.onclick = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
});

document.getElementById('tab-login').onclick = () => {
    document.getElementById('form-login').classList.remove('hidden');
    document.getElementById('form-register').classList.add('hidden');
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
};
document.getElementById('tab-register').onclick = () => {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-register').classList.remove('hidden');
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
};

elements.canvas.onmousedown = () => isScratching = true;
window.onmouseup = () => isScratching = false;
elements.canvas.onmousemove = scratch;
elements.canvas.ontouchstart = (e) => { e.preventDefault(); isScratching = true; };
elements.canvas.ontouchend = () => isScratching = false;
elements.canvas.ontouchmove = scratch;

window.onload = () => {
    const s = db.session;
    if (s) {
        player = db.users.find(u => u.username === s);
        if (player) return startApp();
    }
    elements.loading.classList.add('hidden');
    elements.auth.classList.remove('hidden');
};
