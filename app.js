let player = null;
let currentTicket = null;
let isScratching = false;

const TICKETS = [
    { id: 'bronze', name: 'Ticket Bronze', price: 10, max: 50, color: '#cd7f32', emoji: '🥉' },
    { id: 'silver', name: 'Ticket Argent', price: 50, max: 300, color: '#c0c0c0', emoji: '🥈' },
    { id: 'gold', name: 'Ticket Or', price: 200, max: 1500, color: '#ffd700', emoji: '🥇' },
    { id: 'diamond', name: 'Ticket Diamant', price: 1000, max: 10000, color: '#b9f2ff', emoji: '💎' }
];

function sanitize(user) {
    if(!user) return null;
    user.coins = isFinite(user.coins) ? Number(user.coins) : (user.username === 'ADMIN' ? 999999 : 500);
    user.xp = isFinite(user.xp) ? Number(user.xp) : 0;
    user.level = isFinite(user.level) ? Number(user.level) : 1;
    user.debt = isFinite(user.debt) ? Number(user.debt) : 0;
    return user;
}

function save() {
    if(!player) return;
    const users = JSON.parse(localStorage.getItem('sk_users') || '[]');
    const idx = users.findIndex(u => u.username === player.username);
    if(idx !== -1) {
        users[idx] = player;
        localStorage.setItem('sk_users', JSON.stringify(users));
    }
}

function login() {
    const u = document.getElementById('username').value.trim().toUpperCase();
    const p = document.getElementById('password').value;
    if(!u || !p) return alert('Remplis tout !');

    let users = JSON.parse(localStorage.getItem('sk_users') || '[]');
    
    if(u === 'ADMIN' && p === '135975') {
        let admin = users.find(x => x.username === 'ADMIN');
        if(!admin) {
            admin = { username: 'ADMIN', password: '135975', coins: 999999, xp: 0, level: 100, debt: 0 };
            users.push(admin);
        } else {
            admin.coins = 999999;
        }
        localStorage.setItem('sk_users', JSON.stringify(users));
    }

    let user = users.find(x => x.username === u);
    if(!user) {
        user = { username: u, password: p, coins: 500, xp: 0, level: 1, debt: 0 };
        users.push(user);
        localStorage.setItem('sk_users', JSON.stringify(users));
    } else if(user.password !== p) {
        return alert('Mauvais mot de passe');
    }

    player = sanitize(user);
    save();
    start();
}

function start() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    updateUI();
    render();
}

function updateUI() {
    if(!player) return;
    player = sanitize(player);
    document.getElementById('hud-coins').innerText = `💰 ${Math.floor(player.coins)}`;
    document.getElementById('hud-xp').innerText = `⭐ XP: ${player.xp}`;
    document.getElementById('hud-level').innerText = `🏆 Niv. ${player.level}`;
    
    if(player.username === 'ADMIN') document.getElementById('admin-btn').classList.remove('hidden');
    else document.getElementById('admin-btn').classList.add('hidden');

    if(player.debt > 0 && player.coins >= player.debt * 2) {
        player.coins -= player.debt;
        player.debt = 0;
        showToast(`Dette remboursée !`);
        save();
        updateUI();
    }
}

function render() {
    const grid = document.getElementById('tickets');
    grid.innerHTML = TICKETS.map(t => `
        <div class="ticket" onclick="buyTicket('${t.id}')">
            <div style="font-size: 3rem;">${t.emoji}</div>
            <h3 style="margin: 0.5rem 0;">${t.name}</h3>
            <p style="color: var(--gold); font-weight: bold;">${t.price} 💰</p>
            <p style="font-size: 0.7rem; color: #aaa;">Gagnez jusqu'à ${t.max} !</p>
        </div>
    `).join('');
}

function buyTicket(id) {
    const t = TICKETS.find(x => x.id === id);
    if(player.coins < t.price) return document.getElementById('loan-modal').classList.remove('hidden');
    player.coins -= t.price;
    currentTicket = t;
    openScratch();
    save();
    updateUI();
}

function openScratch() {
    const modal = document.getElementById('scratch-modal');
    const canvas = document.getElementById('scratch-canvas');
    const ctx = canvas.getContext('2d');
    const resultDiv = document.getElementById('scratch-result');

    const win = Math.random() < 0.35;
    const prize = win ? Math.floor(Math.random() * currentTicket.max) + 1 : 0;
    player.lastPrize = prize;

    resultDiv.innerText = prize > 0 ? `GAGNÉ: ${prize} 💰` : "PERDU 😢";
    resultDiv.style.color = prize > 0 ? 'var(--gold)' : '#ff4444';

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = currentTicket.color;
    ctx.fillRect(0, 0, 300, 150);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GRATTEZ ICI', 150, 85);

    document.getElementById('collect-btn').classList.add('hidden');
    modal.classList.remove('hidden');

    canvas.onmousedown = () => isScratching = true;
    window.onmouseup = () => isScratching = false;
    
    const scratchHandler = e => {
        if(!isScratching) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill();
        checkScratch();
    };

    canvas.onmousemove = scratchHandler;
    canvas.ontouchmove = e => { e.preventDefault(); scratchHandler(e); };
    canvas.ontouchstart = () => isScratching = true;
}

function checkScratch() {
    const ctx = document.getElementById('scratch-canvas').getContext('2d');
    const data = ctx.getImageData(0,0,300,150).data;
    let cleared = 0;
    for(let i=3; i<data.length; i+=4) if(data[i] === 0) cleared++;
    if(cleared / (300*150) > 0.6) {
        ctx.clearRect(0,0,300,150);
        document.getElementById('collect-btn').classList.remove('hidden');
    }
}

function collectPrize() {
    player.coins += player.lastPrize;
    player.xp += 20;
    if(player.xp >= player.level * 100) {
        player.level++;
        player.xp = 0;
        showToast(`NIVEAU SUPÉRIEUR !`);
    }
    document.getElementById('scratch-modal').classList.add('hidden');
    save();
    updateUI();
}

function openAdmin() {
    const users = JSON.parse(localStorage.getItem('sk_users') || '[]');
    const list = document.getElementById('admin-list');
    list.innerHTML = `<table style="width:100%; border-collapse: collapse; margin-top: 10px; color: #fff;">
        <tr style="background: var(--accent); color: black;">
            <th style="padding: 8px;">User</th>
            <th>Coins</th>
            <th>Lvl</th>
            <th>Pass</th>
        </tr>
        ${users.map(u => `<tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
            <td style="padding: 8px;">${u.username}</td>
            <td>${Math.floor(u.coins || 0)}</td>
            <td>${u.level || 1}</td>
            <td>${u.password}</td>
        </tr>`).join('')}
    </table>`;
    document.getElementById('admin-modal').classList.remove('hidden');
}

function takeLoan() {
    player.debt = (player.debt || 0) + 100;
    player.coins += 100;
    document.getElementById('loan-modal').classList.add('hidden');
    showToast('Prêt de 100 💰 accordé !');
    save();
    updateUI();
}

function showToast(m) {
    const t = document.createElement('div');
    t.className = 'toast'; t.innerText = m;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
}

function logout() { location.reload(); }

window.onload = () => {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
    }, 1000);
};
