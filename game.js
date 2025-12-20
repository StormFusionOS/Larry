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
    const baseY = SCREEN_HEIGHT - 150;
    const bobY = player.bobOffset * 3;

    // Smash animation
    let leftX = 100;
    let rightX = SCREEN_WIDTH - 100;
    let fistY = baseY + bobY;
    let fistScale = 1;

    if (player.isSmashing) {
        const progress = player.smashFrame / 20;

        if (player.smashFrame < 8) {
            // Wind up
            const windUp = player.smashFrame / 8;
            leftX -= windUp * 50;
            rightX += windUp * 50;
            fistY += windUp * 100;
            fistScale = 1 + windUp * 0.3;
        } else if (player.smashFrame < 12) {
            // Smash forward!
            const smashProgress = (player.smashFrame - 8) / 4;
            leftX += smashProgress * 200;
            rightX -= smashProgress * 200;
            fistY -= smashProgress * 150;
            fistScale = 1.5 - smashProgress * 0.3;
        } else {
            // Recovery
            const recovery = (player.smashFrame - 12) / 8;
            leftX = 100 + 200 * (1 - recovery);
            rightX = SCREEN_WIDTH - 100 - 200 * (1 - recovery);
            fistY = baseY - 150 * (1 - recovery);
            fistScale = 1.2 - recovery * 0.2;
        }
    }

    // Draw both fists
    drawFist(leftX, fistY, fistScale, true);
    drawFist(rightX, fistY, fistScale, false);
}

function drawFist(x, y, scale, isLeft) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * (isLeft ? 1 : -1), scale);

    // Arm
    ctx.fillStyle = '#228B22'; // Dinosaur green
    ctx.beginPath();
    ctx.ellipse(0, 80, 35, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wrist
    ctx.beginPath();
    ctx.ellipse(0, 30, 40, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fist
    ctx.fillStyle = '#2E8B2E';
    ctx.beginPath();
    ctx.ellipse(0, -10, 50, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Knuckle highlights
    ctx.fillStyle = '#3CB371';
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 20, -25, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    // Claws
    ctx.fillStyle = '#F5F5DC';
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 22 - 8, -45);
        ctx.lineTo(i * 22, -75);
        ctx.lineTo(i * 22 + 8, -45);
        ctx.fill();
    }

    // Scales detail
    ctx.fillStyle = '#1E6B1E';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(
            Math.cos(i * 1.2) * 25,
            Math.sin(i * 1.2) * 20 + 10,
            8,
            0, Math.PI * 2
        );
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
