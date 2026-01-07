/* ==================================================
   1. GESTIÓN DEL MODELO DE IA (OPTIMIZADO)
   ================================================== */
class CpuDefenderAI {
    constructor() {
        this.model = null;
        this.isTrained = false;
        this.isTraining = false;
    }

    generateDataset(samples = 1000) {
        return tf.tidy(() => {
            const inputs = [];
            const outputs = [];

            for (let i = 0; i < samples; i++) {
                const score = Math.random() * 5000;
                const health = Math.random() * 100;
                const enemies = Math.floor(Math.random() * 20);
                const time = Math.random() * 5000;

                inputs.push([score/5000, health/100, enemies/20, time/5000]);

                let label = 1; // Normal por defecto
                
                // --- REGLAS AGRESIVAS ---
                // Si tienes poca vida -> Ayuda (0)
                if (health < 30 || (health < 50 && enemies > 12)) {
                    label = 0; 
                } 
                // Si juegas mínimamente bien -> Hardcore (2)
                // Bajamos el score requerido a 150 para que suba de nivel RÁPIDO
                else if (health > 60 && score > 150 && enemies < 10) {
                    label = 2; 
                }

                const outputRow = [0, 0, 0];
                outputRow[label] = 1;
                outputs.push(outputRow);
            }
            return { xs: tf.tensor2d(inputs), ys: tf.tensor2d(outputs) };
        });
    }

    async trainModel() {
        if (this.isTraining) return;
        this.isTraining = true;

        this.model = tf.sequential();
        this.model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [4] }));
        this.model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
        this.model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

        this.model.compile({ optimizer: tf.train.adam(0.01), loss: 'categoricalCrossentropy', metrics: ['accuracy'] }); // Learning rate 0.01 para aprender rápido

        const data = this.generateDataset();
        
        await this.model.fit(data.xs, data.ys, {
            epochs: 5, // Un par de épocas más para asegurar precisión
            shuffle: true,
            yieldEvery: 'batch',
            callbacks: { onEpochEnd: async () => await tf.nextFrame() }
        });

        data.xs.dispose(); data.ys.dispose();
        this.isTrained = true; this.isTraining = false;
        console.log(">> IA LISTA PARA EL COMBATE.");
    }

    predict(score, health, enemies, time) {
        if (!this.isTrained || !this.model) return 1;
        return tf.tidy(() => {
            const input = tf.tensor2d([[ score / 5000.0, health / 100.0, enemies / 20.0, time / 5000.0 ]]);
            return this.model.predict(input).argMax(1).dataSync()[0];
        });
    }
}
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
  
  if (currentListId === 'list-pro') return alert("¡BLOQUEADO! Requiere Coin.");

  if (gameName.includes('pong')) playMinigame('pong');
  else if (gameName.includes('snake')) playMinigame('snake');
  else if (gameName.includes('cpu')) playMinigame('cpu');
});
// Función global para el Toggle desde HTML
window.toggleMLMode = function() {
    if(activeCpuGameInstance) {
        const toggle = document.getElementById('mlToggle');
        activeCpuGameInstance.setMLMode(toggle.checked);
    }
};

window.playMinigame = function(gameType) {
    const overlay = document.getElementById('game-overlay');
    const gameArea = document.getElementById('game-area');
    const title = document.getElementById('game-title');
    const mlContainer = document.querySelector('.ml-switch-container');
    
    if (gameInterval) clearInterval(gameInterval);
    if (activeCpuGameInstance) { activeCpuGameInstance.destroy(); activeCpuGameInstance = null; }
    
    document.getElementById('mlToggle').checked = false; 
    
    gameArea.innerHTML = ''; // Limpiar canvas previo
    // Reinsertar elementos de Overlay necesarios
    gameArea.innerHTML += `
        <div id="challenge-announcement" class="challenge-overlay" style="display: none;">
            <h1 class="glitch-text" id="announcement-title">CPU OVERDRIVE</h1>
            <p id="announcement-subtitle">AI DIFFICULTY ENABLED</p>
        </div>
        <div id="ai-loading" class="challenge-overlay" style="display: none; background: rgba(0,0,0,0.8);">
            <div class="spinner"></div>
            <p style="margin-top: 20px; color: #00f3ff;">TRAINING NEURAL NETWORK...</p>
        </div>
    `;

    overlay.classList.add('active');
    if (title) title.innerText = gameType.toUpperCase();

    if (gameType === 'cpu') {
        mlContainer.style.display = 'flex';
        startCpuDefender(); 
    } else {
        mlContainer.style.display = 'none';
        if (gameType === 'snake') startSnake();
        if (gameType === 'pong') startPong();
    }
};

window.closeMinigame = function() {
    if (gameInterval) clearInterval(gameInterval);
    if (activeCpuGameInstance) { activeCpuGameInstance.destroy(); activeCpuGameInstance = null; }
    document.getElementById('game-area').innerHTML = '';
    document.getElementById('game-overlay').classList.remove('active');
};

function createGameCanvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.style.maxWidth = '100%'; 
    document.getElementById('game-area').appendChild(c);
    return { canvas: c, ctx: c.getContext('2d') };
}

function updateScore(v) { document.getElementById('game-score').innerText = typeof v === 'number' ? 'SCORE: ' + v : v; }

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

// -----------------------------------------------------------
// CPU DEFENDER
// -----------------------------------------------------------
// -----------------------------------------------------------
// CPU DEFENDER
// -----------------------------------------------------------
function startCpuDefender() {
    const gameArea = document.getElementById('game-area');
    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 500;
    canvas.style.cursor = 'crosshair';
    canvas.style.backgroundColor = '#1a2f1a';

    const ui = document.createElement('div');
    ui.className = 'ui-layer';
    ui.innerHTML = `
        <div id="ai-hud" class="ai-status-hud" style="display:none;">
            <span id="ai-level-text">AI LEVEL: OFF</span>
            <small id="ai-desc-text">MANUAL MODE</small>
        </div>

        <div class="hud-controls">
            <button class="btn-cpu" id="btn-repair">🔧 REPAIR<span>(Cost: 500)</span></button>
        </div>
        <div id="cpu-game-over" class="cpu-game-over-msg" style="display:none;">
            <h2 style="color:red;">SYSTEM FAILURE</h2>
            <p>Score: <span id="final-cpu-score">0</span></p>
            <p style="font-size:0.7rem; color:#aaa;">Click ✕ to Reset</p>
        </div>
    `;
    gameArea.appendChild(canvas);
    gameArea.appendChild(ui);

    activeCpuGameInstance = new CpuGame(canvas);
    document.getElementById('btn-repair').onclick = () => activeCpuGameInstance.repairCpu();
}

/* -----------------------------------------------------------
   CLASE PRINCIPAL DEL JUEGO (CORREGIDA)
   ----------------------------------------------------------- */
class CpuGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.state = 'playing';
        this.score = 0;
        
        // VARIABLE NUEVA PARA PAUSAR DURANTE INTRO
        this.isPaused = false; 

        this.ai = new CpuDefenderAI();

        // Variables de Estado IA
        this.mlModeActive = false;
        this.evaluationPhase = false;
        this.evaluationTimer = 0;
        this.currentLevel = 1; 
        this.levelTimeSeconds = 0; 
        this.aiUpdateTimer = 0;

        // Entidades
        this.cpu = new CpuEntity(this.width / 2, this.height / 2);
        this.player = new CpuPlayer(this.width / 2, this.height / 2 + 100);
        this.bullets = [];
        this.enemies = [];
        this.enemyMines = [];
        this.particles = [];

        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.frameCount = 0;
        this.enemySpawnRate = 120;

        // Listeners
        window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
        this.canvas.addEventListener('mousemove', e => {
            const r = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - r.left;
            this.mouse.y = e.clientY - r.top;
        });
        this.canvas.addEventListener('mousedown', () => {
            if (this.state === 'playing' && !this.isPaused) this.player.shoot(this);
        });

        this.loop();
    }

    // --- AQUÍ ESTÁ EL CAMBIO PRINCIPAL ---
    async setMLMode(active) {
        this.mlModeActive = active;
        const hud = document.getElementById('ai-hud');
        
        if (active) {
            // 1. CONGELAR EL JUEGO INMEDIATAMENTE
            this.isPaused = true; 
            
            hud.style.display = 'flex';
            this.updateHUD("INITIALIZING...", "PLEASE WAIT");
            
            // 2. PANTALLA DE CARGA (ENTRENAMIENTO)
            this.setLoading(true);
            
            // Esperar un momento para que la UI se pinte antes de bloquear con el entrenamiento
            await new Promise(r => setTimeout(r, 100));
            
            // Entrenar modelo (esto bloquea unos milisegundos)
            if (!this.ai.isTrained) await this.ai.trainModel();
            
            this.setLoading(false);

            // 3. MOSTRAR TÍTULO "CPU OVERDRIVE"
            this.showAnnouncement("CPU OVERDRIVE", "AI TAKING CONTROL");

            // 4. ESPERAR 2.5 SEGUNDOS (MIRA EL TÍTULO, EL JUEGO SIGUE PAUSADO)
            await new Promise(r => setTimeout(r, 2500));

            // 5. ARRANCAR EL JUEGO AHORA SÍ
            this.isPaused = false; 
            
            // Configurar inicio de nivel
            this.currentLevel = 1;
            this.levelTimeSeconds = 0;
            this.evaluationPhase = true;
            this.evaluationTimer = 0;
            
            this.updateHUD("AI LEVEL: 1", "WARMING UP");

        } else {
            // APAGAR IA
            hud.style.display = 'none';
            this.currentLevel = 1;
            this.enemySpawnRate = 120;
            this.isPaused = false; // Asegurar que se despausa si se apaga el switch
        }
    }

    updateHUD(levelTitle, subText) {
        const title = document.getElementById('ai-level-text');
        const desc = document.getElementById('ai-desc-text');
        if(title && desc) {
            title.innerText = levelTitle;
            desc.innerText = subText;
            
            if(levelTitle.includes("3")) title.style.color = "#ff0000"; 
            else if(levelTitle.includes("2")) title.style.color = "#ffa500"; 
            else title.style.color = "#00ff00"; 
        }
    }

    update() {
        // --- BLOQUEO DE PAUSA ---
        // Si el estado no es playing O si está pausado por la intro, no actualiza nada.
        if (this.state !== 'playing' || this.isPaused) return;

        this.frameCount++;
        this.player.update(this.keys, this.mouse, this.width, this.height);

        // ==========================================
        // LÓGICA DE IA Y NIVELES
        // ==========================================
        if (this.mlModeActive && this.ai.isTrained) {
            
            if (this.evaluationPhase) {
                this.evaluationTimer++;
                // Calibración rápida: 3 segundos (180 frames)
                if (this.evaluationTimer > 180) {
                    this.evaluationPhase = false;
                    this.updateHUD("AI LEVEL: 1", "ASSISTANCE MODE");
                }
            } else {
                // Evaluar cada segundo (60 frames)
                this.aiUpdateTimer++;
                if (this.aiUpdateTimer >= 60) {
                    this.aiUpdateTimer = 0;
                    
                    const prediction = this.ai.predict(this.score, this.cpu.health, this.enemies.length, this.frameCount);
                    
                    // TRANSICIONES DE NIVEL
                    if (prediction === 2) { // La IA predice "Hardcore"
                        if (this.currentLevel === 1) {
                            this.currentLevel = 2;
                            this.levelTimeSeconds = 0;
                            this.showAnnouncement("LEVEL 2", "MINES DEPLOYED");
                            this.updateHUD("AI LEVEL: 2", "HARDCORE MODE");
                        } else if (this.currentLevel === 2) {
                            this.levelTimeSeconds++;
                            // Si aguantas 10 segundos en nivel 2 -> BERSERK
                            if (this.levelTimeSeconds >= 10) {
                                this.currentLevel = 3;
                                this.showAnnouncement("⚠ LEVEL 3 ⚠", "BERSERK OVERLOAD");
                                this.updateHUD("AI LEVEL: 3", "MAXIMUM OVERDRIVE");
                            }
                        }
                    } else if (prediction === 0) { // La IA predice "Ayuda"
                         if (this.currentLevel > 1) {
                            this.currentLevel = 1;
                            this.levelTimeSeconds = 0;
                            this.updateHUD("AI LEVEL: 1", "ASSISTANCE MODE");
                         }
                    }
                }
            }

            // APLICAR PARAMETROS SEGÚN NIVEL
            if (this.currentLevel === 1) {
                this.enemySpawnRate = 80;
            } 
            else if (this.currentLevel === 2) {
                this.enemySpawnRate = 50; 
                if(this.frameCount % 200 === 0) this.spawnMine();
            } 
            else if (this.currentLevel === 3) {
                this.enemySpawnRate = 25; 
                if(this.frameCount % 100 === 0) this.spawnMine();
            }

        } else {
            this.enemySpawnRate = 120; // Modo Manual
        }

        // ==========================================
        // SPAWN Y UPDATE DE ENTIDADES
        // ==========================================
        if (this.frameCount % this.enemySpawnRate === 0) this.spawnEnemy();

        this.bullets.forEach((b, i) => {
            b.update();
            if (b.offScreen(this.width, this.height)) this.bullets.splice(i, 1);
        });

        // Actualizar Enemigos
        this.enemies.forEach((e, ei) => {
            // Lógica BERSERK
            let speedMult = 1;
            if (this.currentLevel === 3 && this.mlModeActive) speedMult = 2.5; 
            
            e.update(this.cpu, speedMult);

            if (Math.hypot(e.x - this.cpu.x, e.y - this.cpu.y) < 40) {
                this.cpu.takeDamage(10);
                this.createExplosion(e.x, e.y, 5, 'red');
                this.enemies.splice(ei, 1);
                if (this.cpu.health <= 0) this.gameOver();
                return;
            }

            this.bullets.forEach((b, bi) => {
                if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
                    this.createExplosion(e.x, e.y, 8, '#ffaa00');
                    this.enemies.splice(ei, 1);
                    this.bullets.splice(bi, 1);
                    this.score += 50;
                    updateScore(this.score);
                }
            });
        });

        // Actualizar Minas
        this.enemyMines.forEach((m, mi) => {
            if(Math.hypot(m.x - this.cpu.x, m.y - this.cpu.y) < 100 && this.frameCount % 60 === 0) {
                 this.cpu.takeDamage(2);
                 this.createExplosion(this.cpu.x, this.cpu.y, 2, 'purple');
            }
            this.bullets.forEach((b, bi) => {
                if (Math.hypot(m.x - b.x, m.y - b.y) < 15) {
                    this.createExplosion(m.x, m.y, 15, 'cyan');
                    this.enemyMines.splice(mi, 1);
                    this.bullets.splice(bi, 1);
                    this.score += 150;
                    updateScore(this.score);
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

        const e = new CpuEnemy(x, y);
        if (this.currentLevel === 2) e.speed *= 1.5;
        this.enemies.push(e);
    }

    spawnMine() {
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 150;
        const mx = this.width/2 + Math.cos(angle) * dist;
        const my = this.height/2 + Math.sin(angle) * dist;
        this.enemyMines.push(new CpuMineEnemy(mx, my));
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#1a2f1a';
        ctx.fillRect(0, 0, this.width, this.height);

        this.drawCircuitLines(ctx);
        this.cpu.draw(ctx);
        this.enemyMines.forEach(m => m.draw(ctx));
        this.bullets.forEach(b => b.draw(ctx));
        
        this.enemies.forEach(e => {
            const isBerserk = (this.mlModeActive && this.currentLevel === 3);
            e.draw(ctx, isBerserk);
        });
        
        this.player.draw(ctx);
        this.particles.forEach(p => p.draw(ctx));
    }

    drawCircuitLines(ctx) {
        ctx.strokeStyle = '#2f4f2f'; ctx.lineWidth = 10; ctx.beginPath();
        ctx.moveTo(this.width / 2, 0); ctx.lineTo(this.width / 2, this.height);
        ctx.moveTo(0, this.height / 2); ctx.lineTo(this.width, this.height / 2); ctx.stroke();
    }
    repairCpu() {
        if (this.score >= 500 && this.cpu.health < 100) {
            this.score -= 500;
            this.cpu.health = Math.min(100, this.cpu.health + 30);
            this.createExplosion(this.cpu.x, this.cpu.y, 10, '#00ff00');
            updateScore(this.score);
        }
    }
    createExplosion(x, y, c, color) { for (let i = 0; i < c; i++) this.particles.push(new CpuParticle(x, y, color)); }
    setLoading(v) { document.getElementById('ai-loading').style.display = v ? 'flex' : 'none'; }
    showAnnouncement(t, s) {
        const a = document.getElementById('challenge-announcement');
        if (!a) return;
        document.getElementById('announcement-title').innerText = t;
        document.getElementById('announcement-subtitle').innerText = s;
        a.style.display = 'flex';
        setTimeout(() => a.style.display = 'none', 2000);
    }
    gameOver() {
        this.state = 'gameover';
        document.getElementById('cpu-game-over').style.display = 'block';
        document.getElementById('final-cpu-score').innerText = this.score;
    }
    destroy() { this.state = 'destroyed'; cancelAnimationFrame(this.animationId); }
    loop() {
        if (this.state !== 'destroyed') {
            this.update(); this.draw();
            if (this.state === 'playing') requestAnimationFrame(() => this.loop());
        }
    }
}
/* --- CLASES VISUALES (ACTUALIZADAS PARA BERSERK) --- */
class CpuEntity { 
    constructor(x, y) { this.x = x; this.y = y; this.size = 60; this.health = 100; }
    draw(ctx) {
        ctx.fillStyle = '#005555'; ctx.fillRect(this.x - 30, this.y - 30, 60, 60);
        ctx.fillStyle = '#00ffff'; ctx.fillRect(this.x - 20, this.y - 20, 40, 40);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(this.x-30, this.y-30, 60, 60);
        ctx.fillStyle = 'red'; ctx.fillRect(this.x - 40, this.y - 50, 80, 8);
        ctx.fillStyle = '#00ff00'; ctx.fillRect(this.x - 40, this.y - 50, 80 * (this.health / 100), 8);
    }
    takeDamage(n) { this.health -= n; }
}
class CpuPlayer { 
    constructor(x, y) { this.x = x; this.y = y; this.angle = 0; this.speed = 4; }
    update(keys, mouse, w, h) {
        if (keys['w']) this.y -= 4; if (keys['s']) this.y += 4; if (keys['a']) this.x -= 4; if (keys['d']) this.x += 4;
        this.x = Math.max(20, Math.min(w-20, this.x)); this.y = Math.max(20, Math.min(h-20, this.y));
        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    }
    shoot(g) { g.bullets.push(new CpuBullet(this.x, this.y, {x:Math.cos(this.angle)*10, y:Math.sin(this.angle)*10})); }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = '#cca300'; ctx.fillRect(5, -4, 25, 8); 
        ctx.fillStyle = '#888'; ctx.fillRect(-15, -15, 30, 30);
        ctx.fillStyle = '#fff'; ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
    }
}
class CpuBullet {
    constructor(x, y, v) { this.x = x; this.y = y; this.velocity = v; this.radius = 4; }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; }
    offScreen(w, h) { return this.x < 0 || this.x > w || this.y < 0 || this.y > h; }
    draw(ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, 4, 0, Math.PI*2); ctx.fillStyle='yellow'; ctx.fill(); }
}
class CpuEnemy {
    constructor(x, y) { this.x=x; this.y=y; this.speed=1.5+Math.random(); this.radius=12; }
    // Update recibe multiplicador de velocidad (berserk)
    update(t, mult = 1) { 
        const dx=t.x-this.x, dy=t.y-this.y, d=Math.hypot(dx,dy); 
        const currentSpeed = this.speed * mult;
        this.x+=(dx/d)*currentSpeed; 
        this.y+=(dy/d)*currentSpeed; 
    }
    draw(ctx, isBerserk = false) { 
        // Si es berserk, color Naranja/Rojo brillante
        ctx.fillStyle = isBerserk ? '#ff5500' : '#d32f2f'; 
        ctx.beginPath(); ctx.arc(this.x, this.y, 12, 0, Math.PI*2); ctx.fill(); 
        ctx.strokeStyle='#fff'; ctx.stroke(); 
    }
}
class CpuMineEnemy {
    constructor(x, y) { this.x = x; this.y = y; }
    draw(ctx) {
        const pulse = (Math.sin(Date.now() / 100) + 1) * 5; 
        ctx.fillStyle = `rgba(255, 0, 255, 0.6)`;
        ctx.beginPath(); ctx.arc(this.x, this.y, 10 + pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.x, this.y, 8, 0, Math.PI * 2); ctx.fill();
    }
}
class CpuParticle {
    constructor(x, y, c) { this.x=x; this.y=y; this.c=c; this.life=1.0; this.vx=(Math.random()-.5)*5; this.vy=(Math.random()-.5)*5; }
    update() { this.x+=this.vx; this.y+=this.vy; this.life-=0.05; }
    draw(ctx) { ctx.globalAlpha=Math.max(0,this.life); ctx.fillStyle=this.c; ctx.fillRect(this.x,this.y,4,4); ctx.globalAlpha=1.0; }
}