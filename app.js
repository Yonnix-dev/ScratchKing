/**
 * WAVE RUNNER - Core Engine v2
 */

// === DB & SESSION ===
const db = {
  get users() { return JSON.parse(localStorage.getItem('wr_users')) || []; },
  set users(v) { localStorage.setItem('wr_users', JSON.stringify(v)); },
  get session() { return localStorage.getItem('wr_session'); },
  set session(v) { localStorage.setItem('wr_session', v || ''); }
};

// === CONSTANTS ===
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const INITIAL_SPEED = 6;
const SPEED_INC = 0.0008;

// === STATE ===
let player = null;
let gameState = 'loading';
let score = 0;
let distance = 0;
let gameSpeed = INITIAL_SPEED;
let obstacles = [];
let particles = [];
let animationId = null;
let lastSpawnTime = 0;
let lastFrameTime = 0;

// === ELEMENTS ===
const elements = {
  loading: document.getElementById('loading-screen'),
  auth: document.getElementById('auth-screen'),
  menu: document.getElementById('menu-screen'),
  game: document.getElementById('game-screen'),
  canvas: document.getElementById('game-canvas'),
  ctx: document.getElementById('game-canvas').getContext('2d'),
  modals: {
    shop: document.getElementById('shop-modal'),
    leaderboard: document.getElementById('leaderboard-modal'),
    gameover: document.getElementById('gameover-modal'),
    levelup: document.getElementById('levelup-modal')
  },
  stats: {
    coins: document.querySelectorAll('.coins-value'),
    level: document.querySelectorAll('.level-value'),
    xp: document.querySelectorAll('.xp-fill'),
    username: document.querySelector('.username-display')
  }
};

// === CORE FUNCTIONS ===
function savePlayer() {
  if (!player) return;
  const users = db.users;
  const idx = users.findIndex(u => u.username === player.username);
  if (idx !== -1) {
    users[idx] = player;
    db.users = users;
  }
}

function updateUI() {
  if (!player) return;
  elements.stats.coins.forEach(el => el.textContent = Math.floor(player.coins));
  elements.stats.level.forEach(el => el.textContent = player.level);
  if (elements.stats.username) elements.stats.username.textContent = player.username;
  
  const nextXP = player.level * 100;
  elements.stats.xp.forEach(el => el.style.width = `${(player.xp / nextXP) * 100}%`);
}

// === GAME OBJECTS ===
class WavePlayer {
  constructor(username) {
    this.username = username;
    this.x = 100;
    this.y = 300;
    this.width = 45;
    this.height = 45;
    this.dy = 0;
    this.jumpCount = 0;
    this.maxJumps = 2;
    this.angle = 0;
    
    // Stats
    this.level = 1;
    this.xp = 0;
    this.coins = 0;
    this.highscore = 0;
    this.activeSkin = 'default';
    this.ownedSkins = ['default'];
    this.upgrades = { jump: 0, speed: 0, coins: 0 };
  }

  update() {
    this.dy += GRAVITY;
    this.y += this.dy;

    const groundY = CANVAS_HEIGHT - 60;
    if (this.y + this.height > groundY) {
      this.y = groundY - this.height;
      this.dy = 0;
      this.jumpCount = 0;
      this.angle = 0;
    } else {
      this.angle += 0.15;
    }
  }

  draw() {
    const { ctx } = elements;
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.angle);
    
    // Body
    ctx.fillStyle = '#3498db';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(52, 152, 219, 0.5)';
    ctx.beginPath();
    ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height, 12);
    ctx.fill();
    
    // Glow effect
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Face
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(12, -8, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  jump() {
    if (this.jumpCount < this.maxJumps) {
      this.dy = JUMP_FORCE;
      this.jumpCount++;
      createParticles(this.x, this.y + this.height, '#fff', 8);
    }
  }
}

class Obstacle {
  constructor() {
    const types = ['spike', 'block', 'wall'];
    this.type = types[Math.floor(Math.random() * types.length)];
    this.width = 40 + Math.random() * 30;
    this.height = this.type === 'wall' ? 120 : 50 + Math.random() * 40;
    this.x = CANVAS_WIDTH + 100;
    this.y = CANVAS_HEIGHT - 60 - this.height;
    this.color = '#ff4757';
  }

  update() {
    this.x -= gameSpeed;
  }

  draw() {
    const { ctx } = elements;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255, 71, 87, 0.4)';
    ctx.beginPath();
    if (this.type === 'spike') {
      ctx.moveTo(this.x, this.y + this.height);
      ctx.lineTo(this.x + this.width/2, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
    } else {
      ctx.roundRect(this.x, this.y, this.width, this.height, 8);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function createParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      dx: (Math.random() - 0.5) * 8,
      dy: (Math.random() - 0.5) * 8,
      size: Math.random() * 4 + 2,
      life: 1.0,
      color
    });
  }
}

// === ENGINE ===
function spawnObstacle() {
  const now = Date.now();
  const minInterval = 1500 / (gameSpeed / 6);
  if (now - lastSpawnTime > minInterval + Math.random() * 1000) {
    obstacles.push(new Obstacle());
    lastSpawnTime = now;
  }
}

function checkCollision(p, o) {
  const padding = 5;
  return p.x + padding < o.x + o.width - padding &&
         p.x + p.width - padding > o.x + padding &&
         p.y + padding < o.y + o.height - padding &&
         p.y + p.height - padding > o.y + padding;
}

function gameOver() {
  gameState = 'gameover';
  createParticles(player.x, player.y, '#3498db', 20);
  
  // Stats
  const earnedCoins = Math.floor(score / 8);
  const earnedXP = Math.floor(score / 4);
  player.coins += earnedCoins;
  player.xp += earnedXP;
  if (score > player.highscore) player.highscore = score;
  
  // Level Up
  const nextXP = player.level * 100;
  if (player.xp >= nextXP) {
    player.level++;
    player.xp -= nextXP;
    showLevelUp();
  }
  
  savePlayer();
  updateUI();
  
  document.getElementById('final-score').textContent = score;
  document.getElementById('final-distance').textContent = Math.floor(distance) + 'm';
  elements.modals.gameover.classList.remove('hidden');
}

function showLevelUp() {
  elements.modals.levelup.classList.remove('hidden');
  setTimeout(() => elements.modals.levelup.classList.add('hidden'), 3000);
}

function gameLoop(timestamp) {
  if (gameState !== 'playing') return;
  
  const { ctx } = elements;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Background Decoration
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  for(let i=0; i<5; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 100 + i*80);
    ctx.lineTo(CANVAS_WIDTH, 120 + i*80);
    ctx.stroke();
  }

  player.update();
  player.draw();
  
  spawnObstacle();
  
  obstacles.forEach((obs, idx) => {
    obs.update();
    obs.draw();
    if (checkCollision(player, obs)) gameOver();
    if (obs.x + obs.width < 0) {
      obstacles.splice(idx, 1);
      score += 10;
      document.getElementById('score-value').textContent = score;
    }
  });
  
  particles.forEach((p, idx) => {
    p.x += p.dx;
    p.y += p.dy;
    p.life -= 0.025;
    if (p.life <= 0) particles.splice(idx, 1);
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  });

  distance += gameSpeed / 60;
  document.getElementById('distance-value').textContent = Math.floor(distance);
  gameSpeed += SPEED_INC;
  
  animationId = requestAnimationFrame(gameLoop);
}

// === AUTH & UI ===
function login(u) {
  const users = db.users;
  const user = users.find(x => x.username === u);
  if (user) {
    player = Object.assign(new WavePlayer(u), user);
    db.session = u;
    showScreen('menu');
  } else {
    alert('Utilisateur inconnu');
  }
}

function register(u) {
  if (!u || u.length < 3) return alert('Nom trop court');
  const users = db.users;
  if (users.find(x => x.username === u)) return alert('Nom déjà pris');
  
  const newPlayer = new WavePlayer(u);
  users.push(newPlayer);
  db.users = users;
  login(u);
}

function showScreen(screenId) {
  Object.values(elements).forEach(el => {
    if (el && el.classList && el.classList.contains('screen')) {
      el.classList.add('hidden');
    }
  });
  elements[screenId].classList.remove('hidden');
  updateUI();
}

function startGame() {
  showScreen('game');
  elements.modals.gameover.classList.add('hidden');
  
  gameState = 'playing';
  score = 0;
  distance = 0;
  gameSpeed = INITIAL_SPEED;
  obstacles = [];
  particles = [];
  
  player.y = 300;
  player.dy = 0;
  
  requestAnimationFrame(gameLoop);
}

// === EVENTS ===
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    if (gameState === 'playing') player.jump();
    if (gameState === 'menu') startGame();
  }
});

elements.canvas.addEventListener('mousedown', () => {
  if (gameState === 'playing') player.jump();
});

// Auth
document.getElementById('login-btn').onclick = () => login(document.getElementById('username').value);
document.getElementById('register-btn').onclick = () => register(document.getElementById('reg-username').value);

document.getElementById('tab-register').onclick = () => {
  document.getElementById('form-login').classList.add('hidden');
  document.getElementById('form-register').classList.remove('hidden');
  document.getElementById('tab-register').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
};

document.getElementById('tab-login').onclick = () => {
  document.getElementById('form-register').classList.add('hidden');
  document.getElementById('form-login').classList.remove('hidden');
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-register').classList.remove('active');
};

// Menu
document.getElementById('start-game').onclick = startGame;
document.getElementById('restart-btn').onclick = startGame;
document.getElementById('back-menu-btn').onclick = () => {
  elements.modals.gameover.classList.add('hidden');
  showScreen('menu');
};

// Modals
document.getElementById('open-shop').onclick = () => elements.modals.shop.classList.remove('hidden');
document.getElementById('open-leaderboard').onclick = () => {
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = db.users
    .sort((a,b) => b.highscore - a.highscore)
    .slice(0, 10)
    .map((u, i) => `<li><span class="rank">${i+1}</span> <span class="name">${u.username}</span> <span class="pts">${u.highscore} pts</span></li>`)
    .join('');
  elements.modals.leaderboard.classList.remove('hidden');
};

document.querySelectorAll('.close-modal').forEach(btn => {
  btn.onclick = () => {
    elements.modals.shop.classList.add('hidden');
    elements.modals.leaderboard.classList.add('hidden');
  };
});

// Boot
setTimeout(() => {
  elements.loading.classList.add('hidden');
  const session = db.session;
  if (session) login(session);
  else showScreen('auth');
}, 1500);
