/* ==================================================
   1. GESTIÓN DE IA (CARGA + EJECUCIÓN)
   ================================================== */
class CpuDefenderAI {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.loadAttempts = 0;
        this.maxAttempts = 3;
    }

    async loadModel() {
        try {
            console.log("🔄 Intentando cargar modelo de IA...");
            this.model = await tf.loadLayersModel('./model/model.json');
            if (!this.model) throw new Error("Modelo es null después de carga");

            const inputShape = this.model.inputs[0].shape;
            console.log("📊 Forma de entrada del modelo:", inputShape);

            const testInput = tf.tensor2d([[0.5, 0.5, 0.5, 0.5]]);
            const testOutput = this.model.predict(testInput);
            testInput.dispose();
            testOutput.dispose();

            this.isLoaded = true;
            console.log("✅ IA CARGADA Y LISTA.");
            return true;
        } catch (error) {
            console.error("❌ ERROR CARGANDO IA:", error);
            this.loadAttempts++;
            if (this.loadAttempts < this.maxAttempts) {
                console.log(`🔄 Reintentando... (${this.loadAttempts}/${this.maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.loadModel();
            }
            alert("⚠️ Error al cargar modelo de IA\n\nRevisa la consola (F12) para más detalles.");
            return false;
        }
    }

    predict(score, health, enemies, time) {
        if (!this.isLoaded || !this.model) {
            console.warn("⚠️ Modelo no cargado, usando dificultad NORMAL por defecto");
            return 1;
        }
        return tf.tidy(() => {
            const normalizedInput = [
                score / 5000.0,
                health / 100.0,
                enemies / 20.0,
                time / 5000.0
            ];
            const inputTensor = tf.tensor2d([normalizedInput]);
            const prediction = this.model.predict(inputTensor);
            const probabilities = prediction.dataSync();
            const classIndex = prediction.argMax(1).dataSync()[0];
            return { classIndex, probabilities: Array.from(probabilities) };
        });
    }
}

/* ==================================================
   2. UI Y NAVEGACIÓN
   ================================================== */
let currentIndex = 0;
let currentListId = 'list-minigames';
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playBtn = document.getElementById('playBtn');

function switchCategory(c, b) {
    currentIndex = 0;
    document.querySelectorAll('.cat-btn').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.game-display').forEach(l => l.classList.remove('active-list'));
    currentListId = c === 'minigames' ? 'list-minigames' : 'list-pro';
    document.getElementById(currentListId).classList.add('active-list');
    updateGallery();
}
function updateGallery() {
    document.getElementById(currentListId).style.transform = `translateX(${currentIndex * -100}%)`;
}
function getActiveCards() {
    return document.getElementById(currentListId).querySelectorAll('.game-card');
}
nextBtn.onclick = () => {
    const c = getActiveCards();
    currentIndex = (currentIndex < c.length - 1) ? currentIndex + 1 : 0;
    updateGallery();
};
prevBtn.onclick = () => {
    const c = getActiveCards();
    currentIndex = (currentIndex > 0) ? currentIndex - 1 : c.length - 1;
    updateGallery();
};

var gameInterval = null;
var activeCpuGameInstance = null;

playBtn.addEventListener('click', () => {
    const cards = getActiveCards();
    const name = cards[currentIndex].querySelector('h3').innerText.toLowerCase();
    if (currentListId === 'list-pro') return alert("¡BLOQUEADO!");
    if (name.includes('pong')) playMinigame('pong');
    else if (name.includes('snake')) playMinigame('snake');
    else if (name.includes('cpu')) playMinigame('cpu');
});

window.toggleMLMode = function () {
    if (activeCpuGameInstance) {
        setTimeout(() => {
            activeCpuGameInstance.setMLMode(document.getElementById('mlToggle').checked);
        }, 50);
    }
};

window.playMinigame = function (type) {
    const overlay = document.getElementById('game-overlay');
    const gameArea = document.getElementById('game-area');
    const title = document.getElementById('game-title');

    if (gameInterval) clearInterval(gameInterval);
    if (activeCpuGameInstance) { activeCpuGameInstance.destroy(); activeCpuGameInstance = null; }
    document.getElementById('mlToggle').checked = false;

    gameArea.innerHTML = '';
    gameArea.innerHTML += `
        <div id="challenge-announcement" class="challenge-overlay" style="display: none;">
            <h1 class="glitch-text" id="announcement-title">CPU OVERDRIVE</h1>
            <p id="announcement-subtitle">AI DIFFICULTY ENABLED</p>
        </div>
        <div id="ai-loading" class="challenge-overlay" style="display: none; background: #000; z-index: 500;">
            <div class="spinner"></div>
            <p id="loading-text" style="margin-top: 20px; color: #00ff00; font-family: 'Courier Prime'; text-align:center;">CARGANDO CEREBRO...</p>
        </div>
    `;

    overlay.classList.add('active');
    if (title) title.innerText = type.toUpperCase();

    if (type === 'cpu') {
        document.querySelector('.ml-switch-container').style.display = 'flex';
        startCpuDefender();
    } else {
        document.querySelector('.ml-switch-container').style.display = 'none';
        if (type === 'snake') startSnake();
        if (type === 'pong') startPong();
    }
};

window.closeMinigame = function () {
    if (gameInterval) clearInterval(gameInterval);
    if (activeCpuGameInstance) { activeCpuGameInstance.destroy(); activeCpuGameInstance = null; }
    document.getElementById('game-area').innerHTML = '';
    document.getElementById('game-overlay').classList.remove('active');
};

function createGameCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.style.maxWidth = '100%';
    document.getElementById('game-area').appendChild(c);
    return { canvas: c, ctx: c.getContext('2d') };
}
function updateScore(v) {
    document.getElementById('game-score').innerText = typeof v === 'number' ? 'SCORE: ' + v : v;
}

/* ==================================================
   2.1 MINIGAMES
   ================================================== */
function startSnake() {
    const { ctx, canvas } = createGameCanvas(600, 400);
    let s = [{ x: 10, y: 10 }], d = { x: 1, y: 0 }, f = { x: 15, y: 15 }, sc = 0, r = true;

    document.onkeydown = e => {
        if (e.key.startsWith('Arrow')) {
            d = {
                x: e.key == 'ArrowUp' ? 0 : e.key == 'ArrowDown' ? 0 : e.key == 'ArrowLeft' ? -1 : 1,
                y: e.key == 'ArrowUp' ? -1 : e.key == 'ArrowDown' ? 1 : 0
            };
        }
    };

    gameInterval = setInterval(() => {
        if (!r) return;
        let h = { x: s[0].x + d.x, y: s[0].y + d.y };

        if (h.x < 0 || h.x >= 30 || h.y < 0 || h.y >= 20 || s.some(seg => seg.x === h.x && seg.y === h.y)) {
            r = false;
            return;
        }

        s.unshift(h);

        if (h.x === f.x && h.y === f.y) {
            sc += 10;
            updateScore(sc);
            f = { x: Math.floor(Math.random() * 30), y: Math.floor(Math.random() * 20) };
        } else {
            s.pop();
        }

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 600, 400);

        ctx.fillStyle = 'orange';
        s.forEach(p => ctx.fillRect(p.x * 20 + 1, p.y * 20 + 1, 18, 18));

        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.arc(f.x * 20 + 10, f.y * 20 + 10, 8, 0, 7);
        ctx.fill();
    }, 100);
}

function startPong() {
    const { ctx, canvas } = createGameCanvas(600, 400);
    let b = { x: 300, y: 200, dx: 4, dy: 4 }, p = { y: 150 }, c = { y: 150 }, r = true;

    canvas.onmousemove = e => p.y = e.clientY - canvas.getBoundingClientRect().top - 40;

    gameInterval = setInterval(() => {
        if (!r) return;

        b.x += b.dx;
        b.y += b.dy;

        if (b.y <= 0 || b.y >= 400) b.dy *= -1;

        if ((b.x < 20 && b.y > p.y && b.y < p.y + 80) || (b.x > 580 && b.y > c.y && b.y < c.y + 80)) {
            b.dx *= -1.1;
        }

        if (b.x < 0 || b.x > 600) {
            b.x = 300;
            b.dx = 4 * (Math.random() > .5 ? 1 : -1);
        }

        c.y += (b.y - (c.y + 40)) * 0.1;

        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 600, 400);

        ctx.fillStyle = 'orange';
        ctx.fillRect(10, p.y, 10, 80);
        ctx.fillRect(580, c.y, 10, 80);

        ctx.fillStyle = 'lime';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, 7);
        ctx.fill();
    }, 16);
}

/* ==================================================
   3. CPU DEFENDER
   ================================================== */
function startCpuDefender() {
    const gameArea = document.getElementById('game-area');

    const canvas = document.createElement('canvas');
    canvas.width = 700;
    canvas.height = 600;
    canvas.style.cursor = 'crosshair';
    canvas.style.backgroundColor = '#1a2f1a';

    const ui = document.createElement('div');
    ui.className = 'ui-layer';
    ui.innerHTML = `
        <div class="hud-controls">
            <button class="btn-cpu" id="btn-repair">🔧 REPAIR<span>(500)</span></button>
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

class CpuGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.state = 'playing';
        this.score = 0;

        this.ai = new CpuDefenderAI();
        this.mlModeActive = false;

        this.introSequence = false;
        this.evaluationPhase = false;
        this.evaluationTimer = 0;

        this.currentLevel = 1;
        this.aiCheckTimer = 0;
        this.levelTimer = 0;

        // Munición
        this.maxAmmo = 50;
        this.ammo = this.maxAmmo;
        this.ammoBoxes = [];
        this.ammoBoxSpawnTimer = 0;

        // Probabilidades (crudas) para HUD
        this.aiProbabilities = [0.33, 0.33, 0.34]; // EASY, NORMAL, HARD

        // ===== Ruta A: EMA + histéresis + cooldown =====
        this.aiEma = { easy: 0.33, normal: 0.33, hard: 0.34 };
        this.aiCooldownFrames = 0;

        // UI progreso suave
        this.aiProgressSmooth = 0;

        // alerta ammo bajo
        this.lowAmmoWarned = false;

        // ===== Parámetros Ruta A =====
        this.AI_EMA_ALPHA = 0.20;
        this.AI_UP_TH = 0.72;
        this.AI_DOWN_TH = 0.78;       // (base) ahora será dinámico al bajar
        this.AI_NORMAL_LOCK = 0.55;
        this.AI_COOLDOWN_SEC = 4;
        this.AI_COOLDOWN_FRAMES = Math.floor(this.AI_COOLDOWN_SEC * 60);

        // ===== Asistencia inteligente (bajar) =====
        this.prevCpuHealth = 100;
        this.cpuDmgEma = 0;        // daño reciente al CPU (EMA)
        this.dangerEma = 0;        // estrés combinado (EMA)
        this.assistCounter = 0;    // confirma antes de bajar

        this.cpu = new CpuBase(this.width / 2, this.height - 60);
        this.player = new PlayerTank(this.width / 2, this.height - 150);

        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.tanks = [];
        this.particles = [];

        this.keys = {};
        this.frameCount = 0;
        this.enemySpawnRate = 120;
        this.shootCooldown = 0;

        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;

            if (['z', 'x', 'c', ' ', 'enter'].includes(e.key.toLowerCase())) {
                if (this.state === 'playing' && !this.introSequence && this.shootCooldown <= 0 && this.ammo > 0) {
                    this.player.shoot(this);
                    this.shootCooldown = 10;
                    this.ammo--;

                    // alerta ammo bajo
                    if (this.ammo <= 10 && !this.lowAmmoWarned && this.ammo > 0) {
                        this.lowAmmoWarned = true;
                        this.showAnnouncement("POCA MUNICIÓN", "RECOGE AMMO", 1200);
                    }

                    // game over sin ammo
                    if (this.ammo <= 0) {
                        this.showAnnouncement("SIN MUNICIÓN", "SISTEMA OFFLINE", 1600);
                        this.gameOver();
                        return;
                    }
                }
            }

            if (['q', 'e', 'shift'].includes(e.key.toLowerCase())) {
                this.repairCpu();
            }
        });
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);

        this.loop();
    }

    showAnnouncement(t, s, d = 2000) {
        const a = document.getElementById('challenge-announcement');
        if (a) {
            document.getElementById('announcement-title').innerText = t;
            document.getElementById('announcement-subtitle').innerText = s;
            a.style.display = 'flex';
            setTimeout(() => { a.style.display = 'none'; }, d);
        }
    }

    setLoading(v, t) {
        const l = document.getElementById('ai-loading');
        if (l) {
            if (t) document.getElementById('loading-text').innerText = t;
            l.style.display = v ? 'flex' : 'none';
        }
    }

    resetAiFilterState() {
        this.aiEma = { easy: 0.33, normal: 0.33, hard: 0.34 };
        this.aiCooldownFrames = 0;
        this.aiProgressSmooth = 0;
        this.levelTimer = 0;

        // asistencia
        this.prevCpuHealth = 100;
        this.cpuDmgEma = 0;
        this.dangerEma = 0;
        this.assistCounter = 0;
    }

    async setMLMode(active) {
        this.mlModeActive = active;

        if (active) {
            this.introSequence = true;
            this.enemies = [];
            this.tanks = [];
            this.enemyBullets = [];

            this.setLoading(true, "CARGANDO MODELO IA...");

            setTimeout(async () => {
                try {
                    if (!this.ai.isLoaded) {
                        const success = await this.ai.loadModel();
                        if (!success) throw new Error("Fallo carga");
                    }

                    this.setLoading(false);
                    this.showAnnouncement("SISTEMA IA", "ONLINE", 1500);
                    await new Promise(r => setTimeout(r, 1500));

                    this.showAnnouncement("NIVEL 1", "ROBOTS SIMPLES", 1500);
                    await new Promise(r => setTimeout(r, 1500));

                    this.introSequence = false;
                    this.evaluationPhase = true;
                    this.evaluationTimer = 0;

                    this.currentLevel = 1;
                    this.enemySpawnRate = 90;

                    this.maxAmmo = 50;
                    this.ammo = this.maxAmmo;
                    this.lowAmmoWarned = false;

                    this.resetAiFilterState();
                } catch (e) {
                    console.error(e);
                    this.setLoading(false);
                    this.mlModeActive = false;
                    this.introSequence = false;
                    document.getElementById('mlToggle').checked = false;
                }
            }, 100);
        } else {
            this.introSequence = false;
            this.currentLevel = 1;
            this.enemySpawnRate = 120;

            this.maxAmmo = 50;
            this.ammo = this.maxAmmo;
            this.lowAmmoWarned = false;

            this.showAnnouncement("MODO MANUAL", "IA DESACTIVADA");
            this.resetAiFilterState();
        }
    }

    repairCpu() {
        if (this.score >= 500 && this.cpu.health < 100) {
            this.score -= 500;
            this.cpu.health = Math.min(100, this.cpu.health + 30);
            this.createExplosion(this.cpu.x, this.cpu.y, 10, '#00ff00');
            updateScore(this.score);
        }
    }

    createExplosion(x, y, c, color) {
        for (let i = 0; i < c; i++) this.particles.push(new Particle(x, y, color));
    }

    spawnAmmoBox() {
        const x = 50 + Math.random() * (this.width - 100);
        this.ammoBoxes.push(new AmmoBox(x, -30));
    }

    update() {
        if (this.state !== 'playing') return;
        if (this.introSequence) return;

        this.frameCount++;
        if (this.shootCooldown > 0) this.shootCooldown--;

        this.player.update(this.keys, this.width, this.height);

        // ===== IA + NIVELES (Ruta A) =====
        if (this.mlModeActive && this.ai.isLoaded) {
            if (this.evaluationPhase) {
                this.evaluationTimer++;
                if (this.evaluationTimer > 120) {
                    this.evaluationPhase = false;
                    this.showAnnouncement("CALIBRACION", "COMPLETA");
                }
            }

            this.aiCheckTimer++;
            if (this.aiCheckTimer > 30) { // ~0.5s
                this.aiCheckTimer = 0;

                // cooldown (como evaluamos cada 30 frames, consumimos en bloques)
                if (this.aiCooldownFrames > 0) this.aiCooldownFrames -= 30;
                if (this.aiCooldownFrames < 0) this.aiCooldownFrames = 0;

                const result = this.ai.predict(this.score, this.cpu.health, this.enemies.length, this.frameCount);
                this.aiProbabilities = result.probabilities;

                const pEasy = this.aiProbabilities[0] ?? 0.33;
                const pNormal = this.aiProbabilities[1] ?? 0.33;
                const pHard = this.aiProbabilities[2] ?? 0.34;

                // EMA
                const a = this.AI_EMA_ALPHA;
                this.aiEma.easy = a * pEasy + (1 - a) * this.aiEma.easy;
                this.aiEma.normal = a * pNormal + (1 - a) * this.aiEma.normal;
                this.aiEma.hard = a * pHard + (1 - a) * this.aiEma.hard;

                const canChange =
                    this.aiCooldownFrames === 0 &&
                    !this.evaluationPhase &&
                    !this.introSequence;

                if (canChange) {
                    // Si NORMAL domina, no tocar (reduce jitter)
                    if (this.aiEma.normal < this.AI_NORMAL_LOCK) {
                        // ===== SUBIR NIVEL (igual que estaba) =====
                        if (this.aiEma.hard >= this.AI_UP_TH) {
                            if (this.currentLevel === 1) {
                                this.currentLevel = 2;
                                this.levelTimer = 0;
                                this.maxAmmo = 75;
                                this.showAnnouncement("NIVEL 2", "¡ROBOTS ARMADOS!");
                                this.aiCooldownFrames = this.AI_COOLDOWN_FRAMES;
                            } else if (this.currentLevel === 2) {
                                this.levelTimer++;
                                if (this.levelTimer > 8) { // ~4s sosteniendo hard
                                    this.currentLevel = 3;
                                    this.maxAmmo = 100;
                                    this.showAnnouncement("NIVEL 3", "¡TANQUES EXPLOSIVOS!");
                                    this.aiCooldownFrames = this.AI_COOLDOWN_FRAMES;
                                }
                            }
                        } else {
                            if (this.currentLevel === 2) this.levelTimer = 0;
                        }

                        // ===== BAJAR NIVEL (asistencia inteligente) =====
                        const currentHealth = this.cpu.health;

                        // daño reciente al CPU (por intervalo)
                        const prevH = (this.prevCpuHealth ?? currentHealth);
                        const healthLoss = Math.max(0, prevH - currentHealth);
                        this.prevCpuHealth = currentHealth;

                        const dmgAlpha = 0.25;
                        this.cpuDmgEma = dmgAlpha * healthLoss + (1 - dmgAlpha) * (this.cpuDmgEma ?? 0);

                        // presión de enemigos
                        const enemyPressure = Math.min(1, this.enemies.length / 15);

                        // presión de munición (si estás seco, sube estrés un poco)
                        const ammoPressure = 1 - (this.ammo / Math.max(1, this.maxAmmo)); // 0..1

                        // estrés combinado (pesos ajustables)
                        const dangerNow =
                            (1 - currentHealth / 100) * 0.60 +
                            enemyPressure * 0.30 +
                            ammoPressure * 0.10;

                        // EMA del estrés
                        const dangerAlpha = 0.20;
                        this.dangerEma = dangerAlpha * dangerNow + (1 - dangerAlpha) * (this.dangerEma ?? 0);

                        // umbral dinámico: baja antes si la vida está baja
                        const dynamicDownTh =
                            this.AI_DOWN_TH - 0.18 * (1 - currentHealth / 100); // hasta ~0.60

                        const isCritical = (currentHealth <= 45) || (this.cpuDmgEma >= 3);

                        // asistencia si:
                        // - easyEMA supera umbral dinámico Y hard no pelea
                        // - o estrés alto
                        // - o emergencia directa
                        const shouldAssist =
                            (this.aiEma.easy >= dynamicDownTh && this.aiEma.hard < 0.55) ||
                            (this.dangerEma >= 0.62) ||
                            isCritical;

                        if (this.currentLevel > 1 && shouldAssist) {
                            this.assistCounter++;
                        } else {
                            this.assistCounter = 0;
                        }

                        // confirmar 2 checks (~1s)
                        if (this.currentLevel > 1 && this.assistCounter >= 2) {
                            this.currentLevel = Math.max(1, this.currentLevel - 1);
                            this.maxAmmo = this.currentLevel === 1 ? 50 : 75;
                            this.showAnnouncement("ASISTENCIA", "BAJANDO DIFICULTAD");
                            this.aiCooldownFrames = this.AI_COOLDOWN_FRAMES;
                            this.levelTimer = 0;
                            this.assistCounter = 0;
                        }
                    }
                }
            }

            // spawn rate por nivel
            if (this.currentLevel === 1) this.enemySpawnRate = 90;
            if (this.currentLevel === 2) this.enemySpawnRate = 60;
            if (this.currentLevel === 3) this.enemySpawnRate = 50;
        } else {
            this.enemySpawnRate = 120;
        }

        // Spawn cajas de munición
        this.ammoBoxSpawnTimer++;
        const ammoSpawnRate = this.currentLevel === 1 ? 300 : this.currentLevel === 2 ? 250 : 200;
        if (this.ammoBoxSpawnTimer > ammoSpawnRate) {
            this.spawnAmmoBox();
            this.ammoBoxSpawnTimer = 0;
        }

        // actualizar cajas
        this.ammoBoxes.forEach((box, i) => {
            box.update();
            if (box.y > this.height) {
                this.ammoBoxes.splice(i, 1);
                return;
            }

            // colisión con jugador
            if (Math.hypot(box.x - this.player.x, box.y - this.player.y) < 25) {
                const ammoGain = this.currentLevel === 1 ? 20 : this.currentLevel === 2 ? 30 : 40;
                this.ammo = Math.min(this.maxAmmo, this.ammo + ammoGain);
                if (this.ammo > 10) this.lowAmmoWarned = false;
                this.createExplosion(box.x, box.y, 8, '#ffcc00');
                this.ammoBoxes.splice(i, 1);
            }

            // disparar cajas
            this.bullets.forEach((b, bi) => {
                if (Math.hypot(box.x - b.x, box.y - b.y) < 20) {
                    const ammoGain = this.currentLevel === 1 ? 20 : this.currentLevel === 2 ? 30 : 40;
                    this.ammo = Math.min(this.maxAmmo, this.ammo + ammoGain);
                    if (this.ammo > 10) this.lowAmmoWarned = false;
                    this.createExplosion(box.x, box.y, 8, '#ffcc00');
                    this.ammoBoxes.splice(i, 1);
                    this.bullets.splice(bi, 1);
                }
            });
        });

        if (this.frameCount % this.enemySpawnRate === 0) this.spawnEnemy();

        this.bullets.forEach((b, i) => {
            b.update();
            if (b.y < 0) this.bullets.splice(i, 1);
        });

        this.enemyBullets.forEach((b, i) => {
            b.update();
            if (b.y > this.height) {
                this.enemyBullets.splice(i, 1);
                return;
            }

            if (Math.hypot(b.x - this.player.x, b.y - this.player.y) < 20) {
                this.cpu.takeDamage(5);
                this.createExplosion(this.player.x, this.player.y, 5, '#ff6600');
                this.enemyBullets.splice(i, 1);
                if (this.cpu.health <= 0) this.gameOver();
            }
        });

        this.enemies.forEach((e, ei) => {
            e.update(this);

            if (e.y > this.height - 90) {
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

        this.tanks.forEach((t, ti) => {
            t.update(this);

            if (t.y > this.height - 90) {
                this.cpu.takeDamage(20);
                this.createExplosion(t.x, t.y, 15, '#ff0000');
                this.tanks.splice(ti, 1);
                if (this.cpu.health <= 0) this.gameOver();
                return;
            }

            this.bullets.forEach((b, bi) => {
                if (Math.hypot(t.x - b.x, t.y - b.y) < 20) {
                    this.createExplosion(t.x, t.y, 20, '#ff6600');

                    const explosionRadius = 80;
                    this.enemies.forEach((e, ei2) => {
                        if (Math.hypot(e.x - t.x, e.y - t.y) < explosionRadius) {
                            this.createExplosion(e.x, e.y, 8, '#ffaa00');
                            this.enemies.splice(ei2, 1);
                            this.score += 25;
                        }
                    });

                    this.tanks.splice(ti, 1);
                    this.bullets.splice(bi, 1);
                    this.score += 200;
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
        const x = 50 + Math.random() * (this.width - 100);

        if (this.mlModeActive && this.currentLevel === 3 && Math.random() < 0.3) {
            this.tanks.push(new ExplosiveTank(x, -30, this.currentLevel));
            return;
        }

        const canShoot = this.mlModeActive && this.currentLevel >= 2;
        const e = new RobotEnemy(x, -30, canShoot);

        if (this.currentLevel === 2) e.speed *= 1.2;
        if (this.currentLevel === 3) e.speed *= 1.5;

        this.enemies.push(e);
    }

    draw() {
        const ctx = this.ctx;

        ctx.fillStyle = '#1a2f1a';
        ctx.fillRect(0, 0, this.width, this.height);

        this.drawCircuitLines(ctx);

        this.cpu.draw(ctx);
        this.tanks.forEach(t => t.draw(ctx));
        this.ammoBoxes.forEach(box => box.draw(ctx));
        this.enemyBullets.forEach(b => b.draw(ctx));
        this.bullets.forEach(b => b.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.player.draw(ctx);
        this.particles.forEach(p => p.draw(ctx));

        // HUD: Ammo
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'right';
        const lowAmmo = this.ammo <= 10;

        ctx.fillStyle = lowAmmo ? '#ff0000' : '#ffcc00';
        if (lowAmmo && Math.floor(Date.now() / 200) % 2 === 0) {
            ctx.fillStyle = '#ffffff';
        }
        ctx.fillText(`AMMO: ${this.ammo}/${this.maxAmmo}`, this.width - 20, 30);

        // HUD: IA
        if (this.mlModeActive) {
            ctx.textAlign = 'left';
            let lvlText = "AI: CALIBRANDO...";
            ctx.fillStyle = '#ffff00';

            if (!this.evaluationPhase && !this.introSequence) {
                if (this.currentLevel === 1) { lvlText = "AI LVL: 1"; ctx.fillStyle = '#00ff00'; }
                if (this.currentLevel === 2) { lvlText = "AI LVL: 2"; ctx.fillStyle = '#ffaa00'; }
                if (this.currentLevel === 3) { lvlText = "AI LVL: 3"; ctx.fillStyle = '#ff0000'; }
            }
            if (this.introSequence) lvlText = "AI: INICIANDO...";
            ctx.fillText(lvlText, 20, 30);

            if (!this.introSequence && !this.evaluationPhase) {
                const barX = 20;
                const barY = 45;
                const barWidth = 200;
                const barHeight = 20;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(barX, barY, barWidth, barHeight);

                const easyWidth = barWidth * (this.aiProbabilities[0] ?? 0.33);
                const normalWidth = barWidth * (this.aiProbabilities[1] ?? 0.33);
                const hardWidth = barWidth * (this.aiProbabilities[2] ?? 0.34);

                ctx.fillStyle = '#00ff00';
                ctx.fillRect(barX, barY, easyWidth, barHeight);

                ctx.fillStyle = '#ffff00';
                ctx.fillRect(barX + easyWidth, barY, normalWidth, barHeight);

                ctx.fillStyle = '#ff0000';
                ctx.fillRect(barX + easyWidth + normalWidth, barY, hardWidth, barHeight);

                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(barX, barY, barWidth, barHeight);

                ctx.font = '8px "Press Start 2P"';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText('EASY', barX + 30, barY + 15);
                ctx.fillText('NORMAL', barX + 100, barY + 15);
                ctx.fillText('HARD', barX + 170, barY + 15);

                // Progreso hacia upgrade (EMA hard)
                if (this.currentLevel < 3) {
                    const progressBarY = barY + 25;
                    const target = Math.min(1, this.aiEma.hard / this.AI_UP_TH);
                    this.aiProgressSmooth += (target - this.aiProgressSmooth) * 0.12;

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                    ctx.fillRect(barX, progressBarY, barWidth, 10);

                    const isReady = this.aiEma.hard >= this.AI_UP_TH;
                    const pulse = Math.sin(Date.now() * 0.01) * 0.08 + 0.92;

                    ctx.fillStyle = isReady ? '#ff0000' : '#ffaa00';
                    if (isReady) ctx.globalAlpha = pulse;
                    ctx.fillRect(barX, progressBarY, barWidth * this.aiProgressSmooth, 10);
                    ctx.globalAlpha = 1;

                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(barX, progressBarY, barWidth, 10);

                    ctx.font = '7px "Press Start 2P"';
                    ctx.textAlign = 'left';
                    ctx.fillStyle = isReady ? '#ff0000' : '#ffffff';

                    const pct = Math.floor(this.aiProgressSmooth * 100);
                    const txt = isReady ? 'READY!' : `UPGRADE: ${pct}%`;
                    ctx.fillText(txt, barX, progressBarY + 22);

                    if (this.aiCooldownFrames > 0) {
                        ctx.fillStyle = '#aaa';
                        ctx.fillText(`COOLDOWN`, barX + 120, progressBarY + 22);
                    }
                }
            }
        }
    }

    drawCircuitLines(ctx) {
        ctx.strokeStyle = '#2f4f2f';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2, this.height);
        ctx.moveTo(0, this.height / 2);
        ctx.lineTo(this.width, this.height / 2);
        ctx.stroke();
    }

    gameOver() {
        if (this.state !== 'playing') return;
        this.state = 'gameover';
        document.getElementById('cpu-game-over').style.display = 'block';
        document.getElementById('final-cpu-score').innerText = this.score;
    }

    destroy() {
        this.state = 'destroyed';
        cancelAnimationFrame(this.animationId);
    }

    loop() {
        if (this.state !== 'destroyed') {
            this.update();
            this.draw();
            if (this.state === 'playing') requestAnimationFrame(() => this.loop());
        }
    }
}

/* ==================================================
   4. CLASES
   ================================================== */
class CpuBase {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.health = 100;
    }

    draw(ctx) {
        ctx.fillStyle = '#005555';
        ctx.fillRect(this.x - 40, this.y - 20, 80, 40);

        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x - 30, this.y - 15, 60, 30);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 40, this.y - 20, 80, 40);

        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 50, this.y + 30, 100, 8);

        ctx.fillStyle = this.health > 30 ? '#00ff00' : '#ff0000';
        ctx.fillRect(this.x - 50, this.y + 30, 100 * (this.health / 100), 8);
    }

    takeDamage(n) {
        this.health -= n;
    }
}

class PlayerTank {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 5;
    }

    update(keys, w, h) {
        if (keys['w'] || keys['arrowup']) this.y -= this.speed;
        if (keys['s'] || keys['arrowdown']) this.y += this.speed;
        if (keys['a'] || keys['arrowleft']) this.x -= this.speed;
        if (keys['d'] || keys['arrowright']) this.x += this.speed;

        this.x = Math.max(25, Math.min(w - 25, this.x));
        this.y = Math.max(100, Math.min(h - 170, this.y));
    }

    shoot(game) {
        game.bullets.push(new Bullet(this.x, this.y - 25, -8, '#ffff00'));
    }

    draw(ctx) {
        ctx.fillStyle = '#cca300';
        ctx.fillRect(this.x - 20, this.y - 10, 40, 20);

        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(this.x - 5, this.y - 25, 10, 20);

        ctx.fillStyle = '#888';
        ctx.fillRect(this.x - 22, this.y - 8, 8, 16);
        ctx.fillRect(this.x + 14, this.y - 8, 8, 16);

        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 8, this.y - 5, 16, 10);
    }
}

class Bullet {
    constructor(x, y, vy, color) {
        this.x = x;
        this.y = y;
        this.vy = vy;
        this.radius = 4;
        this.color = color;
    }

    update() {
        this.y += this.vy;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class AmmoBox {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 1.5;
        this.pulse = 0;
    }

    update() {
        this.y += this.speed;
        this.pulse += 0.1;
    }

    draw(ctx) {
        const glow = Math.sin(this.pulse) * 3;

        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);

        ctx.fillStyle = '#000';
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('A', this.x, this.y + 8);

        ctx.strokeStyle = `rgba(255, 204, 0, ${0.5 + Math.abs(glow) / 10})`;
        ctx.lineWidth = 2 + Math.abs(glow);
        ctx.strokeRect(this.x - 15, this.y - 15, 30, 30);
    }
}

class RobotEnemy {
    constructor(x, y, canShoot) {
        this.x = x;
        this.y = y;
        this.speed = 1.2 + Math.random() * 0.5;
        this.radius = 18;
        this.canShoot = canShoot;
        this.shootCooldown = 60 + Math.random() * 60;
        this.dodgeDirection = Math.random() > 0.5 ? 1 : -1;
        this.dodgeTimer = 0;
    }

    update(game) {
        this.y += this.speed;

        if (this.canShoot) {
            this.dodgeTimer++;
            if (this.dodgeTimer > 30) {
                this.dodgeDirection *= -1;
                this.dodgeTimer = 0;
            }
            this.x += this.dodgeDirection * 0.8;
            this.x = Math.max(30, Math.min(game.width - 30, this.x));
        }

        if (this.canShoot) {
            this.shootCooldown--;
            if (this.shootCooldown <= 0) {
                game.enemyBullets.push(new Bullet(this.x, this.y + 18, 5, '#ff0000'));
                this.shootCooldown = 80 + Math.random() * 40;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(this.x - 18, this.y - 18, 36, 36);

        ctx.fillStyle = '#ff4444';
        ctx.fillRect(this.x - 12, this.y - 24, 24, 10);

        if (this.canShoot) {
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(this.x - 6, this.y + 15, 12, 18);

            if (this.shootCooldown < 5) {
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(this.x - 4, this.y + 30, 8, 8);
            }
        }

        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x - 12, this.y - 10, 8, 8);
        ctx.fillRect(this.x + 4, this.y - 10, 8, 8);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 18, this.y - 18, 36, 36);

        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 26, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

class ExplosiveTank {
    constructor(x, y, level) {
        this.x = x;
        this.y = y;
        this.speed = 1 + Math.random() * 0.5;
        this.shootCooldown = 40 + Math.random() * 40;
        this.pulse = 0;
    }

    update(game) {
        this.y += this.speed;
        this.pulse += 0.1;

        this.shootCooldown--;
        if (this.shootCooldown <= 0) {
            game.enemyBullets.push(new Bullet(this.x - 10, this.y + 15, 6, '#ff00ff'));
            game.enemyBullets.push(new Bullet(this.x + 10, this.y + 15, 6, '#ff00ff'));
            this.shootCooldown = 60 + Math.random() * 30;
        }
    }

    draw(ctx) {
        const glow = Math.sin(this.pulse) * 3;

        ctx.fillStyle = '#8b008b';
        ctx.fillRect(this.x - 28, this.y - 18, 56, 36);

        ctx.fillStyle = '#aa00aa';
        ctx.fillRect(this.x - 20, this.y - 25, 40, 15);

        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(this.x - 22, this.y - 32, 10, 12);
        ctx.fillRect(this.x + 12, this.y - 32, 10, 12);

        ctx.fillStyle = '#555';
        ctx.fillRect(this.x - 32, this.y - 15, 12, 30);
        ctx.fillRect(this.x + 20, this.y - 15, 12, 30);

        ctx.fillStyle = glow > 0 ? '#ff0000' : '#880000';
        ctx.beginPath();
        ctx.arc(this.x - 15, this.y - 8, 4, 0, Math.PI * 2);
        ctx.arc(this.x + 15, this.y - 8, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 0, 255, ${0.5 + Math.abs(glow) / 10})`;
        ctx.lineWidth = 3 + Math.abs(glow);
        ctx.strokeRect(this.x - 28, this.y - 18, 56, 36);
    }
}

class Particle {
    constructor(x, y, c) {
        this.x = x;
        this.y = y;
        this.c = c;
        this.life = 1.0;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.c;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}
