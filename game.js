// TOFU SMASH - First Person Melee Combat Game
// Doom-style raycasting with overhead smash attacks!

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const MAP_SIZE = 16;
const TILE_SIZE = 64;
const FOV = Math.PI / 3; // 60 degrees field of view
const NUM_RAYS = 200;
const MAX_DEPTH = 800;
const WALL_HEIGHT_FACTOR = 40000;

// Player settings
const player = {
    x: 4.5 * TILE_SIZE,
    y: 4.5 * TILE_SIZE,
    angle: 0,
    speed: 3,
    rotSpeed: 0.05,
    health: 100,
    maxHealth: 100,
    kills: 0,
    isSmashing: false,
    smashFrame: 0,
    smashCooldown: 0,
    bobOffset: 0,
    bobDirection: 1
};

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameover', 'win'
let currentWave = 1;
let enemiesRemaining = 0;
let totalKills = 0;
let screenShake = 0;
let bloodSplatters = [];

// Input handling
const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    strafeLeft: false,
    strafeRight: false,
    smash: false
};

// Map layout (1 = wall, 0 = floor)
let gameMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Enemies array
let enemies = [];

// Enemy class
class Enemy {
    constructor(x, y, type = 'demon') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.health = type === 'demon' ? 30 : type === 'imp' ? 20 : 50;
        this.maxHealth = this.health;
        this.speed = type === 'demon' ? 1.5 : type === 'imp' ? 2.5 : 1;
        this.damage = type === 'demon' ? 15 : type === 'imp' ? 10 : 25;
        this.size = type === 'ogre' ? 40 : 30;
        this.isHit = false;
        this.hitTimer = 0;
        this.attackCooldown = 0;
        this.isDead = false;
        this.deathTimer = 0;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    update() {
        if (this.isDead) {
            this.deathTimer++;
            return;
        }

        // Animation
        this.animTimer++;
        if (this.animTimer > 10) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 2;
        }

        // Hit flash timer
        if (this.isHit) {
            this.hitTimer--;
            if (this.hitTimer <= 0) {
                this.isHit = false;
            }
        }

        // Attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // Move towards player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 40) {
            // Move towards player
            const moveX = (dx / dist) * this.speed;
            const moveY = (dy / dist) * this.speed;

            // Check collision with walls
            const newX = this.x + moveX;
            const newY = this.y + moveY;

            const mapX = Math.floor(newX / TILE_SIZE);
            const mapY = Math.floor(newY / TILE_SIZE);

            if (mapX >= 0 && mapX < MAP_SIZE && mapY >= 0 && mapY < MAP_SIZE) {
                if (gameMap[mapY][mapX] === 0) {
                    this.x = newX;
                    this.y = newY;
                }
            }
        } else if (this.attackCooldown <= 0) {
            // Attack player
            player.health -= this.damage;
            this.attackCooldown = 60;
            screenShake = 10;

            // Add blood splatter effect
            for (let i = 0; i < 5; i++) {
                bloodSplatters.push({
                    x: Math.random() * SCREEN_WIDTH,
                    y: Math.random() * SCREEN_HEIGHT,
                    size: Math.random() * 50 + 20,
                    alpha: 0.8
                });
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.isHit = true;
        this.hitTimer = 10;

        if (this.health <= 0) {
            this.isDead = true;
            player.kills++;
            totalKills++;
            enemiesRemaining--;
            screenShake = 15;

            // Blood explosion
            for (let i = 0; i < 8; i++) {
                bloodSplatters.push({
                    x: Math.random() * SCREEN_WIDTH,
                    y: SCREEN_HEIGHT - Math.random() * 200,
                    size: Math.random() * 30 + 10,
                    alpha: 0.6
                });
            }
        }
    }

    getDistanceToPlayer() {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getAngleToPlayer() {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        return Math.atan2(dy, dx);
    }
}

// Spawn enemies for current wave
function spawnWave() {
    enemies = [];
    const numEnemies = 3 + currentWave * 2;
    enemiesRemaining = numEnemies;

    for (let i = 0; i < numEnemies; i++) {
        let x, y;
        let validPos = false;

        while (!validPos) {
            x = (Math.random() * 12 + 2) * TILE_SIZE;
            y = (Math.random() * 12 + 2) * TILE_SIZE;

            const mapX = Math.floor(x / TILE_SIZE);
            const mapY = Math.floor(y / TILE_SIZE);

            // Make sure not in a wall and not too close to player
            const distToPlayer = Math.sqrt(
                Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2)
            );

            if (gameMap[mapY][mapX] === 0 && distToPlayer > 200) {
                validPos = true;
            }
        }

        // Randomize enemy types based on wave
        let type = 'imp';
        const roll = Math.random();
        if (currentWave >= 2 && roll > 0.5) type = 'demon';
        if (currentWave >= 3 && roll > 0.8) type = 'ogre';

        enemies.push(new Enemy(x, y, type));
    }
}

// Input event listeners
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW':
        case 'ArrowUp':
            keys.forward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.backward = true;
            break;
        case 'KeyA':
            keys.strafeLeft = true;
            break;
        case 'KeyD':
            keys.strafeRight = true;
            break;
        case 'ArrowLeft':
            keys.left = true;
            break;
        case 'ArrowRight':
            keys.right = true;
            break;
        case 'Space':
        case 'KeyF':
            if (!keys.smash && player.smashCooldown <= 0) {
                keys.smash = true;
                player.isSmashing = true;
                player.smashFrame = 0;
            }
            e.preventDefault();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW':
        case 'ArrowUp':
            keys.forward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            keys.backward = false;
            break;
        case 'KeyA':
            keys.strafeLeft = false;
            break;
        case 'KeyD':
            keys.strafeRight = false;
            break;
        case 'ArrowLeft':
            keys.left = false;
            break;
        case 'ArrowRight':
            keys.right = false;
            break;
        case 'Space':
        case 'KeyF':
            keys.smash = false;
            break;
    }
});

// Button event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('next-level-btn').addEventListener('click', nextWave);
document.getElementById('win-restart-btn').addEventListener('click', startGame);

function startGame() {
    gameState = 'playing';
    player.x = 8 * TILE_SIZE;
    player.y = 8 * TILE_SIZE;
    player.angle = 0;
    player.health = player.maxHealth;
    player.kills = 0;
    totalKills = 0;
    currentWave = 1;
    bloodSplatters = [];

    spawnWave();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');
    document.getElementById('level-complete-screen').classList.add('hidden');
}

function nextWave() {
    currentWave++;
    player.health = Math.min(player.health + 30, player.maxHealth);
    spawnWave();

    document.getElementById('level-complete-screen').classList.add('hidden');
    gameState = 'playing';
}

function showWaveComplete() {
    if (currentWave >= 5) {
        // Win the game!
        document.getElementById('win-score').textContent = totalKills;
        document.getElementById('win-screen').classList.remove('hidden');
        gameState = 'win';
    } else {
        document.getElementById('completed-level').textContent = currentWave;
        document.getElementById('level-score').textContent = totalKills;
        document.getElementById('level-complete-screen').classList.remove('hidden');
        gameState = 'levelcomplete';
    }
}

function showGameOver() {
    document.getElementById('final-score').textContent = totalKills;
    document.getElementById('game-over-screen').classList.remove('hidden');
    gameState = 'gameover';
}

// Update player movement
function updatePlayer() {
    // Rotation
    if (keys.left) {
        player.angle -= player.rotSpeed;
    }
    if (keys.right) {
        player.angle += player.rotSpeed;
    }

    // Keep angle in bounds
    while (player.angle < 0) player.angle += Math.PI * 2;
    while (player.angle >= Math.PI * 2) player.angle -= Math.PI * 2;

    // Movement
    let moveX = 0;
    let moveY = 0;

    if (keys.forward) {
        moveX += Math.cos(player.angle) * player.speed;
        moveY += Math.sin(player.angle) * player.speed;
    }
    if (keys.backward) {
        moveX -= Math.cos(player.angle) * player.speed;
        moveY -= Math.sin(player.angle) * player.speed;
    }
    if (keys.strafeLeft) {
        moveX += Math.cos(player.angle - Math.PI/2) * player.speed;
        moveY += Math.sin(player.angle - Math.PI/2) * player.speed;
    }
    if (keys.strafeRight) {
        moveX += Math.cos(player.angle + Math.PI/2) * player.speed;
        moveY += Math.sin(player.angle + Math.PI/2) * player.speed;
    }

    // Check wall collision
    const newX = player.x + moveX;
    const newY = player.y + moveY;
    const padding = 15;

    const mapX1 = Math.floor((newX - padding) / TILE_SIZE);
    const mapX2 = Math.floor((newX + padding) / TILE_SIZE);
    const mapY1 = Math.floor((newY - padding) / TILE_SIZE);
    const mapY2 = Math.floor((newY + padding) / TILE_SIZE);

    // Check X movement
    if (gameMap[Math.floor(player.y / TILE_SIZE)][mapX1] === 0 &&
        gameMap[Math.floor(player.y / TILE_SIZE)][mapX2] === 0) {
        player.x = newX;
    }

    // Check Y movement
    if (gameMap[mapY1][Math.floor(player.x / TILE_SIZE)] === 0 &&
        gameMap[mapY2][Math.floor(player.x / TILE_SIZE)] === 0) {
        player.y = newY;
    }

    // View bob when moving
    if (keys.forward || keys.backward || keys.strafeLeft || keys.strafeRight) {
        player.bobOffset += player.bobDirection * 0.15;
        if (Math.abs(player.bobOffset) > 5) {
            player.bobDirection *= -1;
        }
    } else {
        player.bobOffset *= 0.8;
    }

    // Smash cooldown
    if (player.smashCooldown > 0) {
        player.smashCooldown--;
    }

    // Smash animation
    if (player.isSmashing) {
        player.smashFrame++;

        // At peak of smash, check for hits
        if (player.smashFrame === 8) {
            performSmash();
        }

        if (player.smashFrame >= 20) {
            player.isSmashing = false;
            player.smashCooldown = 15;
        }
    }

    // Check health
    if (player.health <= 0) {
        showGameOver();
    }

    // Check wave complete
    if (enemiesRemaining <= 0 && gameState === 'playing') {
        showWaveComplete();
    }
}

// Perform the smash attack
function performSmash() {
    screenShake = 20;

    // Check all enemies in range
    enemies.forEach(enemy => {
        if (enemy.isDead) return;

        const dist = enemy.getDistanceToPlayer();
        if (dist < 100) { // Smash range
            // Check if enemy is roughly in front of player
            let angleToEnemy = enemy.getAngleToPlayer();
            let angleDiff = player.angle - angleToEnemy;

            // Normalize angle difference
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            // Wide arc smash (120 degree cone)
            if (Math.abs(angleDiff) < Math.PI / 3) {
                enemy.takeDamage(40);
            }
        }
    });
}

// Raycasting for walls
function castRays() {
    const rays = [];
    const rayAngleStep = FOV / NUM_RAYS;
    const startAngle = player.angle - FOV / 2;

    for (let i = 0; i < NUM_RAYS; i++) {
        const rayAngle = startAngle + i * rayAngleStep;

        let rayX = player.x;
        let rayY = player.y;

        const rayDirX = Math.cos(rayAngle);
        const rayDirY = Math.sin(rayAngle);

        let distance = 0;
        let hitWall = false;
        let wallType = 0;

        while (!hitWall && distance < MAX_DEPTH) {
            distance += 1;

            rayX = player.x + rayDirX * distance;
            rayY = player.y + rayDirY * distance;

            const mapX = Math.floor(rayX / TILE_SIZE);
            const mapY = Math.floor(rayY / TILE_SIZE);

            if (mapX < 0 || mapX >= MAP_SIZE || mapY < 0 || mapY >= MAP_SIZE) {
                hitWall = true;
                wallType = 1;
            } else if (gameMap[mapY][mapX] !== 0) {
                hitWall = true;
                wallType = gameMap[mapY][mapX];
            }
        }

        // Fix fisheye effect
        const correctedDist = distance * Math.cos(rayAngle - player.angle);

        rays.push({
            distance: correctedDist,
            angle: rayAngle,
            wallType: wallType
        });
    }

    return rays;
}

// Draw the 3D view
function draw3DView() {
    const rays = castRays();
    const rayWidth = SCREEN_WIDTH / NUM_RAYS;

    // Draw ceiling
    const ceilingGradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT / 2);
    ceilingGradient.addColorStop(0, '#1a0a0a');
    ceilingGradient.addColorStop(1, '#3d1a1a');
    ctx.fillStyle = ceilingGradient;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT / 2);

    // Draw floor
    const floorGradient = ctx.createLinearGradient(0, SCREEN_HEIGHT / 2, 0, SCREEN_HEIGHT);
    floorGradient.addColorStop(0, '#2d2d2d');
    floorGradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2);

    // Draw walls
    for (let i = 0; i < rays.length; i++) {
        const ray = rays[i];
        const wallHeight = WALL_HEIGHT_FACTOR / ray.distance;
        const wallTop = (SCREEN_HEIGHT - wallHeight) / 2 + player.bobOffset;

        // Wall color with distance shading
        const brightness = Math.max(0.2, 1 - ray.distance / MAX_DEPTH);
        const r = Math.floor(139 * brightness);
        const g = Math.floor(69 * brightness);
        const b = Math.floor(69 * brightness);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(
            i * rayWidth,
            wallTop + (screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0),
            rayWidth + 1,
            wallHeight
        );

        // Add vertical line detail
        if (i % 4 === 0) {
            ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
            ctx.fillRect(i * rayWidth, wallTop, 1, wallHeight);
        }
    }
}

// Draw enemies as sprites
function drawEnemies() {
    // Sort enemies by distance (far to near)
    const sortedEnemies = [...enemies].sort((a, b) =>
        b.getDistanceToPlayer() - a.getDistanceToPlayer()
    );

    sortedEnemies.forEach(enemy => {
        if (enemy.isDead && enemy.deathTimer > 30) return; // Fade out dead enemies

        const dist = enemy.getDistanceToPlayer();
        if (dist > MAX_DEPTH) return;

        // Calculate screen position
        let angleToEnemy = Math.atan2(
            enemy.y - player.y,
            enemy.x - player.x
        );

        let angleDiff = angleToEnemy - player.angle;

        // Normalize angle
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        // Check if in view
        if (Math.abs(angleDiff) > FOV / 2 + 0.2) return;

        // Screen X position
        const screenX = (SCREEN_WIDTH / 2) + (angleDiff / (FOV / 2)) * (SCREEN_WIDTH / 2);

        // Sprite size based on distance
        const spriteHeight = WALL_HEIGHT_FACTOR / dist * 0.8;
        const spriteWidth = spriteHeight * 0.8;

        const spriteY = (SCREEN_HEIGHT - spriteHeight) / 2 + player.bobOffset +
            (screenShake > 0 ? (Math.random() - 0.5) * screenShake : 0);

        // Draw enemy
        if (enemy.isDead) {
            // Dead enemy - collapsed
            ctx.globalAlpha = Math.max(0, 1 - enemy.deathTimer / 30);
            drawDeadEnemy(screenX, spriteY + spriteHeight * 0.6, spriteWidth, spriteHeight * 0.3, enemy.type);
            ctx.globalAlpha = 1;
        } else {
            drawEnemy(screenX, spriteY, spriteWidth, spriteHeight, enemy);
        }
    });
}

function drawEnemy(x, y, width, height, enemy) {
    const centerX = x;
    const centerY = y + height / 2;

    // Anime color palette based on type
    let hairColor, skinColor, eyeColor, outfitColor;
    switch (enemy.type) {
        case 'imp':
            hairColor = '#FFB6C1'; // Pink hair
            skinColor = '#FFE4E1';
            eyeColor = '#FF69B4';
            outfitColor = '#DDA0DD';
            break;
        case 'demon':
            hairColor = '#FF4444'; // Red hair
            skinColor = '#FFE0D0';
            eyeColor = '#FF0000';
            outfitColor = '#8B0000';
            break;
        case 'ogre':
            hairColor = '#90EE90'; // Green hair
            skinColor = '#F0FFF0';
            eyeColor = '#228B22';
            outfitColor = '#006400';
            break;
    }

    if (enemy.isHit) {
        hairColor = skinColor = eyeColor = outfitColor = '#ffffff';
    }

    // === HORSE EARS ===
    // Left ear
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(centerX - width / 3, y + height / 6);
    ctx.quadraticCurveTo(centerX - width / 2.5, y - height / 2, centerX - width / 5, y - height / 3);
    ctx.quadraticCurveTo(centerX - width / 4, y, centerX - width / 3, y + height / 6);
    ctx.fill();
    // Inner ear
    ctx.fillStyle = '#FFB0B0';
    ctx.beginPath();
    ctx.moveTo(centerX - width / 3.2, y + height / 8);
    ctx.quadraticCurveTo(centerX - width / 2.8, y - height / 3, centerX - width / 4.5, y - height / 5);
    ctx.quadraticCurveTo(centerX - width / 3.5, y, centerX - width / 3.2, y + height / 8);
    ctx.fill();

    // Right ear
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(centerX + width / 3, y + height / 6);
    ctx.quadraticCurveTo(centerX + width / 2.5, y - height / 2, centerX + width / 5, y - height / 3);
    ctx.quadraticCurveTo(centerX + width / 4, y, centerX + width / 3, y + height / 6);
    ctx.fill();
    // Inner ear
    ctx.fillStyle = '#FFB0B0';
    ctx.beginPath();
    ctx.moveTo(centerX + width / 3.2, y + height / 8);
    ctx.quadraticCurveTo(centerX + width / 2.8, y - height / 3, centerX + width / 4.5, y - height / 5);
    ctx.quadraticCurveTo(centerX + width / 3.5, y, centerX + width / 3.2, y + height / 8);
    ctx.fill();

    // === ANIME HAIR ===
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(centerX, y + height / 5, width / 2.2, height / 3.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // Hair bangs
    ctx.beginPath();
    ctx.moveTo(centerX - width / 2.5, y + height / 4);
    ctx.quadraticCurveTo(centerX - width / 4, y + height / 3, centerX - width / 6, y + height / 4.5);
    ctx.quadraticCurveTo(centerX, y + height / 3.5, centerX + width / 6, y + height / 4.5);
    ctx.quadraticCurveTo(centerX + width / 4, y + height / 3, centerX + width / 2.5, y + height / 4);
    ctx.lineTo(centerX + width / 2.5, y + height / 6);
    ctx.lineTo(centerX - width / 2.5, y + height / 6);
    ctx.fill();

    // === ANIME FACE ===
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY - height / 10, width / 2.5, height / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // === BIG ANIME EYES ===
    if (!enemy.isHit) {
        const eyeW = width / 5;
        const eyeH = height / 5;
        const eyeY = centerY - height / 6;

        // Left eye white
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(centerX - width / 6, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left eye color
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(centerX - width / 6, eyeY + 2, eyeW * 0.7, eyeH * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(centerX - width / 6, eyeY + 3, eyeW * 0.35, eyeH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(centerX - width / 5, eyeY - 2, eyeW * 0.25, eyeH * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right eye white
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(centerX + width / 6, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right eye color
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(centerX + width / 6, eyeY + 2, eyeW * 0.7, eyeH * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right pupil
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(centerX + width / 6, eyeY + 3, eyeW * 0.35, eyeH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right eye shine
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(centerX + width / 7, eyeY - 2, eyeW * 0.25, eyeH * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Small anime mouth
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + height / 10, width / 10, height / 20, 0, 0, Math.PI);
        ctx.fill();

        // Blush marks
        ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
        ctx.beginPath();
        ctx.ellipse(centerX - width / 4, centerY, width / 8, height / 20, 0, 0, Math.PI * 2);
        ctx.ellipse(centerX + width / 4, centerY, width / 8, height / 20, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // === BODY/OUTFIT ===
    ctx.fillStyle = outfitColor;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + height / 3, width / 2.5, height / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outfit detail
    ctx.strokeStyle = enemy.isHit ? '#fff' : '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + height / 6);
    ctx.lineTo(centerX, centerY + height / 2);
    ctx.stroke();
}

function drawDeadEnemy(x, y, width, height, type) {
    // Collapsed anime horse-girl
    let hairColor;
    switch (type) {
        case 'imp': hairColor = '#FFB6C1'; break;
        case 'demon': hairColor = '#FF4444'; break;
        case 'ogre': hairColor = '#90EE90'; break;
    }

    // Flat body
    ctx.fillStyle = '#FFE4E1';
    ctx.beginPath();
    ctx.ellipse(x, y, width / 2, height / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair splayed out
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(x, y - height / 6, width / 2, height / 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // X eyes (anime style)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const eyeSize = width / 12;

    ctx.beginPath();
    ctx.moveTo(x - width / 5 - eyeSize, y - eyeSize);
    ctx.lineTo(x - width / 5 + eyeSize, y + eyeSize);
    ctx.moveTo(x - width / 5 + eyeSize, y - eyeSize);
    ctx.lineTo(x - width / 5 - eyeSize, y + eyeSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + width / 5 - eyeSize, y - eyeSize);
    ctx.lineTo(x + width / 5 + eyeSize, y + eyeSize);
    ctx.moveTo(x + width / 5 + eyeSize, y - eyeSize);
    ctx.lineTo(x + width / 5 - eyeSize, y + eyeSize);
    ctx.stroke();

    // Droopy ears
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(x - width / 3, y - height / 4, width / 8, height / 5, -0.5, 0, Math.PI * 2);
    ctx.ellipse(x + width / 3, y - height / 4, width / 8, height / 5, 0.5, 0, Math.PI * 2);
    ctx.fill();
}

// Draw the player's fists - anatomically correct arms with joints
function drawFists() {
    const bobY = player.bobOffset * 3;

    // Fixed shoulder anchor points - top 1/3 of screen, at edges
    const leftShoulderX = -20;
    const rightShoulderX = SCREEN_WIDTH + 20;
    const shoulderY = SCREEN_HEIGHT / 3;

    // Arm segment lengths (like a muscular person)
    const upperArmLength = 180;  // Shoulder to elbow
    const forearmLength = 160;   // Elbow to wrist

    // Base wrist/fist position - connected together in center bottom
    let fistCenterX = SCREEN_WIDTH / 2;
    let fistY = SCREEN_HEIGHT - 60 + bobY;
    let fistScale = 1.0;
    let smashPhase = 'idle';

    if (player.isSmashing) {
        if (player.smashFrame < 6) {
            // Wind up - raise connected fists overhead
            const windUp = player.smashFrame / 6;
            fistY = SCREEN_HEIGHT - 60 - windUp * 500;
            fistScale = 1.0 + windUp * 0.3;
            smashPhase = 'windup';
        } else if (player.smashFrame < 10) {
            // SMASH DOWN! - connected fists slam down
            const smashProgress = (player.smashFrame - 6) / 4;
            fistY = SCREEN_HEIGHT - 560 + smashProgress * 620;
            fistScale = 1.3 + smashProgress * 0.3;
            smashPhase = 'smash';
        } else {
            // Recovery - return to idle
            const recovery = (player.smashFrame - 10) / 10;
            fistY = SCREEN_HEIGHT + 60 - recovery * 120;
            fistScale = 1.6 - recovery * 0.6;
            smashPhase = 'recovery';
        }
    }

    // Calculate wrist positions for each arm
    const leftWristX = fistCenterX - 50;
    const rightWristX = fistCenterX + 50;
    const wristY = fistY;

    // Draw both arms with proper joint anatomy
    drawAnatomicalArm(leftShoulderX, shoulderY, leftWristX, wristY, upperArmLength, forearmLength, true, smashPhase);
    drawAnatomicalArm(rightShoulderX, shoulderY, rightWristX, wristY, upperArmLength, forearmLength, false, smashPhase);

    // Draw both connected fists in the center
    drawConnectedFists(fistCenterX, fistY, fistScale, smashPhase);
}

// Calculate elbow position using inverse kinematics
function calculateElbowPosition(shoulderX, shoulderY, wristX, wristY, upperArmLen, forearmLen, isLeft) {
    const dx = wristX - shoulderX;
    const dy = wristY - shoulderY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp distance to valid range
    const maxReach = upperArmLen + forearmLen - 10;
    const minReach = Math.abs(upperArmLen - forearmLen) + 10;
    const clampedDist = Math.max(minReach, Math.min(maxReach, dist));

    // Use law of cosines to find elbow angle
    const a = upperArmLen;
    const b = forearmLen;
    const c = clampedDist;

    // Angle at shoulder
    let cosAngleA = (a * a + c * c - b * b) / (2 * a * c);
    cosAngleA = Math.max(-1, Math.min(1, cosAngleA));
    const angleA = Math.acos(cosAngleA);

    // Base angle from shoulder to wrist
    const baseAngle = Math.atan2(dy, dx);

    // Elbow bends outward (left arm bends left, right arm bends right)
    const elbowAngle = isLeft ? baseAngle - angleA : baseAngle + angleA;

    return {
        x: shoulderX + Math.cos(elbowAngle) * upperArmLen,
        y: shoulderY + Math.sin(elbowAngle) * upperArmLen
    };
}

// Draw anatomically correct muscular arm with shoulder, elbow, and wrist joints
function drawAnatomicalArm(shoulderX, shoulderY, wristX, wristY, upperArmLen, forearmLen, isLeft, phase) {
    ctx.save();

    // Hyper-realistic skin color palette
    const skinBase = '#D4A574';
    const skinWarm = '#E8B896';
    const skinShadow = '#A67C5B';
    const skinDeepShadow = '#8B6547';
    const skinHighlight = '#F5D5C0';
    const skinPale = '#F0E0D6';
    const veinBlue = '#6080A0';
    const veinPurple = '#8070A0';

    // Calculate elbow position using IK
    const elbow = calculateElbowPosition(shoulderX, shoulderY, wristX, wristY, upperArmLen, forearmLen, isLeft);

    // Calculate angles for each segment
    const upperArmAngle = Math.atan2(elbow.y - shoulderY, elbow.x - shoulderX);
    const forearmAngle = Math.atan2(wristY - elbow.y, wristX - elbow.x);

    // === DRAW SHOULDER JOINT (Deltoid muscle) ===
    drawDeltoid(shoulderX, shoulderY, upperArmAngle, isLeft);

    // === DRAW UPPER ARM (Bicep & Tricep) ===
    drawUpperArm(shoulderX, shoulderY, elbow.x, elbow.y, upperArmAngle, isLeft, phase);

    // === DRAW ELBOW JOINT ===
    drawElbowJoint(elbow.x, elbow.y, upperArmAngle, forearmAngle);

    // === DRAW FOREARM (Brachioradialis, Extensors, Flexors) ===
    drawForearm(elbow.x, elbow.y, wristX, wristY, forearmAngle, isLeft);

    // === DRAW WRIST ===
    drawWrist(wristX, wristY, forearmAngle);

    ctx.restore();
}

// Draw the deltoid (shoulder) muscle
function drawDeltoid(x, y, angle, isLeft) {
    const skinBase = '#D4A574';
    const skinWarm = '#E8B896';
    const skinShadow = '#A67C5B';
    const skinHighlight = '#F5D5C0';

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Deltoid - rounded cap over shoulder
    const deltoidGrad = ctx.createRadialGradient(20, 0, 5, 25, 0, 50);
    deltoidGrad.addColorStop(0, skinHighlight);
    deltoidGrad.addColorStop(0.4, skinWarm);
    deltoidGrad.addColorStop(0.7, skinBase);
    deltoidGrad.addColorStop(1, skinShadow);

    ctx.fillStyle = deltoidGrad;
    ctx.beginPath();
    ctx.ellipse(30, 0, 45, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deltoid striations (muscle fibers visible)
    ctx.strokeStyle = 'rgba(180, 140, 110, 0.3)';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(5, i * 8);
        ctx.quadraticCurveTo(30, i * 6, 55, i * 10);
        ctx.stroke();
    }

    ctx.restore();
}

// Draw upper arm with bicep and tricep
function drawUpperArm(sx, sy, ex, ey, angle, isLeft, phase) {
    const skinBase = '#D4A574';
    const skinWarm = '#E8B896';
    const skinShadow = '#A67C5B';
    const skinDeepShadow = '#8B6547';
    const skinHighlight = '#F5D5C0';
    const veinBlue = '#6080A0';

    const length = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // Base upper arm cylinder
    const armGrad = ctx.createLinearGradient(0, -40, 0, 40);
    armGrad.addColorStop(0, skinShadow);
    armGrad.addColorStop(0.25, skinBase);
    armGrad.addColorStop(0.5, skinWarm);
    armGrad.addColorStop(0.75, skinHighlight);
    armGrad.addColorStop(1, skinBase);

    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.moveTo(20, -35);
    ctx.lineTo(length - 15, -30);
    ctx.quadraticCurveTo(length, 0, length - 15, 30);
    ctx.lineTo(20, 35);
    ctx.quadraticCurveTo(0, 0, 20, -35);
    ctx.fill();

    // BICEP - the bulging muscle on front of arm
    const bicepBulge = phase === 'windup' ? 1.3 : (phase === 'smash' ? 1.4 : 1.0);
    const bicepGrad = ctx.createRadialGradient(length * 0.45, -12, 5, length * 0.45, -8, 35 * bicepBulge);
    bicepGrad.addColorStop(0, skinHighlight);
    bicepGrad.addColorStop(0.4, skinWarm);
    bicepGrad.addColorStop(1, skinBase);

    ctx.fillStyle = bicepGrad;
    ctx.beginPath();
    ctx.ellipse(length * 0.45, -10, 40 * bicepBulge, 28 * bicepBulge, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Bicep peak definition
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(length * 0.45, -12, 25 * bicepBulge, -0.5, Math.PI + 0.5);
    ctx.stroke();

    // TRICEP - horseshoe muscle on back of arm
    const tricepGrad = ctx.createRadialGradient(length * 0.5, 15, 5, length * 0.5, 18, 30);
    tricepGrad.addColorStop(0, skinBase);
    tricepGrad.addColorStop(0.5, skinShadow);
    tricepGrad.addColorStop(1, skinDeepShadow);

    ctx.fillStyle = tricepGrad;
    ctx.beginPath();
    ctx.ellipse(length * 0.5, 18, 35, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tricep horseshoe shape definition
    ctx.strokeStyle = skinDeepShadow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(length * 0.3, 25);
    ctx.quadraticCurveTo(length * 0.5, 35, length * 0.7, 25);
    ctx.stroke();

    // Brachialis (muscle between bicep and tricep)
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.ellipse(length * 0.6, -5, 15, 25, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Major vein running along bicep
    ctx.strokeStyle = veinBlue;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(30, -25);
    ctx.bezierCurveTo(length * 0.3, -30, length * 0.5, -25, length * 0.7, -20);
    ctx.stroke();

    // Vein highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(31, -26);
    ctx.bezierCurveTo(length * 0.3, -31, length * 0.5, -26, length * 0.7, -21);
    ctx.stroke();

    // Branching vein
    ctx.strokeStyle = veinBlue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(length * 0.4, -27);
    ctx.quadraticCurveTo(length * 0.35, -35, length * 0.25, -32);
    ctx.stroke();

    // TOFU tattoo on left arm bicep
    if (isLeft) {
        ctx.save();
        ctx.translate(length * 0.45, -5);
        ctx.rotate(-0.1);

        // Tattoo shadow
        ctx.fillStyle = 'rgba(0, 40, 20, 0.15)';
        ctx.font = 'bold 24px Impact';
        ctx.textAlign = 'center';
        ctx.fillText('TOFU', 2, 2);

        // Main tattoo ink
        ctx.fillStyle = '#1B4D3E';
        ctx.fillText('TOFU', 0, 0);

        // Ink texture
        ctx.fillStyle = 'rgba(20, 80, 50, 0.5)';
        ctx.font = 'bold 22px Impact';
        ctx.fillText('TOFU', 0, 0);

        ctx.restore();
    }

    // Arm hair
    ctx.strokeStyle = 'rgba(80, 60, 40, 0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 20; i++) {
        const hx = 40 + Math.random() * (length - 60);
        const hy = -25 + Math.random() * 50;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + (Math.random() - 0.5) * 5, hy - 4);
        ctx.stroke();
    }

    ctx.restore();
}

// Draw elbow joint
function drawElbowJoint(x, y, upperAngle, forearmAngle) {
    const skinBase = '#D4A574';
    const skinWarm = '#E8B896';
    const skinShadow = '#A67C5B';
    const skinHighlight = '#F5D5C0';

    ctx.save();
    ctx.translate(x, y);

    // Elbow is a complex joint - draw olecranon (elbow bump)
    const avgAngle = (upperAngle + forearmAngle) / 2;
    ctx.rotate(avgAngle);

    // Main elbow joint
    const elbowGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 30);
    elbowGrad.addColorStop(0, skinHighlight);
    elbowGrad.addColorStop(0.5, skinWarm);
    elbowGrad.addColorStop(1, skinShadow);

    ctx.fillStyle = elbowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Olecranon (bony point of elbow)
    ctx.fillStyle = skinHighlight;
    ctx.beginPath();
    ctx.ellipse(0, 12, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Elbow crease
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -5, 18, 0.5, Math.PI - 0.5);
    ctx.stroke();

    // Tendons visible at elbow
    ctx.strokeStyle = 'rgba(180, 150, 120, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -20);
    ctx.lineTo(-5, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -20);
    ctx.lineTo(5, 5);
    ctx.stroke();

    ctx.restore();
}

// Draw forearm with brachioradialis and other muscles
function drawForearm(ex, ey, wx, wy, angle, isLeft) {
    const skinBase = '#D4A574';
    const skinWarm = '#E8B896';
    const skinShadow = '#A67C5B';
    const skinDeepShadow = '#8B6547';
    const skinHighlight = '#F5D5C0';
    const veinBlue = '#6080A0';

    const length = Math.sqrt((wx - ex) ** 2 + (wy - ey) ** 2);

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle);

    // Base forearm shape - tapers toward wrist
    const forearmGrad = ctx.createLinearGradient(0, -35, 0, 35);
    forearmGrad.addColorStop(0, skinShadow);
    forearmGrad.addColorStop(0.3, skinBase);
    forearmGrad.addColorStop(0.5, skinWarm);
    forearmGrad.addColorStop(0.7, skinHighlight);
    forearmGrad.addColorStop(1, skinBase);

    ctx.fillStyle = forearmGrad;
    ctx.beginPath();
    ctx.moveTo(10, -28);
    ctx.lineTo(length - 10, -18);
    ctx.quadraticCurveTo(length, 0, length - 10, 18);
    ctx.lineTo(10, 28);
    ctx.quadraticCurveTo(-5, 0, 10, -28);
    ctx.fill();

    // BRACHIORADIALIS - prominent muscle on outer forearm
    const brachioGrad = ctx.createRadialGradient(length * 0.3, -10, 5, length * 0.3, -8, 25);
    brachioGrad.addColorStop(0, skinHighlight);
    brachioGrad.addColorStop(0.5, skinWarm);
    brachioGrad.addColorStop(1, skinBase);

    ctx.fillStyle = brachioGrad;
    ctx.beginPath();
    ctx.ellipse(length * 0.3, -8, 30, 18, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Extensor muscles (top of forearm)
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.ellipse(length * 0.5, -12, 25, 12, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Flexor muscles (bottom of forearm)
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.ellipse(length * 0.4, 12, 28, 15, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Pronator teres
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.ellipse(length * 0.2, 8, 18, 12, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Forearm veins - complex network
    ctx.strokeStyle = veinBlue;
    ctx.lineWidth = 2.5;

    // Main cephalic vein
    ctx.beginPath();
    ctx.moveTo(15, -20);
    ctx.bezierCurveTo(length * 0.3, -22, length * 0.6, -18, length - 15, -12);
    ctx.stroke();

    // Basilic vein
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 18);
    ctx.bezierCurveTo(length * 0.4, 20, length * 0.7, 15, length - 15, 10);
    ctx.stroke();

    // Median cubital vein (connects the two)
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(length * 0.2, -15);
    ctx.quadraticCurveTo(length * 0.25, 0, length * 0.3, 15);
    ctx.stroke();

    // Vein highlights
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, -21);
    ctx.bezierCurveTo(length * 0.3, -23, length * 0.6, -19, length - 15, -13);
    ctx.stroke();

    // Tendons visible near wrist
    ctx.strokeStyle = 'rgba(200, 170, 140, 0.5)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(length * 0.7, i * 6);
        ctx.lineTo(length - 5, i * 4);
        ctx.stroke();
    }

    // Forearm hair
    ctx.strokeStyle = 'rgba(70, 50, 35, 0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 25; i++) {
        const hx = 25 + Math.random() * (length - 50);
        const hy = -20 + Math.random() * 40;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + (Math.random() - 0.5) * 5, hy - 3);
        ctx.stroke();
    }

    ctx.restore();
}

// Draw wrist joint
function drawWrist(x, y, angle) {
    const skinBase = '#D4A574';
    const skinWarm = '#E8B896';
    const skinShadow = '#A67C5B';
    const skinHighlight = '#F5D5C0';

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Wrist is narrower, with visible bones
    const wristGrad = ctx.createRadialGradient(0, 0, 3, 0, 0, 22);
    wristGrad.addColorStop(0, skinHighlight);
    wristGrad.addColorStop(0.5, skinWarm);
    wristGrad.addColorStop(1, skinShadow);

    ctx.fillStyle = wristGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ulna head (bony bump on outside of wrist)
    ctx.fillStyle = skinHighlight;
    ctx.beginPath();
    ctx.ellipse(0, 14, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tendons on wrist
    ctx.strokeStyle = 'rgba(200, 170, 140, 0.6)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-15, i * 5);
        ctx.lineTo(15, i * 4);
        ctx.stroke();
    }

    // Wrist creases
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-18, -3);
    ctx.lineTo(18, -3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16, 3);
    ctx.lineTo(16, 3);
    ctx.stroke();

    ctx.restore();
}

// Draw two connected fists balled together
function drawConnectedFists(centerX, centerY, scale, phase) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Hyper-realistic skin color palette
    const skinBase = '#D4A574';
    const skinWarm = '#E8B896';
    const skinShadow = '#A67C5B';
    const skinDeepShadow = '#8B6547';
    const skinHighlight = '#F5D5C0';
    const skinPale = '#F0E0D6';
    const veinBlue = '#7090A8';

    // Draw left fist (slightly to the left)
    drawSingleFist(-35, 0, true);

    // Draw right fist (slightly to the right)
    drawSingleFist(35, 0, false);

    // Draw interlocking fingers in the middle (hands clasped together)
    const handGradient = ctx.createRadialGradient(0, -20, 5, 0, -15, 60);
    handGradient.addColorStop(0, skinHighlight);
    handGradient.addColorStop(0.4, skinWarm);
    handGradient.addColorStop(0.8, skinBase);
    handGradient.addColorStop(1, skinShadow);
    ctx.fillStyle = handGradient;

    // Connecting knuckles in center where hands meet
    for (let i = -1; i <= 1; i++) {
        const knuckleX = i * 18;
        const knuckleGradient = ctx.createRadialGradient(knuckleX, -45, 2, knuckleX, -43, 14);
        knuckleGradient.addColorStop(0, skinPale);
        knuckleGradient.addColorStop(0.5, skinHighlight);
        knuckleGradient.addColorStop(1, skinBase);
        ctx.fillStyle = knuckleGradient;
        ctx.beginPath();
        ctx.ellipse(knuckleX, -45, 12, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Knuckle wrinkles
        ctx.strokeStyle = skinDeepShadow;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(knuckleX, -45, 11, 0.3, 2.8);
        ctx.stroke();
    }

    // Smash impact effect during smash phase
    if (phase === 'smash') {
        // Impact lines
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.8)';
        ctx.lineWidth = 4;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 50, -30 + Math.sin(angle) * 30);
            ctx.lineTo(Math.cos(angle) * 90, -30 + Math.sin(angle) * 50);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// Draw a single fist
function drawSingleFist(offsetX, offsetY, isLeft) {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    if (!isLeft) ctx.scale(-1, 1);

    const skinBase = '#D4A574';
    const skinWarm = '#E8B896';
    const skinShadow = '#A67C5B';
    const skinDeepShadow = '#8B6547';
    const skinHighlight = '#F5D5C0';
    const skinPale = '#F0E0D6';
    const veinBlue = '#7090A8';

    // Wrist
    const wristGradient = ctx.createLinearGradient(-25, 15, 25, 15);
    wristGradient.addColorStop(0, skinShadow);
    wristGradient.addColorStop(0.3, skinBase);
    wristGradient.addColorStop(0.7, skinWarm);
    wristGradient.addColorStop(1, skinShadow);
    ctx.fillStyle = wristGradient;
    ctx.beginPath();
    ctx.ellipse(0, 15, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back of hand
    const handGradient = ctx.createRadialGradient(0, -15, 5, 0, -10, 45);
    handGradient.addColorStop(0, skinHighlight);
    handGradient.addColorStop(0.4, skinWarm);
    handGradient.addColorStop(0.8, skinBase);
    handGradient.addColorStop(1, skinShadow);
    ctx.fillStyle = handGradient;
    ctx.beginPath();
    ctx.moveTo(-32, 8);
    ctx.quadraticCurveTo(-38, -10, -30, -35);
    ctx.lineTo(30, -35);
    ctx.quadraticCurveTo(38, -10, 32, 8);
    ctx.quadraticCurveTo(0, 20, -32, 8);
    ctx.fill();

    // Hand veins
    ctx.strokeStyle = veinBlue;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, 5);
    ctx.quadraticCurveTo(-8, -12, -12, -28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.quadraticCurveTo(10, -8, 15, -25);
    ctx.stroke();

    // Metacarpal bones
    ctx.strokeStyle = 'rgba(160, 130, 110, 0.35)';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 4; i++) {
        const boneX = -20 + i * 13;
        ctx.beginPath();
        ctx.moveTo(boneX + 2, 0);
        ctx.lineTo(boneX, -28);
        ctx.stroke();
    }

    // Four fingers curled
    for (let i = 0; i < 4; i++) {
        const fingerX = -22 + i * 14;
        const fingerSize = i === 1 || i === 2 ? 1.1 : 0.95;

        // Knuckle
        const knuckleGradient = ctx.createRadialGradient(fingerX, -42, 2, fingerX, -40, 11);
        knuckleGradient.addColorStop(0, skinPale);
        knuckleGradient.addColorStop(0.5, skinHighlight);
        knuckleGradient.addColorStop(1, skinBase);
        ctx.fillStyle = knuckleGradient;
        ctx.beginPath();
        ctx.ellipse(fingerX, -42, 8 * fingerSize, 10 * fingerSize, 0, 0, Math.PI * 2);
        ctx.fill();

        // Knuckle wrinkle
        ctx.strokeStyle = skinDeepShadow;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.arc(fingerX, -42, 8 * fingerSize, 0.3, 2.8);
        ctx.stroke();

        // Curled finger segment
        ctx.fillStyle = skinBase;
        ctx.beginPath();
        ctx.ellipse(fingerX, -33, 6 * fingerSize, 7 * fingerSize, 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Thumb wrapped over
    ctx.fillStyle = skinWarm;
    ctx.beginPath();
    ctx.ellipse(-30, -2, 13, 18, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.ellipse(-36, -10, 10, 20, -0.5, 0, Math.PI * 2);
    ctx.fill();

    const thumbGradient = ctx.createRadialGradient(-42, -24, 3, -40, -22, 13);
    thumbGradient.addColorStop(0, skinHighlight);
    thumbGradient.addColorStop(0.6, skinWarm);
    thumbGradient.addColorStop(1, skinBase);
    ctx.fillStyle = thumbGradient;
    ctx.beginPath();
    ctx.ellipse(-40, -24, 9, 12, -0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skinWarm;
    ctx.beginPath();
    ctx.ellipse(-46, -36, 8, 10, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Thumb nail
    ctx.fillStyle = '#F8F0EC';
    ctx.beginPath();
    ctx.ellipse(-48, -40, 5, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Draw blood splatters
function drawBloodSplatters() {
    bloodSplatters.forEach((splat, index) => {
        ctx.fillStyle = `rgba(139, 0, 0, ${splat.alpha})`;
        ctx.beginPath();
        ctx.arc(splat.x, splat.y, splat.size, 0, Math.PI * 2);
        ctx.fill();

        // Fade out
        splat.alpha -= 0.02;
    });

    // Remove faded splatters
    bloodSplatters = bloodSplatters.filter(s => s.alpha > 0);
}

// Draw HUD
function drawHUD() {
    // Health bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(20, SCREEN_HEIGHT - 50, 200, 30);

    // Health bar
    const healthPercent = player.health / player.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#22aa22' : healthPercent > 0.25 ? '#aaaa22' : '#aa2222';
    ctx.fillStyle = healthColor;
    ctx.fillRect(22, SCREEN_HEIGHT - 48, 196 * healthPercent, 26);

    // Health bar border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, SCREEN_HEIGHT - 50, 200, 30);

    // Health text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.max(0, Math.floor(player.health))} HP`, 120, SCREEN_HEIGHT - 30);

    // Smash indicator
    if (player.smashCooldown > 0) {
        ctx.fillStyle = '#666';
    } else {
        ctx.fillStyle = '#44ff44';
    }
    ctx.fillRect(SCREEN_WIDTH - 100, SCREEN_HEIGHT - 50, 80, 30);
    ctx.strokeRect(SCREEN_WIDTH - 100, SCREEN_HEIGHT - 50, 80, 30);
    ctx.fillStyle = player.smashCooldown > 0 ? '#aaa' : '#fff';
    ctx.fillText('SMASH!', SCREEN_WIDTH - 60, SCREEN_HEIGHT - 30);

    // Crosshair
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 2;
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy);
    ctx.lineTo(cx - 5, cy);
    ctx.moveTo(cx + 5, cy);
    ctx.lineTo(cx + 15, cy);
    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx, cy - 5);
    ctx.moveTo(cx, cy + 5);
    ctx.lineTo(cx, cy + 15);
    ctx.stroke();

    // Smashing effect
    if (player.isSmashing && player.smashFrame >= 8 && player.smashFrame < 12) {
        ctx.fillStyle = `rgba(255, 255, 0, ${0.3 - (player.smashFrame - 8) * 0.075})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // SMASH text
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SMASH!', SCREEN_WIDTH / 2 + Math.random() * 10, SCREEN_HEIGHT / 2 + Math.random() * 10);
    }
}

// Update UI overlay
function updateUI() {
    document.getElementById('level').textContent = `WAVE ${currentWave}`;
    document.getElementById('score').textContent = totalKills;
    document.getElementById('coins').textContent = enemiesRemaining;
    document.getElementById('lives').textContent = Math.floor(player.health);
    document.getElementById('time').textContent = '';
}

// Main game loop
function gameLoop() {
    // Update screen shake
    if (screenShake > 0) {
        screenShake -= 1;
    }

    if (gameState === 'playing') {
        updatePlayer();

        // Update enemies
        enemies.forEach(enemy => enemy.update());
    }

    // Apply screen shake
    ctx.save();
    if (screenShake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * screenShake,
            (Math.random() - 0.5) * screenShake
        );
    }

    // Draw everything
    draw3DView();
    drawEnemies();
    drawBloodSplatters();
    drawFists();

    ctx.restore();

    drawHUD();

    if (gameState === 'playing') {
        updateUI();
    }

    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();
