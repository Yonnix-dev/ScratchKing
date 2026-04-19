/**
 * WAVE RUNNER - Full Game Logic
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
const INITIAL_SPEED = 5;
const SPEED_INC = 0.0005;

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
  game: document.getElementById('game-container'),
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
    xp: document.querySelectorAll('.xp-fill')
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
  const nextXP = player.level * 100;
  elements.stats.xp.forEach(el => el.style.width = `${(player.xp / nextXP) * 100}%`);
}

// === GAME OBJECTS ===
class WavePlayer {
  constructor(username) {
    this.username = username;
    this.x = 100;
    this.y = 300;
    this.width = 50;
    this.height = 50;
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
    this.activeTheme = 'classic';
    this.ownedSkins = ['default'];
    this.ownedThemes = ['classic'];
    this.upgrades = { jump: 0, speed: 0, coins: 0 };
  }

  update() {
    this.dy += GRAVITY;
    this.y += this.dy;

    if (this.y + this.height > CANVAS_HEIGHT - 50) {
      this.y = CANVAS_HEIGHT - 50 - this.height;
      this.dy = 0;
      this.jumpCount = 0;
      this.angle = 0;
    } else {
      this.angle += 0.1;
    }
  }

  draw() {
    const { ctx } = elements;
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.angle);
    
    // Draw Skin
    ctx.fillStyle = this.activeSkin === 'gold' ? '#f1c40f' : '#3498db';
    ctx.beginPath();
    ctx.roundRect(-this.width/2, -this.height/2, this.width, this.height, 10);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(10, -10, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  jump() {
    if (this.jumpCount < this.maxJumps) {
      this.dy = JUMP_FORCE;
      this.jumpCount++;
      createParticles(this.x, this.y + this.height, '#fff', 5);
    }
  }
}

class Obstacle {
  constructor() {
    this.width = 40 + Math.random() * 40;
    this.height = 40 + Math.random() * 80;
    this.x = CANVAS_WIDTH;
    this.y = CANVAS_HEIGHT - 50 - this.height;
    this.color = '#e74c3c';
  }

  update() {
    this.x -= gameSpeed;
  }

  draw() {
    const { ctx } = elements;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.stroke();
  }
}

function createParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      dx: (Math.random() - 0.5) * 10,
      dy: (Math.random() - 0.5) * 10,
      size: Math.random() * 5 + 2,
      life: 1.0,
      color
    });
  }
}

// === ENGINE ===
function spawnObstacle() {
  const now = Date.now();
  if (now - lastSpawnTime > 2000 / (gameSpeed / 5)) {
    obstacles.push(new Obstacle());
    lastSpawnTime = now;
  }
}

function checkCollision(p, o) {
  return p.x < o.x + o.width &&
         p.x + p.width > o.x &&
         p.y < o.y + o.height &&
         p.y + p.height > o.y;
}

function gameOver() {
  gameState = 'gameover';
  cancelAnimationFrame(animationId);
  
  // Save Stats
  const earnedCoins = Math.floor(score / 10);
  const earnedXP = Math.floor(score / 5);
  player.coins += earnedCoins;
  player.xp += earnedXP;
  if (score > player.highscore) player.highscore = score;
  
  // Level Up Check
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
  elements.modals.gameover.classList.add('active');
}

function showLevelUp() {
  elements.modals.levelup.classList.add('active');
  setTimeout(() => elements.modals.levelup.classList.remove('active'), 3000);
}

function gameLoop(timestamp) {
  if (gameState !== 'playing') return;
  
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  
  const { ctx } = elements;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Draw Background Waves (Simple)
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT - 40 - i * 10);
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 40 - i * 10);
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
    p.life -= 0.02;
    if (p.life <= 0) particles.splice(idx, 1);
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  });

  distance += gameSpeed / 60;
  document.getElementById('distance-value').textContent = Math.floor(distance) + 'm';
  gameSpeed += SPEED_INC;
  
  animationId = requestAnimationFrame(gameLoop);
}

// === AUTH LOGIC ===
function login(username, password) {
  const users = db.users;
  const user = users.find(u => u.username === username);
  if (user) {
    player = Object.assign(new WavePlayer(username), user);
    db.session = username;
    initMenu();
  } else {
    alert('User not found. Please register.');
  }
}

function register(username, password) {
  const users = db.users;
  if (users.find(u => u.username === username)) return alert('Username taken');
  
  const newPlayer = new WavePlayer(username);
  users.push(newPlayer);
  db.users = users;
  login(username, password);
}

function initMenu() {
  elements.auth.classList.remove('active');
  elements.menu.classList.add('active');
  updateUI();
}

function startGame() {
  elements.menu.classList.remove('active');
  elements.modals.gameover.classList.remove('active');
  elements.game.classList.add('active');
  
  gameState = 'playing';
  score = 0;
  distance = 0;
  gameSpeed = INITIAL_SPEED;
  obstacles = [];
  particles = [];
  document.getElementById('score-value').textContent = '0';
  
  player.x = 100;
  player.y = 300;
  player.dy = 0;
  
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// === EVENTS ===
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    if (gameState === 'playing') player.jump();
    if (gameState === 'menu') startGame();
  }
});

gameCanvas.addEventListener('touchstart', () => {
  if (gameState === 'playing') player.jump();
});

// Auth Buttons
document.getElementById('login-btn').onclick = () => {
  const u = document.getElementById('username').value;
  if (u) login(u, '123');
};

document.getElementById('register-btn').onclick = () => {
  const u = document.getElementById('username').value;
  if (u) register(u, '123');
};

document.getElementById('start-game').onclick = startGame;
document.getElementById('restart-btn').onclick = startGame;

// Modal Toggles
document.getElementById('open-shop').onclick = () => elements.modals.shop.classList.add('active');
document.getElementById('open-leaderboard').onclick = () => {
  const list = document.getElementById('leaderboard-list');
  list.innerHTML = db.users
    .sort((a,b) => b.highscore - a.highscore)
    .slice(0, 10)
    .map((u, i) => `<li><span>${i+1}. ${u.username}</span> <span>${u.highscore} pts</span></li>`)
    .join('');
  elements.modals.leaderboard.classList.add('active');
};

document.querySelectorAll('.close-modal').forEach(btn => {
  btn.onclick = () => {
    elements.modals.shop.classList.remove('active');
    elements.modals.leaderboard.classList.remove('active');
  };
});

// Boot
setTimeout(() => {
  elements.loading.classList.remove('active');
  const session = db.session;
  if (session) login(session, '123');
  else elements.auth.classList.add('active');
}, 2000);
