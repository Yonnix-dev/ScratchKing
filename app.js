// ===== DATABASE (localStorage) =====
const db = {
    get users() { return JSON.parse(localStorage.getItem('sk_users') || '[]'); },
    set users(v) { localStorage.setItem('sk_users', JSON.stringify(v)); },
    get session() { return localStorage.getItem('sk_session'); },
    set session(v) { localStorage.setItem('sk_session', v || ''); }
};

// ===== STATE =====
let player = null;
let pendingTicketId = null;
let isScratchFinished = false;
let currentPrize = 0;
let rouletteSpinning = false;

// ===== DATA =====
const TICKETS = [
    {id:'fortune', name:'Fortune Dorée', emoji:'🪙', price:30, xpWin:8, desc:'Aligne 3 symboles dorés !'},
    {id:'treasure', name:'Chemin du Trésor', emoji:'🗺️', price:50, xpWin:12, desc:'Connecte le chemin au trésor'},
    {id:'animals', name:'Monde des Animaux', emoji:'🐾', price:40, xpWin:10, desc:'Trouve 2 animaux identiques'},
    {id:'stars', name:'Mystère des Étoiles', emoji:'⭐', price:60, xpWin:15, desc:'Gratte 3 étoiles identiques'},
    {id:'world', name:'Voyage autour du Monde', emoji:'✈️', price:80, xpWin:20, desc:'Réunis 3 destinations'},
    {id:'hero', name:'Super-Héros', emoji:'🦸', price:100, xpWin:25, desc:'Associe les héros et pouvoirs'},
    {id:'puzzle', name:'Puzzle Mystère', emoji:'🧩', price:75, xpWin:18, desc:'Complète le puzzle caché'},
    {id:'maze', name:'Défi du Labyrinthe', emoji:'🌀', price:90, xpWin:22, desc:'Trouve le chemin jusqu’à la sortie'},
    {id:'carnival', name:'Fête Foraine', emoji:'🎡', price:55, xpWin:14, desc:'Accumule 3 jeux gagnants'},
    {id:'cooking', name:'Cuisine Gourmande', emoji:'👨‍🍳', price:70, xpWin:17, desc:'Réunis les bons ingrédients'}
];

const PRIZES = {
    fortune:[0,0,0,40,60,80], treasure:[0,0,0,70,100,130], animals:[0,0,0,50,80,100],
    stars:[0,0,0,80,120,160], world:[0,0,0,110,160,200], hero:[0,0,0,140,200,250],
    puzzle:[0,0,0,100,150,180], maze:[0,0,0,120,180,220], carnival:[0,0,0,75,110,140],
    cooking:[0,0,0,95,140,170]
};

const SKINS = [
    {id:'default', name:'Défaut', price:0, emoji:'⚪'},
    {id:'neon', name:'Néon', price:500, emoji:'🟢'},
    {id:'gold', name:'Gold', price:1000, emoji:'🟡'},
    {id:'dark', name:'Dark', price:750, emoji:'⚫'},
    {id:'fire', name:'Fire', price:1500, emoji:'🔴'}
];

const SKIN_VARS = {
    default: {accent:'#a259ff', bg:'#0d0d1a', bg2:'#1a0d2e'},
    neon: {accent:'#00ffcc', bg:'#0a0f1e', bg2:'#001a15'},
    gold: {accent:'#ffd700', bg:'#1a1400', bg2:'#2a2000'},
    dark: {accent:'#888888', bg:'#050505', bg2:'#101010'},
    fire: {accent:'#ff6b00', bg:'#1a0a00', bg2:'#2a1000'}
};

const ROULETTE_PRIZES = [
    {label:'+50💰', credits:50, xp:0}, {label:'+100💰', credits:100, xp:0},
    {label:'+XP 20', credits:0, xp:20}, {label:'+200💰', credits:200, xp:0},
    {label:'Rien', credits:0, xp:0}, {label:'+500💰', credits:500, xp:0},
    {label:'+XP 50', credits:0, xp:50}, {label:'+150💰', credits:150, xp:0}
];

const ROULETTE_COLORS = ['#a259ff','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#3730a3','#312e81','#1e1b4b'];

// ===== INIT =====
function initAdmin() {
    const users = db.users;
    if (!users.find(u => u.username === 'ADMIN')) {
        users.push({username:'ADMIN', password:'135975', credits:9999, xp:0, level:1, debt:0, lastRoulette:0, skin:'default', ownedSkins:['default']});
        db.users = users;
    }
}

window.addEventListener('load', () => {
    initAdmin();
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        const s = db.session;
        if (s) {
            const f = db.users.find(x => x.username === s);
            if (f) { startGame(f); return; }
        }
        document.getElementById('auth-screen').classList.remove('hidden');
        setupAuth();
    }, 1500);
});

// ===== AUTH =====
function setupAuth() {
    document.getElementById('tab-login').onclick = () => showAuthTab('login');
    document.getElementById('tab-register').onclick = () => showAuthTab('register');
    document.getElementById('btn-login').onclick = handleLogin;
    document.getElementById('btn-register').onclick = handleRegister;
}

function showAuthTab(t) {
    document.getElementById('form-login').classList.toggle('hidden', t !== 'login');
    document.getElementById('form-register').classList.toggle('hidden', t !== 'register');
    document.getElementById('tab-login').classList.toggle('active', t === 'login');
    document.getElementById('tab-register').classList.toggle('active', t === 'register');
    document.getElementById('auth-error').textContent = '';
}

function handleLogin() {
    const u = document.getElementById('login-user').value.trim();
    const p = document.getElementById('login-pass').value.trim();
    if (!u || !p) return setAuthError('Remplis tous les champs.');
    const found = db.users.find(x => x.username === u);
    if (!found) return setAuthError('Compte introuvable.');
    if (found.password !== p) return setAuthError('Mot de passe incorrect.');
    startGame(found);
}

function handleRegister() {
    const u = document.getElementById('reg-user').value.trim();
    const p = document.getElementById('reg-pass').value.trim();
    if (!u || !p) return setAuthError('Remplis tous les champs.');
    if (u.length < 3) return setAuthError('Pseudo trop court (min 3).');
    if (db.users.find(x => x.username === u)) return setAuthError('Ce pseudo existe déjà.');
    const newPlayer = {username:u, password:p, credits:500, xp:0, level:1, debt:0, lastRoulette:0, skin:'default', ownedSkins:['default']};
    const users = db.users;
    users.push(newPlayer);
    db.users = users;
    startGame(newPlayer);
}

function setAuthError(m) { document.getElementById('auth-error').textContent = m; }

function logout() {
    savePlayer();
    player = null;
    db.session = '';
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
}

// ===== GAME =====
function startGame(data) {
    player = data;
    db.session = data.username;
    if (!player.ownedSkins) player.ownedSkins = ['default'];
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    applySkin(player.skin || 'default', false);
    updateHUD();
    renderTickets();
    if (player.username.toLowerCase() === 'admin') {
        document.getElementById('admin-btn').classList.remove('hidden');
    }
    
    document.getElementById('shop-btn').onclick = openShop;
    document.getElementById('logout-btn').onclick = logout;
    document.getElementById('admin-btn').onclick = openAdmin;
    document.getElementById('close-scratch').onclick = closeScratch;
    document.getElementById('close-shop').onclick = closeShop;
    document.getElementById('close-admin').onclick = closeAdmin;
    document.getElementById('accept-loan').onclick = acceptLoan;
    document.getElementById('decline-loan').onclick = () => document.getElementById('loan-modal').classList.add('hidden');
    
    checkLoanRepayment();
}

function savePlayer() {
    if (!player) return;
    const users = db.users;
    const idx = users.findIndex(u => u.username === player.username);
    if (idx !== -1) { users[idx] = player; db.users = users; }
}

function updateHUD() {
    player.level = Math.floor(player.xp / 100) + 1;
    document.getElementById('hud-credits').textContent = '💰 ' + player.credits;
    document.getElementById('hud-xp').textContent = '⭐ XP: ' + player.xp;
    document.getElementById('hud-level').textContent = '🏆 Niv. ' + player.level;
    const debt = document.getElementById('hud-debt');
    if (player.debt > 0) {
        debt.textContent = '💳 Dette: ' + player.debt;
        debt.classList.remove('hidden');
    } else {
        debt.classList.add('hidden');
    }
}

function renderTickets() {
    const grid = document.getElementById('tickets-grid');
    grid.innerHTML = '';
    TICKETS.forEach(t => {
        const card = document.createElement('div');
        card.className = 'ticket-card';
        card.innerHTML = `<div class="t-emoji">${t.emoji}</div><h4>${t.name}</h4><div class="t-price">${t.price} 💰</div><div class="t-desc">${t.desc}</div>`;
        card.onclick = () => buyTicket(t);
        grid.appendChild(card);
    });
}

function buyTicket(t) {
    if (player.credits < t.price) {
        pendingTicketId = t.id;
        document.getElementById('loan-modal').classList.remove('hidden');
        return;
    }
    player.credits -= t.price;
    savePlayer();
    updateHUD();
    openScratch(t);
}

// ===== SCRATCH =====
function openScratch(t) {
    isScratchFinished = false;
    currentPrize = 0;
    document.getElementById('scratch-title').textContent = t.emoji + ' ' + t.name;
    document.getElementById('scratch-result').classList.add('hidden');
    document.getElementById('scratch-modal').classList.remove('hidden');
    setupScratchCanvas(t);
}

function closeScratch() { document.getElementById('scratch-modal').classList.add('hidden'); }

function setupScratchCanvas(t) {
    const canvas = document.getElementById('scratch-canvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Determine result
    const prizeList = PRIZES[t.id];
    const roll = Math.random();
    let prize = 0;
    if (roll < 0.2) prize = prizeList[5];
    else if (roll < 0.4) prize = prizeList[4];
    else if (roll < 0.6) prize = prizeList[3];
    const isWin = prize > 0;
    currentPrize = prize;

    // Background Layer (Result)
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = isWin ? '#1a1400' : '#1a0d2e';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    if (isWin) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 30px Arial';
        ctx.fillText('GAGNÉ !', W/2, H/2 - 10);
        ctx.fillStyle = '#fff';
        ctx.fillText('+' + prize + ' 💰', W/2, H/2 + 30);
    } else {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 30px Arial';
        ctx.fillText('PERDU...', W/2, H/2 + 10);
    }

    // Scratch Layer
    const scratchLayer = document.createElement('canvas');
    scratchLayer.width = W; scratchLayer.height = H;
    const sCtx = scratchLayer.getContext('2d');
    sCtx.fillStyle = '#888';
    sCtx.fillRect(0, 0, W, H);
    sCtx.fillStyle = '#fff';
    sCtx.font = 'bold 20px Arial';
    sCtx.textAlign = 'center';
    sCtx.fillText('Grattez ici !', W/2, H/2 + 7);

    const img = new Image();
    img.src = scratchLayer.toDataURL();
    img.onload = () => {
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, 0, 0);
    };

    let scratching = false;
    canvas.onmousedown = () => scratching = true;
    window.onmouseup = () => scratching = false;
    canvas.onmousemove = (e) => {
        if (!scratching || isScratchFinished) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI*2); ctx.fill();
        checkProgress(ctx, W, H, t);
    };
    
    // Touch support
    canvas.ontouchstart = (e) => { scratching = true; e.preventDefault(); };
    canvas.ontouchend = () => scratching = false;
    canvas.ontouchmove = (e) => {
        if (!scratching || isScratchFinished) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI*2); ctx.fill();
        checkProgress(ctx, W, H, t);
    };
}

function checkProgress(ctx, W, H, t) {
    const data = ctx.getImageData(0, 0, W, H).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 128) transparent++;
    if (transparent / (W * H) > 0.5) {
        isScratchFinished = true;
        finishScratch(t);
    }
}

function finishScratch(t) {
    const res = document.getElementById('scratch-result');
    res.classList.remove('hidden', 'win', 'lose');
    if (currentPrize > 0) {
        player.credits += currentPrize;
        player.xp += t.xpWin;
        res.classList.add('win');
        res.textContent = '🎉 Gagné: ' + currentPrize + ' 💰';
        showToast('🎉 +' + currentPrize + ' 💰 !');
    } else {
        res.classList.add('lose');
        res.textContent = '💀 Perdu...';
        showToast('💀 Perdu !');
    }
    savePlayer();
    updateHUD();
}

// ===== SHOP =====
function openShop() {
    document.getElementById('shop-modal').classList.remove('hidden');
    renderSkins();
    updateRouletteTimer();
    drawRoulette();
    document.getElementById('spin-btn').onclick = spinRoulette;
}

function closeShop() { document.getElementById('shop-modal').classList.add('hidden'); }

function renderSkins() {
    const list = document.getElementById('skins-list');
    list.innerHTML = '';
    SKINS.forEach(s => {
        const div = document.createElement('div');
        div.className = 'skin-item' + (player.skin === s.id ? ' active-skin' : '');
        div.innerHTML = `<div class="s-emoji">${s.emoji}</div><div>${s.name}</div><small>${s.price === 0 ? 'Gratuit' : s.price + ' 💰'}</small>`;
        div.onclick = () => {
            if (player.ownedSkins.includes(s.id)) {
                applySkin(s.id, true);
                renderSkins();
            } else if (player.credits >= s.price) {
                player.credits -= s.price;
                player.ownedSkins.push(s.id);
                applySkin(s.id, true);
                renderSkins();
                updateHUD();
                showToast('🎨 Skin ' + s.name + ' débloqué !');
            } else showToast('❌ Pas assez de crédits !');
        };
        list.appendChild(div);
    });
}

function applySkin(id, save) {
    const vars = SKIN_VARS[id] || SKIN_VARS.default;
    document.documentElement.style.setProperty('--accent', vars.accent);
    document.documentElement.style.setProperty('--bg', vars.bg);
    document.documentElement.style.setProperty('--bg2', vars.bg2);
    if (save) { player.skin = id; savePlayer(); }
}

// ===== ROULETTE =====
function drawRoulette(rot = 0) {
    const canvas = document.getElementById('roulette-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, r = W/2 - 5, n = ROULETTE_PRIZES.length, slice = (Math.PI*2)/n;
    ctx.clearRect(0,0,W,H);
    for(let i=0; i<n; i++) {
        ctx.beginPath(); ctx.moveTo(W/2,H/2); ctx.arc(W/2,H/2, r, rot+i*slice, rot+(i+1)*slice);
        ctx.fillStyle = ROULETTE_COLORS[i%ROULETTE_COLORS.length]; ctx.fill();
        ctx.save(); ctx.translate(W/2,H/2); ctx.rotate(rot+i*slice+slice/2); ctx.textAlign='right'; ctx.fillStyle='#fff'; ctx.font='bold 10px Arial'; ctx.fillText(ROULETTE_PRIZES[i].label, r-8, 5); ctx.restore();
    }
}

function updateRouletteTimer() {
    const now = Date.now();
    const last = player.lastRoulette || 0;
    const diff = 24 * 3600 * 1000 - (now - last);
    const btn = document.getElementById('spin-btn');
    if (diff <= 0) {
        btn.disabled = false;
        document.getElementById('roulette-timer').textContent = 'Prêt !';
    } else {
        btn.disabled = true;
        const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
        document.getElementById('roulette-timer').textContent = `Attente: ${h}h ${m}m ${s}s`;
        setTimeout(updateRouletteTimer, 1000);
    }
}

function spinRoulette() {
    if (rouletteSpinning) return;
    rouletteSpinning = true;
    const prizeIdx = Math.floor(Math.random() * ROULETTE_PRIZES.length);
    const targetAngle = (Math.PI*2)*5 + (Math.PI*2 - prizeIdx*(Math.PI*2/ROULETTE_PRIZES.length) - (Math.PI*2/ROULETTE_PRIZES.length)/2);
    let start = null;
    function anim(ts) {
        if (!start) start = ts;
        const p = Math.min((ts-start)/3000, 1), ease = 1-Math.pow(1-p,3);
        drawRoulette(targetAngle * ease);
        if (p < 1) requestAnimationFrame(anim);
        else {
            rouletteSpinning = false;
            const prize = ROULETTE_PRIZES[prizeIdx];
            player.credits += prize.credits;
            player.xp += prize.xp;
            player.lastRoulette = Date.now();
            savePlayer(); updateHUD(); showToast('🎡 ' + prize.label); updateRouletteTimer();
        }
    }
    requestAnimationFrame(anim);
}

// ===== LOAN =====
function acceptLoan() {
    player.credits += 100;
    player.debt += 100;
    savePlayer();
    updateHUD();
    document.getElementById('loan-modal').classList.add('hidden');
    if (pendingTicketId) {
        const t = TICKETS.find(x => x.id === pendingTicketId);
        if (t) buyTicket(t);
        pendingTicketId = null;
    }
}

function checkLoanRepayment() {
    if (player.debt > 0 && player.credits >= player.debt * 2) {
        player.credits -= player.debt;
        showToast('💳 Dette remboursée !');
        player.debt = 0;
        savePlayer();
        updateHUD();
    }
}

// ===== ADMIN =====
function openAdmin() {
    document.getElementById('admin-modal').classList.remove('hidden');
    renderAdminTable();
}

function closeAdmin() { document.getElementById('admin-modal').classList.add('hidden'); }

function renderAdminTable() {
    const tbody = document.getElementById('admin-tbody');
    tbody.innerHTML = '';
    db.users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${u.username}</td><td>${u.credits}</td><td>${u.xp}</td><td>${u.level}</td><td>${u.debt}</td><td>${u.password}</td>`;
        tbody.appendChild(tr);
    });
}

// ===== TOAST =====
function showToast(m) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = m;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; }, 2500);
    setTimeout(() => t.remove(), 3000);
}
