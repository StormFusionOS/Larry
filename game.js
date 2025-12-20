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

// Draw photorealistic first-person forearm from corner to fist
function drawFirstPersonForearm(originX, originY, wristX, wristY, isLeft, phase) {
    ctx.save();

    const dx = wristX - originX;
    const dy = wristY - originY;
    const armLength = Math.sqrt(dx * dx + dy * dy);
    const armAngle = Math.atan2(dy, dx);

    ctx.translate(originX, originY);
    ctx.rotate(armAngle);

    const elbowThickness = 90;
    const wristThickness = 58;

    // === LAYER 1: Deep shadow base ===
    ctx.fillStyle = 'rgba(120, 85, 60, 1)';
    ctx.beginPath();
    ctx.moveTo(-5, -elbowThickness/2 - 3);
    ctx.lineTo(armLength + 5, -wristThickness/2 - 2);
    ctx.quadraticCurveTo(armLength + 20, 0, armLength + 5, wristThickness/2 + 2);
    ctx.lineTo(-5, elbowThickness/2 + 3);
    ctx.quadraticCurveTo(-25, 0, -5, -elbowThickness/2 - 3);
    ctx.fill();

    // === LAYER 2: Main skin with natural color variation ===
    const skinGrad = ctx.createLinearGradient(0, -elbowThickness/2, 0, elbowThickness/2);
    skinGrad.addColorStop(0, 'rgb(158, 118, 88)');
    skinGrad.addColorStop(0.15, 'rgb(182, 142, 110)');
    skinGrad.addColorStop(0.3, 'rgb(198, 158, 128)');
    skinGrad.addColorStop(0.5, 'rgb(210, 172, 142)');
    skinGrad.addColorStop(0.7, 'rgb(198, 158, 128)');
    skinGrad.addColorStop(0.85, 'rgb(182, 142, 110)');
    skinGrad.addColorStop(1, 'rgb(158, 118, 88)');

    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.moveTo(0, -elbowThickness/2);
    ctx.lineTo(armLength, -wristThickness/2);
    ctx.quadraticCurveTo(armLength + 15, 0, armLength, wristThickness/2);
    ctx.lineTo(0, elbowThickness/2);
    ctx.quadraticCurveTo(-20, 0, 0, -elbowThickness/2);
    ctx.fill();

    // === LAYER 3: Subsurface scattering (warm undertone) ===
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = 'rgb(220, 160, 140)';
    ctx.beginPath();
    ctx.ellipse(armLength * 0.4, 0, armLength * 0.35, 35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // === LAYER 4: Muscle definition with subtle shading ===

    // Flexor muscles (inner arm) - very subtle
    ctx.globalAlpha = 0.25;
    const flexGrad = ctx.createRadialGradient(armLength * 0.35, 12, 0, armLength * 0.35, 15, 50);
    flexGrad.addColorStop(0, 'rgb(215, 175, 145)');
    flexGrad.addColorStop(0.5, 'rgb(195, 155, 125)');
    flexGrad.addColorStop(1, 'rgba(175, 135, 105, 0)');
    ctx.fillStyle = flexGrad;
    ctx.beginPath();
    ctx.ellipse(armLength * 0.35, 15, 60, 30, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Brachioradialis - subtle bulge
    ctx.globalAlpha = 0.2;
    const brachGrad = ctx.createRadialGradient(armLength * 0.28, -18, 0, armLength * 0.28, -15, 45);
    brachGrad.addColorStop(0, 'rgb(218, 178, 148)');
    brachGrad.addColorStop(0.6, 'rgb(195, 155, 125)');
    brachGrad.addColorStop(1, 'rgba(175, 135, 105, 0)');
    ctx.fillStyle = brachGrad;
    ctx.beginPath();
    ctx.ellipse(armLength * 0.28, -18, 50, 28, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // === LAYER 5: Veins (subtle, under skin) ===

    // Main veins with transparency for under-skin look
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = 'rgb(95, 115, 140)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    // Median vein
    ctx.beginPath();
    ctx.moveTo(armLength * 0.08, 3);
    ctx.bezierCurveTo(armLength * 0.25, 6, armLength * 0.5, 2, armLength * 0.75, -1);
    ctx.bezierCurveTo(armLength * 0.88, -2, armLength * 0.95, 0, armLength - 8, 1);
    ctx.stroke();

    // Cephalic vein
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(armLength * 0.05, -22);
    ctx.bezierCurveTo(armLength * 0.2, -25, armLength * 0.45, -20, armLength * 0.65, -16);
    ctx.bezierCurveTo(armLength * 0.82, -13, armLength * 0.92, -10, armLength - 12, -7);
    ctx.stroke();

    // Basilic vein
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(armLength * 0.06, 25);
    ctx.bezierCurveTo(armLength * 0.22, 27, armLength * 0.48, 22, armLength * 0.68, 16);
    ctx.bezierCurveTo(armLength * 0.82, 12, armLength * 0.92, 8, armLength - 10, 6);
    ctx.stroke();

    // Small branch veins
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(armLength * 0.32, 5);
    ctx.quadraticCurveTo(armLength * 0.38, 16, armLength * 0.48, 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(armLength * 0.55, 1);
    ctx.quadraticCurveTo(armLength * 0.52, -10, armLength * 0.58, -17);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // === LAYER 6: Tendons near wrist ===
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = 'rgb(180, 155, 135)';
    ctx.lineWidth = 2.5;
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(armLength * 0.72, i * 7);
        ctx.lineTo(armLength - 3, i * 5.5);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // === LAYER 7: Skin creases ===
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = 'rgb(130, 95, 70)';
    ctx.lineWidth = 1.2;

    // Wrist creases
    ctx.beginPath();
    ctx.moveTo(armLength - 22, -wristThickness/2 + 6);
    ctx.quadraticCurveTo(armLength - 18, 0, armLength - 22, wristThickness/2 - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(armLength - 32, -wristThickness/2 + 10);
    ctx.quadraticCurveTo(armLength - 28, 0, armLength - 32, wristThickness/2 - 10);
    ctx.stroke();

    // Elbow crease
    ctx.beginPath();
    ctx.moveTo(18, -elbowThickness/2 + 12);
    ctx.quadraticCurveTo(28, 0, 18, elbowThickness/2 - 12);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // === LAYER 8: Fine arm hair ===
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = 'rgb(70, 50, 35)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 100; i++) {
        const hx = armLength * 0.08 + Math.random() * (armLength * 0.8);
        const hy = -38 + Math.random() * 76;
        const hairLen = 3 + Math.random() * 5;
        const hairAngle = -0.3 + Math.random() * 0.6;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx - hairLen * Math.cos(hairAngle), hy - hairLen * Math.sin(hairAngle));
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // === LAYER 9: Micro skin texture ===
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = 'rgb(90, 65, 45)';
    for (let i = 0; i < 150; i++) {
        const px = armLength * 0.05 + Math.random() * (armLength * 0.9);
        const py = -40 + Math.random() * 80;
        ctx.beginPath();
        ctx.arc(px, py, 0.3 + Math.random() * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // === LAYER 10: Specular highlights ===
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.beginPath();
    ctx.ellipse(armLength * 0.45, -20, armLength * 0.25, 10, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.05;
    ctx.beginPath();
    ctx.ellipse(armLength * 0.6, 8, armLength * 0.15, 8, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // === TOFU TATTOO ===
    if (isLeft) {
        ctx.save();
        ctx.translate(armLength * 0.4, -8);
        ctx.rotate(0.03);

        // Tattoo with skin texture showing through
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = 'rgb(25, 60, 45)';
        ctx.font = 'bold 28px Impact';
        ctx.textAlign = 'center';
        ctx.fillText('TOFU', 0, 0);

        // Slight blur/age effect
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = 'rgb(35, 75, 55)';
        ctx.fillText('TOFU', 1, 1);
        ctx.globalAlpha = 1;

        ctx.restore();
    }

    ctx.restore();
}

// Draw two fists pressed together at the knuckles
function drawPressedFists(centerX, centerY, scale, phase) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Draw left fist
    drawRealisticFist(-48, 0, true);

    // Draw right fist
    drawRealisticFist(48, 0, false);

    // Central connection where knuckles meet
    const centerGrad = ctx.createRadialGradient(0, -28, 3, 0, -25, 28);
    centerGrad.addColorStop(0, 'rgb(225, 192, 165)');
    centerGrad.addColorStop(0.4, 'rgb(205, 170, 142)');
    centerGrad.addColorStop(1, 'rgb(175, 140, 112)');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.ellipse(0, -28, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle highlight on pressed knuckles
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.beginPath();
    ctx.ellipse(0, -32, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Impact effect during smash - more subtle
    if (phase === 'smash') {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = 'rgb(255, 235, 200)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const innerR = 55;
            const outerR = 85 + Math.random() * 25;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * innerR, -22 + Math.sin(angle) * innerR * 0.5);
            ctx.lineTo(Math.cos(angle) * outerR, -22 + Math.sin(angle) * outerR * 0.5);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}

// Draw a single photorealistic fist
function drawRealisticFist(offsetX, offsetY, isLeft) {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    if (!isLeft) ctx.scale(-1, 1);

    // === LAYER 1: Shadow base ===
    ctx.fillStyle = 'rgb(115, 82, 58)';
    ctx.beginPath();
    ctx.moveTo(-48, 23);
    ctx.quadraticCurveTo(-60, 0, -48, -33);
    ctx.lineTo(23, -38);
    ctx.quadraticCurveTo(40, 0, 23, 28);
    ctx.quadraticCurveTo(-12, 40, -48, 23);
    ctx.fill();

    // === LAYER 2: Main hand skin ===
    const handGrad = ctx.createRadialGradient(-8, -5, 5, 0, 0, 60);
    handGrad.addColorStop(0, 'rgb(215, 178, 148)');
    handGrad.addColorStop(0.3, 'rgb(198, 162, 132)');
    handGrad.addColorStop(0.6, 'rgb(185, 148, 118)');
    handGrad.addColorStop(1, 'rgb(162, 125, 95)');

    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(-45, 20);
    ctx.quadraticCurveTo(-55, 0, -45, -30);
    ctx.lineTo(20, -35);
    ctx.quadraticCurveTo(35, 0, 20, 25);
    ctx.quadraticCurveTo(-10, 35, -45, 20);
    ctx.fill();

    // === LAYER 3: Subsurface warmth ===
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = 'rgb(225, 165, 145)';
    ctx.beginPath();
    ctx.ellipse(-10, -5, 35, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // === LAYER 4: Veins (subtle) ===
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = 'rgb(95, 115, 138)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-28, 12);
    ctx.bezierCurveTo(-24, 2, -18, -12, -14, -26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 15);
    ctx.bezierCurveTo(-8, 5, -3, -8, 6, -24);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // === LAYER 5: Metacarpal structure ===
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = 'rgb(165, 135, 108)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        const bx = -28 + i * 13;
        ctx.beginPath();
        ctx.moveTo(bx, 8);
        ctx.lineTo(bx + 4, -28);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // === LAYER 6: Knuckles ===
    for (let i = 0; i < 4; i++) {
        const kx = -26 + i * 13;
        const ksize = (i === 1 || i === 2) ? 1.12 : 0.95;

        // Knuckle base shadow
        ctx.fillStyle = 'rgb(155, 120, 92)';
        ctx.beginPath();
        ctx.ellipse(kx, -36, 9 * ksize, 11 * ksize, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main knuckle
        const knuckleGrad = ctx.createRadialGradient(kx - 1, -38, 1, kx, -36, 10 * ksize);
        knuckleGrad.addColorStop(0, 'rgb(228, 198, 175)');
        knuckleGrad.addColorStop(0.4, 'rgb(208, 175, 150)');
        knuckleGrad.addColorStop(1, 'rgb(178, 145, 118)');
        ctx.fillStyle = knuckleGrad;
        ctx.beginPath();
        ctx.ellipse(kx, -38, 8 * ksize, 10 * ksize, 0, 0, Math.PI * 2);
        ctx.fill();

        // Knuckle wrinkle
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = 'rgb(125, 92, 68)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(kx, -38, 7 * ksize, 0.5, 2.6);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Curled finger
        const fingerGrad = ctx.createRadialGradient(kx + 2, -29, 1, kx + 3, -28, 8 * ksize);
        fingerGrad.addColorStop(0, 'rgb(205, 168, 140)');
        fingerGrad.addColorStop(1, 'rgb(175, 138, 110)');
        ctx.fillStyle = fingerGrad;
        ctx.beginPath();
        ctx.ellipse(kx + 3, -28, 6 * ksize, 7 * ksize, 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Fingernail hint
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = 'rgb(235, 225, 218)';
        ctx.beginPath();
        ctx.ellipse(kx + 6, -24, 3 * ksize, 4 * ksize, 0.35, -0.4, Math.PI * 0.6);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // === LAYER 7: Thumb ===
    // Thenar eminence
    const thenarGrad = ctx.createRadialGradient(-40, 5, 2, -38, 8, 22);
    thenarGrad.addColorStop(0, 'rgb(212, 175, 148)');
    thenarGrad.addColorStop(0.6, 'rgb(192, 155, 128)');
    thenarGrad.addColorStop(1, 'rgb(168, 132, 105)');
    ctx.fillStyle = thenarGrad;
    ctx.beginPath();
    ctx.ellipse(-40, 6, 13, 20, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Thumb segments
    const thumbGrad = ctx.createRadialGradient(-48, -10, 2, -46, -8, 15);
    thumbGrad.addColorStop(0, 'rgb(218, 182, 155)');
    thumbGrad.addColorStop(0.5, 'rgb(198, 162, 135)');
    thumbGrad.addColorStop(1, 'rgb(172, 138, 112)');
    ctx.fillStyle = thumbGrad;
    ctx.beginPath();
    ctx.ellipse(-46, -10, 10, 14, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Thumb tip
    const tipGrad = ctx.createRadialGradient(-53, -23, 2, -52, -22, 12);
    tipGrad.addColorStop(0, 'rgb(215, 180, 155)');
    tipGrad.addColorStop(1, 'rgb(185, 150, 125)');
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.ellipse(-52, -22, 9, 11, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Thumb nail
    ctx.fillStyle = 'rgb(238, 228, 222)';
    ctx.beginPath();
    ctx.ellipse(-55, -26, 5, 7, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // Nail lunula
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgb(248, 242, 238)';
    ctx.beginPath();
    ctx.ellipse(-53, -22, 3, 2.5, -0.15, Math.PI * 0.8, Math.PI * 1.2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Thumb crease
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = 'rgb(128, 95, 72)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-44, 0);
    ctx.quadraticCurveTo(-48, -6, -46, -14);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // === LAYER 8: Skin texture ===
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = 'rgb(85, 62, 45)';
    for (let i = 0; i < 50; i++) {
        const px = -45 + Math.random() * 60;
        const py = -35 + Math.random() * 55;
        ctx.beginPath();
        ctx.arc(px, py, 0.3 + Math.random() * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // === LAYER 9: Specular highlight ===
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.beginPath();
    ctx.ellipse(-15, -35, 20, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

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
