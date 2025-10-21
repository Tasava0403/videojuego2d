/* main.js
   Juego 2D: Zombies y Momias
   - assets/ tiene: cursor.png, favicon.ico, fondo.jpg, gun-sound.mp3, sountrag.mp3, momia.png, zombie.png
*/

(() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Ajustes de tamaño (mantiene canvas con tamaño de atributos, pero escala en CSS)
    const W = canvas.width;
    const H = canvas.height;

    // Elementos del DOM
    const scoreEl = document.getElementById('score');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const bgMusic = document.getElementById('bgMusic');
    const shotSound = document.getElementById('shotSound');
    const messageDiv = document.getElementById('message');

    let animationId = null;
    let running = false;
    let score = 0;

    // Carga de imágenes
    const assets = {
        zombie: loadImage('assets/zombie.png'),
        momia: loadImage('assets/momia.png'),
    };

    function loadImage(src) {
        const img = new Image();
        img.src = src;
        return img;
    }

    // Utilidades
    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function distance(x1, y1, x2, y2) {
        const dx = x1 - x2, dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Clase para enemigos
    class Enemy {
        // type: 'zombie' (lineal) o 'momia' (circular)
        constructor(type) {
            this.type = type;
            this.img = assets[type];
            this.size = Math.floor(rand(50, 90)); // tamaño en px
            this.alpha = 1;

            this.reset();
            this.visible = true;
            this.disappearTimer = 0; // si >0 desaparecerá y reaparecerá
        }

        reset() {
            // spawn en cualquier borde con velocidad aleatoria
            this.x = rand(50, W - 50);
            this.y = rand(50, H - 50);

            if (this.type === 'zombie') {
                // velocidad lineal
                const speed = rand(0.6, 2.0);
                // dirección aleatoria
                const angle = rand(0, Math.PI * 2);
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
            } else {
                // momia: movimiento circular alrededor de un centro que cambia de vez en cuando
                this.centerX = rand(100, W - 100);
                this.centerY = rand(100, H - 100);
                this.radius = rand(30, 90);
                this.angle = rand(0, Math.PI * 2);
                this.angularSpeed = rand(0.01, 0.05) * (Math.random() < 0.5 ? 1 : -1);
            }

            // hace que reaparezca opaco
            this.alpha = 1;
            this.visible = true;
            this.disappearTimer = 0;
        }

        update(dt) {
            if (!this.visible) {
                // si no visible, contar para reaparecer
                this.disappearTimer -= dt;
                if (this.disappearTimer <= 0) this.reset();
                return;
            }

            if (this.type === 'zombie') {
                this.x += this.vx * dt * 60 / 16; // compensación por dt
                this.y += this.vy * dt * 60 / 16;

                // rebote suave en bordes
                if (this.x < 10 || this.x > W - 10) this.vx *= -1;
                if (this.y < 10 || this.y > H - 10) this.vy *= -1;

                // pequeña probabilidad de desaparecer y reaparecer en otro sitio
                if (Math.random() < 0.0008) this.hideTemporarily();
            } else {
                // movimiento circular
                this.angle += this.angularSpeed * dt * 60 / 16;
                this.x = this.centerX + Math.cos(this.angle) * this.radius;
                this.y = this.centerY + Math.sin(this.angle) * this.radius;

                // ocasionalmente cambia el centro y radio
                if (Math.random() < 0.001) {
                    this.centerX = rand(100, W - 100);
                    this.centerY = rand(100, H - 100);
                    this.radius = rand(30, 110);
                    this.angularSpeed = rand(0.01, 0.06) * (Math.random() < 0.5 ? 1 : -1);
                }

                if (Math.random() < 0.0006) this.hideTemporarily();
            }
        }

        hideTemporarily() {
            this.visible = false;
            this.disappearTimer = rand(0.8, 2.5); // segundos
        }

        draw(ctx) {
            if (!this.visible) return;
            ctx.save();
            ctx.globalAlpha = this.alpha;
            // Dibujar imagen centrada
            const w = this.size;
            const h = this.size;
            ctx.drawImage(this.img, this.x - w / 2, this.y - h / 2, w, h);
            ctx.restore();
        }

        isHit(mx, my) {
            if (!this.visible) return false;
            // hitbox circular
            const r = Math.max(this.size / 2, 20);
            return distance(mx, my, this.x, this.y) <= r * 0.75; // algo tolerante
        }

        onShot() {
            // reproducir efecto, ocultar y aumentar score en código externo
            this.visible = false;
            this.disappearTimer = rand(0.6, 2.0);
            // opcional: animación de fade out
            // (aquí lo dejamos para simplicidad)
        }
    }

    // Lista de enemigos
    const enemies = [];

    function populateEnemies(count = 7) {
        enemies.length = 0;
        for (let i = 0; i < count; i++) {
            // aleatoriza tipos
            const type = Math.random() < 0.55 ? 'zombie' : 'momia';
            enemies.push(new Enemy(type));
        }
    }

    // Game loop
    let lastTime = null;
    function loop(timestamp) {
        if (!running) return;
        if (!lastTime) lastTime = timestamp;
        const dt = Math.min(0.05, (timestamp - lastTime) / 1000); // delta en segundos, cap
        lastTime = timestamp;

        update(dt);
        render();

        animationId = requestAnimationFrame(loop);
    }

    function update(dt) {
        // actualizar enemigos
        enemies.forEach(e => e.update(dt));
    }

    function render() {
        // Limpiar canvas (mantener background-image via CSS)
        ctx.clearRect(0, 0, W, H);

        // dibujar enemigos
        enemies.forEach(e => e.draw(ctx));
    }

    // Input: click para disparar
    function canvasClick(e) {
        if (!running) return;
        const rect = canvas.getBoundingClientRect();
        // coordenadas en sistema del canvas
        const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
        const my = ((e.clientY - rect.top) / rect.height) * canvas.height;

        // buscar enemigo golpeado (tomar primero en la lista que esté en el punto)
        let hit = false;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (enemy.isHit(mx, my)) {
                enemy.onShot();
                hit = true;
                // puntaje variable por tipo
                score += (enemy.type === 'zombie' ? 10 : 15);
                updateScore();
                break; // solo uno por click
            }
        }

        // reproducir efecto
        if (hit) {
            shotSound.currentTime = 0;
            shotSound.play().catch(() => {/* Autoplay policy may block until user interacts */ });
        } else {
            // se puede reproducir un "clic" de miss si se desea
            // para ahora, nada
        }
    }

    function updateScore() {
        scoreEl.textContent = score;
    }

    // Controls
    function startGame() {
        if (running) return;
        running = true;
        lastTime = null;
        // iniciar audio si es posible
        bgMusic.volume = 0.45;
        bgMusic.play().catch(() => {/* navegador podría bloquear reproducción automática; se reproducirá al primer click si es así */ });
        animationId = requestAnimationFrame(loop);
        showMessage('');
    }

    function pauseGame() {
        if (!running) return;
        running = false;
        cancelAnimationFrame(animationId);
        animationId = null;
        showMessage('PAUSADO');
    }

    function resetGame() {
        running = false;
        cancelAnimationFrame(animationId);
        animationId = null;
        score = 0;
        updateScore();
        populateEnemies(8);
        showMessage('Listo. Presiona Iniciar');
        // reset audio
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }

    function showMessage(txt, timeout = 1500) {
        if (!txt) { messageDiv.style.display = 'none'; return; }
        messageDiv.textContent = txt;
        messageDiv.style.display = 'block';
        if (timeout > 0) {
            setTimeout(() => { messageDiv.style.display = 'none'; }, timeout);
        }
    }

    // Eventos
    canvas.addEventListener('click', (e) => {
        // primer click también desbloquea audio en navegadores
        bgMusic.play().catch(() => { });
        canvasClick(e);
    });

    startBtn.addEventListener('click', () => {
        startGame();
        showMessage('¡Comenzó!', 1000);
    });

    pauseBtn.addEventListener('click', () => {
        if (running) pauseGame();
        else { startGame(); }
    });

    resetBtn.addEventListener('click', () => {
        resetGame();
    });

    // inicialización
    function init() {
        // esperar a que las imágenes se carguen (mejor experiencia)
        const imgs = [assets.zombie, assets.momia];
        let loaded = 0;
        imgs.forEach(img => {
            if (img.complete) loaded++;
            else img.onload = () => { loaded++; if (loaded === imgs.length) afterLoad(); };
        });
        if (loaded === imgs.length) afterLoad();
    }

    function afterLoad() {
        populateEnemies(8);
        showMessage('Presiona Iniciar para jugar', 2500);
    }

    // arrancar init
    init();

    // Exponer para debugging si se necesita
    window._game = {
        start: startGame,
        pause: pauseGame,
        reset: resetGame,
        enemies,
        get score() { return score; }
    };

})();
