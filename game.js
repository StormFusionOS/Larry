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

// Draw the player's fists - first person view from bottom corners
function drawFists() {
    const bobY = player.bobOffset * 2;

    // Arms originate from bottom corners of screen
    const leftArmOriginX = -80;
    const leftArmOriginY = SCREEN_HEIGHT + 100;
    const rightArmOriginX = SCREEN_WIDTH + 80;
    const rightArmOriginY = SCREEN_HEIGHT + 100;

    // Fists meet in the center
    let fistCenterX = SCREEN_WIDTH / 2;
    let fistCenterY = SCREEN_HEIGHT / 2 + 50 + bobY;
    let fistScale = 1.0;
    let smashPhase = 'idle';

    if (player.isSmashing) {
        if (player.smashFrame < 6) {
            // Wind up - raise fists up
            const windUp = player.smashFrame / 6;
            fistCenterY = SCREEN_HEIGHT / 2 + 50 - windUp * 350;
            fistScale = 1.0 - windUp * 0.2;
            smashPhase = 'windup';
        } else if (player.smashFrame < 10) {
            // SMASH DOWN!
            const smashProgress = (player.smashFrame - 6) / 4;
            fistCenterY = SCREEN_HEIGHT / 2 - 300 + smashProgress * 500;
            fistScale = 0.8 + smashProgress * 0.5;
            smashPhase = 'smash';
        } else {
            // Recovery
            const recovery = (player.smashFrame - 10) / 10;
            fistCenterY = SCREEN_HEIGHT / 2 + 200 - recovery * 150;
            fistScale = 1.3 - recovery * 0.3;
            smashPhase = 'recovery';
        }
    }

    // Draw left forearm from bottom-left corner to center
    drawFirstPersonForearm(leftArmOriginX, leftArmOriginY, fistCenterX - 55, fistCenterY, true, smashPhase);

    // Draw right forearm from bottom-right corner to center
    drawFirstPersonForearm(rightArmOriginX, rightArmOriginY, fistCenterX + 55, fistCenterY, false, smashPhase);

    // Draw the two fists pressed together
    drawPressedFists(fistCenterX, fistCenterY, fistScale, smashPhase);
}

// Draw realistic first-person forearm from corner to fist
function drawFirstPersonForearm(originX, originY, wristX, wristY, isLeft, phase) {
    ctx.save();

    // Skin tones for realistic look
    const skinBase = '#C9A07A';
    const skinWarm = '#D4AD8C';
    const skinLight = '#E0BFA0';
    const skinShadow = '#A8805C';
    const skinDeep = '#8B6544';
    const veinColor = '#5577A0';
    const veinDark = '#446688';

    const dx = wristX - originX;
    const dy = wristY - originY;
    const armLength = Math.sqrt(dx * dx + dy * dy);
    const armAngle = Math.atan2(dy, dx);

    // Draw from origin to wrist
    ctx.translate(originX, originY);
    ctx.rotate(armAngle);

    // Base forearm thickness (thicker at elbow, tapers to wrist)
    const elbowThickness = 85;
    const wristThickness = 55;

    // Main forearm shape - tapered cylinder showing underside
    const forearmGrad = ctx.createLinearGradient(0, -elbowThickness/2, 0, elbowThickness/2);
    forearmGrad.addColorStop(0, skinShadow);
    forearmGrad.addColorStop(0.2, skinBase);
    forearmGrad.addColorStop(0.4, skinWarm);
    forearmGrad.addColorStop(0.6, skinLight);
    forearmGrad.addColorStop(0.8, skinWarm);
    forearmGrad.addColorStop(1, skinShadow);

    ctx.fillStyle = forearmGrad;
    ctx.beginPath();
    ctx.moveTo(0, -elbowThickness/2);
    ctx.lineTo(armLength, -wristThickness/2);
    ctx.quadraticCurveTo(armLength + 15, 0, armLength, wristThickness/2);
    ctx.lineTo(0, elbowThickness/2);
    ctx.quadraticCurveTo(-20, 0, 0, -elbowThickness/2);
    ctx.fill();

    // Inner forearm muscle - Flexor group (prominent on underside)
    const flexorGrad = ctx.createRadialGradient(armLength * 0.35, 15, 5, armLength * 0.35, 18, 40);
    flexorGrad.addColorStop(0, skinLight);
    flexorGrad.addColorStop(0.5, skinWarm);
    flexorGrad.addColorStop(1, skinBase);
    ctx.fillStyle = flexorGrad;
    ctx.beginPath();
    ctx.ellipse(armLength * 0.35, 18, 55, 28, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Flexor carpi muscle
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.ellipse(armLength * 0.5, 12, 40, 20, 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Palmaris longus tendon area
    ctx.fillStyle = skinWarm;
    ctx.beginPath();
    ctx.ellipse(armLength * 0.7, 5, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brachioradialis (outer edge muscle)
    const brachioGrad = ctx.createRadialGradient(armLength * 0.25, -20, 5, armLength * 0.25, -18, 35);
    brachioGrad.addColorStop(0, skinLight);
    brachioGrad.addColorStop(0.6, skinWarm);
    brachioGrad.addColorStop(1, skinShadow);
    ctx.fillStyle = brachioGrad;
    ctx.beginPath();
    ctx.ellipse(armLength * 0.25, -20, 45, 25, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // === PROMINENT VEINS (very visible on inner forearm) ===

    // Main median vein - runs down center
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(armLength * 0.1, 5);
    ctx.bezierCurveTo(armLength * 0.3, 8, armLength * 0.5, 3, armLength * 0.75, 0);
    ctx.bezierCurveTo(armLength * 0.85, -2, armLength * 0.95, 0, armLength - 10, 2);
    ctx.stroke();

    // Vein highlight
    ctx.strokeStyle = 'rgba(180, 200, 220, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(armLength * 0.1, 4);
    ctx.bezierCurveTo(armLength * 0.3, 7, armLength * 0.5, 2, armLength * 0.75, -1);
    ctx.stroke();

    // Cephalic vein (outer side)
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(armLength * 0.05, -25);
    ctx.bezierCurveTo(armLength * 0.2, -28, armLength * 0.4, -22, armLength * 0.6, -18);
    ctx.bezierCurveTo(armLength * 0.8, -15, armLength * 0.9, -12, armLength - 15, -8);
    ctx.stroke();

    // Basilic vein (inner side)
    ctx.strokeStyle = veinDark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(armLength * 0.08, 28);
    ctx.bezierCurveTo(armLength * 0.25, 30, armLength * 0.45, 25, armLength * 0.65, 18);
    ctx.bezierCurveTo(armLength * 0.8, 14, armLength * 0.9, 10, armLength - 12, 8);
    ctx.stroke();

    // Branching veins
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(armLength * 0.35, 8);
    ctx.quadraticCurveTo(armLength * 0.4, 20, armLength * 0.5, 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(armLength * 0.5, 3);
    ctx.quadraticCurveTo(armLength * 0.55, -8, armLength * 0.45, -18);
    ctx.stroke();

    // === TENDONS visible near wrist ===
    ctx.strokeStyle = 'rgba(200, 180, 160, 0.6)';
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(armLength * 0.7, i * 8);
        ctx.lineTo(armLength - 5, i * 6);
        ctx.stroke();
    }

    // === ARM HAIR ===
    ctx.strokeStyle = 'rgba(60, 45, 30, 0.35)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 60; i++) {
        const hx = armLength * 0.1 + Math.random() * (armLength * 0.75);
        const hy = -35 + Math.random() * 70;
        const hairLen = 4 + Math.random() * 6;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - hairLen, hy + (Math.random() - 0.5) * 4);
        ctx.stroke();
    }

    // === SKIN TEXTURE - wrinkles and creases ===

    // Wrist creases
    ctx.strokeStyle = skinDeep;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(armLength - 25, -wristThickness/2 + 5);
    ctx.quadraticCurveTo(armLength - 20, 0, armLength - 25, wristThickness/2 - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(armLength - 35, -wristThickness/2 + 8);
    ctx.quadraticCurveTo(armLength - 30, 0, armLength - 35, wristThickness/2 - 8);
    ctx.stroke();

    // Elbow area crease
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, -elbowThickness/2 + 10);
    ctx.quadraticCurveTo(25, 0, 15, elbowThickness/2 - 10);
    ctx.stroke();

    // Subtle skin pores
    ctx.fillStyle = 'rgba(100, 75, 55, 0.08)';
    for (let i = 0; i < 80; i++) {
        const px = armLength * 0.1 + Math.random() * (armLength * 0.8);
        const py = -30 + Math.random() * 60;
        ctx.beginPath();
        ctx.arc(px, py, 0.5 + Math.random() * 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // === TOFU TATTOO on left forearm ===
    if (isLeft) {
        ctx.save();
        ctx.translate(armLength * 0.4, -5);
        ctx.rotate(0.05);

        // Tattoo shadow for depth
        ctx.fillStyle = 'rgba(0, 30, 20, 0.2)';
        ctx.font = 'bold 32px Impact';
        ctx.textAlign = 'center';
        ctx.fillText('TOFU', 2, 2);

        // Main tattoo ink - dark green
        ctx.fillStyle = '#1B4D3E';
        ctx.fillText('TOFU', 0, 0);

        // Slight ink variation
        ctx.fillStyle = 'rgba(25, 70, 50, 0.6)';
        ctx.font = 'bold 30px Impact';
        ctx.fillText('TOFU', 0, 0);

        ctx.restore();
    }

    // Highlight/sheen on skin
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.ellipse(armLength * 0.5, -15, armLength * 0.3, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Draw two fists pressed together at the knuckles
function drawPressedFists(centerX, centerY, scale, phase) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Draw left fist
    drawRealisticFist(-50, 0, true);

    // Draw right fist
    drawRealisticFist(50, 0, false);

    // Knuckles pressing together in center
    const skinLight = '#E0BFA0';
    const skinWarm = '#D4AD8C';
    const skinBase = '#C9A07A';

    // Central pressed knuckle area
    const centerGrad = ctx.createRadialGradient(0, -25, 5, 0, -20, 30);
    centerGrad.addColorStop(0, skinLight);
    centerGrad.addColorStop(0.5, skinWarm);
    centerGrad.addColorStop(1, skinBase);
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.ellipse(0, -25, 25, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Impact effect during smash
    if (phase === 'smash') {
        ctx.strokeStyle = 'rgba(255, 220, 150, 0.9)';
        ctx.lineWidth = 5;
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const innerR = 60;
            const outerR = 100 + Math.random() * 30;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * innerR, -20 + Math.sin(angle) * innerR * 0.6);
            ctx.lineTo(Math.cos(angle) * outerR, -20 + Math.sin(angle) * outerR * 0.6);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// Draw a single realistic fist
function drawRealisticFist(offsetX, offsetY, isLeft) {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    if (!isLeft) ctx.scale(-1, 1);

    const skinBase = '#C9A07A';
    const skinWarm = '#D4AD8C';
    const skinLight = '#E0BFA0';
    const skinShadow = '#A8805C';
    const skinDeep = '#8B6544';
    const veinColor = '#5577A0';

    // Back of hand
    const handGrad = ctx.createRadialGradient(-5, 0, 5, 0, 0, 55);
    handGrad.addColorStop(0, skinLight);
    handGrad.addColorStop(0.4, skinWarm);
    handGrad.addColorStop(0.8, skinBase);
    handGrad.addColorStop(1, skinShadow);

    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(-45, 20);
    ctx.quadraticCurveTo(-55, 0, -45, -30);
    ctx.lineTo(20, -35);
    ctx.quadraticCurveTo(35, 0, 20, 25);
    ctx.quadraticCurveTo(-10, 35, -45, 20);
    ctx.fill();

    // Hand veins
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, 15);
    ctx.bezierCurveTo(-25, 5, -20, -10, -15, -25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-15, 18);
    ctx.bezierCurveTo(-10, 8, -5, -5, 5, -22);
    ctx.stroke();

    // Metacarpal bones visible
    ctx.strokeStyle = 'rgba(180, 160, 140, 0.3)';
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
        const bx = -30 + i * 14;
        ctx.beginPath();
        ctx.moveTo(bx, 10);
        ctx.lineTo(bx + 5, -28);
        ctx.stroke();
    }

    // Four knuckles (curled fingers)
    for (let i = 0; i < 4; i++) {
        const kx = -28 + i * 14;
        const ksize = (i === 1 || i === 2) ? 1.15 : 1.0;

        // Main knuckle
        const knuckleGrad = ctx.createRadialGradient(kx, -38, 2, kx, -36, 12 * ksize);
        knuckleGrad.addColorStop(0, '#F0E0D0');
        knuckleGrad.addColorStop(0.4, skinLight);
        knuckleGrad.addColorStop(1, skinBase);
        ctx.fillStyle = knuckleGrad;
        ctx.beginPath();
        ctx.ellipse(kx, -38, 9 * ksize, 11 * ksize, 0, 0, Math.PI * 2);
        ctx.fill();

        // Knuckle wrinkles
        ctx.strokeStyle = skinDeep;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(kx, -38, 8 * ksize, 0.4, 2.7);
        ctx.stroke();

        // Curled finger segment
        ctx.fillStyle = skinBase;
        ctx.beginPath();
        ctx.ellipse(kx + 3, -28, 7 * ksize, 8 * ksize, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Fingernail edge barely visible
        ctx.fillStyle = '#F5EBE5';
        ctx.beginPath();
        ctx.ellipse(kx + 6, -24, 4 * ksize, 5 * ksize, 0.4, -0.5, Math.PI * 0.7);
        ctx.fill();
    }

    // Thumb wrapped over fingers
    ctx.fillStyle = skinWarm;
    ctx.beginPath();
    ctx.ellipse(-42, 8, 14, 22, -0.3, 0, Math.PI * 2);
    ctx.fill();

    const thumbGrad = ctx.createRadialGradient(-50, -8, 3, -48, -6, 14);
    thumbGrad.addColorStop(0, skinLight);
    thumbGrad.addColorStop(0.7, skinWarm);
    thumbGrad.addColorStop(1, skinBase);
    ctx.fillStyle = thumbGrad;
    ctx.beginPath();
    ctx.ellipse(-48, -8, 11, 15, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Thumb tip
    ctx.fillStyle = skinWarm;
    ctx.beginPath();
    ctx.ellipse(-55, -22, 10, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Thumb nail
    ctx.fillStyle = '#F8F2EC';
    ctx.beginPath();
    ctx.ellipse(-58, -26, 6, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Thumb crease
    ctx.strokeStyle = skinDeep;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-46, 2);
    ctx.quadraticCurveTo(-50, -5, -48, -12);
    ctx.stroke();

    // Skin texture - pores
    ctx.fillStyle = 'rgba(100, 80, 60, 0.1)';
    for (let i = 0; i < 30; i++) {
        const px = -40 + Math.random() * 55;
        const py = -30 + Math.random() * 45;
        ctx.beginPath();
        ctx.arc(px, py, 0.5 + Math.random() * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }

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
