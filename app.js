// --- CONFIG & DATA ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const SKINS = [
    { id: 'classic', name: 'Original', emoji: '🏃', price: 0 },
    { id: 'robot', name: 'Bot-X', emoji: '🤖', price: 100 },
    { id: 'ninja', name: 'Shinobi', emoji: '🥷', price: 250 },
    { id: 'alien', name: 'Zorg', emoji: '👽', price: 500 },
    { id: 'king', name: 'King', emoji: '👑', price: 1000 }
];

let gameState = {
    running: false,
    score: 0,
    coins: 0,
    bestScore: 0,
    totalCoins: 0,
    unlockedSkins: ['classic'],
    currentSkin: 'classic',
    speed: 5,
    obstacles: [],
    pickups: [],
    laneWidth: 0,
    playerLane: 1,
    playerVisualX: 1,
    lastObstacleTime: 0,
    lastPickupTime: 0,
    difficultyMultiplier: 1
};

// Safe load
function loadData() {
    try {
        gameState.bestScore = parseInt(localStorage.getItem('subway_best')) || 0;
        gameState.totalCoins = parseInt(localStorage.getItem('subway_total_coins')) || 0;
        const skins = localStorage.getItem('subway_skins');
        if (skins) gameState.unlockedSkins = JSON.parse(skins);
        gameState.currentSkin = localStorage.getItem('subway_current_skin') || 'classic';
    } catch (e) { console.error('Data error:', e); }
}

function init() {
    loadData();
    resize();
    window.addEventListener('resize', resize);
    
    // Controls
    let touchStartX = 0;
    window.addEventListener('touchstart', e => touchStartX = e.touches[0].clientX);
    window.addEventListener('touchend', e => {
        let diff = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diff) > 20) movePlayer(diff > 0 ? 1 : -1);
    });
    window.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') movePlayer(-1);
        if (e.key === 'ArrowRight') movePlayer(1);
    });

    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('retry-btn').onclick = startGame;
    document.getElementById('back-to-menu').onclick = showMenu;
    document.getElementById('shop-btn').onclick = openSkins;
    document.getElementById('skin-btn').onclick = openSkins;
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')));

    updateUI();
    
    // Immediate show
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
}

function resize() {
    const container = document.getElementById('game-container');
    if (!container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    gameState.laneWidth = canvas.width / 3;
}

function movePlayer(dir) {
    if (!gameState.running) return;
    gameState.playerLane = Math.max(0, Math.min(2, gameState.playerLane + dir));
}

function startGame() {
    gameState.running = true;
    gameState.score = 0;
    gameState.coins = 0;
    gameState.speed = 8;
    gameState.obstacles = [];
    gameState.pickups = [];
    gameState.playerLane = 1;
    gameState.playerVisualX = 1;
    gameState.difficultyMultiplier = 1;
    
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('game-ui').classList.remove('hidden');
    
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState.running = false;
    
    if (gameState.score > gameState.bestScore) {
        gameState.bestScore = Math.floor(gameState.score);
        localStorage.setItem('subway_best', gameState.bestScore);
        document.getElementById('new-high-score').classList.remove('hidden');
    } else {
        document.getElementById('new-high-score').classList.add('hidden');
    }
    
    gameState.totalCoins += gameState.coins;
    localStorage.setItem('subway_total_coins', gameState.totalCoins);
    
    document.getElementById('final-score').innerText = Math.floor(gameState.score);
    document.getElementById('final-coins').innerText = gameState.coins;
    document.getElementById('game-over-screen').classList.remove('hidden');
    document.getElementById('game-ui').classList.add('hidden');
    updateUI();
}

function updateUI() {
    document.getElementById('best-score').innerText = gameState.bestScore;
    document.getElementById('total-coins').innerText = gameState.totalCoins;
}

function showMenu() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('menu-screen').classList.remove('hidden');
    updateUI();
}

function gameLoop(time) {
    if (!gameState.running) return;

    gameState.score += 0.1 * gameState.difficultyMultiplier;
    gameState.difficultyMultiplier += 0.0001;
    gameState.speed = 8 * gameState.difficultyMultiplier;

    if (time - gameState.lastObstacleTime > 1200 / gameState.difficultyMultiplier) {
        let lane = Math.floor(Math.random() * 3);
        gameState.obstacles.push({ lane: lane, y: -100, h: Math.random() > 0.8 ? 120 : 60 });
        gameState.lastObstacleTime = time;
    }
    
    if (time - gameState.lastPickupTime > 600) {
        gameState.pickups.push({ lane: Math.floor(Math.random() * 3), y: -50 });
        gameState.lastPickupTime = time;
    }

    gameState.obstacles.forEach(o => o.y += gameState.speed);
    gameState.pickups.forEach(p => p.y += gameState.speed);
    
    gameState.obstacles = gameState.obstacles.filter(o => o.y < canvas.height + 100);
    gameState.pickups = gameState.pickups.filter(p => p.y < canvas.height + 100);
    
    gameState.playerVisualX += (gameState.playerLane - gameState.playerVisualX) * 0.2;

    const pX = gameState.playerVisualX * gameState.laneWidth + gameState.laneWidth / 2;
    const pY = canvas.height - 100;

    gameState.obstacles.forEach(o => {
        if (o.lane === gameState.playerLane && o.y > pY - 50 && o.y < pY + 50) gameOver();
    });

    gameState.pickups = gameState.pickups.filter(p => {
        if (p.lane === gameState.playerLane && p.y > pY - 50 && p.y < pY + 50) {
            gameState.coins++;
            return false;
        }
        return true;
    });

    render();
    document.getElementById('current-score').innerText = Math.floor(gameState.score);
    document.getElementById('current-coins').innerText = gameState.coins;

    requestAnimationFrame(gameLoop);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Rails
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    for(let i=0; i<=3; i++) {
        let x = i * gameState.laneWidth;
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
    }
    
    // Background
    ctx.fillStyle = '#111';
    let offset = (gameState.score * 40) % 100;
    for(let y = -100 + offset; y < canvas.height; y += 100) {
        ctx.fillRect(0, y, canvas.width, 5);
    }

    gameState.pickups.forEach(p => {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(p.lane * gameState.laneWidth + gameState.laneWidth/2, p.y, 12, 0, 7); ctx.fill();
    });

    gameState.obstacles.forEach(o => {
        ctx.fillStyle = o.h > 80 ? '#ff3366' : '#666';
        ctx.fillRect(o.lane * gameState.laneWidth + 10, o.y, gameState.laneWidth - 20, o.h);
        ctx.strokeStyle = '#fff'; ctx.strokeRect(o.lane * gameState.laneWidth + 10, o.y, gameState.laneWidth - 20, o.h);
    });

    const skin = SKINS.find(s => s.id === gameState.currentSkin) || SKINS[0];
    ctx.font = '40px serif'; ctx.textAlign = 'center';
    ctx.fillText(skin.emoji, gameState.playerVisualX * gameState.laneWidth + gameState.laneWidth/2, canvas.height - 90);
}

function openSkins() {
    const c = document.getElementById('skin-container');
    c.innerHTML = '';
    SKINS.forEach(s => {
        const u = gameState.unlockedSkins.includes(s.id);
        const active = gameState.currentSkin === s.id;
        const div = document.createElement('div');
        div.className = `skin-item ${active?'selected':''} ${!u?'locked':''}`;
        div.innerHTML = `<div>${s.emoji}</div><small>${s.name}</small><div>${u?(active?'EQUIP':'SELECT'):'🪙'+s.price}</div>`;
        div.onclick = () => {
            if(u){ gameState.currentSkin=s.id; localStorage.setItem('subway_current_skin',s.id); openSkins(); }
            else if(gameState.totalCoins>=s.price){
                gameState.totalCoins-=s.price; gameState.unlockedSkins.push(s.id);
                localStorage.setItem('subway_total_coins', gameState.totalCoins);
                localStorage.setItem('subway_skins', JSON.stringify(gameState.unlockedSkins));
                gameState.currentSkin=s.id; localStorage.setItem('subway_current_skin',s.id);
                openSkins(); updateUI();
            }
        };
        c.appendChild(div);
    });
    document.getElementById('skin-modal').classList.remove('hidden');
}

window.onload = init;
