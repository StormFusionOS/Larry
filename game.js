// TOFU SMASH - Side-Scrolling Platformer with Smash Attacks!

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 5;
const TILE_SIZE = 40;

// Player settings
const player = {
    x: 100,
    y: 300,
    width: 50,
    height: 80,
    velX: 0,
    velY: 0,
    onGround: false,
    facing: 1, // 1 = right, -1 = left
    health: 100,
    maxHealth: 100,
    kills: 0,
    isSmashing: false,
    smashFrame: 0,
    smashCooldown: 0,
    isJumping: false,
    runFrame: 0,
    runTimer: 0
};

// Camera
const camera = {
    x: 0,
    y: 0
};

// Game state
let gameState = 'start';
let currentWave = 1;
let totalKills = 0;
let screenShake = 0;
let particles = [];

// Input handling
const keys = {
    left: false,
    right: false,
    jump: false,
    smash: false
};

// Level data - platforms [x, y, width, height, type]
// type: 'ground', 'platform', 'floating'
let platforms = [];
let levelWidth = 3000;

// Generate level
function generateLevel() {
    platforms = [];

    // Ground
    for (let x = 0; x < levelWidth; x += 200) {
        // Some gaps in ground
        if (Math.random() > 0.15 || x < 400) {
            platforms.push({
                x: x,
                y: 520,
                width: 200,
                height: 80,
                type: 'ground'
            });
        }
    }

    // Floating platforms
    for (let i = 0; i < 40; i++) {
        const x = 300 + i * 150 + Math.random() * 100;
        const y = 250 + Math.random() * 200;
        platforms.push({
            x: x,
            y: y,
            width: 80 + Math.random() * 60,
            height: 20,
            type: 'platform'
        });
    }

    // Higher platforms
    for (let i = 0; i < 20; i++) {
        const x = 200 + i * 250 + Math.random() * 150;
        const y = 120 + Math.random() * 100;
        platforms.push({
            x: x,
            y: y,
            width: 100 + Math.random() * 50,
            height: 20,
            type: 'floating'
        });
    }
}

// Enemies array
let enemies = [];

// Enemy class - Anime Horse Girls
class Enemy {
    constructor(x, y, type = 'imp') {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.velX = 0;
        this.velY = 0;
        this.type = type;
        this.health = type === 'demon' ? 40 : type === 'imp' ? 25 : 60;
        this.maxHealth = this.health;
        this.speed = type === 'demon' ? 2 : type === 'imp' ? 3 : 1.5;
        this.damage = type === 'demon' ? 15 : type === 'imp' ? 10 : 25;
        this.onGround = false;
        this.facing = -1;
        this.isHit = false;
        this.hitTimer = 0;
        this.isDead = false;
        this.deathTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.jumpCooldown = 0;
    }

    update() {
        if (this.isDead) {
            this.deathTimer++;
            this.velY += GRAVITY * 0.5;
            this.y += this.velY;
            return;
        }

        // Animation
        this.animTimer++;
        if (this.animTimer > 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // Hit flash
        if (this.isHit) {
            this.hitTimer--;
            if (this.hitTimer <= 0) this.isHit = false;
        }

        // Gravity
        this.velY += GRAVITY;

        // Move towards player
        const dx = player.x - this.x;
        this.facing = dx > 0 ? 1 : -1;

        if (Math.abs(dx) > 30) {
            this.velX = this.facing * this.speed;
        } else {
            this.velX = 0;
        }

        // Jump if player is above
        if (player.y < this.y - 50 && this.onGround && this.jumpCooldown <= 0) {
            this.velY = JUMP_FORCE * 0.8;
            this.onGround = false;
            this.jumpCooldown = 60;
        }
        if (this.jumpCooldown > 0) this.jumpCooldown--;

        // Apply velocity
        this.x += this.velX;
        this.y += this.velY;

        // Platform collision
        this.onGround = false;
        for (const plat of platforms) {
            if (this.checkPlatformCollision(plat)) {
                this.y = plat.y - this.height;
                this.velY = 0;
                this.onGround = true;
            }
        }

        // Fall death
        if (this.y > 700) {
            this.isDead = true;
        }
    }

    checkPlatformCollision(plat) {
        return this.velY >= 0 &&
               this.x + this.width > plat.x &&
               this.x < plat.x + plat.width &&
               this.y + this.height >= plat.y &&
               this.y + this.height <= plat.y + plat.height + this.velY + 5;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.isHit = true;
        this.hitTimer = 10;
        this.velY = -8;
        this.velX = -this.facing * 5;

        if (this.health <= 0) {
            this.isDead = true;
            player.kills++;
            totalKills++;
            // Spawn particles
            for (let i = 0; i < 15; i++) {
                particles.push({
                    x: this.x + this.width/2,
                    y: this.y + this.height/2,
                    velX: (Math.random() - 0.5) * 10,
                    velY: (Math.random() - 0.5) * 10 - 5,
                    size: 3 + Math.random() * 5,
                    color: `hsl(${Math.random() * 60 + 300}, 70%, 50%)`,
                    life: 40
                });
            }
        }
    }
}

// Spawn wave of enemies
function spawnWave(wave) {
    enemies = [];
    const numEnemies = 5 + wave * 3;

    for (let i = 0; i < numEnemies; i++) {
        const x = 500 + i * 200 + Math.random() * 100;
        const y = 200;
        const types = ['imp', 'imp', 'demon', 'demon', 'ogre'];
        const type = types[Math.floor(Math.random() * Math.min(wave + 2, types.length))];
        enemies.push(new Enemy(x, y, type));
    }
}

// Input event listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.jump = true;
    if (e.code === 'KeyF' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.smash = true;

    if (e.code === 'Enter' || e.code === 'Space') {
        if (gameState === 'start') {
            startGame();
        } else if (gameState === 'gameover' || gameState === 'win') {
            gameState = 'start';
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.jump = false;
    if (e.code === 'KeyF' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.smash = false;
});

function startGame() {
    gameState = 'playing';
    player.x = 100;
    player.y = 400;
    player.velX = 0;
    player.velY = 0;
    player.health = player.maxHealth;
    player.kills = 0;
    currentWave = 1;
    totalKills = 0;
    generateLevel();
    spawnWave(currentWave);
}

// Update game
function update() {
    if (gameState !== 'playing') return;

    // Player movement
    if (keys.left) {
        player.velX = -MOVE_SPEED;
        player.facing = -1;
    } else if (keys.right) {
        player.velX = MOVE_SPEED;
        player.facing = 1;
    } else {
        player.velX *= 0.8;
    }

    // Running animation
    if (Math.abs(player.velX) > 0.5 && player.onGround) {
        player.runTimer++;
        if (player.runTimer > 6) {
            player.runTimer = 0;
            player.runFrame = (player.runFrame + 1) % 4;
        }
    } else {
        player.runFrame = 0;
    }

    // Jumping
    if (keys.jump && player.onGround) {
        player.velY = JUMP_FORCE;
        player.onGround = false;
        player.isJumping = true;
    }

    // Smash attack
    if (keys.smash && !player.isSmashing && player.smashCooldown <= 0) {
        player.isSmashing = true;
        player.smashFrame = 0;
        screenShake = 5;
    }

    if (player.isSmashing) {
        player.smashFrame++;

        // Hit detection during smash
        if (player.smashFrame >= 5 && player.smashFrame <= 12) {
            const smashRange = 80;
            const smashX = player.x + (player.facing > 0 ? player.width : -smashRange);

            for (const enemy of enemies) {
                if (enemy.isDead) continue;

                if (enemy.x + enemy.width > smashX &&
                    enemy.x < smashX + smashRange &&
                    Math.abs(enemy.y - player.y) < 60) {
                    enemy.takeDamage(35);
                    screenShake = 12;

                    // Impact particles
                    for (let i = 0; i < 8; i++) {
                        particles.push({
                            x: enemy.x + enemy.width/2,
                            y: enemy.y + enemy.height/2,
                            velX: (Math.random() - 0.5) * 15,
                            velY: (Math.random() - 0.5) * 15,
                            size: 5 + Math.random() * 8,
                            color: 'rgb(255, 220, 150)',
                            life: 20
                        });
                    }
                }
            }
        }

        if (player.smashFrame >= 25) {
            player.isSmashing = false;
            player.smashCooldown = 20;
        }
    }

    if (player.smashCooldown > 0) player.smashCooldown--;

    // Gravity
    player.velY += GRAVITY;

    // Apply velocity
    player.x += player.velX;
    player.y += player.velY;

    // Platform collision
    player.onGround = false;
    for (const plat of platforms) {
        if (player.velY >= 0 &&
            player.x + player.width > plat.x &&
            player.x < plat.x + plat.width &&
            player.y + player.height >= plat.y &&
            player.y + player.height <= plat.y + plat.height + player.velY + 5) {
            player.y = plat.y - player.height;
            player.velY = 0;
            player.onGround = true;
            player.isJumping = false;
        }
    }

    // World bounds
    if (player.x < 0) player.x = 0;
    if (player.x > levelWidth - player.width) player.x = levelWidth - player.width;

    // Fall death
    if (player.y > 700) {
        player.health = 0;
    }

    // Update camera
    camera.x = player.x - SCREEN_WIDTH / 2 + player.width / 2;
    camera.y = player.y - SCREEN_HEIGHT / 2;
    camera.x = Math.max(0, Math.min(camera.x, levelWidth - SCREEN_WIDTH));
    camera.y = Math.max(0, Math.min(camera.y, 100));

    // Update enemies
    for (const enemy of enemies) {
        enemy.update();

        // Collision with player
        if (!enemy.isDead && !player.isSmashing) {
            if (player.x + player.width > enemy.x &&
                player.x < enemy.x + enemy.width &&
                player.y + player.height > enemy.y &&
                player.y < enemy.y + enemy.height) {
                player.health -= 0.5;
                screenShake = 3;
            }
        }
    }

    // Remove dead enemies after animation
    enemies = enemies.filter(e => !e.isDead || e.deathTimer < 60);

    // Update particles
    particles = particles.filter(p => {
        p.x += p.velX;
        p.y += p.velY;
        p.velY += 0.3;
        p.life--;
        p.size *= 0.95;
        return p.life > 0;
    });

    // Screen shake decay
    if (screenShake > 0) screenShake *= 0.9;

    // Check wave completion
    if (enemies.filter(e => !e.isDead).length === 0) {
        currentWave++;
        if (currentWave > 5) {
            gameState = 'win';
        } else {
            spawnWave(currentWave);
            player.health = Math.min(player.health + 30, player.maxHealth);
        }
    }

    // Game over check
    if (player.health <= 0) {
        gameState = 'gameover';
    }
}

// Draw functions
function draw() {
    // Clear with sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    skyGrad.addColorStop(0, '#1a1a2e');
    skyGrad.addColorStop(0.5, '#16213e');
    skyGrad.addColorStop(1, '#1f4068');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Apply screen shake
    ctx.save();
    if (screenShake > 0.5) {
        ctx.translate(
            (Math.random() - 0.5) * screenShake * 2,
            (Math.random() - 0.5) * screenShake * 2
        );
    }

    // Apply camera
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw background mountains
    drawBackground();

    // Draw platforms
    drawPlatforms();

    // Draw enemies
    for (const enemy of enemies) {
        drawEnemy(enemy);
    }

    // Draw player
    drawPlayer();

    // Draw particles
    for (const p of particles) {
        ctx.globalAlpha = p.life / 40;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // Camera

    // Draw HUD
    drawHUD();

    ctx.restore(); // Screen shake

    // Draw game state screens
    if (gameState === 'start') {
        drawStartScreen();
    } else if (gameState === 'gameover') {
        drawGameOverScreen();
    } else if (gameState === 'win') {
        drawWinScreen();
    }
}

function drawBackground() {
    // Parallax mountains
    ctx.fillStyle = '#0f0f23';
    for (let i = 0; i < levelWidth / 200 + 5; i++) {
        const x = i * 200 - (camera.x * 0.3) % 200;
        ctx.beginPath();
        ctx.moveTo(x, 600);
        ctx.lineTo(x + 100, 300 + Math.sin(i) * 50);
        ctx.lineTo(x + 200, 600);
        ctx.fill();
    }

    ctx.fillStyle = '#1a1a35';
    for (let i = 0; i < levelWidth / 150 + 5; i++) {
        const x = i * 150 - (camera.x * 0.5) % 150;
        ctx.beginPath();
        ctx.moveTo(x, 600);
        ctx.lineTo(x + 75, 400 + Math.sin(i * 2) * 30);
        ctx.lineTo(x + 150, 600);
        ctx.fill();
    }
}

function drawPlatforms() {
    for (const plat of platforms) {
        // Skip if off screen
        if (plat.x + plat.width < camera.x - 50 || plat.x > camera.x + SCREEN_WIDTH + 50) continue;

        if (plat.type === 'ground') {
            // Ground with grass
            const groundGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
            groundGrad.addColorStop(0, '#3d5c3d');
            groundGrad.addColorStop(0.1, '#2d4a2d');
            groundGrad.addColorStop(1, '#1a2e1a');
            ctx.fillStyle = groundGrad;
            ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

            // Grass tufts
            ctx.fillStyle = '#4a7a4a';
            for (let i = 0; i < plat.width; i += 8) {
                ctx.beginPath();
                ctx.moveTo(plat.x + i, plat.y);
                ctx.lineTo(plat.x + i + 4, plat.y - 6 - Math.random() * 4);
                ctx.lineTo(plat.x + i + 8, plat.y);
                ctx.fill();
            }
        } else {
            // Floating platforms
            const platGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.height);
            platGrad.addColorStop(0, '#8b7355');
            platGrad.addColorStop(1, '#5c4a3a');
            ctx.fillStyle = platGrad;

            // Platform with rounded edges
            ctx.beginPath();
            ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 5);
            ctx.fill();

            // Highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillRect(plat.x + 2, plat.y + 2, plat.width - 4, 4);
        }
    }
}

function drawPlayer() {
    const px = player.x;
    const py = player.y;

    ctx.save();
    ctx.translate(px + player.width/2, py + player.height/2);
    ctx.scale(player.facing, 1);
    ctx.translate(-player.width/2, -player.height/2);

    // Body bob for running
    const runBob = player.onGround ? Math.sin(player.runFrame * Math.PI / 2) * 3 : 0;

    // === BODY ===
    // Torso
    const torsoGrad = ctx.createLinearGradient(10, 15, 40, 15);
    torsoGrad.addColorStop(0, 'rgb(60, 60, 70)');
    torsoGrad.addColorStop(0.5, 'rgb(80, 80, 90)');
    torsoGrad.addColorStop(1, 'rgb(50, 50, 60)');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.ellipse(25, 35 + runBob, 18, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // === LEGS ===
    const legOffset = player.onGround ? Math.sin(player.runFrame * Math.PI / 2) * 8 : 5;

    // Left leg
    ctx.fillStyle = 'rgb(50, 50, 60)';
    ctx.beginPath();
    ctx.ellipse(18, 65 + runBob - legOffset, 8, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Right leg
    ctx.beginPath();
    ctx.ellipse(32, 65 + runBob + legOffset, 8, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Boots
    ctx.fillStyle = 'rgb(40, 35, 30)';
    ctx.beginPath();
    ctx.ellipse(18, 78 + runBob - legOffset, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(32, 78 + runBob + legOffset, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // === HEAD ===
    // Neck
    ctx.fillStyle = 'rgb(195, 155, 125)';
    ctx.beginPath();
    ctx.ellipse(25, 12 + runBob, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const headGrad = ctx.createRadialGradient(25, 0 + runBob, 5, 25, 2 + runBob, 18);
    headGrad.addColorStop(0, 'rgb(210, 175, 145)');
    headGrad.addColorStop(1, 'rgb(175, 140, 110)');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(25, 2 + runBob, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair (spiky)
    ctx.fillStyle = 'rgb(40, 30, 25)';
    ctx.beginPath();
    ctx.moveTo(12, 0 + runBob);
    ctx.lineTo(15, -12 + runBob);
    ctx.lineTo(20, -5 + runBob);
    ctx.lineTo(25, -14 + runBob);
    ctx.lineTo(30, -5 + runBob);
    ctx.lineTo(35, -10 + runBob);
    ctx.lineTo(38, 2 + runBob);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(20, 0 + runBob, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(30, 0 + runBob, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = 'rgb(30, 30, 30)';
    ctx.beginPath();
    ctx.arc(21, 0 + runBob, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(31, 0 + runBob, 2, 0, Math.PI * 2);
    ctx.fill();

    // === MUSCULAR ARMS ===
    drawPlayerArm(ctx, runBob, true);  // Back arm
    drawPlayerArm(ctx, runBob, false); // Front arm

    ctx.restore();

    // Smash effect
    if (player.isSmashing && player.smashFrame >= 5 && player.smashFrame <= 12) {
        const effectX = player.x + (player.facing > 0 ? player.width + 20 : -60);
        const effectY = player.y + player.height / 2;

        // Impact wave
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = 'rgb(255, 220, 150)';
        ctx.lineWidth = 4;
        const radius = (player.smashFrame - 5) * 15;
        ctx.beginPath();
        ctx.arc(effectX + 20 * player.facing, effectY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Impact lines
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(effectX + Math.cos(angle) * 20, effectY + Math.sin(angle) * 20);
            ctx.lineTo(effectX + Math.cos(angle) * (40 + radius), effectY + Math.sin(angle) * (40 + radius));
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
}

function drawPlayerArm(ctx, runBob, isBack) {
    const armSwing = player.onGround ? Math.sin(player.runFrame * Math.PI / 2) * 0.4 : 0;
    const smashAngle = player.isSmashing ?
        (player.smashFrame < 8 ? -0.5 - player.smashFrame * 0.1 : 0.8) : 0;

    ctx.save();

    // Position arm
    const armX = isBack ? 20 : 30;
    const armY = 25 + runBob;
    ctx.translate(armX, armY);

    // Rotation
    const rotation = isBack ?
        (smashAngle * 0.5 - armSwing) :
        (smashAngle + armSwing);
    ctx.rotate(rotation);

    // Arm opacity for depth
    if (isBack) ctx.globalAlpha = 0.85;

    // Upper arm
    const armGrad = ctx.createLinearGradient(0, -8, 0, 8);
    armGrad.addColorStop(0, 'rgb(175, 140, 110)');
    armGrad.addColorStop(0.5, 'rgb(200, 165, 135)');
    armGrad.addColorStop(1, 'rgb(165, 130, 100)');
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.ellipse(18, 0, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bicep bulge
    ctx.fillStyle = 'rgb(205, 170, 140)';
    ctx.beginPath();
    ctx.ellipse(15, -3, 12, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Forearm
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.ellipse(38, 2, 18, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Fist
    const fistGrad = ctx.createRadialGradient(52, 2, 2, 52, 2, 12);
    fistGrad.addColorStop(0, 'rgb(210, 175, 145)');
    fistGrad.addColorStop(1, 'rgb(170, 135, 105)');
    ctx.fillStyle = fistGrad;
    ctx.beginPath();
    ctx.ellipse(52, 2, 10, 9, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Knuckles
    ctx.fillStyle = 'rgb(195, 160, 130)';
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(56, -4 + i * 3, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // TOFU tattoo on front arm
    if (!isBack) {
        ctx.fillStyle = 'rgba(25, 60, 45, 0.8)';
        ctx.font = 'bold 8px Impact';
        ctx.textAlign = 'center';
        ctx.fillText('TOFU', 18, 4);
    }

    // Veins
    ctx.globalAlpha = isBack ? 0.2 : 0.3;
    ctx.strokeStyle = 'rgb(100, 120, 145)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.quadraticCurveTo(25, -4, 42, 0);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
}

function drawEnemy(enemy) {
    if (enemy.x + enemy.width < camera.x - 50 || enemy.x > camera.x + SCREEN_WIDTH + 50) return;

    const ex = enemy.x;
    const ey = enemy.y;

    ctx.save();
    ctx.translate(ex + enemy.width/2, ey + enemy.height/2);
    ctx.scale(enemy.facing, 1);

    if (enemy.isDead) {
        ctx.rotate(enemy.deathTimer * 0.1);
        ctx.globalAlpha = 1 - enemy.deathTimer / 60;
    }

    ctx.translate(-enemy.width/2, -enemy.height/2);

    // Flash white when hit
    if (enemy.isHit) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(20, 30, 25, 35, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Color based on type
    let hairColor, skinColor, outfitColor;
    switch(enemy.type) {
        case 'imp':
            hairColor = '#FFB6C1';
            skinColor = '#FFE4E1';
            outfitColor = '#FF69B4';
            break;
        case 'demon':
            hairColor = '#FF4444';
            skinColor = '#FFD5D5';
            outfitColor = '#8B0000';
            break;
        case 'ogre':
            hairColor = '#90EE90';
            skinColor = '#E8FFE8';
            outfitColor = '#228B22';
            break;
    }

    // Body
    ctx.fillStyle = outfitColor;
    ctx.beginPath();
    ctx.ellipse(20, 35, 14, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (bouncing animation)
    const legAnim = Math.sin(enemy.animFrame * Math.PI / 2) * 5;
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(14, 52 + legAnim, 6, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(26, 52 - legAnim, 6, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(20, 10, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horse ears
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(4, -18);
    ctx.lineTo(12, -5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(36, -18);
    ctx.lineTo(28, -5);
    ctx.closePath();
    ctx.fill();

    // Inner ear
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(6, -12);
    ctx.lineTo(11, -5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(32, -2);
    ctx.lineTo(34, -12);
    ctx.lineTo(29, -5);
    ctx.closePath();
    ctx.fill();

    // Hair
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(20, 2, 13, 10, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // Hair strands
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.quadraticCurveTo(5, 20, 8, 30);
    ctx.lineTo(12, 28);
    ctx.quadraticCurveTo(10, 18, 12, 8);
    ctx.closePath();
    ctx.fill();

    // Eyes (anime style)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(14, 8, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(26, 8, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = enemy.type === 'demon' ? '#8B0000' : '#4169E1';
    ctx.beginPath();
    ctx.ellipse(15, 9, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(27, 9, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(14, 7, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(26, 7, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Blush
    ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
    ctx.beginPath();
    ctx.ellipse(8, 14, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(32, 14, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#FF6B6B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (enemy.isHit) {
        ctx.arc(20, 18, 3, 0, Math.PI);
    } else {
        ctx.arc(20, 16, 3, Math.PI, Math.PI * 2);
    }
    ctx.stroke();

    ctx.restore();

    // Health bar
    if (!enemy.isDead && enemy.health < enemy.maxHealth) {
        const healthPercent = enemy.health / enemy.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(ex, ey - 10, enemy.width, 5);
        ctx.fillStyle = healthPercent > 0.5 ? '#4a4' : healthPercent > 0.25 ? '#aa4' : '#a44';
        ctx.fillRect(ex, ey - 10, enemy.width * healthPercent, 5);
    }
}

function drawHUD() {
    // Health bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(15, 15, 210, 35);

    const healthPercent = player.health / player.maxHealth;
    const healthGrad = ctx.createLinearGradient(20, 20, 200, 20);
    if (healthPercent > 0.5) {
        healthGrad.addColorStop(0, '#22aa22');
        healthGrad.addColorStop(1, '#44cc44');
    } else if (healthPercent > 0.25) {
        healthGrad.addColorStop(0, '#aaaa22');
        healthGrad.addColorStop(1, '#cccc44');
    } else {
        healthGrad.addColorStop(0, '#aa2222');
        healthGrad.addColorStop(1, '#cc4444');
    }
    ctx.fillStyle = healthGrad;
    ctx.fillRect(20, 20, 200 * healthPercent, 25);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 200, 25);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.max(0, Math.floor(player.health))} HP`, 120, 38);

    // Wave and kills
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(SCREEN_WIDTH - 150, 15, 135, 55);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Wave: ${currentWave}/5`, SCREEN_WIDTH - 25, 35);
    ctx.fillText(`Kills: ${totalKills}`, SCREEN_WIDTH - 25, 58);

    // Smash cooldown indicator
    if (player.smashCooldown > 0) {
        ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('SMASH COOLDOWN', 20, 70);
    } else if (!player.isSmashing) {
        ctx.fillStyle = 'rgba(100, 255, 100, 0.8)';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('SMASH READY [SHIFT]', 20, 70);
    }

    // Controls hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('A/D or ←/→: Move | W/↑/SPACE: Jump | SHIFT: SMASH', SCREEN_WIDTH/2, SCREEN_HEIGHT - 15);
}

function drawStartScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 64px Impact';
    ctx.textAlign = 'center';
    ctx.fillText('TOFU SMASH', SCREEN_WIDTH/2, 180);

    ctx.fillStyle = '#ffaaaa';
    ctx.font = '24px Arial';
    ctx.fillText('Side-Scrolling Platformer', SCREEN_WIDTH/2, 230);

    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText('Smash the anime horse-girls with your mighty fists!', SCREEN_WIDTH/2, 300);

    ctx.fillText('A/D or ←/→ : Move', SCREEN_WIDTH/2, 360);
    ctx.fillText('W/↑/SPACE : Jump', SCREEN_WIDTH/2, 390);
    ctx.fillText('SHIFT : SMASH ATTACK', SCREEN_WIDTH/2, 420);

    ctx.fillStyle = '#ffff44';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Press ENTER or SPACE to Start', SCREEN_WIDTH/2, 500);
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(100, 0, 0, 0.85)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 72px Impact';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', SCREEN_WIDTH/2, 250);

    ctx.fillStyle = '#fff';
    ctx.font = '28px Arial';
    ctx.fillText(`You reached Wave ${currentWave}`, SCREEN_WIDTH/2, 320);
    ctx.fillText(`Total Kills: ${totalKills}`, SCREEN_WIDTH/2, 360);

    ctx.fillStyle = '#ffff44';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Press ENTER or SPACE to Restart', SCREEN_WIDTH/2, 450);
}

function drawWinScreen() {
    ctx.fillStyle = 'rgba(0, 50, 0, 0.85)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.fillStyle = '#44ff44';
    ctx.font = 'bold 72px Impact';
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY!', SCREEN_WIDTH/2, 250);

    ctx.fillStyle = '#fff';
    ctx.font = '28px Arial';
    ctx.fillText('You defeated all waves!', SCREEN_WIDTH/2, 320);
    ctx.fillText(`Total Kills: ${totalKills}`, SCREEN_WIDTH/2, 360);

    ctx.fillStyle = '#ffff44';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Press ENTER or SPACE to Play Again', SCREEN_WIDTH/2, 450);
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
