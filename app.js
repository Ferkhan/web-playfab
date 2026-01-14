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
            
            // Cargar modelo desde la carpeta model/
            this.model = await tf.loadLayersModel('./model/model.json');
            
            // Verificar que el modelo se cargó correctamente
            if (!this.model) {
                throw new Error("Modelo es null después de carga");
            }
            
            // Verificar la forma de entrada esperada
            const inputShape = this.model.inputs[0].shape;
            console.log("📊 Forma de entrada del modelo:", inputShape);
            
            // Hacer una predicción de prueba
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
            
            alert(
                "⚠️ Error al cargar modelo de IA\n\n" +
                "Posibles causas:\n" +
                "1. No estás usando Live Server o servidor HTTP\n" +
                "2. La carpeta 'model/' no existe o está vacía\n" +
                "3. Faltan archivos: model.json o .bin\n\n" +
                "Revisa la consola (F12) para más detalles."
            );
            return false;
        }
    }

    predict(score, health, enemies, time) {
        if (!this.isLoaded || !this.model) {
            console.warn("⚠️ Modelo no cargado, usando dificultad NORMAL por defecto");
            return 1; // Default NORMAL
        }

        return tf.tidy(() => {
            // Normalizar EXACTAMENTE igual que en el entrenamiento
            const normalizedInput = [
                score / 5000.0,      // score normalizado
                health / 100.0,      // health normalizado
                enemies / 20.0,      // enemies normalizado
                time / 5000.0        // time normalizado
            ];
            
            console.log("🔍 Input normalizado:", normalizedInput);
            
            // Crear tensor con la forma correcta [1, 4]
            const inputTensor = tf.tensor2d([normalizedInput]);
            
            // Predecir
            const prediction = this.model.predict(inputTensor);
            
            // Obtener índice de clase con mayor probabilidad
            const classIndex = prediction.argMax(1).dataSync()[0];
            
            // Obtener probabilidades para debug
            const probabilities = prediction.dataSync();
            console.log("📊 Probabilidades:", {
                "EASY (Ayuda)": probabilities[0].toFixed(3),
                "NORMAL": probabilities[1].toFixed(3),
                "HARD (Ataque)": probabilities[2].toFixed(3),
                "Clase predicha": classIndex
            });
            
            return classIndex;
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
function updateGallery() { document.getElementById(currentListId).style.transform = `translateX(${currentIndex * -100}%)`; }
function getActiveCards() { return document.getElementById(currentListId).querySelectorAll('.game-card'); }
nextBtn.onclick = () => { const c = getActiveCards(); currentIndex = (currentIndex < c.length - 1) ? currentIndex + 1 : 0; updateGallery(); };
prevBtn.onclick = () => { const c = getActiveCards(); currentIndex = (currentIndex > 0) ? currentIndex - 1 : c.length - 1; updateGallery(); };

const THEME = { orange: '#ff3300', green: '#ffcc00', black: '#111111' };
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

window.toggleMLMode = function() {
    if(activeCpuGameInstance) {
        setTimeout(() => {
            activeCpuGameInstance.setMLMode(document.getElementById('mlToggle').checked);
        }, 50);
    }
};

window.playMinigame = function(type) {
    const overlay = document.getElementById('game-overlay');
    const gameArea = document.getElementById('game-area');
    const title = document.getElementById('game-title');
    
    if (gameInterval) clearInterval(gameInterval);
    if (activeCpuGameInstance) { activeCpuGameInstance.destroy(); activeCpuGameInstance = null; }
    document.getElementById('mlToggle').checked = false; 
    
    gameArea.innerHTML = ''; 
    // OVERLAYS (Carga y Alertas)
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

function startSnake() { /* Lógica Snake normal */
    const {ctx, canvas} = createGameCanvas(600, 400); let s=[{x:10,y:10}], d={x:1,y:0}, f={x:15,y:15}, sc=0, r=true;
    document.onkeydown=e=>{if(e.key.startsWith('Arrow')) d={x:e.key=='ArrowUp'?0:e.key=='ArrowDown'?0:e.key=='ArrowLeft'?-1:1, y:e.key=='ArrowUp'?-1:e.key=='ArrowDown'?1:0};};
    gameInterval=setInterval(()=>{ if(!r)return; let h={x:s[0].x+d.x, y:s[0].y+d.y}; if(h.x<0||h.x>=30||h.y<0||h.y>=20||s.some(seg=>seg.x===h.x&&seg.y===h.y)) return r=false; s.unshift(h); if(h.x===f.x&&h.y===f.y){sc+=10;updateScore(sc);f={x:Math.floor(Math.random()*30),y:Math.floor(Math.random()*20)}}else s.pop(); ctx.fillStyle='#111';ctx.fillRect(0,0,600,400); ctx.fillStyle='orange'; s.forEach(p=>ctx.fillRect(p.x*20+1,p.y*20+1,18,18)); ctx.fillStyle='lime';ctx.beginPath();ctx.arc(f.x*20+10,f.y*20+10,8,0,7);ctx.fill(); },100);
}
function startPong() { /* Lógica Pong normal */
    const {ctx, canvas} = createGameCanvas(600, 400); let b={x:300,y:200,dx:4,dy:4}, p={y:150}, c={y:150}, r=true;
    canvas.onmousemove=e=>p.y=e.clientY-canvas.getBoundingClientRect().top-40;
    gameInterval=setInterval(()=>{ if(!r)return; b.x+=b.dx;b.y+=b.dy; if(b.y<=0||b.y>=400)b.dy*=-1; if((b.x<20&&b.y>p.y&&b.y<p.y+80)||(b.x>580&&b.y>c.y&&b.y<c.y+80)) b.dx*=-1.1; if(b.x<0||b.x>600) {b.x=300;b.dx=4*(Math.random()>.5?1:-1);} c.y+=(b.y-(c.y+40))*0.1; ctx.fillStyle='#111';ctx.fillRect(0,0,600,400); ctx.fillStyle='orange';ctx.fillRect(10,p.y,10,80);ctx.fillRect(580,c.y,10,80);ctx.fillStyle='lime';ctx.beginPath();ctx.arc(b.x,b.y,8,0,7);ctx.fill(); },16);
}

/* ==================================================
   5. CPU DEFENDER (LÓGICA NIVELES + MINAS)
   ================================================== */
function startCpuDefender() {
    const gameArea = document.getElementById('game-area');
    const canvas = document.createElement('canvas'); canvas.width = 700; canvas.height = 500;
    canvas.style.cursor = 'crosshair'; canvas.style.backgroundColor = '#1a2f1a'; 
    const ui = document.createElement('div'); ui.className = 'ui-layer';
    ui.innerHTML = `<div class="hud-controls"><button class="btn-cpu" id="btn-repair">🔧 REPAIR<span>(Cost: 500)</span></button></div><div id="cpu-game-over" class="cpu-game-over-msg" style="display:none;"><h2 style="color:red;">SYSTEM FAILURE</h2><p>Score: <span id="final-cpu-score">0</span></p><p style="font-size:0.7rem; color:#aaa;">Click ✕ to Reset</p></div>`;
    gameArea.appendChild(canvas); gameArea.appendChild(ui);
    activeCpuGameInstance = new CpuGame(canvas);
    document.getElementById('btn-repair').onclick = () => activeCpuGameInstance.repairCpu();
}

class CpuGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width; this.height = canvas.height;
        this.state = 'playing'; this.score = 0;
        
        this.ai = new CpuDefenderAI();
        
        // ESTADOS
        this.mlModeActive = false;
        this.introSequence = false;
        this.evaluationPhase = false;
        this.evaluationTimer = 0;
        
        // NIVELES
        this.currentLevel = 1; // 1, 2(Minas), 3(Max)
        this.aiCheckTimer = 0; 
        this.levelTimer = 0;   
        
        this.cpu = new CpuEntity(this.width/2, this.height/2);
        this.player = new CpuPlayer(this.width/2, this.height/2+100);
        this.bullets=[]; this.enemies=[]; this.enemyMines=[]; this.particles=[];
        this.keys={}; this.mouse={x:0,y:0}; this.frameCount=0; this.enemySpawnRate=120;

        window.addEventListener('keydown', e=>this.keys[e.key.toLowerCase()]=true);
        window.addEventListener('keyup', e=>this.keys[e.key.toLowerCase()]=false);
        this.canvas.addEventListener('mousemove', e=>{ const r=this.canvas.getBoundingClientRect(); this.mouse.x=e.clientX-r.left; this.mouse.y=e.clientY-r.top; });
        this.canvas.addEventListener('mousedown', ()=>{ if(this.state==='playing' && !this.introSequence) this.player.shoot(this); });
        this.loop();
    }

    showAnnouncement(t, s, d=2000) {
        const a = document.getElementById('challenge-announcement');
        if(a){ document.getElementById('announcement-title').innerText=t; document.getElementById('announcement-subtitle').innerText=s; a.style.display='flex'; setTimeout(()=>{a.style.display='none';}, d); }
    }
    setLoading(v, t) {
        const l = document.getElementById('ai-loading');
        if(l){ if(t)document.getElementById('loading-text').innerText=t; l.style.display=v?'flex':'none'; }
    }

    // --- SECUENCIA DE INICIO CON CARGA DE MODELO ---
    async setMLMode(active) {
        this.mlModeActive = active;
        if(active) {
            this.introSequence = true; // Congelar juego
            this.enemies = []; this.enemyMines = [];
            
            this.setLoading(true, "CARGANDO MODELO IA...");
            
            setTimeout(async () => {
                try {
                    // Cargar modelo
                    if (!this.ai.isLoaded) {
                        const success = await this.ai.loadModel();
                        if (!success) throw new Error("Fallo carga");
                    }

                    this.setLoading(false);
                    
                    // Intro
                    this.showAnnouncement("SISTEMA IA", "ONLINE", 1500);
                    await new Promise(r => setTimeout(r, 1500));
                    this.showAnnouncement("NIVEL 1", "CALIBRANDO...", 1500);
                    await new Promise(r => setTimeout(r, 1500));

                    // Inicio
                    this.introSequence = false;
                    this.evaluationPhase = true;
                    this.evaluationTimer = 0;
                    this.currentLevel = 1;
                    this.enemySpawnRate = 90;

                } catch(e) {
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
            this.showAnnouncement("MODO MANUAL", "IA DESACTIVADA");
        }
    }

    repairCpu() { if(this.score>=500&&this.cpu.health<100){this.score-=500;this.cpu.health=Math.min(100,this.cpu.health+30);this.createExplosion(this.cpu.x,this.cpu.y,10,'#00ff00');updateScore(this.score);}}
    createExplosion(x,y,c,color){for(let i=0;i<c;i++)this.particles.push(new CpuParticle(x,y,color));}

    update() {
        if(this.state!=='playing') return;
        if(this.introSequence) return; 

        this.frameCount++;
        this.player.update(this.keys, this.mouse, this.width, this.height);

        // --- LÓGICA IA Y NIVELES ---
        if(this.mlModeActive && this.ai.isLoaded) {
            
            // Calibración inicial
            if(this.evaluationPhase) {
                this.evaluationTimer++;
                if(this.evaluationTimer > 300) { 
                    this.evaluationPhase = false;
                    this.showAnnouncement("CALIBRACION", "COMPLETA");
                }
            } 
            
            // Predicción (cada 1s)
            this.aiCheckTimer++;
            if(this.aiCheckTimer > 60) {
                this.aiCheckTimer = 0;
                
                const prediction = this.ai.predict(this.score, this.cpu.health, this.enemies.length, this.frameCount);
                
                // Lógica Niveles
                if(prediction === 2) { // HARD
                    if(this.currentLevel === 1) {
                        this.currentLevel = 2; // Subir Nivel 2
                        this.levelTimer = 0;
                        this.showAnnouncement("NIVEL 2", "¡PELIGRO: MINAS!");
                    } else if (this.currentLevel === 2) {
                        this.levelTimer++;
                        if(this.levelTimer > 15) { // 15s en Nivel 2 -> Nivel 3
                            this.currentLevel = 3;
                            this.showAnnouncement("NIVEL 3", "SOBRECARGA");
                        }
                    }
                } 
                else if (prediction === 0 && this.currentLevel > 1) { // HELP
                    this.currentLevel = 1;
                    this.showAnnouncement("ASISTENCIA", "BAJANDO DIFICULTAD");
                }
            }

            if(this.currentLevel === 1) this.enemySpawnRate = 90;
            if(this.currentLevel === 2) this.enemySpawnRate = 50; 
            if(this.currentLevel === 3) this.enemySpawnRate = 25; 
            
        } else {
            this.enemySpawnRate = 120; // Manual
        }

        if(this.frameCount % this.enemySpawnRate === 0) this.spawnEnemy();

        // Daño minas (Nivel 2+)
        if(this.frameCount % 60 === 0) {
            this.enemyMines.forEach(m => {
                this.cpu.takeDamage(2);
                this.createExplosion(m.x, m.y, 2, '#ff00ff');
            });
        }

        // Updates
        this.bullets.forEach((b,i)=>{ b.update(); if(b.offScreen(this.width,this.height))this.bullets.splice(i,1); });
        this.enemies.forEach((e,ei)=>{
            e.update(this.cpu);
            if(Math.hypot(e.x-this.cpu.x, e.y-this.cpu.y)<40){
                this.cpu.takeDamage(10); this.createExplosion(e.x,e.y,5,'red'); this.enemies.splice(ei,1);
                if(this.cpu.health<=0)this.gameOver();
                return;
            }
            this.bullets.forEach((b,bi)=>{
                if(Math.hypot(e.x-b.x, e.y-b.y)<e.radius+b.radius){
                    this.createExplosion(e.x,e.y,8,'#ffaa00');
                    this.enemies.splice(ei,1); this.bullets.splice(bi,1);
                    this.score+=50; updateScore(this.score);
                }
            });
        });
        
        this.enemyMines.forEach((m,mi)=>{
            this.bullets.forEach((b,bi)=>{
                if(Math.hypot(m.x-b.x, m.y-b.y)<15){
                    this.createExplosion(m.x,m.y,15,'cyan');
                    this.enemyMines.splice(mi,1); this.bullets.splice(bi,1);
                    this.score+=150; updateScore(this.score);
                }
            });
        });

        this.particles.forEach((p,i)=>{p.update();if(p.life<=0)this.particles.splice(i,1);});
    }

    spawnEnemy() {
        const side=Math.floor(Math.random()*4); let x,y;
        if(side===0){x=Math.random()*this.width;y=-30;} else if(side===1){x=this.width+30;y=Math.random()*this.height;} else if(side===2){x=Math.random()*this.width;y=this.height+30;} else {x=-30;y=Math.random()*this.height;}
        
        // Spawn Minas solo en Nivel 2+
        if(this.mlModeActive && this.currentLevel >= 2) {
            if(Math.random() < 0.4) {
                const ox=(Math.random()-.5)*300; const oy=(Math.random()-.5)*300;
                this.enemyMines.push(new CpuMineEnemy(this.width/2+ox, this.height/2+oy));
                return;
            }
        }
        const e = new CpuEnemy(x, y);
        if(this.currentLevel === 2) e.speed *= 1.6;
        if(this.currentLevel === 3) e.speed *= 2.5;
        this.enemies.push(e);
    }

    draw() {
        const ctx = this.ctx;
        ctx.fillStyle = '#1a2f1a'; ctx.fillRect(0,0,this.width,this.height);
        this.drawCircuitLines(ctx);
        this.cpu.draw(ctx);
        this.enemyMines.forEach(m=>m.draw(ctx));
        this.bullets.forEach(b=>b.draw(ctx));
        this.enemies.forEach(e=>e.draw(ctx));
        this.player.draw(ctx);
        this.particles.forEach(p=>p.draw(ctx));
        
        // --- HUD VISUAL DE NIVEL ---
        if(this.mlModeActive) {
            ctx.font='12px "Press Start 2P"'; 
            ctx.textAlign='left';
            let lvlText = "AI: CALIBRANDO...";
            ctx.fillStyle = '#ffff00'; 

            if(!this.evaluationPhase && !this.introSequence){
                if(this.currentLevel===1) { lvlText="AI LEVEL: 1 (NORMAL)"; ctx.fillStyle='#00ff00'; }
                if(this.currentLevel===2) { lvlText="AI LEVEL: 2 (BOMBAS)"; ctx.fillStyle='#ffaa00'; }
                if(this.currentLevel===3) { lvlText="AI LEVEL: 3 (MAX)"; ctx.fillStyle='#ff0000'; }
            }
            if(this.introSequence) lvlText = "AI: INICIANDO...";
            ctx.fillText(lvlText, 20, 30);
        }
    }

    drawCircuitLines(ctx){ ctx.strokeStyle='#2f4f2f';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(this.width/2,0);ctx.lineTo(this.width/2,this.height);ctx.moveTo(0,this.height/2);ctx.lineTo(this.width,this.height/2);ctx.stroke(); }
    gameOver(){ this.state='gameover'; document.getElementById('cpu-game-over').style.display='block'; document.getElementById('final-cpu-score').innerText=this.score; }
    destroy(){ this.state='destroyed'; cancelAnimationFrame(this.animationId); }
    loop(){ if(this.state!=='destroyed'){ this.update(); this.draw(); if(this.state==='playing') requestAnimationFrame(()=>this.loop()); } }
}

/* CLASES VISUALES */
class CpuEntity { constructor(x,y){this.x=x;this.y=y;this.size=60;this.health=100;} draw(ctx){ctx.fillStyle='#005555';ctx.fillRect(this.x-30,this.y-30,60,60);ctx.fillStyle='#00ffff';ctx.fillRect(this.x-20,this.y-20,40,40);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(this.x-30,this.y-30,60,60);ctx.fillStyle='red';ctx.fillRect(this.x-40,this.y-50,80,8);ctx.fillStyle='#00ff00';ctx.fillRect(this.x-40,this.y-50,80*(this.health/100),8);} takeDamage(n){this.health-=n;} }
class CpuPlayer { constructor(x,y){this.x=x;this.y=y;this.angle=0;this.speed=4;} update(k,m,w,h){if(k['w'])this.y-=4;if(k['s'])this.y+=4;if(k['a'])this.x-=4;if(k['d'])this.x+=4;this.x=Math.max(20,Math.min(w-20,this.x));this.y=Math.max(20,Math.min(h-20,this.y));this.angle=Math.atan2(m.y-this.y,m.x-this.x);} shoot(g){g.bullets.push(new CpuBullet(this.x,this.y,{x:Math.cos(this.angle)*10,y:Math.sin(this.angle)*10}));} draw(ctx){ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);ctx.fillStyle='#cca300';ctx.fillRect(5,-4,25,8);ctx.fillStyle='#888';ctx.fillRect(-15,-15,30,30);ctx.fillStyle='#fff';ctx.fillRect(-5,-5,10,10);ctx.restore();} }
class CpuBullet { constructor(x,y,v){this.x=x;this.y=y;this.velocity=v;this.radius=4;} update(){this.x+=this.velocity.x;this.y+=this.velocity.y;} offScreen(w,h){return this.x<0||this.x>w||this.y<0||this.y>h;} draw(ctx){ctx.beginPath();ctx.arc(this.x,this.y,4,0,Math.PI*2);ctx.fillStyle='yellow';ctx.fill();} }
class CpuEnemy { constructor(x,y){this.x=x;this.y=y;this.speed=1.5+Math.random();this.radius=12;} update(t){const dx=t.x-this.x,dy=t.y-this.y,d=Math.hypot(dx,dy);this.x+=(dx/d)*this.speed;this.y+=(dy/d)*this.speed;} draw(ctx){ctx.fillStyle='#d32f2f';ctx.beginPath();ctx.arc(this.x,this.y,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.stroke();} }
class CpuMineEnemy { constructor(x,y){this.x=x;this.y=y;} draw(ctx){const p=(Math.sin(Date.now()/100)+1)*5;ctx.fillStyle='rgba(255,0,255,0.6)';ctx.beginPath();ctx.arc(this.x,this.y,10+p,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(this.x,this.y,8,0,Math.PI*2);ctx.fill();} }
class CpuParticle { constructor(x,y,c){this.x=x;this.y=y;this.c=c;this.life=1.0;this.vx=(Math.random()-.5)*5;this.vy=(Math.random()-.5)*5;} update(){this.x+=this.vx;this.y+=this.vy;this.life-=0.05;} draw(ctx){ctx.globalAlpha=Math.max(0,this.life);ctx.fillStyle=this.c;ctx.fillRect(this.x,this.y,4,4);ctx.globalAlpha=1.0;} }