// DINO SMASHER - First Person Melee Combat Game
// Doom-style raycasting with Hulk-smash attacks!

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

    // Flash white when hit
    if (enemy.isHit) {
        ctx.fillStyle = '#ffffff';
    } else {
        // Color based on type
        switch (enemy.type) {
            case 'imp':
                ctx.fillStyle = '#8B4513';
                break;
            case 'demon':
                ctx.fillStyle = '#cc2222';
                break;
            case 'ogre':
                ctx.fillStyle = '#4a4a22';
                break;
        }
    }

    // Body
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face details
    if (!enemy.isHit) {
        // Eyes
        ctx.fillStyle = enemy.type === 'demon' ? '#ffff00' : '#ff0000';
        const eyeSize = width / 8;
        const eyeY = centerY - height / 6;
        ctx.beginPath();
        ctx.arc(centerX - width / 5, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.arc(centerX + width / 5, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.fillStyle = '#000';
        ctx.beginPath();
        const mouthY = centerY + height / 6;
        ctx.ellipse(centerX, mouthY, width / 4, height / 8, 0, 0, Math.PI);
        ctx.fill();

        // Teeth
        ctx.fillStyle = '#fff';
        for (let i = -2; i <= 2; i++) {
            ctx.fillRect(
                centerX + i * (width / 12) - 2,
                mouthY - height / 16,
                4,
                height / 12
            );
        }

        // Horns for demons
        if (enemy.type === 'demon' || enemy.type === 'ogre') {
            ctx.fillStyle = enemy.type === 'demon' ? '#880000' : '#333';
            ctx.beginPath();
            ctx.moveTo(centerX - width / 3, y + height / 8);
            ctx.lineTo(centerX - width / 4, y - height / 6);
            ctx.lineTo(centerX - width / 6, y + height / 8);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(centerX + width / 3, y + height / 8);
            ctx.lineTo(centerX + width / 4, y - height / 6);
            ctx.lineTo(centerX + width / 6, y + height / 8);
            ctx.fill();
        }
    }

    // Animation - bobbing
    if (enemy.animFrame === 1) {
        ctx.fillStyle = enemy.isHit ? '#fff' : '#000';
        ctx.beginPath();
        ctx.ellipse(centerX, y + height + 5, width / 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawDeadEnemy(x, y, width, height, type) {
    ctx.fillStyle = type === 'demon' ? '#661111' : type === 'ogre' ? '#333311' : '#5a3010';
    ctx.beginPath();
    ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // X eyes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const eyeSize = width / 10;

    ctx.beginPath();
    ctx.moveTo(x - width / 4 - eyeSize, y - eyeSize);
    ctx.lineTo(x - width / 4 + eyeSize, y + eyeSize);
    ctx.moveTo(x - width / 4 + eyeSize, y - eyeSize);
    ctx.lineTo(x - width / 4 - eyeSize, y + eyeSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + width / 4 - eyeSize, y - eyeSize);
    ctx.lineTo(x + width / 4 + eyeSize, y + eyeSize);
    ctx.moveTo(x + width / 4 + eyeSize, y - eyeSize);
    ctx.lineTo(x + width / 4 - eyeSize, y + eyeSize);
    ctx.stroke();
}

// Draw the player's fists
function drawFists() {
    const baseY = SCREEN_HEIGHT - 100;
    const bobY = player.bobOffset * 3;

    // Smash animation - overhead swing down
    let leftX = 150;
    let rightX = SCREEN_WIDTH - 150;
    let fistY = baseY + bobY;
    let fistScale = 1;
    let armRotation = 0; // Rotation for overhead swing

    if (player.isSmashing) {
        if (player.smashFrame < 6) {
            // Wind up - raise arms overhead
            const windUp = player.smashFrame / 6;
            leftX = 150 + windUp * 100;
            rightX = SCREEN_WIDTH - 150 - windUp * 100;
            fistY = baseY - windUp * 400; // Go way up
            fistScale = 1 + windUp * 0.5;
            armRotation = -windUp * 0.3; // Tilt back
        } else if (player.smashFrame < 10) {
            // SMASH DOWN!
            const smashProgress = (player.smashFrame - 6) / 4;
            leftX = 250 + smashProgress * 50;
            rightX = SCREEN_WIDTH - 250 - smashProgress * 50;
            fistY = baseY - 400 + smashProgress * 500; // Slam down past center
            fistScale = 1.5 + smashProgress * 0.3;
            armRotation = -0.3 + smashProgress * 0.5; // Swing forward
        } else {
            // Recovery - return to idle
            const recovery = (player.smashFrame - 10) / 10;
            leftX = 300 - recovery * 150;
            rightX = SCREEN_WIDTH - 300 + recovery * 150;
            fistY = baseY + 100 - recovery * 100;
            fistScale = 1.8 - recovery * 0.8;
            armRotation = 0.2 * (1 - recovery);
        }
    }

    // Draw both fists
    drawFist(leftX, fistY, fistScale, true, armRotation);
    drawFist(rightX, fistY, fistScale, false, armRotation);
}

function drawFist(x, y, scale, isLeft, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * (isLeft ? 1 : -1));
    ctx.scale(scale * (isLeft ? 1 : -1), scale);

    // Hyper-realistic skin color palette
    const skinBase = '#D4A574';
    const skinWarm = '#E8B896';
    const skinPink = '#E8C0B0';
    const skinShadow = '#A67C5B';
    const skinDeepShadow = '#8B6547';
    const skinHighlight = '#F5D5C0';
    const skinPale = '#F0E0D6';
    const veinBlue = '#7090A8';
    const veinPurple = '#9080A0';

    // === UPPER ARM WITH REALISTIC MUSCLE ANATOMY ===

    // Base arm shape with gradient
    const armGradient = ctx.createRadialGradient(-5, 130, 10, 0, 130, 70);
    armGradient.addColorStop(0, skinHighlight);
    armGradient.addColorStop(0.3, skinWarm);
    armGradient.addColorStop(0.7, skinBase);
    armGradient.addColorStop(1, skinShadow);
    ctx.fillStyle = armGradient;
    ctx.beginPath();
    ctx.ellipse(0, 130, 48, 72, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deltoid muscle insertion
    ctx.fillStyle = skinWarm;
    ctx.beginPath();
    ctx.ellipse(-8, 175, 25, 20, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Bicep peak - detailed
    const bicepGradient = ctx.createRadialGradient(-15, 115, 5, -12, 118, 35);
    bicepGradient.addColorStop(0, skinHighlight);
    bicepGradient.addColorStop(0.5, skinWarm);
    bicepGradient.addColorStop(1, skinBase);
    ctx.fillStyle = bicepGradient;
    ctx.beginPath();
    ctx.ellipse(-15, 118, 22, 38, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Bicep vein
    ctx.strokeStyle = veinBlue;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-25, 150);
    ctx.quadraticCurveTo(-28, 130, -20, 110);
    ctx.quadraticCurveTo(-15, 95, -18, 85);
    ctx.stroke();
    // Vein highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-26, 148);
    ctx.quadraticCurveTo(-29, 130, -21, 112);
    ctx.stroke();

    // Tricep - horseshoe shape
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.ellipse(20, 135, 18, 35, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skinDeepShadow;
    ctx.beginPath();
    ctx.ellipse(25, 140, 10, 20, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Arm hair (subtle)
    ctx.strokeStyle = 'rgba(80, 60, 40, 0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 25; i++) {
        const hx = -30 + Math.random() * 60;
        const hy = 90 + Math.random() * 80;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + (Math.random() - 0.5) * 6, hy - 4 - Math.random() * 4);
        ctx.stroke();
    }

    // TOFU tattoo on left arm - more realistic ink
    if (isLeft) {
        ctx.save();
        // Tattoo shadow (skin indent effect)
        ctx.fillStyle = 'rgba(0, 40, 20, 0.15)';
        ctx.font = 'bold 26px Impact';
        ctx.textAlign = 'center';
        ctx.rotate(-0.08);
        ctx.fillText('TOFU', 2, 132);
        // Main tattoo ink
        ctx.fillStyle = '#1B4D3E';
        ctx.fillText('TOFU', 0, 130);
        // Ink texture variation
        ctx.fillStyle = 'rgba(20, 60, 40, 0.7)';
        ctx.font = 'bold 24px Impact';
        ctx.fillText('TOFU', 0, 130);
        // Slight highlight on raised ink
        ctx.strokeStyle = 'rgba(100, 140, 120, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeText('TOFU', -1, 129);
        ctx.restore();
    }

    // === FOREARM WITH MUSCLE GROUPS ===

    // Brachioradialis muscle
    const forearmGradient = ctx.createRadialGradient(5, 55, 5, 0, 55, 55);
    forearmGradient.addColorStop(0, skinHighlight);
    forearmGradient.addColorStop(0.4, skinWarm);
    forearmGradient.addColorStop(0.8, skinBase);
    forearmGradient.addColorStop(1, skinShadow);
    ctx.fillStyle = forearmGradient;
    ctx.beginPath();
    ctx.ellipse(0, 55, 38, 55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Extensor muscles
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.ellipse(15, 50, 12, 30, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Flexor muscles (inner arm shadow)
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.ellipse(-18, 60, 10, 28, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Complex forearm veins
    ctx.strokeStyle = veinBlue;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, 90);
    ctx.quadraticCurveTo(-15, 65, -8, 40);
    ctx.quadraticCurveTo(-5, 25, -10, 10);
    ctx.stroke();
    // Branch vein
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10, 55);
    ctx.quadraticCurveTo(-20, 45, -25, 50);
    ctx.stroke();
    // Second major vein
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 85);
    ctx.quadraticCurveTo(15, 60, 8, 35);
    ctx.stroke();

    // Forearm hair
    ctx.strokeStyle = 'rgba(70, 50, 35, 0.25)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 30; i++) {
        const hx = -25 + Math.random() * 50;
        const hy = 20 + Math.random() * 70;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + (Math.random() - 0.5) * 5, hy - 3 - Math.random() * 4);
        ctx.stroke();
    }

    // === WRIST ===
    const wristGradient = ctx.createLinearGradient(-30, 12, 30, 12);
    wristGradient.addColorStop(0, skinShadow);
    wristGradient.addColorStop(0.3, skinBase);
    wristGradient.addColorStop(0.7, skinWarm);
    wristGradient.addColorStop(1, skinShadow);
    ctx.fillStyle = wristGradient;
    ctx.beginPath();
    ctx.ellipse(0, 12, 30, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wrist bone protrusion (ulna)
    ctx.fillStyle = skinHighlight;
    ctx.beginPath();
    ctx.ellipse(25, 15, 8, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Wrist tendons
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 8, 25);
        ctx.lineTo(i * 6, 0);
        ctx.stroke();
    }

    // === HYPER-REALISTIC FIST ===

    // Back of hand base with gradient
    const handGradient = ctx.createRadialGradient(0, -20, 5, 0, -15, 50);
    handGradient.addColorStop(0, skinHighlight);
    handGradient.addColorStop(0.4, skinWarm);
    handGradient.addColorStop(0.8, skinBase);
    handGradient.addColorStop(1, skinShadow);
    ctx.fillStyle = handGradient;
    ctx.beginPath();
    ctx.moveTo(-38, 5);
    ctx.quadraticCurveTo(-45, -15, -35, -40);
    ctx.lineTo(35, -40);
    ctx.quadraticCurveTo(45, -15, 38, 5);
    ctx.quadraticCurveTo(0, 18, -38, 5);
    ctx.fill();

    // Hand veins
    ctx.strokeStyle = veinBlue;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, 5);
    ctx.quadraticCurveTo(-8, -15, -15, -30);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 5);
    ctx.quadraticCurveTo(12, -10, 18, -28);
    ctx.stroke();

    // Metacarpal bones visible under skin
    ctx.strokeStyle = 'rgba(160, 130, 110, 0.4)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
        const boneX = -22 + i * 15;
        ctx.beginPath();
        ctx.moveTo(boneX + 3, 0);
        ctx.lineTo(boneX, -32);
        ctx.stroke();
    }

    // === FOUR FINGERS (curled into fist) ===
    for (let i = 0; i < 4; i++) {
        const fingerX = -26 + i * 17;
        const fingerSize = i === 1 || i === 2 ? 1.1 : 0.95; // Middle fingers larger

        // Proximal phalanx (first segment, visible as knuckle)
        const knuckleGradient = ctx.createRadialGradient(fingerX, -48, 2, fingerX, -46, 12);
        knuckleGradient.addColorStop(0, skinPale);
        knuckleGradient.addColorStop(0.5, skinHighlight);
        knuckleGradient.addColorStop(1, skinBase);
        ctx.fillStyle = knuckleGradient;
        ctx.beginPath();
        ctx.ellipse(fingerX, -48, 9 * fingerSize, 11 * fingerSize, 0, 0, Math.PI * 2);
        ctx.fill();

        // Knuckle wrinkles
        ctx.strokeStyle = skinDeepShadow;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(fingerX, -48, 9 * fingerSize, 0.3, 2.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(fingerX - 6, -52);
        ctx.quadraticCurveTo(fingerX, -55, fingerX + 6, -52);
        ctx.stroke();

        // Middle phalanx (curled under, partially visible)
        ctx.fillStyle = skinBase;
        ctx.beginPath();
        ctx.ellipse(fingerX, -38, 7 * fingerSize, 8 * fingerSize, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Finger crease between segments
        ctx.strokeStyle = skinDeepShadow;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fingerX - 5, -42);
        ctx.quadraticCurveTo(fingerX, -40, fingerX + 5, -42);
        ctx.stroke();

        // Distal phalanx with nail (curled under, nail barely visible)
        ctx.fillStyle = skinShadow;
        ctx.beginPath();
        ctx.ellipse(fingerX + 2, -32, 5 * fingerSize, 6 * fingerSize, 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Fingernail (just edge visible)
        ctx.fillStyle = '#F0E6E0';
        ctx.beginPath();
        ctx.ellipse(fingerX + 4, -30, 3 * fingerSize, 4 * fingerSize, 0.5, 0, Math.PI);
        ctx.fill();
        // Nail edge
        ctx.strokeStyle = '#D0C0B8';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(fingerX + 4, -30, 3 * fingerSize, 0, Math.PI);
        ctx.stroke();
    }

    // === THUMB (wrapped over fingers) ===

    // Thenar eminence (thumb muscle on palm)
    ctx.fillStyle = skinWarm;
    ctx.beginPath();
    ctx.ellipse(-35, -5, 15, 20, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Thumb metacarpal
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.ellipse(-42, -12, 11, 24, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Thumb proximal phalanx
    const thumbGradient = ctx.createRadialGradient(-48, -28, 3, -46, -26, 15);
    thumbGradient.addColorStop(0, skinHighlight);
    thumbGradient.addColorStop(0.6, skinWarm);
    thumbGradient.addColorStop(1, skinBase);
    ctx.fillStyle = thumbGradient;
    ctx.beginPath();
    ctx.ellipse(-46, -28, 10, 14, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Thumb distal phalanx
    ctx.fillStyle = skinWarm;
    ctx.beginPath();
    ctx.ellipse(-52, -42, 9, 11, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Thumb nail - detailed
    ctx.fillStyle = '#F8F0EC';
    ctx.beginPath();
    ctx.ellipse(-54, -46, 6, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Nail lunula (half moon)
    ctx.fillStyle = '#FFF8F5';
    ctx.beginPath();
    ctx.ellipse(-53, -42, 4, 3, -0.2, Math.PI, Math.PI * 2);
    ctx.fill();
    // Nail cuticle
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-54, -46, 6, 2.8, 3.5 + Math.PI);
    ctx.stroke();

    // Thumb joint creases
    ctx.strokeStyle = skinDeepShadow;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-50, -18);
    ctx.quadraticCurveTo(-45, -22, -48, -26);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-54, -34);
    ctx.quadraticCurveTo(-50, -36, -52, -40);
    ctx.stroke();

    // === SKIN TEXTURE (subtle pores) ===
    ctx.fillStyle = 'rgba(120, 90, 70, 0.08)';
    for (let i = 0; i < 40; i++) {
        const px = -35 + Math.random() * 70;
        const py = -45 + Math.random() * 50;
        ctx.beginPath();
        ctx.arc(px, py, 0.5 + Math.random(), 0, Math.PI * 2);
        ctx.fill();
    }

    // Skin highlights (sweat/oil sheen)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.ellipse(-5, -48, 20, 8, 0.1, 0, Math.PI * 2);
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
