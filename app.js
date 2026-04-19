/** SCRATCH KING **/
const db = {
    get users() { return JSON.parse(localStorage.getItem('sk_users')) || []; },
    set users(v) { localStorage.setItem('sk_users', JSON.stringify(v)); },
    get session() { return localStorage.getItem('sk_session'); },
    set session(v) { localStorage.setItem('sk_session', v || ''); }
};
let currentPlayer = null;
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
    coinsDisplay: document.querySelectorAll('.coins-value'),
    usernameDisplay: document.querySelector('.username-display'),
    tabLogin: document.getElementById('tab-login'),
    tabRegister: document.getElementById('tab-register'),
    formLogin: document.getElementById('form-login'),
    formRegister: document.getElementById('form-register')
};

function login(username) {
    const users = db.users;
    let user = users.find(u => u.username === username);
    if (!user) return alert("Compte inconnu. Veuillez vous inscrire.");
    currentPlayer = user;
    db.session = username;
    initApp();
}
function register(username) {
    if (!username || username.length < 3) return alert("Pseudo trop court");
    const users = db.users;
    if (users.find(u => u.username === username)) return alert("Pseudo déjà pris");
    const newUser = { username, coins: 500, level: 1, xp: 0, ticketsScratched: 0 };
    users.push(newUser);
    db.users = users;
    login(username);
}
function initApp() {
    elements.loading.classList.add('hidden');
    elements.auth.classList.add('hidden');
    elements.game.classList.remove('hidden');
    updateUI();
    renderTickets();
}
function updateUI() {
    if (!currentPlayer) return;
    elements.coinsDisplay.forEach(el => el.textContent = currentPlayer.coins);
    if (elements.usernameDisplay) elements.usernameDisplay.textContent = currentPlayer.username;
}
function renderTickets() {
    elements.ticketsGrid.innerHTML = TICKET_TYPES.map(t => `
        <div class="ticket-card" onclick="openTicket('${t.id}')">
            <div class="t-emoji">${t.emoji}</div>
            <h3>${t.name}</h3>
            <p class="ticket-price">${t.price} 💰</p>
            <p class="ticket-desc">Gagnez jusqu'à ${t.maxPrize} !</p>
        </div>
    `).join('');
}

let isScratching = false;
let currentPrize = 0;
function openTicket(typeId) {
    const ticket = TICKET_TYPES.find(t => t.id === typeId);
    if (currentPlayer.coins < ticket.price) return alert("Pas assez de jetons !");
    currentPlayer.coins -= ticket.price;
    updateUI();
    savePlayer();
    currentPrize = calculatePrize(ticket);
    elements.result.innerHTML = currentPrize > 0 ? `GAGNÉ !<br>${currentPrize} 💰` : `PERDU...<br>😢`;
    elements.result.style.color = currentPrize > 0 ? '#ffd700' : '#ff4757';
    initScratchCanvas(ticket.color);
    elements.scratchModal.classList.remove('hidden');
    elements.collectBtn.classList.add('hidden');
}
function calculatePrize(ticket) {
    const rand = Math.random();
    if (rand > 0.4) return 0;
    return Math.floor(Math.random() * ticket.maxPrize) + 1;
}
function initScratchCanvas(color) {
    const canvas = elements.canvas;
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 250;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
    checkScratchProgress();
}
function checkScratchProgress() {
    const ctx = elements.canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, 400, 250);
    let transparentPixels = 0;
    for (let i = 3; i < imageData.data.length; i += 4) if (imageData.data[i] === 0) transparentPixels++;
    if ((transparentPixels / (400 * 250)) * 100 > 60) revealTicket();
}
function revealTicket() {
    elements.canvas.getContext('2d').clearRect(0, 0, 400, 250);
    elements.collectBtn.classList.remove('hidden');
}
function savePlayer() {
    const users = db.users;
    const idx = users.findIndex(u => u.username === currentPlayer.username);
    if (idx !== -1) { users[idx] = currentPlayer; db.users = users; }
}
document.getElementById('login-btn').onclick = () => login(document.getElementById('username').value);
document.getElementById('register-btn').onclick = () => register(document.getElementById('reg-username').value);
document.getElementById('close-scratch').onclick = () => elements.scratchModal.classList.add('hidden');
elements.tabLogin.onclick = () => { elements.formLogin.classList.remove('hidden'); elements.formRegister.classList.add('hidden'); elements.tabLogin.classList.add('active'); elements.tabRegister.classList.remove('active'); };
elements.tabRegister.onclick = () => { elements.formLogin.classList.add('hidden'); elements.formRegister.classList.remove('hidden'); elements.tabRegister.classList.add('active'); elements.tabLogin.classList.remove('active'); };
elements.collectBtn.onclick = () => { currentPlayer.coins += currentPrize; currentPlayer.ticketsScratched++; savePlayer(); updateUI(); elements.scratchModal.classList.add('hidden'); };
elements.canvas.onmousedown = () => isScratching = true;
window.onmouseup = () => isScratching = false;
elements.canvas.onmousemove = scratch;
elements.canvas.ontouchstart = () => isScratching = true;
elements.canvas.ontouchend = () => isScratching = false;
elements.canvas.ontouchmove = scratch;
window.onload = () => {
    setTimeout(() => {
        const session = db.session;
        if (session) {
            const user = db.users.find(u => u.username === session);
            if (user) { currentPlayer = user; initApp(); }
            else { elements.loading.classList.add('hidden'); elements.auth.classList.remove('hidden'); }
        } else { elements.loading.classList.add('hidden'); elements.auth.classList.remove('hidden'); }
    }, 1500);
};
