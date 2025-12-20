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

// Generate level - challenging but fair platforming
function generateLevel() {
    platforms = [];

    // Solid starting area
    for (let x = 0; x < 600; x += 200) {
        platforms.push({
            x: x,
            y: 520,
            width: 200,
            height: 80,
            type: 'ground'
        });
    }

    // Section 1: Ground with jumpable gaps (gap = 150, easy jump)
    let groundX = 600;
    const groundPattern = [200, -150, 250, -150, 200, -180, 300, -150, 200];
    for (const segment of groundPattern) {
        if (segment > 0) {
            platforms.push({ x: groundX, y: 520, width: segment, height: 80, type: 'ground' });
            groundX += segment;
        } else {
            groundX += Math.abs(segment); // gap
        }
    }

    // Section 2: Stepping stone platforms (always reachable)
    const steppingStones = [
        { x: 750, y: 420, w: 100 },
        { x: 900, y: 350, w: 120 },
        { x: 1100, y: 380, w: 100 },
        { x: 1300, y: 320, w: 110 },
        { x: 1500, y: 360, w: 100 },
        { x: 1700, y: 300, w: 120 },
        { x: 1900, y: 340, w: 100 },
    ];
    for (const stone of steppingStones) {
        platforms.push({ x: stone.x, y: stone.y, width: stone.w, height: 20, type: 'platform' });
    }

    // Continue ground after gap section
    for (let x = groundX; x < levelWidth - 200; x += 200) {
        // Occasional gaps that are always jumpable
        if (x % 600 === 0 && x > groundX) {
            x += 120; // Small gap
        }
        platforms.push({ x: x, y: 520, width: 200, height: 80, type: 'ground' });
    }

    // Section 3: High platforms for skilled players (bonus route)
    const highPlatforms = [
        { x: 400, y: 250, w: 150 },
        { x: 620, y: 180, w: 120 },
        { x: 850, y: 150, w: 130 },
        { x: 1100, y: 180, w: 120 },
        { x: 1350, y: 140, w: 140 },
        { x: 1600, y: 170, w: 120 },
        { x: 1850, y: 130, w: 130 },
        { x: 2100, y: 160, w: 120 },
        { x: 2350, y: 140, w: 150 },
    ];
    for (const plat of highPlatforms) {
        platforms.push({ x: plat.x, y: plat.y, width: plat.w, height: 20, type: 'floating' });
    }

    // Mid-level connector platforms
    const connectors = [
        { x: 500, y: 350, w: 80 },
        { x: 1000, y: 280, w: 90 },
        { x: 1450, y: 250, w: 85 },
        { x: 2000, y: 270, w: 90 },
        { x: 2500, y: 280, w: 85 },
    ];
    for (const conn of connectors) {
        platforms.push({ x: conn.x, y: conn.y, width: conn.w, height: 20, type: 'platform' });
    }
}

// Enemies array
let enemies = [];

// Boss state
let boss = null;
let isBossFight = false;
let fireballs = []; // Boss fireballs

// Enemy class - Haru Urara style horse girls
class Enemy {
    constructor(x, y, type = 'urara') {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 60;
        this.velX = 0;
        this.velY = 0;
        this.type = type;
        // Haru Urara variants
        this.health = type === 'urara_strong' ? 50 : type === 'urara_fast' ? 20 : 30;
        this.maxHealth = this.health;
        this.speed = type === 'urara_fast' ? 4 : type === 'urara_strong' ? 1.8 : 2.5;
        this.damage = type === 'urara_strong' ? 18 : type === 'urara_fast' ? 8 : 12;
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

// Boss class - Marioman the Furry
class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 140;
        this.velX = 0;
        this.velY = 0;
        this.health = 500;
        this.maxHealth = 500;
        this.speed = 2.5;
        this.damage = 25;
        this.onGround = false;
        this.facing = -1;
        this.isHit = false;
        this.hitTimer = 0;
        this.isDead = false;
        this.deathTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;
        this.jumpCooldown = 0;
        this.attackCooldown = 0;
        this.isAttacking = false;
        this.attackFrame = 0;
        this.phase = 1; // Gets angrier as health drops
        this.introTimer = 120; // Intro animation
        this.shakeTimer = 0;
        this.fireballCooldown = 0; // Fireball attack timer
    }

    update() {
        // Intro animation
        if (this.introTimer > 0) {
            this.introTimer--;
            if (this.introTimer > 60) {
                screenShake = 5;
            }
            return;
        }

        if (this.isDead) {
            this.deathTimer++;
            this.velY += GRAVITY * 0.3;
            this.y += this.velY;
            screenShake = Math.max(0, 20 - this.deathTimer * 0.3);
            return;
        }

        // Phase based on health
        this.phase = this.health > 300 ? 1 : this.health > 150 ? 2 : 3;

        // Animation
        this.animTimer++;
        if (this.animTimer > 6) {
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

        // Move towards player (faster in later phases)
        const dx = player.x - this.x;
        this.facing = dx > 0 ? 1 : -1;
        const phaseSpeed = this.speed + (this.phase - 1) * 0.8;

        if (Math.abs(dx) > 60) {
            this.velX = this.facing * phaseSpeed;
        } else {
            this.velX = 0;
            // Attack when close
            if (this.attackCooldown <= 0 && !this.isAttacking) {
                this.isAttacking = true;
                this.attackFrame = 0;
                this.attackCooldown = 60 - this.phase * 10;
            }
        }

        // Attack animation
        if (this.isAttacking) {
            this.attackFrame++;
            if (this.attackFrame === 15) {
                // Deal damage if player is close
                if (Math.abs(player.x - this.x) < 100 && Math.abs(player.y - this.y) < 80) {
                    player.health -= this.damage;
                    screenShake = 15;
                }
            }
            if (this.attackFrame >= 30) {
                this.isAttacking = false;
            }
        }

        if (this.attackCooldown > 0) this.attackCooldown--;

        // Fireball attack - shoots fireballs at player
        if (this.fireballCooldown <= 0 && !this.isAttacking) {
            const fireballSpeed = 6 + this.phase;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Shoot fireball towards player
            fireballs.push({
                x: this.x + this.width / 2,
                y: this.y + 30,
                velX: (dx / dist) * fireballSpeed,
                velY: (dy / dist) * fireballSpeed,
                size: 15 + this.phase * 3,
                damage: 15 + this.phase * 5,
                life: 180
            });

            // Shoot more fireballs in later phases
            if (this.phase >= 2) {
                fireballs.push({
                    x: this.x + this.width / 2,
                    y: this.y + 30,
                    velX: (dx / dist) * fireballSpeed + 2,
                    velY: (dy / dist) * fireballSpeed - 2,
                    size: 12 + this.phase * 2,
                    damage: 10 + this.phase * 3,
                    life: 150
                });
            }
            if (this.phase >= 3) {
                fireballs.push({
                    x: this.x + this.width / 2,
                    y: this.y + 30,
                    velX: (dx / dist) * fireballSpeed - 2,
                    velY: (dy / dist) * fireballSpeed - 2,
                    size: 12 + this.phase * 2,
                    damage: 10 + this.phase * 3,
                    life: 150
                });
            }

            this.fireballCooldown = 90 - this.phase * 15; // Faster in later phases
            screenShake = 4;
        }
        if (this.fireballCooldown > 0) this.fireballCooldown--;

        // Jump if player is above (more frequent in later phases)
        const jumpChance = this.phase === 3 ? 40 : this.phase === 2 ? 60 : 80;
        if (player.y < this.y - 80 && this.onGround && this.jumpCooldown <= 0) {
            this.velY = JUMP_FORCE * 1.2;
            this.onGround = false;
            this.jumpCooldown = jumpChance;
            screenShake = 8;
        }
        if (this.jumpCooldown > 0) this.jumpCooldown--;

        // Apply velocity
        this.x += this.velX;
        this.y += this.velY;

        // Platform collision
        this.onGround = false;
        for (const plat of platforms) {
            if (this.velY >= 0 &&
                this.x + this.width > plat.x &&
                this.x < plat.x + plat.width &&
                this.y + this.height >= plat.y &&
                this.y + this.height <= plat.y + plat.height + this.velY + 5) {
                this.y = plat.y - this.height;
                this.velY = 0;
                this.onGround = true;
                if (this.shakeTimer > 0) {
                    screenShake = 5;
                    this.shakeTimer = 0;
                }
            }
        }

        if (!this.onGround && this.velY > 0) {
            this.shakeTimer = 5;
        }

        // World bounds
        if (this.x < 0) this.x = 0;
        if (this.x > levelWidth - this.width) this.x = levelWidth - this.width;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.isHit = true;
        this.hitTimer = 8;
        screenShake = 10;

        // Knockback resistant
        this.velY = -3;
        this.velX = -this.facing * 2;

        if (this.health <= 0) {
            this.isDead = true;
            screenShake = 25;
            // Victory particles
            for (let i = 0; i < 50; i++) {
                particles.push({
                    x: this.x + this.width/2,
                    y: this.y + this.height/2,
                    velX: (Math.random() - 0.5) * 20,
                    velY: (Math.random() - 0.5) * 20 - 10,
                    size: 5 + Math.random() * 10,
                    color: `hsl(${Math.random() * 360}, 80%, 60%)`,
                    life: 80
                });
            }
        }
    }
}

// Spawn wave of enemies
function spawnWave(wave) {
    enemies = [];
    boss = null;
    isBossFight = false;
    fireballs = []; // Clear fireballs

    if (wave === 6) {
        // Boss fight!
        isBossFight = true;
        boss = new Boss(player.x + 400, 200);
        return;
    }

    const numEnemies = 4 + wave * 2;

    for (let i = 0; i < numEnemies; i++) {
        const x = 500 + i * 180 + Math.random() * 80;
        const y = 200;
        // All enemies are now Haru Urara variants
        const types = ['urara', 'urara', 'urara_fast', 'urara_strong'];
        const type = types[Math.floor(Math.random() * Math.min(wave + 1, types.length))];
        enemies.push(new Enemy(x, y, type));
    }
}

// Input event listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.jump = true;
    if (e.code === 'KeyF' || e.code === 'ControlLeft' || e.code === 'ControlRight') keys.smash = true;

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
    if (e.code === 'KeyF' || e.code === 'ControlLeft' || e.code === 'ControlRight') keys.smash = false;
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

            // Hit regular enemies
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

            // Hit boss
            if (boss && !boss.isDead && boss.introTimer <= 0) {
                if (boss.x + boss.width > smashX &&
                    boss.x < smashX + smashRange &&
                    Math.abs(boss.y - player.y) < 100) {
                    boss.takeDamage(25); // Less damage to boss

                    // Impact particles
                    for (let i = 0; i < 12; i++) {
                        particles.push({
                            x: boss.x + boss.width/2,
                            y: boss.y + boss.height/2,
                            velX: (Math.random() - 0.5) * 20,
                            velY: (Math.random() - 0.5) * 20,
                            size: 6 + Math.random() * 10,
                            color: 'rgb(255, 180, 100)',
                            life: 25
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

    // Update boss
    if (boss) {
        boss.update();

        // Boss collision with player
        if (!boss.isDead && !player.isSmashing && boss.introTimer <= 0) {
            if (player.x + player.width > boss.x &&
                player.x < boss.x + boss.width &&
                player.y + player.height > boss.y &&
                player.y < boss.y + boss.height) {
                player.health -= 1;
                screenShake = 5;
            }
        }
    }

    // Update fireballs
    fireballs = fireballs.filter(fb => {
        fb.x += fb.velX;
        fb.y += fb.velY;
        fb.life--;

        // Check collision with player
        const dx = player.x + player.width/2 - fb.x;
        const dy = player.y + player.height/2 - fb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < fb.size + 20) {
            player.health -= fb.damage;
            screenShake = 10;
            // Explosion particles
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x: fb.x,
                    y: fb.y,
                    velX: (Math.random() - 0.5) * 10,
                    velY: (Math.random() - 0.5) * 10,
                    size: 4 + Math.random() * 6,
                    color: `hsl(${Math.random() * 60}, 100%, 50%)`,
                    life: 30
                });
            }
            return false; // Remove fireball
        }

        // Remove if off screen or expired
        return fb.life > 0 && fb.y < 700;
    });

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
    if (isBossFight) {
        // Boss fight completion
        if (boss && boss.isDead && boss.deathTimer > 100) {
            gameState = 'win';
        }
    } else if (enemies.filter(e => !e.isDead).length === 0) {
        currentWave++;
        if (currentWave > 5) {
            // Wave 6 is boss fight
            spawnWave(currentWave);
            player.health = Math.min(player.health + 50, player.maxHealth);
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

    // Draw boss
    if (boss) {
        drawBoss(boss);
    }

    // Draw fireballs
    for (const fb of fireballs) {
        // Fireball glow
        const fbGrad = ctx.createRadialGradient(fb.x, fb.y, 0, fb.x, fb.y, fb.size * 1.5);
        fbGrad.addColorStop(0, 'rgba(255, 255, 200, 1)');
        fbGrad.addColorStop(0.3, 'rgba(255, 150, 0, 0.9)');
        fbGrad.addColorStop(0.6, 'rgba(255, 50, 0, 0.7)');
        fbGrad.addColorStop(1, 'rgba(100, 0, 0, 0)');
        ctx.fillStyle = fbGrad;
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, fb.size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Fireball core
        ctx.fillStyle = 'rgba(255, 255, 100, 0.9)';
        ctx.beginPath();
        ctx.arc(fb.x, fb.y, fb.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Fire trail particles
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.5 - i * 0.15})`;
            ctx.beginPath();
            ctx.arc(
                fb.x - fb.velX * (i + 1) * 0.5 + (Math.random() - 0.5) * 5,
                fb.y - fb.velY * (i + 1) * 0.5 + (Math.random() - 0.5) * 5,
                fb.size * (0.4 - i * 0.1),
                0, Math.PI * 2
            );
            ctx.fill();
        }
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

    // === SHIRTLESS MUSCULAR TORSO (Kratos style) ===
    // Base torso - skin tone
    const torsoGrad = ctx.createLinearGradient(10, 15, 40, 55);
    torsoGrad.addColorStop(0, 'rgb(195, 160, 130)');
    torsoGrad.addColorStop(0.5, 'rgb(180, 145, 115)');
    torsoGrad.addColorStop(1, 'rgb(165, 130, 100)');
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.ellipse(25, 35 + runBob, 20, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pec muscles
    ctx.fillStyle = 'rgb(175, 140, 110)';
    ctx.beginPath();
    ctx.ellipse(17, 25 + runBob, 10, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(33, 25 + runBob, 10, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Pec highlights
    ctx.fillStyle = 'rgb(200, 165, 135)';
    ctx.beginPath();
    ctx.ellipse(16, 23 + runBob, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(34, 23 + runBob, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Abs - 6 pack
    ctx.fillStyle = 'rgb(165, 130, 100)';
    for (let row = 0; row < 3; row++) {
        ctx.beginPath();
        ctx.ellipse(20, 38 + row * 8 + runBob, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(30, 38 + row * 8 + runBob, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Center line
    ctx.strokeStyle = 'rgb(150, 115, 85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(25, 20 + runBob);
    ctx.lineTo(25, 58 + runBob);
    ctx.stroke();

    // === KRATOS RED STRIPE ===
    ctx.strokeStyle = 'rgb(180, 30, 30)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // Stripe goes from left shoulder diagonally across chest
    ctx.moveTo(8, 18 + runBob);
    ctx.lineTo(15, 25 + runBob);
    ctx.lineTo(25, 35 + runBob);
    ctx.lineTo(35, 50 + runBob);
    ctx.stroke();

    // Red stripe shadow
    ctx.strokeStyle = 'rgb(120, 20, 20)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 20 + runBob);
    ctx.lineTo(17, 27 + runBob);
    ctx.lineTo(27, 37 + runBob);
    ctx.lineTo(37, 52 + runBob);
    ctx.stroke();

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

    // Smash animation phases with proper joint angles
    let shoulderAngle = 0;
    let elbowAngle = 0;

    if (player.isSmashing) {
        const frame = player.smashFrame;
        if (frame < 6) {
            // Wind-up: pull arm back, bend elbow
            shoulderAngle = -0.8 - frame * 0.15;
            elbowAngle = -1.2 - frame * 0.1;
        } else if (frame < 12) {
            // Strike: extend arm forward rapidly
            const strikeProgress = (frame - 6) / 6;
            shoulderAngle = -1.7 + strikeProgress * 2.5;
            elbowAngle = -1.8 + strikeProgress * 2.0;
        } else {
            // Follow through
            const followProgress = Math.min((frame - 12) / 10, 1);
            shoulderAngle = 0.8 - followProgress * 0.8;
            elbowAngle = 0.2 - followProgress * 0.2;
        }
    }

    ctx.save();

    // Shoulder position
    const shoulderX = isBack ? 15 : 35;
    const shoulderY = 22 + runBob;
    ctx.translate(shoulderX, shoulderY);

    // Arm opacity for depth
    if (isBack) ctx.globalAlpha = 0.85;

    // === SHOULDER JOINT ===
    // Deltoid muscle at shoulder
    ctx.fillStyle = 'rgb(190, 155, 125)';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    // === UPPER ARM (rotates from shoulder) ===
    const upperArmRotation = isBack ?
        (shoulderAngle * 0.5 - armSwing + 0.3) :
        (shoulderAngle + armSwing + 0.3);
    ctx.rotate(upperArmRotation);

    const upperArmLength = 22;

    // Upper arm muscle
    const armGrad = ctx.createLinearGradient(0, -7, 0, 7);
    armGrad.addColorStop(0, 'rgb(175, 140, 110)');
    armGrad.addColorStop(0.5, 'rgb(200, 165, 135)');
    armGrad.addColorStop(1, 'rgb(165, 130, 100)');
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.ellipse(upperArmLength / 2, 0, upperArmLength / 2 + 2, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bicep bulge (more pronounced during wind-up)
    const bicepBulge = player.isSmashing && player.smashFrame < 8 ? 1.3 : 1;
    ctx.fillStyle = 'rgb(205, 170, 140)';
    ctx.beginPath();
    ctx.ellipse(upperArmLength / 2 - 2, -3, 10 * bicepBulge, 6 * bicepBulge, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Tricep on back
    ctx.fillStyle = 'rgb(180, 145, 115)';
    ctx.beginPath();
    ctx.ellipse(upperArmLength / 2, 4, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // === ELBOW JOINT ===
    ctx.translate(upperArmLength, 0);

    // Elbow
    ctx.fillStyle = 'rgb(185, 150, 120)';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // === FOREARM (rotates from elbow) ===
    const forearmRotation = isBack ? elbowAngle * 0.5 : elbowAngle;
    ctx.rotate(forearmRotation);

    const forearmLength = 20;

    // Forearm muscle
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.ellipse(forearmLength / 2, 0, forearmLength / 2 + 2, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Forearm definition
    ctx.fillStyle = 'rgb(190, 155, 125)';
    ctx.beginPath();
    ctx.ellipse(forearmLength / 2 + 3, -2, 8, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // === WRIST & FIST ===
    ctx.translate(forearmLength, 0);

    // Wrist
    ctx.fillStyle = 'rgb(195, 160, 130)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fist
    const fistGrad = ctx.createRadialGradient(10, 0, 2, 10, 0, 12);
    fistGrad.addColorStop(0, 'rgb(210, 175, 145)');
    fistGrad.addColorStop(1, 'rgb(170, 135, 105)');
    ctx.fillStyle = fistGrad;
    ctx.beginPath();
    ctx.ellipse(10, 0, 10, 9, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Knuckles
    ctx.fillStyle = 'rgb(195, 160, 130)';
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(16, -5 + i * 3.5, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // TOFU tattoo on front arm's upper arm
    if (!isBack) {
        ctx.save();
        ctx.rotate(-forearmRotation); // Undo forearm rotation
        ctx.translate(-forearmLength, 0); // Go back to elbow
        ctx.rotate(-upperArmRotation + 0.3); // Undo upper arm rotation partially
        ctx.fillStyle = 'rgba(180, 30, 30, 0.9)'; // Red like Kratos markings
        ctx.font = 'bold 7px Impact';
        ctx.textAlign = 'center';
        ctx.fillText('TOFU', -8, 3);
        ctx.restore();
    }

    // Veins on forearm
    ctx.globalAlpha = isBack ? 0.2 : 0.35;
    ctx.strokeStyle = 'rgb(100, 130, 155)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-forearmLength + 5, -2);
    ctx.quadraticCurveTo(-forearmLength / 2, -4, 2, -1);
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

    // Haru Urara style - all variants have brown hair with white blaze
    const skinColor = '#FFE4D6'; // Soft skin tone
    let outfitColor, accentColor;
    switch(enemy.type) {
        case 'urara_fast':
            outfitColor = '#FF6B35'; // Bright orange racing
            accentColor = '#FFD700';
            break;
        case 'urara_strong':
            outfitColor = '#E85D04'; // Darker orange
            accentColor = '#FF8C00';
            break;
        default: // urara
            outfitColor = '#FF8C42'; // Classic orange
            accentColor = '#FFB347';
            break;
    }

    // Racing outfit body
    ctx.fillStyle = outfitColor;
    ctx.beginPath();
    ctx.ellipse(20, 35, 14, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Racing stripes on outfit
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 20);
    ctx.lineTo(12, 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(28, 20);
    ctx.lineTo(28, 50);
    ctx.stroke();

    // Accent stripe
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, 18);
    ctx.lineTo(20, 52);
    ctx.stroke();

    // Legs (bouncing animation)
    const legAnim = Math.sin(enemy.animFrame * Math.PI / 2) * 5;
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(14, 52 + legAnim, 6, 12, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(26, 52 - legAnim, 6, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Racing boots
    ctx.fillStyle = '#4A3728';
    ctx.beginPath();
    ctx.ellipse(14, 62 + legAnim, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(26, 62 - legAnim, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(20, 10, 12, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Horse ears (brown with pink inside)
    ctx.fillStyle = '#8B5A2B'; // Brown ears
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

    // Inner ear (pink)
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

    // Brown hair (chestnut color like Haru Urara)
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(20, 2, 13, 10, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // White blaze (Haru Urara's signature marking)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(17, -6);
    ctx.lineTo(20, 2);
    ctx.lineTo(23, -6);
    ctx.quadraticCurveTo(20, -8, 17, -6);
    ctx.fill();
    // Blaze continues down forehead
    ctx.beginPath();
    ctx.ellipse(20, 0, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair strands (brown)
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.quadraticCurveTo(3, 20, 6, 32);
    ctx.lineTo(11, 30);
    ctx.quadraticCurveTo(9, 18, 12, 8);
    ctx.closePath();
    ctx.fill();
    // Right side hair
    ctx.beginPath();
    ctx.moveTo(32, 5);
    ctx.quadraticCurveTo(37, 20, 34, 32);
    ctx.lineTo(29, 30);
    ctx.quadraticCurveTo(31, 18, 28, 8);
    ctx.closePath();
    ctx.fill();

    // Eyes (big cheerful anime eyes)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(14, 8, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(26, 8, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (warm brown like Haru Urara)
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(15, 9, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(27, 9, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine (multiple for sparkly anime eyes)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(13, 7, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(25, 7, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(16, 10, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28, 10, 1, 0, Math.PI * 2);
    ctx.fill();

    // Cheerful blush
    ctx.fillStyle = 'rgba(255, 130, 130, 0.6)';
    ctx.beginPath();
    ctx.ellipse(8, 14, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(32, 14, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cheerful smile (Haru Urara is always smiling!)
    ctx.strokeStyle = '#E85D75';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (enemy.isHit) {
        // Surprised expression when hit
        ctx.arc(20, 17, 3, 0, Math.PI * 2);
    } else {
        // Big happy smile
        ctx.arc(20, 14, 5, 0.2, Math.PI - 0.2);
    }
    ctx.stroke();

    // Add "ganbarimasu!" spirit (small star when not hit)
    if (!enemy.isHit && !enemy.isDead) {
        ctx.fillStyle = '#FFD700';
        const starX = 35 + Math.sin(Date.now() / 200) * 2;
        const starY = -5 + Math.cos(Date.now() / 200) * 2;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const r = i % 2 === 0 ? 4 : 2;
            if (i === 0) ctx.moveTo(starX + r * Math.cos(angle), starY + r * Math.sin(angle));
            else ctx.lineTo(starX + r * Math.cos(angle), starY + r * Math.sin(angle));
        }
        ctx.closePath();
        ctx.fill();
    }

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

// Draw boss - Marioman the Furry
function drawBoss(boss) {
    if (boss.x + boss.width < camera.x - 100 || boss.x > camera.x + SCREEN_WIDTH + 100) return;

    const bx = boss.x;
    const by = boss.y;

    ctx.save();
    ctx.translate(bx + boss.width/2, by + boss.height/2);
    ctx.scale(boss.facing, 1);

    // Intro animation
    if (boss.introTimer > 0) {
        ctx.globalAlpha = 1 - boss.introTimer / 120;
        if (boss.introTimer > 60) {
            ctx.scale(1 + (boss.introTimer - 60) / 60, 1 + (boss.introTimer - 60) / 60);
        }
    }

    if (boss.isDead) {
        ctx.rotate(boss.deathTimer * 0.05);
        ctx.globalAlpha = Math.max(0, 1 - boss.deathTimer / 100);
    }

    ctx.translate(-boss.width/2, -boss.height/2);

    // Flash when hit
    if (boss.isHit) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(50, 70, 55, 75, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Phase colors (gets angrier as health drops)
    let furColor, furLight, eyeColor;
    switch(boss.phase) {
        case 1:
            furColor = '#8B4513'; // Brown fur
            furLight = '#A0522D';
            eyeColor = '#FFD700';
            break;
        case 2:
            furColor = '#A52A2A'; // Reddish brown
            furLight = '#CD5C5C';
            eyeColor = '#FF6347';
            break;
        case 3:
            furColor = '#8B0000'; // Dark red (rage mode)
            furLight = '#DC143C';
            eyeColor = '#FF0000';
            break;
    }

    // Large furry body
    const furGrad = ctx.createRadialGradient(50, 70, 10, 50, 70, 60);
    furGrad.addColorStop(0, furLight);
    furGrad.addColorStop(1, furColor);
    ctx.fillStyle = furGrad;
    ctx.beginPath();
    ctx.ellipse(50, 75, 45, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy chest
    ctx.fillStyle = '#F5DEB3'; // Tan belly
    ctx.beginPath();
    ctx.ellipse(50, 80, 30, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    // Furry legs
    const legAnim = Math.sin(boss.animFrame * Math.PI / 2) * 8;
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(30, 120 + legAnim, 15, 25, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(70, 120 - legAnim, 15, 25, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Big furry feet
    ctx.fillStyle = furLight;
    ctx.beginPath();
    ctx.ellipse(28, 140 + legAnim, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(72, 140 - legAnim, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    const armAngle = boss.isAttacking ? Math.sin(boss.attackFrame * 0.3) * 0.8 : 0;
    ctx.save();
    ctx.translate(15, 50);
    ctx.rotate(-0.5 + armAngle);
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(0, 20, 12, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Paw
    ctx.fillStyle = furLight;
    ctx.beginPath();
    ctx.ellipse(0, 42, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(85, 50);
    ctx.rotate(0.5 - armAngle);
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(0, 20, 12, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = furLight;
    ctx.beginPath();
    ctx.ellipse(0, 42, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Large furry head
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(50, 25, 35, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Furry snout
    ctx.fillStyle = furLight;
    ctx.beginPath();
    ctx.ellipse(50, 35, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#2F2F2F';
    ctx.beginPath();
    ctx.ellipse(50, 30, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(48, 28, 3, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Furry ears
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(20, 0, 15, 20, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(80, 0, 15, 20, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Inner ears
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(20, 2, 8, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(80, 2, 8, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyes (angrier in later phases)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(35, 18, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(65, 18, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.ellipse(37, 19, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(67, 19, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrows
    ctx.strokeStyle = furColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(25, 8);
    ctx.lineTo(42, 12 - boss.phase * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(75, 8);
    ctx.lineTo(58, 12 - boss.phase * 2);
    ctx.stroke();

    // Mouth (grimace or roar)
    ctx.fillStyle = '#4A0000';
    ctx.beginPath();
    if (boss.isAttacking && boss.attackFrame > 10 && boss.attackFrame < 20) {
        // Roaring mouth
        ctx.ellipse(50, 42, 15, 10, 0, 0, Math.PI * 2);
    } else {
        // Grimace
        ctx.ellipse(50, 42, 10, 5, 0, 0, Math.PI);
    }
    ctx.fill();

    // Fangs
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(42, 40);
    ctx.lineTo(44, 48);
    ctx.lineTo(46, 40);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(54, 40);
    ctx.lineTo(56, 48);
    ctx.lineTo(58, 40);
    ctx.fill();

    // "MARIOMAN" name tag
    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
    ctx.fillRect(20, 55, 60, 16);
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 55, 60, 16);
    ctx.fillStyle = '#8B0000';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MARIOMAN', 50, 67);

    ctx.restore();

    // Hovering name above boss head (always visible, bobs up and down)
    if (!boss.isDead) {
        const nameY = by - 30 + Math.sin(Date.now() / 300) * 5;
        const nameX = bx + boss.width / 2;

        // Glowing background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(nameX - 55, nameY - 15, 110, 28, 8);
        ctx.fill();

        // Glowing border
        ctx.strokeStyle = `hsl(${(Date.now() / 20) % 360}, 100%, 50%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(nameX - 55, nameY - 15, 110, 28, 8);
        ctx.stroke();

        // Name text with glow
        ctx.shadowColor = '#FF4400';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#FF4444';
        ctx.font = 'bold 18px Impact';
        ctx.textAlign = 'center';
        ctx.fillText('MARIOMAN', nameX, nameY + 5);
        ctx.shadowBlur = 0;

        // Fire emoji decorations
        ctx.font = '12px Arial';
        ctx.fillText('🔥', nameX - 48, nameY + 5);
        ctx.fillText('🔥', nameX + 42, nameY + 5);
    }

    // Boss intro announcement
    if (boss.introTimer > 0 && boss.introTimer < 80) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(bx - 80, by - 60, 260, 50);
        ctx.strokeStyle = '#FF4400';
        ctx.lineWidth = 3;
        ctx.strokeRect(bx - 80, by - 60, 260, 50);
        ctx.fillStyle = '#FF4444';
        ctx.font = 'bold 28px Impact';
        ctx.textAlign = 'center';
        ctx.fillText('MARIOMAN', bx + 50, by - 30);
        ctx.fillStyle = '#FFD700';
        ctx.font = '14px Arial';
        ctx.fillText('🔥 The Furry Boss 🔥', bx + 50, by - 12);
    }

    // Health bar (large, at top when in boss fight)
    if (!boss.isDead && boss.introTimer <= 0) {
        const healthPercent = boss.health / boss.maxHealth;
        const barWidth = 300;
        const barX = camera.x + SCREEN_WIDTH / 2 - barWidth / 2;
        const barY = 50;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX - 5, barY - 5, barWidth + 10, 30);

        const healthColor = boss.phase === 3 ? '#FF0000' : boss.phase === 2 ? '#FF6600' : '#FFCC00';
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, 20);
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, 20);

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, 20);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('MARIOMAN', barX + barWidth / 2, barY + 15);
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

    ctx.fillStyle = isBossFight ? '#FF4444' : '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    if (isBossFight) {
        ctx.fillText('BOSS FIGHT!', SCREEN_WIDTH - 25, 35);
    } else {
        ctx.fillText(`Wave: ${currentWave}/5`, SCREEN_WIDTH - 25, 35);
    }
    ctx.fillStyle = '#fff';
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
        ctx.fillText('SMASH READY [CTRL]', 20, 70);
    }

    // Controls hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('A/D or ←/→: Move | W/↑/SPACE: Jump | CTRL: SMASH', SCREEN_WIDTH/2, SCREEN_HEIGHT - 15);
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
    ctx.fillText('CTRL : SMASH ATTACK', SCREEN_WIDTH/2, 420);

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
