// ===== DATABASE (localStorage) =====
const db = {
  get users() { return JSON.parse(localStorage.getItem('sk_users') || '[]'); },
  set users(v) { localStorage.setItem('sk_users', JSON.stringify(v)); },
  get session() { return localStorage.getItem('sk_session'); },
  set session(v) { localStorage.setItem('sk_session', v || ''); }
};

// ===== STATE =====
let player = null;
let pendingTicketCost = 0;
let pendingTicketId = null;
let scratchCount = 0;
let isScratchingActive = false;
let scratchCanAward = false;

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
  fortune:[0,0,0,40,60,80],
  treasure:[0,0,0,70,100,130],
  animals:[0,0,0,50,80,100],
  stars:[0,0,0,80,120,160],
  world:[0,0,0,110,160,200],
  hero:[0,0,0,140,200,250],
  puzzle:[0,0,0,100,150,180],
  maze:[0,0,0,120,180,220],
  carnival:[0,0,0,75,110,140],
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
  default: {accent:'#a259ff', bg:'#0d0d1a', bg2:'#1a1d2e'},
  neon: {accent:'#00ffcc', bg:'#0a0f1e', bg2:'#001a15'},
  gold: {accent:'#ffd700', bg:'#1a1400', bg2:'#2a2000'},
  dark: {accent:'#888888', bg:'#050505', bg2:'#101010'},
  fire: {accent:'#ff6b00', bg:'#1a0a00', bg2:'#2a1000'}
};

const ROULETTE_PRIZES = [
  {label:'+50💰', credits:50, xp:0},
  {label:'+100💰', credits:100, xp:0},
  {label:'+XP 20', credits:0, xp:20},
  {label:'+200💰', credits:200, xp:0},
  {label:'Rien', credits:0, xp:0},
  {label:'+500💰', credits:500, xp:0},
  {label:'+XP 50', credits:0, xp:50},
  {label:'+150💰', credits:150, xp:0}
];

const ROULETTE_COLORS = ['#a259ff','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#3730a3','#312e81','#1e1b4b'];
let rouletteSpinning = false;

// ===== INIT =====
function initAdmin() {
  const users = db.users;
  if (!users.find(u => u.username === 'ADMIN')) {
    users.push({username:'ADMIN',password:'135975',credits:9999,xp:0,level:1,debt:0,lastRoulette:0,skin:'default',ownedSkins:['default']});
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
  document.getElementById('tab-login').onclick = () => showTab('login');
  document.getElementById('tab-register').onclick = () => showTab('register');
  document.getElementById('btn-login').onclick = handleLogin;
  document.getElementById('btn-register').onclick = handleRegister;
}

function showTab(t) {
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
  const newPlayer = {username:u,password:p,credits:500,xp:0,level:1,debt:0,lastRoulette:0,skin:'default',ownedSkins:['default']};
  const users = db.users;
  users.push(newPlayer);
  db.users = users;
  startGame(newPlayer);
}

function setAuthError(m) {
  document.getElementById('auth-error').textContent = m;
}

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
  checkLoanRepayment();
  document.getElementById('shop-btn').onclick = openShop;
  document.getElementById('logout-btn').onclick = logout;
  document.getElementById('admin-btn').onclick = openAdmin;
  document.getElementById('close-scratch').onclick = closeScratch;
  document.getElementById('close-shop').onclick = closeShop;
  document.getElementById('close-admin').onclick = closeAdmin;
  document.getElementById('accept-loan').onclick = acceptLoan;
  document.getElementById('decline-loan').onclick = closeLoan;
}

function savePlayer() {
  if (!player) return;
  const users = db.users;
  const idx = users.findIndex(u => u.username === player.username);
  if (idx !== -1) {
    users[idx] = player;
    db.users = users;
  }
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
    card.innerHTML = `
      <div class="t-emoji">${t.emoji}</div>
      <h4>${t.name}</h4>
      <p class="ticket-price">${t.price} 💰</p>
      <p class="ticket-desc">${t.desc}</p>
    `;
    card.onclick = () => buyTicket(t.id);
    grid.appendChild(card);
  });
}

function buyTicket(id) {
  const t = TICKETS.find(x => x.id === id);
  if (player.credits < t.price) {
    pendingTicketCost = t.price;
    pendingTicketId = id;
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
  pendingTicketId = t.id;
  scratchCount = 0;
  scratchCanAward = true;
  document.getElementById('scratch-title').textContent = t.emoji + ' ' + t.name;
  document.getElementById('scratch-result').classList.add('hidden');
  document.getElementById('scratch-modal').classList.remove('hidden');
  setupScratchCanvas(t);
}

function closeScratch() {
  document.getElementById('scratch-modal').classList.add('hidden');
}

function setupScratchCanvas(t) {
  const canvas = document.getElementById('scratch-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width = 400;
  const H = canvas.height = 250;
  
  // Determine result
  const prizeList = PRIZES[t.id];
  const roll = Math.random();
  let prize = 0;
  if (roll < 0.2) prize = prizeList[5];
  else if (roll < 0.4) prize = prizeList[4];
  else if (roll < 0.6) prize = prizeList[3];
  else prize = 0;
  const isWin = prize > 0;

  // Draw reward layer (underneath)
  ctx.clearRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  if (isWin) {
    grad.addColorStop(0, '#1a1400');
    grad.addColorStop(1, '#2a2000');
  } else {
    grad.addColorStop(0, '#1a0d2e');
    grad.addColorStop(1, '#0d0d1a');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  if (isWin) {
    ctx.font = 'bold 36px Segoe UI';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('🎉 GAGNE !', W/2, H/2 - 15);
    ctx.font = 'bold 28px Segoe UI';
    ctx.fillStyle = '#fff';
    ctx.fillText('+' + prize + ' 💰', W/2, H/2 + 30);
  } else {
    ctx.font = 'bold 32px Segoe UI';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText('💀 Perdu...', W/2, H/2 - 10);
    ctx.font = '18px Segoe UI';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Mieux la prochaine fois !', W/2, H/2 + 30);
  }

  // Cover with grey layer
  const cover = document.createElement('canvas');
  cover.width = W; cover.height = H;
  const cctx = cover.getContext('2d');
  const sGrad = cctx.createLinearGradient(0,0,W,H);
  sGrad.addColorStop(0, '#888'); sGrad.addColorStop(1, '#666');
  cctx.fillStyle = sGrad;
  cctx.fillRect(0,0,W,H);
  cctx.fillStyle = 'rgba(255,255,255,0.1)';
  cctx.font = 'bold 20px Segoe UI';
  cctx.textAlign = 'center';
  cctx.fillText('GRATTEZ ICI', W/2, H/2);

  const coverImg = new Image();
  coverImg.src = cover.toDataURL();
  coverImg.onload = () => {
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(coverImg, 0, 0);
  };

  let isDragging = false;
  const totalPixels = W * H;

  function scratch(x, y) {
    if (!scratchCanAward) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    scratchCount++;
    if (scratchCount % 20 === 0) {
      const data = ctx.getImageData(0,0,W,H).data;
      let trans = 0;
      for (let i = 3; i < data.length; i += 4) { if (data[i] < 50) trans++; }
      if (trans / totalPixels > 0.45) {
        scratchCanAward = false;
        revealResult(prize, isWin, t);
      }
    }
  }

  canvas.onmousedown = () => isDragging = true;
  canvas.onmouseup = () => isDragging = false;
  canvas.onmousemove = (e) => {
    if (!isDragging) return;
    const r = canvas.getBoundingClientRect();
    scratch(e.clientX - r.left, e.clientY - r.top);
  };
  canvas.ontouchstart = (e) => { isDragging = true; e.preventDefault(); };
  canvas.ontouchend = () => isDragging = false;
  canvas.ontouchmove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    scratch(t.clientX - r.left, t.clientY - r.top);
  };
}

function revealResult(prize, isWin, t) {
  const resultDiv = document.getElementById('scratch-result');
  resultDiv.classList.remove('hidden');
  if (isWin) {
    player.credits += prize;
    player.xp += t.xpWin;
    resultDiv.textContent = '🎉 Gagné: ' + prize + ' 💰';
    resultDiv.style.color = '#ffd700';
    showToast('🎉 +' + prize + ' 💰 !');
  } else {
    resultDiv.textContent = '💀 Perdu...';
    resultDiv.style.color = '#ff6b6b';
    showToast('💀 Perdu !');
  }
  savePlayer();
  updateHUD();
}

// ===== LOAN =====
function acceptLoan() {
  player.credits += 100;
  player.debt += 100;
  savePlayer();
  updateHUD();
  document.getElementById('loan-modal').classList.add('hidden');
  if (pendingTicketId) buyTicket(pendingTicketId);
}
function closeLoan() { document.getElementById('loan-modal').classList.add('hidden'); pendingTicketId = null; }
function checkLoanRepayment() {
  if (player.debt > 0 && player.credits >= player.debt * 2) {
    player.credits -= player.debt;
    showToast('💳 Dette remboursée !');
    player.debt = 0;
    savePlayer();
    updateHUD();
  }
}

// ===== SHOP =====
function openShop() { document.getElementById('shop-modal').classList.remove('hidden'); renderSkins(); updateRouletteTimer(); drawRoulette(); }
function closeShop() { document.getElementById('shop-modal').classList.add('hidden'); }
function renderSkins() {
  const list = document.getElementById('skins-list');
  list.innerHTML = '';
  SKINS.forEach(s => {
    const div = document.createElement('div');
    div.style = 'background:var(--glass); border:1px solid var(--glass-border); border-radius:12px; padding:1rem; text-align:center; cursor:pointer;';
    if (player.skin === s.id) div.style.borderColor = 'var(--accent)';
    div.innerHTML = `<span>${s.emoji}</span><br><b>${s.name}</b><br>${s.price === 0 ? 'Gratuit' : s.price + ' 💰'}`;
    div.onclick = () => {
      if (player.ownedSkins.includes(s.id)) { applySkin(s.id, true); renderSkins(); }
      else if (player.credits >= s.price) {
        player.credits -= s.price; player.ownedSkins.push(s.id); applySkin(s.id, true); renderSkins(); updateHUD(); showToast('🎨 Skin débloqué !');
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
  if(!canvas) return;
  const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, r = W/2 - 5, n = ROULETTE_PRIZES.length, slice = (Math.PI*2)/n;
  ctx.clearRect(0,0,W,H);
  for(let i=0; i<n; i++) {
    ctx.beginPath(); ctx.moveTo(W/2,H/2); ctx.arc(W/2,H/2, r, rot+i*slice, rot+(i+1)*slice);
    ctx.fillStyle = ROULETTE_COLORS[i%ROULETTE_COLORS.length]; ctx.fill();
    ctx.save(); ctx.translate(W/2,H/2); ctx.rotate(rot+i*slice+slice/2); ctx.textAlign='right'; ctx.fillStyle='#fff'; ctx.font='bold 12px Arial'; ctx.fillText(ROULETTE_PRIZES[i].label, r-10, 5); ctx.restore();
  }
  document.getElementById('spin-btn').onclick = spinRoulette;
}
function updateRouletteTimer() {
  const diff = 24*3600*1000 - (Date.now() - (player.lastRoulette||0));
  const btn = document.getElementById('spin-btn');
  if(diff <= 0) { btn.disabled = false; document.getElementById('roulette-timer').textContent = 'Prêt !'; }
  else {
    btn.disabled = true;
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
    document.getElementById('roulette-timer').textContent = `${h}h ${m}m ${s}s`;
    setTimeout(updateRouletteTimer, 1000);
  }
}
function spinRoulette() {
  if(rouletteSpinning) return;
  rouletteSpinning = true;
  const target = Math.floor(Math.random()*ROULETTE_PRIZES.length);
  const totalRot = (Math.PI*2)*5 + (Math.PI*2 - target*((Math.PI*2)/ROULETTE_PRIZES.length) - ((Math.PI*2)/ROULETTE_PRIZES.length)/2);
  let start = null;
  function anim(t) {
    if(!start) start = t;
    const p = Math.min((t-start)/3000, 1), ease = 1-Math.pow(1-p,3);
    drawRoulette(totalRot*ease);
    if(p<1) requestAnimationFrame(anim);
    else {
      rouletteSpinning = false; const prize = ROULETTE_PRIZES[target];
      player.credits += prize.credits; player.xp += prize.xp; player.lastRoulette = Date.now();
      savePlayer(); updateHUD(); showToast('🎡 ' + prize.label); updateRouletteTimer();
    }
  }
  requestAnimationFrame(anim);
}

// ===== ADMIN =====
function openAdmin() { document.getElementById('admin-modal').classList.remove('hidden'); renderAdminTable(); }
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
  t.style = 'background:rgba(0,0,0,0.8); color:#fff; padding:0.8rem 1.5rem; border-radius:10px; margin-top:0.5rem; backdrop-filter:blur(5px); border:1px solid var(--glass-border); animation:slideIn 0.3s forwards;';
  t.textContent = m;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}
