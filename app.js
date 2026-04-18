// app.js - ScratchKing Main Application
import { createAccount, loginAccount, savePlayer, getAllPlayers, initAdmin } from "./db.js";

// ===== STATE =====
let player = null;
let pendingTicketCost = 0;
let pendingTicketId = null;

// ===== TICKETS =====
const TICKETS = [
  { id:"fortune", name:"Fortune Dorée", emoji:"💰", price:30, xpWin:8, desc:"3 lignes de symboles dorés – Aligne-les pour gagner !", type:"match3" },
  { id:"treasure", name:"Chemin du Trésor", emoji:"🗺️", price:50, xpWin:12, desc:"Connecte le chemin de la carte au trésor", type:"match3" },
  { id:"animals", name:"Monde des Animaux", emoji:"🦁", price:40, xpWin:10, desc:"Trouve 2 animaux identiques parmi les cases", type:"match3" },
  { id:"stars", name:"Mystère des Étoiles", emoji:"⭐", price:60, xpWin:15, desc:"Gratte 3 étoiles de même intensité", type:"match3" },
  { id:"world", name:"Voyage autour du Monde", emoji:"✈️", price:80, xpWin:20, desc:"Réunis 3 destinations pour une escapade complète", type:"match3" },
  { id:"hero", name:"Super-Héros", emoji:"🦸", price:100, xpWin:25, desc:"Associe les héros avec leurs pouvoirs", type:"match3" },
  { id:"puzzle", name:"Puzzle Mystère", emoji:"🧩", price:75, xpWin:18, desc:"Complète le puzzle caché sous les cases", type:"match3" },
  { id:"maze", name:"Défi du Labyrinthe", emoji:"🌀", price:90, xpWin:22, desc:"Trouve le chemin du début à la fin", type:"match3" },
  { id:"carnival", name:"Fête Foraine", emoji:"🎪", price:55, xpWin:14, desc:"Accumule 3 jeux gagnants de la fête", type:"match3" },
  { id:"cooking", name:"Cuisine Gourmande", emoji:"👨‍🍳", price:70, xpWin:17, desc:"Réunis les ingrédients pour une recette complète", type:"match3" },
];
const PRIZES = {
  classic: [0,0,0,75,125,200],
  lucky:   [0,0,0,0,300,600],
  diamond: [0,0,0,0,500,1200],
  gold:    [0,0,0,0,1200,2500,6000],
  rainbow: [0,0,150,250,400],
  mystery: [0,0,0,250,500,1000]
};

// ===== SKINS =====
const SKINS = [
  { id:"default", name:"Défaut",    price:0,    emoji:"⚪" },
  { id:"neon",    name:"Néon",      price:500,  emoji:"🟣" },
  { id:"gold",    name:"Gold",      price:1000, emoji:"🟡" },
  { id:"dark",    name:"Dark",      price:750,  emoji:"⚫" },
  { id:"fire",    name:"Fire",      price:1500, emoji:"🔴" },
];

const SKIN_VARS = {
  default: { accent:"#a259ff", bg:"#0d0d1a", bg2:"#1a0d2e" },
  neon:    { accent:"#00ffcc", bg:"#0a0f1e", bg2:"#001a15" },
  gold:    { accent:"#ffd700", bg:"#1a1400", bg2:"#2a2000" },
  dark:    { accent:"#888888", bg:"#050505", bg2:"#101010" },
  fire:    { accent:"#ff6b00", bg:"#1a0a00", bg2:"#2a1000" },
};

// ===== ROULETTE =====
const ROULETTE_PRIZES = [
  { label:"+50💰",  credits:50,  xp:0  },
  { label:"+100💰", credits:100, xp:0  },
  { label:"+XP 20", credits:0,  xp:20 },
  { label:"+200💰", credits:200, xp:0  },
  { label:"Rien",   credits:0,  xp:0  },
  { label:"+500💰", credits:500, xp:0  },
  { label:"+XP 50", credits:0,  xp:50 },
  { label:"+150💰", credits:150, xp:0  },
];

const ROULETTE_COLORS = ["#a259ff","#7c3aed","#6d28d9","#5b21b6","#4c1d95","#3730a3","#312e81","#1e1b4b"];

let rouletteSpinning = false;

// ===== INIT =====
window.addEventListener("load", async () => {
    try { await initAdmin(); } catch(e) { console.warn("initAdmin failed:", e); }
  setTimeout(() => {
    const ls = document.getElementById("loading-screen");
    ls.style.opacity = "0";
    setTimeout(() => { ls.classList.add("hidden"); show("auth-screen"); }, 600);
  }, 1800);
});

// ===== AUTH =====
window.showTab = (tab) => {
  g("form-login").classList.toggle("hidden", tab !== "login");
  g("form-register").classList.toggle("hidden", tab !== "register");
  g("tab-login").classList.toggle("active", tab === "login");
  g("tab-register").classList.toggle("active", tab === "register");
  g("auth-error").textContent = "";
};

window.handleLogin = async () => {
  const u = g("login-user").value.trim();
  const p = g("login-pass").value.trim();
  if (!u || !p) return setAuthError("Remplis tous les champs.");
  setAuthError("Connexion...");
  const res = await loginAccount(u, p);
  if (res.error) return setAuthError(res.error);
  startGame(res.data);
};

window.handleRegister = async () => {
  const u = g("reg-user").value.trim();
  const p = g("reg-pass").value.trim();
  if (!u || !p) return setAuthError("Remplis tous les champs.");
  if (u.length < 3) return setAuthError("Pseudo trop court (min 3 caractères).");
  setAuthError("Création...");
  const res = await createAccount(u, p);
  if (res.error) return setAuthError(res.error);
  startGame(res.data);
};

window.logout = async () => {
  if (player) await savePlayer(player.username, player);
  player = null;
  hide("game-screen");
  show("auth-screen");
};

function setAuthError(msg) { g("auth-error").textContent = msg; }

// ===== GAME START =====
function startGame(data) {
  player = data;
  if (!player.ownedSkins) player.ownedSkins = ["default"];
  hide("auth-screen");
  show("game-screen");
  applySkin(player.skin || "default", false);
  updateHUD();
  renderTickets();
  if (player.username.toLowerCase() === "admin") {
    g("admin-btn").classList.remove("hidden");
  }
  checkLoanRepayment();
}

function updateHUD() {
  player.level = Math.floor(player.xp / 100) + 1;
  g("hud-credits").textContent = `💰 ${player.credits}`;
  g("hud-xp").textContent = `⭐ XP: ${player.xp}`;
  g("hud-level").textContent = `🏆 Niv. ${player.level}`;
  const debtBadge = g("hud-debt");
  if (player.debt > 0) {
    debtBadge.textContent = `💳 Dette: ${player.debt}`;
    debtBadge.classList.remove("hidden");
  } else {
    debtBadge.classList.add("hidden");
  }
}

function renderTickets() {
  const grid = g("tickets-grid");
  grid.innerHTML = "";
  TICKETS.forEach(t => {
    const card = document.createElement("div");
    card.className = "ticket-card";
    card.innerHTML = `
      <div class="ticket-emoji">${t.emoji}</div>
      <h4>${t.name}</h4>
      <div class="ticket-price">${t.price} 💰</div>
      <div class="ticket-desc">${t.desc}</div>
      <button class="buy-btn" onclick="buyTicket('${t.id}')">Acheter</button>
    `;
    grid.appendChild(card);
  });
}

// ===== BUY TICKET =====
window.buyTicket = (id) => {
  const ticket = TICKETS.find(t => t.id === id);
  if (player.credits < ticket.price) {
    pendingTicketCost = ticket.price;
    pendingTicketId = id;
    show("loan-popup");
    return;
  }
  player.credits -= ticket.price;
  updateHUD();
  autoSave();
  launchScratch(ticket);
};

// ===== LOAN SYSTEM =====
window.acceptLoan = () => {
  player.credits += 100;
  player.debt = (player.debt || 0) + 100;
  hide("loan-popup");
  updateHUD();
  autoSave();
  if (player.credits >= pendingTicketCost) {
    const ticket = TICKETS.find(t => t.id === pendingTicketId);
    if (ticket) buyTicket(ticket.id);
  } else {
    setTimeout(() => show("loan-popup"), 300);
  }
};

window.closeLoan = () => { pendingTicketCost = 0; pendingTicketId = null; hide("loan-popup"); };

function checkLoanRepayment() {
  if (!player.debt || player.debt === 0) return;
  if (player.credits >= player.debt * 2) {
    const repaid = player.debt;
    player.credits -= repaid;
    player.debt = 0;
    showToast(`💳 Remboursement automatique de ${repaid} crédits !`);
    updateHUD();
    autoSave();
  }
}

// ===== SCRATCH GAME =====
function launchScratch(ticket) {
  g("scratch-title").textContent = `${ticket.emoji} ${ticket.name}`;
  g("scratch-result").className = "hidden";
  g("scratch-result").textContent = "";
  show("scratch-modal");

  const canvas = g("scratch-canvas");
  const ctx = canvas.getContext("2d");
  const wrap = canvas.parentNode;
  // Remove old overlay
  wrap.querySelectorAll(".scratch-overlay").forEach(e=>e.remove());

  const prizes = PRIZES[ticket.id];
  const isWin = Math.random() < 0.48;
  const prizePool = prizes.filter(p => p > 0);
  const prize = isWin ? prizePool[Math.floor(Math.random() * prizePool.length)] : 0;

  // Draw hidden layer
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font = "bold 26px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isWin ? "#ffd700" : "#ff6b6b";
  ctx.fillText(isWin ? `🎉 +${prize} 💰` : "😔 Perdu", canvas.width/2, canvas.height/2 - 10);
  ctx.font = "16px Segoe UI";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(isWin ? "Félicitations !" : "Meilleure chance la prochaine fois", canvas.width/2, canvas.height/2 + 20);

  // Scratch overlay
  const overlay = document.createElement("canvas");
  overlay.className = "scratch-overlay";
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  overlay.style.cssText = `position:absolute;top:0;left:0;border-radius:12px;cursor:crosshair`;
  const oCtx = overlay.getContext("2d");
  oCtx.fillStyle = "#3a3a5c";
  oCtx.fillRect(0,0,overlay.width,overlay.height);
  // Pattern on overlay
  oCtx.fillStyle = "rgba(255,255,255,0.05)";
  for(let i=0;i<20;i++) {
    oCtx.font = "14px Arial";
    oCtx.fillText("✨", Math.random()*overlay.width, Math.random()*overlay.height);
  }
  wrap.appendChild(overlay);

  let scratching = false;
  let revealed = false;
  const totalPixels = overlay.width * overlay.height;

  function scratch(x,y) {
    oCtx.globalCompositeOperation = "destination-out";
      let scratchCount = 0;
    oCtx.beginPath();
    oCtx.arc(x,y,30,0,Math.PI*2);
    oCtx.fill();
    // Redraw base + overlay on main canvas
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.font = "bold 26px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isWin ? "#ffd700" : "#ff6b6b";
    ctx.fillText(isWin ? `🎉 +${prize} 💰` : "😔 Perdu", canvas.width/2, canvas.height/2 - 10);
    ctx.font = "16px Segoe UI";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(isWin ? "Félicitations !" : "Meilleure chance la prochaine fois", canvas.width/2, canvas.height/2 + 20);
    ctx.drawImage(overlay,0,0);
    if (!revealed) {
            scratchCount++;
      if (scratchCount > 50) {
        revealed = true;
        overlay.remove();
        showResult(isWin, prize, ticket);
      }
      }
    }
  }

  overlay.addEventListener("mousedown", e=>{ scratching=true; scratch(e.offsetX,e.offsetY); });
  overlay.addEventListener("mousemove", e=>{ if(scratching) scratch(e.offsetX,e.offsetY); });
  overlay.addEventListener("mouseup", ()=>scratching=false);
  overlay.addEventListener("mouseleave", ()=>scratching=false);
  overlay.addEventListener("touchstart", e=>{ scratching=true; const r=overlay.getBoundingClientRect(); scratch(e.touches[0].clientX-r.left, e.touches[0].clientY-r.top); },{passive:true});
  overlay.addEventListener("touchmove", e=>{ if(scratching){const r=overlay.getBoundingClientRect(); scratch(e.touches[0].clientX-r.left, e.touches[0].clientY-r.top);}},{passive:true});
  overlay.addEventListener("touchend", ()=>scratching=false);
}

function showResult(isWin, prize, ticket) {
  const el = g("scratch-result");
  el.className = isWin ? "win" : "lose";
  el.textContent = isWin ? `🎉 +${prize} crédits gagnés !` : "😔 Pas de chance cette fois...";
  el.classList.remove("hidden");
  if (isWin) { player.credits += prize; player.xp += ticket.xpWin * 2; spawnConfetti(); }
  else { player.xp += ticket.xpWin; }
  checkLoanRepayment();
  updateHUD();
  autoSave();
}

window.closeScratch = () => {
  hide("scratch-modal");
  document.querySelectorAll(".scratch-overlay").forEach(e=>e.remove());
};

// ===== SHOP =====
window.openShop = () => {
  renderSkins();
  drawRouletteStatic();
  updateRouletteTimer();
  show("shop-modal");
};
window.closeShop = () => hide("shop-modal");

function renderSkins() {
  const list = g("skins-list");
  list.innerHTML = "";
  SKINS.forEach(s => {
    const div = document.createElement("div");
    const owned = s.price===0 || (player.ownedSkins||[]).includes(s.id);
    const isActive = player.skin === s.id;
    div.className = "skin-item" + (owned ? " owned" : "");
    div.innerHTML = `<div style="font-size:1.8rem">${s.emoji}</div><div>${s.name}</div><div class="skin-price">${owned ? (isActive ? "✔️ Actif" : "✅ Possédé") : s.price+" 💰"}</div>`;
    if (!owned) div.onclick = () => buySkin(s);
    else div.onclick = () => { applySkin(s.id, true); renderSkins(); };
    list.appendChild(div);
  });
}

function buySkin(skin) {
  if (player.credits < skin.price) return showToast("🚫 Pas assez de crédits !");
  player.credits -= skin.price;
  player.ownedSkins = [...(player.ownedSkins||[]), skin.id];
  applySkin(skin.id, true);
  renderSkins();
  updateHUD();
  autoSave();
}

function applySkin(skinId, notify) {
  const s = SKIN_VARS[skinId] || SKIN_VARS.default;
  document.documentElement.style.setProperty("--accent", s.accent);
  document.body.style.background = `linear-gradient(135deg,${s.bg},${s.bg2})`;
  player.skin = skinId;
  if (notify) showToast(`🎨 Skin appliqué !`);
}

// ===== ROULETTE =====
function drawRouletteStatic(rotationAngle) {
  const canvas = g("roulette-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const n = ROULETTE_PRIZES.length;
  const arc = (Math.PI*2)/n;
  const angle = rotationAngle || 0;
  ctx.clearRect(0,0,300,300);
  ctx.save();
  ctx.translate(150,150);
  ctx.rotate(angle);
  for(let i=0;i<n;i++) {
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,140,i*arc-Math.PI/2,(i+1)*arc-Math.PI/2);
    ctx.closePath();
    ctx.fillStyle = ROULETTE_COLORS[i%ROULETTE_COLORS.length];
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.rotate((i+0.5)*arc-Math.PI/2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px Segoe UI";
    ctx.textAlign = "right";
    ctx.fillText(ROULETTE_PRIZES[i].label, 128, 4);
    ctx.restore();
  }
  ctx.restore();
}

window.spinRoulette = () => {
  if (rouletteSpinning) return;
  const now = Date.now();
  if (player.lastRoulette && now - player.lastRoulette < 24*60*60*1000) {
    return showToast(`⏳ Roulette dispo dans ${nextRouletteTime(player.lastRoulette)}`);
  }
  rouletteSpinning = true;
  g("spin-btn").disabled = true;
  const prizeIndex = Math.floor(Math.random() * ROULETTE_PRIZES.length);
  const totalRotation = 360*6 + (prizeIndex/ROULETTE_PRIZES.length)*360;
  const duration = 4000;
  const startTime = performance.now();
  const startAngle = 0;
  function animate(now2) {
    const elapsed = now2 - startTime;
    const progress = Math.min(elapsed/duration, 1);
    const ease = 1 - Math.pow(1-progress, 4);
    const angle = ease * totalRotation * Math.PI / 180;
    drawRouletteStatic(angle);
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      rouletteSpinning = false;
      g("spin-btn").disabled = false;
      const prize = ROULETTE_PRIZES[prizeIndex];
      player.credits += prize.credits;
      player.xp += prize.xp;
      player.lastRoulette = Date.now();
      updateHUD();
      autoSave();
      showToast(`🍡 Roulette : ${prize.label} !`);
      updateRouletteTimer();
      if (prize.credits > 0 || prize.xp > 0) spawnConfetti();
    }
  }
  requestAnimationFrame(animate);
};

function nextRouletteTime(last) {
  const diff = 24*60*60*1000 - (Date.now()-last);
  const h = Math.floor(diff/3600000);
  const m = Math.floor((diff%3600000)/60000);
  return `${h}h ${m}min`;
}

function updateRouletteTimer() {
  const el = g("roulette-timer");
  if (!el) return;
  if (player.lastRoulette && Date.now()-player.lastRoulette < 24*60*60*1000) {
    el.textContent = `⏳ Prochaine roulette dans ${nextRouletteTime(player.lastRoulette)}`;
    g("spin-btn").disabled = true;
  } else {
    el.textContent = "✅ Roulette disponible !";
    g("spin-btn").disabled = false;
  }
}

// ===== ADMIN =====
window.openAdmin = async () => {
  const players = await getAllPlayers();
  const tbody = g("admin-tbody");
  tbody.innerHTML = "";
  players.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.username}</td><td>${p.credits}</td><td>${p.xp}</td><td>${p.level||1}</td><td>${p.debt||0}</td><td>${p.password}</td>`;
    tbody.appendChild(tr);
  });
  show("admin-modal");
};
window.closeAdmin = () => hide("admin-modal");

// ===== CONFETTI =====
const confettiStyle = document.createElement("style");
confettiStyle.textContent = "@keyframes fall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}";
document.head.appendChild(confettiStyle);

function spawnConfetti() {
  for (let i=0;i<80;i++) {
    const dot = document.createElement("div");
    const colors = ["#ffd700","#a259ff","#ff6b6b","#4ade80","#60a5fa","#f97316"];
    dot.style.cssText = `position:fixed;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:${Math.random()>.5?'50%':'2px'};background:${colors[Math.floor(Math.random()*colors.length)]};left:${Math.random()*100}vw;top:-20px;z-index:9999;pointer-events:none;animation:fall ${1+Math.random()*2}s linear ${Math.random()*0.5}s forwards`;
    document.body.appendChild(dot);
    setTimeout(()=>dot.remove(),3500);
  }
}

// ===== TOAST =====
function showToast(msg) {
  const container = g("toast-container");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(()=>{ t.style.opacity="0"; setTimeout(()=>t.remove(),300); }, 2800);
}

// ===== UTILS =====
function g(id) { return document.getElementById(id); }
function show(id) { g(id).classList.remove("hidden"); }
function hide(id) { g(id).classList.add("hidden"); }
async function autoSave() { if(player) await savePlayer(player.username, player); }
