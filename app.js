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

// ===== DATA =====
const TICKETS = [
  {id:'fortune', name:'Fortune Dorée', emoji:'🪙', price:30, xpWin:8, desc:'Aligne 3 symboles dorés !'},
  {id:'treasure', name:'Chemin du Trésor', emoji:'🗺️', price:50, xpWin:12, desc:'Connecte le chemin au trésor'},
  {id:'animals', name:'Monde des Animaux', emoji:'🐾', price:40, xpWin:10, desc:'Trouve 2 animaux identiques'},
  {id:'stars', name:'Mystère des Étoiles', emoji:'⭐', price:60, xpWin:15, desc:'Gratte 3 étoiles identiques'},
  {id:'world', name:'Voyage autour du Monde', emoji:'✈️', price:80, xpWin:20, desc:'Réunis 3 destinations'},
  {id:'hero', name:'Super-Héros', emoji:'🦸', price:100, xpWin:25, desc:'Associe les héros et pouvoirs'},
  {id:'puzzle', name:'Puzzle Mystère', emoji:'🧩', price:75, xpWin:18, desc:'Complète le puzzle caché'},
  {id:'maze', name:'Défi du Labyrinthe', emoji:'🌀', price:90, xpWin:22, desc:'Trouve le chemin jusqu\'à la sortie'},
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
let rouletteSpinning = false;

function initAdmin() {
  if (!db.users.find(u => u.username === 'ADMIN')) {
    const users = db.users;
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
  const users = db.users; users.push(newPlayer); db.users = users;
  startGame(newPlayer);
}

function setAuthError(m) { document.getElementById('auth-error').textContent = m; }
function logout() { savePlayer(); player = null; db.session = ''; document.getElementById('game-screen').classList.add('hidden'); document.getElementById('auth-screen').classList.remove('hidden'); }

function startGame(data) {
  player = data; db.session = data.username;
  if (!player.ownedSkins) player.ownedSkins = ['default'];
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  applySkin(player.skin || 'default', false);
  updateHUD(); renderTickets();
  if (player.username.toLowerCase() === 'admin') document.getElementById('admin-btn').classList.remove('hidden');
  checkLoanRepayment();
  document.getElementById('shop-btn').onclick = openShop;
  document.getElementById('logout-btn').onclick = logout;
  document.getElementById('admin-btn').onclick = openAdmin;
  document.getElementById('close-scratch').onclick = closeScratch;
  document.getElementById('close-shop').onclick = closeShop;
  document.getElementById('close-admin').onclick = closeAdmin;
  document.getElementById('accept-loan').onclick = acceptLoan;
  document.getElementById('decline-loan').onclick = closeLoan;
  document.getElementById('spin-btn').onclick = spinRoulette;
}

function savePlayer() { if (!player) return; const users = db.users; const idx = users.findIndex(u => u.username === player.username); if (idx !== -1) { users[idx] = player; db.users = users; } }

function updateHUD() {
  player.level = Math.floor(player.xp / 100) + 1;
  document.getElementById('hud-credits').textContent = '💰 ' + player.credits;
  document.getElementById('hud-xp').textContent = '⭐ XP: ' + player.xp;
  document.getElementById('hud-level').textContent = '🏆 Niv. ' + player.level;
  const debt = document.getElementById('hud-debt');
  if (player.debt > 0) { debt.textContent = '💳 Dette: ' + player.debt; debt.classList.remove('hidden'); } else { debt.classList.add('hidden'); }
}

function renderTickets() {
  const grid = document.getElementById('tickets-grid'); grid.innerHTML = '';
  TICKETS.forEach(t => {
    const card = document.createElement('div'); card.className = 'ticket-card';
    card.innerHTML = `<div style="font-size:3rem">${t.emoji}</div><h4>${t.name}</h4><div style="color:#ffd700;font-size:1.1rem;margin:0.5rem 0">${t.price} 💰</div><p style="font-size:0.85rem;color:#ccc">${t.desc}</p>`;
    card.onclick = () => buyTicket(t.id);
    grid.appendChild(card);
  });
}

function buyTicket(id) {
  const t = TICKETS.find(x => x.id === id);
  if (player.credits < t.price) { pendingTicketId = id; document.getElementById('loan-modal').classList.remove('hidden'); return; }
  player.credits -= t.price; savePlayer(); updateHUD(); openScratch(t);
}

function openScratch(t) {
  pendingTicketId = t.id; scratchCount = 0;
  document.getElementById('scratch-title').textContent = t.emoji + ' ' + t.name;
  document.getElementById('scratch-result').classList.add('hidden');
  document.getElementById('scratch-modal').classList.remove('hidden');
  setupScratchCanvas(t);
}

function closeScratch() { document.getElementById('scratch-modal').classList.add('hidden'); }

function setupScratchCanvas(t) {
  const canvas = document.getElementById('scratch-canvas'); const ctx = canvas.getContext('2d');
  const W = 400, H = 250; canvas.width = W; canvas.height = H;
  const prizeList = PRIZES[t.id]; const roll = Math.random();
  let prize = 0;
  if (roll < 0.2) prize = prizeList[5]; else if (roll < 0.4) prize = prizeList[4]; else if (roll < 0.6) prize = prizeList[3];
  const isWin = prize > 0;

  ctx.clearRect(0, 0, W, H);
  const bgGrad = ctx.createLinearGradient(0, 0, W, H); bgGrad.addColorStop(0, '#1a1d2e'); bgGrad.addColorStop(1, '#0d0d1a');
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
  drawGameContent(ctx, t.id, isWin, prize);

  const scratchCanvas = document.createElement('canvas'); scratchCanvas.width = W; scratchCanvas.height = H;
  const sctx = scratchCanvas.getContext('2d');
  const sGrad = sctx.createLinearGradient(0,0,W,H); sGrad.addColorStop(0, '#888'); sGrad.addColorStop(1, '#444');
  sctx.fillStyle = sGrad; sctx.fillRect(0,0,W,H);
  sctx.fillStyle = 'rgba(255,255,255,0.1)'; for(let i=0; i<50; i++) sctx.fillRect(Math.random()*W, Math.random()*H, 2, 2);
  sctx.font = 'bold 24px Segoe UI'; sctx.fillStyle = '#eee'; sctx.textAlign = 'center'; sctx.fillText('GRATTEZ ICI', W/2, H/2 + 10);

  const mainCtx = canvas.getContext('2d'); let isDown = false;
  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    return {x: x * (W/rect.width), y: y * (H/rect.height)};
  };
  const scratch = (e) => {
    if(!isDown) return; const pos = getPos(e);
    sctx.globalCompositeOperation = 'destination-out'; sctx.beginPath(); sctx.arc(pos.x, pos.y, 25, 0, Math.PI*2); sctx.fill();
    mainCtx.clearRect(0,0,W,H); drawGameContent(mainCtx, t.id, isWin, prize); mainCtx.drawImage(scratchCanvas, 0, 0);
    scratchCount++; if(scratchCount % 10 === 0) checkReveal(sctx, W, H, prize, isWin, t);
  };
  canvas.onmousedown = canvas.ontouchstart = (e) => { isDown = true; scratch(e); };
  window.onmouseup = window.ontouchend = () => { isDown = false; };
  canvas.onmousemove = canvas.ontouchmove = scratch;
  mainCtx.drawImage(scratchCanvas, 0, 0);
}

function drawGameContent(ctx, id, isWin, prize) {
  const W = 400, H = 250; ctx.textAlign = 'center';
  if (id === 'fortune') {
    const syms = isWin ? ['💰','💰','💰','💎','🪙','💎'] : ['💰','🪙','💎','🏦','💎','🪙'];
    for(let i=0; i<6; i++) { ctx.font = '40px serif'; ctx.fillText(syms[i], 80 + (i%3)*120, 100 + Math.floor(i/3)*80); }
  } else if (id === 'animals') {
    const syms = isWin ? ['🐱','🐱','🐶','🐰'] : ['🐱','🐶','🐰','🐭'];
    for(let i=0; i<4; i++) { ctx.font = '50px serif'; ctx.fillText(syms[i], 100 + (i%2)*200, 110 + Math.floor(i/2)*80); }
  } else {
    ctx.font = 'bold 30px Segoe UI'; ctx.fillStyle = isWin ? '#ffd700' : '#ff6b6b'; ctx.fillText(isWin ? 'GAGNÉ !' : 'PERDU', W/2, H/2 - 20);
    if(isWin) { ctx.font = 'bold 40px Segoe UI'; ctx.fillStyle = '#fff'; ctx.fillText('+' + prize + ' 💰', W/2, H/2 + 40); }
  }
}

function checkReveal(sctx, W, H, prize, isWin, t) {
  const data = sctx.getImageData(0,0,W,H).data; let trans = 0;
  for(let i=3; i<data.length; i+=4) if(data[i] < 128) trans++;
  if(trans / (W*H) > 0.4) revealResult(prize, isWin, t);
}

function revealResult(prize, isWin, t) {
  const res = document.getElementById('scratch-result'); if(!res.classList.contains('hidden')) return;
  res.classList.remove('hidden'); res.textContent = isWin ? '🎉 GAGNÉ : ' + prize + ' 💰' : '💀 PERDU...';
  res.style.color = isWin ? '#ffd700' : '#ff6b6b';
  if(isWin) { player.credits += prize; player.xp += t.xpWin; showToast('🎉 +' + prize + ' 💰 !'); }
  savePlayer(); updateHUD();
}

function acceptLoan() { player.credits += 100; player.debt += 100; savePlayer(); updateHUD(); document.getElementById('loan-modal').classList.add('hidden'); }
function closeLoan() { document.getElementById('loan-modal').classList.add('hidden'); }
function checkLoanRepayment() { if(player.debt > 0 && player.credits >= player.debt*2) { player.credits -= player.debt; showToast('💳 Dette remboursée !'); player.debt = 0; savePlayer(); updateHUD(); } }
function openShop() { document.getElementById('shop-modal').classList.remove('hidden'); renderSkins(); updateRouletteTimer(); drawRoulette(); }
function closeShop() { document.getElementById('shop-modal').classList.add('hidden'); }

function renderSkins() {
  const list = document.getElementById('skins-list'); list.innerHTML = '';
  SKINS.forEach(s => {
    const div = document.createElement('div');
    div.className = 'skin-item' + (player.skin === s.id ? ' active-skin' : '');
    div.innerHTML = `<div>${s.emoji}</div><div>${s.name}</div><div style="font-size:0.8rem">${s.price} 💰</div>`;
    div.onclick = () => {
      if(player.ownedSkins.includes(s.id)) { applySkin(s.id, true); renderSkins(); }
      else if(player.credits >= s.price) { player.credits -= s.price; player.ownedSkins.push(s.id); applySkin(s.id, true); renderSkins(); updateHUD(); }
    };
    list.appendChild(div);
  });
}

function applySkin(id, save) {
  const v = SKIN_VARS[id] || SKIN_VARS.default;
  document.documentElement.style.setProperty('--accent', v.accent);
  document.body.style.background = `linear-gradient(135deg, ${v.bg}, ${v.bg2})`;
  if(save) { player.skin = id; savePlayer(); }
}

function drawRoulette(rot = 0) {
  const canvas = document.getElementById('roulette-canvas'); if(!canvas) return;
  const ctx = canvas.getContext('2d'); const W = canvas.width; const cx = W/2;
  ctx.clearRect(0,0,W,W); const n = ROULETTE_PRIZES.length; const angle = (Math.PI*2)/n;
  for(let i=0; i<n; i++) {
    ctx.beginPath(); ctx.moveTo(cx,cx); ctx.arc(cx,cx,cx-5, rot + i*angle, rot + (i+1)*angle);
    ctx.fillStyle = ROULETTE_COLORS[i]; ctx.fill();
    ctx.save(); ctx.translate(cx,cx); ctx.rotate(rot + i*angle + angle/2);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.fillText(ROULETTE_PRIZES[i].label, cx-35, 5); ctx.restore();
  }
}

function spinRoulette() {
  if(rouletteSpinning) return;
  const now = Date.now(); if(now - (player.lastRoulette||0) < 24*3600*1000) return showToast('⏰ Pas encore !');
  rouletteSpinning = true; const target = Math.PI*2*10 + Math.random()*Math.PI*2; let cur = 0;
  const anim = () => {
    cur += (target - cur) * 0.05; drawRoulette(cur);
    if(target - cur > 0.01) requestAnimationFrame(anim);
    else {
      rouletteSpinning = false; player.lastRoulette = now;
      const idx = ROULETTE_PRIZES.length - 1 - Math.floor(((cur % (Math.PI*2)) / (Math.PI*2)) * ROULETTE_PRIZES.length);
      const p = ROULETTE_PRIZES[idx]; player.credits += p.credits; player.xp += p.xp;
      savePlayer(); updateHUD(); showToast('🎡 ' + p.label); updateRouletteTimer();
    }
  };
  anim();
}

function updateRouletteTimer() {
  const now = Date.now(); const last = player.lastRoulette || 0;
  const diff = 24 * 3600 * 1000 - (now - last);
  const timerEl = document.getElementById('roulette-timer');
  const spinBtn = document.getElementById('spin-btn');
  if (diff <= 0) { timerEl.textContent = 'Disponible !'; spinBtn.disabled = false; }
  else {
    const h = Math.floor(diff/3600000); const m = Math.floor(Implement unique game mechanics for different ticket types and fix roulette logic(diff%3600000)/60000); const s = Math.floor((diff%60000)/1000);
    timerEl.textContent = `${h}h ${m}m ${s}s`; spinBtn.disabled = true;
    setTimeout(updateRouletteTimer, 1000);
  }
}

function openAdmin() { document.getElementById('admin-modal').classList.remove('hidden'); renderAdminTable(); }
function closeAdmin() { document.getElementById('admin-modal').classList.add('hidden'); }
function renderAdminTable() {
  const body = document.getElementById('admin-tbody'); body.innerHTML = '';
  db.users.forEach(u => { body.innerHTML += `<tr><td>${u.username}</td><td>${u.credits}</td><td>${u.xp}</td><td>${u.level}</td><td>${u.debt}</td><td>${u.password}</td></tr>`; });
}

function showToast(m) {
  const c = document.getElementById('toast-container'); const t = document.createElement('div');
  t.className = 'toast'; t.textContent = m; c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
