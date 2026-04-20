// --- CONFIG & DATA ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const SKINS = [
    { id: 'classic', name: 'Original', emoji: '🏃', price: 0, color: '#ffcc00' },
    { id: 'robot', name: 'Bot-X', emoji: '🤖', price: 100, color: '#00d2ff' },
    { id: 'ninja', name: 'Shinobi', emoji: '🥷', price: 250, color: '#ff3366' },
    { id: 'alien', name: 'Zorg', emoji: '👽', price: 500, color: '#00ff00' },
    { id: 'king', name: 'King', emoji: '👑', price: 1000, color: '#ffd700' }
];

let gameState = {
    running: false,
    score: 0,
    coins: 0,
    bestScore: localStorage.getItem('subway_best') || 0,
    totalCoins: parseInt(localStorage.getItem('subway_total_coins')) || 0,
    unlockedSkins: JSON.parse(localStorage.getItem('subway_skins')) || ['classic'],
    currentSkin: localStorage.getItem('subway_current_skin') || 'classic',
    speed: 5,
    obstacles: [],
    pickups: [],
    laneWidth: 0,
    playerLane: 1, // 0, 1, 2
    playerVisualX: 1,
    lastObstacleTime: 0,
    lastPickupTime: 0,
    difficultyMultiplier: 1
};

// --- CORE FUNCTIONS ---
function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // Controls
    let touchStartX = 0;
    window.addEventListener('touchstart', e => touchStartX = e.touches[0].clientX);
    window.addEventListener('touchend', e => {
        let diff = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(diff) > 30) movePlayer(diff > 0 ? 1 : -1);
    });
    window.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') movePlayer(-1);
        if (e.key === 'ArrowRight') movePlayer(1);
    });

    // UI Listeners
    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('retry-btn').onclick = startGame;
    document.getElementById('back-to-menu').onclick = showMenu;
    document.getElementById('shop-btn').onclick = openSkins;
    document.getElementById('skin-btn').onclick = openSkins;
    document.querySelectorAll('.close-modal').forEach(b => b.onclick = () => document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')));

    updateUI();
    
    // Loader simulation
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
    }, 1500);
}

function resize() {
    const container = document.getElementById('game-container');
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
    gameState.speed = 7;
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
    
    // Save
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

// --- GAME LOGIC ---
function gameLoop(time) {
    if (!gameState.running) return;

    // Logic
    gameState.score += 0.1 * gameState.difficultyMultiplier;
    gameState.difficultyMultiplier += 0.0001;
    gameState.speed = 7 * gameState.difficultyMultiplier;

    // Spawn Obstacles
    if (time - gameState.lastObstacleTime > 1500 / gameState.difficultyMultiplier) {
        spawnObstacle();
        gameState.lastObstacleTime = time;
    }
    
    // Spawn Coins
    if (time - gameState.lastPickupTime > 800) {
        spawnPickup();
        gameState.lastPickupTime = time;
    }

    updateObjects();
    checkCollisions();
    render();
    
    document.getElementById('current-score').innerText = Math.floor(gameState.score);
    document.getElementById('current-coins').innerText = gameState.coins;

    requestAnimationFrame(gameLoop);
}

function spawnObstacle() {
    let lane = Math.floor(Math.random() * 3);
    gameState.obstacles.push({
        lane: lane,
        y: -100,
        type: Math.random() > 0.8 ? 'tall' : 'short'
    });
}

function spawnPickup() {
    let lane = Math.floor(Math.random() * 3);
    gameState.pickups.push({ lane: lane, y: -50 });
}

function updateObjects() {
    gameState.obstacles.forEach(o => o.y += gameState.speed);
    gameState.pickups.forEach(p => p.y += gameState.speed);
    
    gameState.obstacles = gameState.obstacles.filter(o => o.y < canvas.height + 100);
    gameState.pickups = gameState.pickups.filter(p => p.y < canvas.height + 100);
    
    // Smooth lane movement
    gameState.playerVisualX += (gameState.playerLane - gameState.playerVisualX) * 0.2;
}

function checkCollisions() {
    const pX = gameState.playerVisualX * gameState.laneWidth + gameState.laneWidth / 2;
    const pY = canvas.height - 100;

    gameState.obstacles.forEach(o => {
        if (o.lane === gameState.playerLane && o.y > pY - 50 && o.y < pY + 50) {
            gameOver();
        }
    });

    gameState.pickups = gameState.pickups.filter(p => {
        if (p.lane === gameState.playerLane && p.y > pY - 50 && p.y < pY + 50) {
            gameState.coins++;
            return false;
        }
        return true;
    });
}

// --- RENDERING ---
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Rails
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    for(let i=0; i<=3; i++) {
        let x = i * gameState.laneWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Background movement (lines)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 10;
    let offset = (gameState.score * 50) % 200;
    for(let y = -200 + offset; y < canvas.height; y += 200) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Pickups (Coins)
    gameState.pickups.forEach(p => {
        let x = p.lane * gameState.laneWidth + gameState.laneWidth / 2;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(x, p.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // Obstacles
    gameState.obstacles.forEach(o => {
        let x = o.lane * gameState.laneWidth + 10;
        let w = gameState.laneWidth - 20;
        ctx.fillStyle = o.type === 'tall' ? '#ff3366' : '#555';
        ctx.fillRect(x, o.y, w, o.type === 'tall' ? 80 : 40);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(x, o.y, w, o.type === 'tall' ? 80 : 40);
    });

    // Player
    const activeSkin = SKINS.find(s => s.id === gameState.currentSkin) || SKINS[0];
    let px = gameState.playerVisualX * gameState.laneWidth + gameState.laneWidth / 2;
    let py = canvas.height - 100;
    
    ctx.font = '50px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(activeSkin.emoji, px, py);
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px, py + 30, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
}

// --- SHOP LOGIC ---
function openSkins() {
    const container = document.getElementById('skin-container');
    container.innerHTML = '';
    
    SKINS.forEach(skin => {
        const isUnlocked = gameState.unlockedSkins.includes(skin.id);
        const isSelected = gameState.currentSkin === skin.id;
        
        const div = document.createElement('div');
        div.className = `skin-item ${isSelected ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
        div.innerHTML = `
            <div style="font-size: 2.5rem">${skin.emoji}</div>
            <div style="font-weight: bold">${skin.name}</div>
            <div class="skin-price">${isUnlocked ? (isSelected ? 'ÉQUIPÉ' : 'SÉLECTIONNER') : '💰 ' + skin.price}</div>
        `;
        
        div.onclick = () => {Implement full Subway Runner game engine with lanes, obstacles, coins, and skin system
            if (isUnlocked) {
                gameState.currentSkin = skin.id;
                localStorage.setItem('subway_current_skin', skin.id);
                openSkins();
            } else if (gameState.totalCoins >= skin.price) {
                gameState.totalCoins -= skin.price;
                gameState.unlockedSkins.push(skin.id);
                localStorage.setItem('subway_total_coins', gameState.totalCoins);
                localStorage.setItem('subway_skins', JSON.stringify(gameState.unlockedSkins));
                gameState.currentSkin = skin.id;
                localStorage.setItem('subway_current_skin', skin.id);
                openSkins();
                updateUI();
            }
        };
        
        container.appendChild(div);
    });
    
    document.getElementById('skin-modal').classList.remove('hidden');
}

init();
