let currentIndex = 0;
let currentListId = 'list-minigames'; 

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playBtn = document.getElementById('playBtn');

function switchCategory(category, btnElement) {
  currentIndex = 0;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  document.querySelectorAll('.game-display').forEach(list => list.classList.remove('active-list'));
  
  if (category === 'minigames') {
    currentListId = 'list-minigames';
  } else {
    currentListId = 'list-pro';
  }
  
  const activeList = document.getElementById(currentListId);
  activeList.classList.add('active-list');
  updateGallery();
}

function updateGallery() {
  const activeList = document.getElementById(currentListId);
  const offset = currentIndex * -100;
  activeList.style.transform = `translateX(${offset}%)`;
}

function getActiveCards() {
  return document.getElementById(currentListId).querySelectorAll('.game-card');
}

nextBtn.addEventListener('click', () => {
  const cards = getActiveCards();
  if (currentIndex < cards.length - 1) { currentIndex++; } 
  else { currentIndex = 0; }
  updateGallery();
});

prevBtn.addEventListener('click', () => {
  const cards = getActiveCards();
  if (currentIndex > 0) { currentIndex--; } 
  else { currentIndex = cards.length - 1; }
  updateGallery();
});

document.addEventListener('keydown', (e) => {
  if(document.getElementById('game-overlay').classList.contains('active')) return;
  if (e.key === "ArrowRight") nextBtn.click();
  if (e.key === "ArrowLeft") prevBtn.click();
  if (e.key === "Enter") playBtn.click();
});


const THEME = { orange: '#ff3300', green: '#ffcc00', black: '#111111' };

var gameInterval = null; 
var activeCpuGameInstance = null; 

playBtn.addEventListener('click', () => {
  const cards = getActiveCards();
  const gameName = cards[currentIndex].querySelector('h3').innerText.toLowerCase();
  
  if (currentListId === 'list-pro') {
      alert("¡JUEGO BLOQUEADO! Insert Coin para desbloquear versión PRO.");
      return;
  }

  if (gameName.includes('pong')) {
      playMinigame('pong');
  } else if (gameName.includes('snake')) {
      playMinigame('snake');
  } else if (gameName.includes('cpu') || gameName.includes('defender')) {
      playMinigame('cpu');
  } else {
      alert("Juego no instalado: " + gameName);
  }
});

window.playMinigame = function(gameType) {
    const overlay = document.getElementById('game-overlay');
    const gameArea = document.getElementById('game-area');
    const title = document.getElementById('game-title');
    if (gameInterval) clearInterval(gameInterval);
    if (activeCpuGameInstance) { activeCpuGameInstance.destroy(); activeCpuGameInstance = null; }
    
    gameArea.innerHTML = '';
    overlay.classList.add('active');
    document.onkeydown = null;
    document.onmousemove = null;
    document.ontouchstart = null;

    if (title) title.innerText = gameType.toUpperCase();

    switch(gameType) {
        case 'snake': 
            startSnake(); 
            break;
        case 'pong': 
            startPong(); 
            break;
        case 'cpu': 
            startCpuDefender(); 
            break;
    }
};

window.closeMinigame = function() {
    const overlay = document.getElementById('game-overlay');
    const gameArea = document.getElementById('game-area');
    
    if (gameInterval) { clearInterval(gameInterval); gameInterval = null; }
    if (activeCpuGameInstance) { activeCpuGameInstance.destroy(); activeCpuGameInstance = null; }
    
    if (gameArea) gameArea.innerHTML = '';
    if (overlay) overlay.classList.remove('active');
    
    document.onkeydown = null;
    document.onmousemove = null;
    document.addEventListener('keydown', (e) => {
      if(document.getElementById('game-overlay').classList.contains('active')) return;
      if (e.key === "ArrowRight") nextBtn.click();
      if (e.key === "ArrowLeft") prevBtn.click();
      if (e.key === "Enter") playBtn.click();
    });
};

function createGameCanvas(width = 600, height = 400) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.maxWidth = '100%'; 
    document.getElementById('game-area').appendChild(canvas);
    return { canvas, ctx: canvas.getContext('2d') };
}

function updateScore(val) {
    const el = document.getElementById('game-score');
    if(el) el.innerText = typeof val === 'number' ? 'SCORE: ' + val : val;
}

function gameOverScreen(ctx, score) {
    if (gameInterval) clearInterval(gameInterval);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = THEME.orange;
    ctx.font = 'bold 30px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
    ctx.fillStyle = THEME.green;
    ctx.font = '15px "Press Start 2P"';
    ctx.fillText('Score: ' + score, ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
}


function startSnake() {
    const gameData = createGameCanvas(600, 400);
    if (!gameData) return;
    const { canvas, ctx } = gameData;
    let snake = [{x:10, y:10}];
    let dir = {x:1, y:0};
    let food = {x:15, y:15};
    let score = 0;
    let gameRunning = true;
    const GRID = 20; const COLS = 30; const ROWS = 20;
    
    document.onkeydown = function(e) {
        if (!gameRunning) return;
        if (e.key === 'ArrowUp' && dir.y === 0) { dir = {x:0, y:-1}; e.preventDefault(); }
        else if (e.key === 'ArrowDown' && dir.y === 0) { dir = {x:0, y:1}; e.preventDefault(); }
        else if (e.key === 'ArrowLeft' && dir.x === 0) { dir = {x:-1, y:0}; e.preventDefault(); }
        else if (e.key === 'ArrowRight' && dir.x === 0) { dir = {x:1, y:0}; e.preventDefault(); }
    };
    
    gameInterval = setInterval(() => {
        if (!gameRunning) return;
        const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS || snake.some(s => s.x === head.x && s.y === head.y)) {
            gameRunning = false; return gameOverScreen(ctx, score);
        }
        
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score += 10; updateScore(score);
            food = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        } else { snake.pop(); }
        
        ctx.fillStyle = THEME.black; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = THEME.orange;
        snake.forEach(s => ctx.fillRect(s.x * GRID + 1, s.y * GRID + 1, GRID - 2, GRID - 2));
        ctx.fillStyle = THEME.green;
        ctx.beginPath(); ctx.arc(food.x * GRID + GRID/2, food.y * GRID + GRID/2, 8, 0, Math.PI * 2); ctx.fill();
    }, 100);
}

function startPong() {
    const gameData = createGameCanvas(600, 400);
    if (!gameData) return;
    const { canvas, ctx } = gameData;
    let p = { x: 10, y: 150, w: 10, h: 80, s: 0 };
    let c = { x: 580, y: 150, w: 10, h: 80, s: 0 };
    let b = { x: 300, y: 200, r: 8, dx: 4, dy: 4 };
    let gameRunning = true;
    
    document.onkeydown = function(e) {
      if (!gameRunning) return;
      if(e.key === 'ArrowUp') p.y = Math.max(0, p.y - 20);
      if(e.key === 'ArrowDown') p.y = Math.min(canvas.height - p.h, p.y + 20);
    };

    canvas.addEventListener('mousemove', (e) => {
       const rect = canvas.getBoundingClientRect();
       p.y = e.clientY - rect.top - p.h/2;
    });

    gameInterval = setInterval(() => {
        if (!gameRunning) return;
        b.x += b.dx; b.y += b.dy;
        
        if (b.y - b.r <= 0 || b.y + b.r >= canvas.height) b.dy *= -1;
        
        if (b.x - b.r <= p.x + p.w && b.y >= p.y && b.y <= p.y + p.h) { b.dx = Math.abs(b.dx) + 0.2; }
        if (b.x + b.r >= c.x && b.y >= c.y && b.y <= c.y + c.h) { b.dx = -(Math.abs(b.dx) + 0.2); }
        
        if (b.x < 0) { c.s++; updateScore(`P1: ${p.s} - CPU: ${c.s}`); resetBall(); }
        if (b.x > canvas.width) { p.s++; updateScore(`P1: ${p.s} - CPU: ${c.s}`); resetBall(); }
        
        if (c.y + c.h/2 < b.y - 10) c.y += 3;
        else if (c.y + c.h/2 > b.y + 10) c.y -= 3;
        
        ctx.fillStyle = THEME.black; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height); ctx.stroke();
        ctx.fillStyle = THEME.orange; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.fillStyle = THEME.green; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fill();
    }, 16);
    
    function resetBall() { b.x=300; b.y=200; b.dx = 4 * (Math.random()>.5?1:-1); b.dy = 4 * (Math.random()>.5?1:-1); }
}


function startCpuDefender() {
    const gameArea = document.getElementById('game-area');
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 500;
    canvas.style.cursor = 'crosshair';
    canvas.style.backgroundColor = '#2e4c2e'; // Fondo PCB
    const uiContainer = document.createElement('div');
    uiContainer.className = 'ui-layer';
    uiContainer.innerHTML = `
        <div class="hud-controls">
            <button class="btn-cpu" id="btn-repair">
                REPAIR
                <span>(Cost: 500)</span>
            </button>
            <button class="btn-cpu" id="btn-mine">
                MINE
                <span>(Cost: 300)</span>
            </button>
        </div>
        <div id="cpu-game-over" class="cpu-game-over-msg" style="display:none;">
            <h2 style="color:red; margin:0 0 10px 0;">SYSTEM CRASHED</h2>
            <p>Score: <span id="final-cpu-score">0</span></p>
            <p style="font-size:0.7rem; color:#aaa;">Presiona ✕ para salir</p>
        </div>
    `;

    gameArea.appendChild(canvas);
    gameArea.appendChild(uiContainer);
    activeCpuGameInstance = new CpuGame(canvas);
    document.getElementById('btn-repair').onclick = () => activeCpuGameInstance.repairCpu();
    document.getElementById('btn-mine').onclick = () => activeCpuGameInstance.placeMine();
}

class CpuGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        this.state = 'playing';
        this.score = 0;
        
        this.cpu = new CpuEntity(this.width / 2, this.height / 2);
        this.player = new CpuPlayer(this.width / 2, this.height / 2 + 100);
        this.bullets = [];
        this.enemies = [];
        this.mines = [];
        this.particles = [];

        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        
        this.frameCount = 0;
        this.enemySpawnRate = 100;
        this.animationId = null;
        this.handleKeyDow = e => this.keys[e.key.toLowerCase()] = true;
        this.handleKeyUp = e => this.keys[e.key.toLowerCase()] = false;
        this.handleMouseMove = e => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        };
        this.handleMouseDown = () => {
            if (this.state === 'playing') this.player.shoot(this);
        };

        window.addEventListener('keydown', this.handleKeyDow);
        window.addEventListener('keyup', this.handleKeyUp);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);

        this.loop();
    }

    destroy() {
        this.state = 'destroyed';
        cancelAnimationFrame(this.animationId);
        window.removeEventListener('keydown', this.handleKeyDow);
        window.removeEventListener('keyup', this.handleKeyUp);
    }

    repairCpu() {
        if (this.score >= 500 && this.cpu.health < 100) {
            this.score -= 500;
            this.cpu.health = Math.min(100, this.cpu.health + 30);
            this.createExplosion(this.cpu.x, this.cpu.y, 10, '#00ff00');
            updateScore(this.score);
        }
    }

    placeMine() {
        if (this.score >= 300) {
            this.score -= 300;
            this.mines.push(new CpuMine(this.player.x, this.player.y));
            updateScore(this.score);
        }
    }

    createExplosion(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new CpuParticle(x, y, color));
        }
    }

    update() {
        if (this.state !== 'playing') return;
        
        this.frameCount++;
        this.player.update(this.keys, this.mouse, this.width, this.height);
        if (this.frameCount % this.enemySpawnRate === 0) {
            this.spawnEnemy();
            if (this.enemySpawnRate > 20) this.enemySpawnRate--;
        }

        this.bullets.forEach((b, i) => {
            b.update();
            if (b.offScreen(this.width, this.height)) this.bullets.splice(i, 1);
        });
        this.enemies.forEach((e, ei) => {
            e.update(this.cpu);
            const distCpu = Math.hypot(e.x - this.cpu.x, e.y - this.cpu.y);
            if (distCpu < 40) {
                this.cpu.takeDamage(10);
                this.createExplosion(e.x, e.y, 5, 'red');
                this.enemies.splice(ei, 1);
                if (this.cpu.health <= 0) this.gameOver();
                return;
            }
            this.bullets.forEach((b, bi) => {
                const distBullet = Math.hypot(e.x - b.x, e.y - b.y);
                if (distBullet < e.radius + b.radius) {
                    this.createExplosion(e.x, e.y, 8, '#ffaa00');
                    this.enemies.splice(ei, 1);
                    this.bullets.splice(bi, 1);
                    this.score += 50;
                    updateScore(this.score);
                }
            });
            this.mines.forEach((m, mi) => {
                const distMine = Math.hypot(e.x - m.x, e.y - m.y);
                if (distMine < 40) {
                    this.createExplosion(m.x, m.y, 20, 'orange');
                    this.enemies.splice(ei, 1);
                    this.mines.splice(mi, 1);
                }
            });
        });
        this.particles.forEach((p, i) => {
            p.update();
            if (p.life <= 0) this.particles.splice(i, 1);
        });
    }

    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        if (side === 0) { x = Math.random() * this.width; y = -30; } 
        else if (side === 1) { x = this.width + 30; y = Math.random() * this.height; } 
        else if (side === 2) { x = Math.random() * this.width; y = this.height + 30; } 
        else { x = -30; y = Math.random() * this.height; } 
        
        this.enemies.push(new CpuEnemy(x, y));
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#2e4c2e';
        ctx.fillRect(0, 0, this.width, this.height);
        this.drawCircuitLines(ctx);

        this.mines.forEach(m => m.draw(ctx));
        this.cpu.draw(ctx);
        this.bullets.forEach(b => b.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.player.draw(ctx);
        this.particles.forEach(p => p.draw(ctx));
    }

    drawCircuitLines(ctx) {
        ctx.strokeStyle = '#3a5f3a';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(this.width/2, 0); ctx.lineTo(this.width/2, this.height);
        ctx.moveTo(0, this.height/2); ctx.lineTo(this.width, this.height/2);
        ctx.stroke();
        ctx.fillStyle = '#223822';
        ctx.fillRect(100, 100, 50, 80);
        ctx.fillRect(this.width-150, this.height-150, 80, 50);
    }

    gameOver() {
        this.state = 'gameover';
        const msg = document.getElementById('cpu-game-over');
        const scoreSpan = document.getElementById('final-cpu-score');
        if(msg) msg.style.display = 'block';
        if(scoreSpan) scoreSpan.innerText = this.score;
    }

    loop() {
        if (this.state === 'destroyed') return;
        this.update();
        this.draw();
        if (this.state === 'playing') {
            this.animationId = requestAnimationFrame(() => this.loop());
        }
    }
}

class CpuEntity {
    constructor(x, y) { this.x = x; this.y = y; this.size = 60; this.health = 100; }
    draw(ctx) {
        ctx.fillStyle = '#00cccc';
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.fillStyle = '#ccc';
        for(let i=0; i<4; i++) {
            ctx.fillRect(this.x - this.size/2 - 5, this.y - 20 + (i*15), 5, 5); 
            ctx.fillRect(this.x + this.size/2, this.y - 20 + (i*15), 5, 5); 
        }
        ctx.fillStyle = 'red'; ctx.fillRect(this.x - 40, this.y - 50, 80, 10);
        ctx.fillStyle = '#00ff00'; ctx.fillRect(this.x - 40, this.y - 50, 80 * (this.health / 100), 10);
        ctx.fillStyle = 'white'; ctx.font = '12px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(`${Math.floor(this.health)}%`, this.x, this.y - 55);
    }
    takeDamage(n) { this.health -= n; }
}

class CpuPlayer {
    constructor(x, y) { this.x = x; this.y = y; this.angle = 0; this.speed = 4; }
    update(keys, mouse, w, h) {
        if (keys['w']) this.y -= this.speed;
        if (keys['s']) this.y += this.speed;
        if (keys['a']) this.x -= this.speed;
        if (keys['d']) this.x += this.speed;
        this.x = Math.max(20, Math.min(w - 20, this.x));
        this.y = Math.max(20, Math.min(h - 20, this.y));
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        this.angle = Math.atan2(dy, dx);
    }
    shoot(gameInstance) {
        const v = { x: Math.cos(this.angle) * 10, y: Math.sin(this.angle) * 10 };
        gameInstance.bullets.push(new CpuBullet(this.x, this.y, v));
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#888'; ctx.fillRect(-15, -15, 30, 30);
        ctx.fillStyle = '#555'; ctx.fillRect(0, -5, 25, 10);
        ctx.fillStyle = '#fff'; ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
    }
}

class CpuBullet {
    constructor(x, y, v) { this.x = x; this.y = y; this.velocity = v; this.radius = 4; }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; }
    offScreen(w, h) { return this.x < 0 || this.x > w || this.y < 0 || this.y > h; }
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow'; ctx.fill();
    }
}

class CpuEnemy {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.speed = 1.5 + Math.random(); 
        this.radius = 12;
    }
    update(target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a00'; ctx.lineWidth = 2;
        for(let i=0; i<4; i++) {
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(i)*20, Math.sin(i)*20); ctx.stroke();
        }
        ctx.restore();
    }
}

class CpuMine {
    constructor(x, y) { this.x = x; this.y = y; }
    draw(ctx) {
        ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(this.x, this.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'red';
        if (Math.floor(Date.now() / 200) % 2 === 0) {
            ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, Math.PI * 2); ctx.fill();
        }
    }
}

class CpuParticle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color; this.life = 1.0;
        this.velocity = { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 };
    }
    update() {
        this.x += this.velocity.x; this.y += this.velocity.y; this.life -= 0.05;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}