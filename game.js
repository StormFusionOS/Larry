// Larry's Adventure - A Mario-style Platformer
// Character: Short bald man in a blue shirt

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.5;
const FRICTION = 0.8;
const TILE_SIZE = 32;
const CAMERA_OFFSET = 300;

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameover', 'win'
let score = 0;
let coins = 0;
let lives = 3;
let time = 300;
let timerInterval = null;
let cameraX = 0;

// Input handling
const keys = {
    left: false,
    right: false,
    up: false
};

// Player object - Larry (short bald man in blue shirt)
const player = {
    x: 100,
    y: 400,
    width: 28,
    height: 40,
    velX: 0,
    velY: 0,
    speed: 4,
    jumpStrength: 12,
    onGround: false,
    facingRight: true,
    isJumping: false,
    animFrame: 0,
    animTimer: 0,
    invincible: false,
    invincibleTimer: 0
};

// Level data
let platforms = [];
let bricks = [];
let questionBlocks = [];
let coins_array = [];
let enemies = [];
let pipes = [];
let flagPole = null;
let levelWidth = 3200;

// Initialize level
function initLevel() {
    platforms = [];
    bricks = [];
    questionBlocks = [];
    coins_array = [];
    enemies = [];
    pipes = [];

    // Ground platforms
    // Main ground
    for (let x = 0; x < 2000; x += TILE_SIZE) {
        platforms.push({ x: x, y: 568, width: TILE_SIZE, height: TILE_SIZE, type: 'ground' });
        platforms.push({ x: x, y: 536, width: TILE_SIZE, height: TILE_SIZE, type: 'underground' });
    }

    // Gap in ground
    for (let x = 2128; x < 3200; x += TILE_SIZE) {
        platforms.push({ x: x, y: 568, width: TILE_SIZE, height: TILE_SIZE, type: 'ground' });
        platforms.push({ x: x, y: 536, width: TILE_SIZE, height: TILE_SIZE, type: 'underground' });
    }

    // Floating platforms
    // First set of blocks
    bricks.push({ x: 256, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });
    questionBlocks.push({ x: 288, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    bricks.push({ x: 320, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });
    questionBlocks.push({ x: 352, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    bricks.push({ x: 384, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });

    // Higher question block
    questionBlocks.push({ x: 320, y: 272, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'multi' });

    // Second set of blocks
    bricks.push({ x: 608, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });
    questionBlocks.push({ x: 640, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    bricks.push({ x: 672, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });

    // Brick staircase
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j <= i; j++) {
            bricks.push({ x: 896 + i * TILE_SIZE, y: 536 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
        }
    }

    // Descending staircase
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j <= 3 - i; j++) {
            bricks.push({ x: 1024 + i * TILE_SIZE, y: 536 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
        }
    }

    // More blocks
    questionBlocks.push({ x: 1200, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 1232, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });

    // Long brick platform
    for (let i = 0; i < 8; i++) {
        bricks.push({ x: 1344 + i * TILE_SIZE, y: 336, width: TILE_SIZE, height: TILE_SIZE, hit: false });
    }

    // Pipes
    pipes.push({ x: 448, y: 472, width: 64, height: 96 });
    pipes.push({ x: 768, y: 440, width: 64, height: 128 });
    pipes.push({ x: 1152, y: 472, width: 64, height: 96 });
    pipes.push({ x: 1600, y: 408, width: 64, height: 160 });

    // Second staircase section
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j <= i; j++) {
            bricks.push({ x: 1760 + i * TILE_SIZE, y: 536 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
        }
    }

    // Coins in the air
    coins_array.push({ x: 288, y: 340, width: 24, height: 24, collected: false });
    coins_array.push({ x: 352, y: 340, width: 24, height: 24, collected: false });
    coins_array.push({ x: 640, y: 340, width: 24, height: 24, collected: false });
    coins_array.push({ x: 1200, y: 340, width: 24, height: 24, collected: false });
    coins_array.push({ x: 1232, y: 340, width: 24, height: 24, collected: false });

    // Coins on brick platform
    for (let i = 0; i < 6; i++) {
        coins_array.push({ x: 1360 + i * 40, y: 290, width: 24, height: 24, collected: false });
    }

    // Enemies (Goombas)
    enemies.push({ x: 352, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 640, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 800, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1300, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1400, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1500, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });

    // Koopa (turtle enemy)
    enemies.push({ x: 550, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 1100, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });

    // Flag pole at the end
    flagPole = { x: 2900, y: 200, width: 8, height: 368 };
}

// Draw Larry (short bald man in blue shirt)
function drawPlayer() {
    ctx.save();
    let screenX = player.x - cameraX;

    if (player.invincible && Math.floor(player.invincibleTimer / 5) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }

    // Flip if facing left
    if (!player.facingRight) {
        ctx.translate(screenX + player.width, 0);
        ctx.scale(-1, 1);
        screenX = 0;
    } else {
        ctx.translate(screenX, 0);
    }

    // Draw Larry - a short bald man in blue shirt
    const x = 0;
    const y = player.y;

    // Head (bald, skin color)
    ctx.fillStyle = '#FFDAB9'; // Peach skin tone
    ctx.beginPath();
    ctx.arc(x + player.width / 2, y + 10, 12, 0, Math.PI * 2);
    ctx.fill();

    // Slight shine on bald head
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(x + player.width / 2 - 3, y + 6, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x + player.width / 2 - 4, y + 10, 2, 0, Math.PI * 2);
    ctx.arc(x + player.width / 2 + 4, y + 10, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + player.width / 2 - 7, y + 6);
    ctx.lineTo(x + player.width / 2 - 2, y + 7);
    ctx.moveTo(x + player.width / 2 + 2, y + 7);
    ctx.lineTo(x + player.width / 2 + 7, y + 6);
    ctx.stroke();

    // Small smile
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + player.width / 2, y + 13, 4, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // Body - Blue shirt
    ctx.fillStyle = '#4169E1'; // Royal Blue
    ctx.fillRect(x + 4, y + 20, player.width - 8, 14);

    // Shirt collar
    ctx.fillStyle = '#3158D3';
    ctx.fillRect(x + 8, y + 20, player.width - 16, 3);

    // Arms (skin)
    ctx.fillStyle = '#FFDAB9';
    if (player.onGround && (keys.left || keys.right)) {
        // Walking animation
        const armOffset = Math.sin(player.animFrame * 0.3) * 3;
        ctx.fillRect(x + 1, y + 22 + armOffset, 4, 10);
        ctx.fillRect(x + player.width - 5, y + 22 - armOffset, 4, 10);
    } else {
        ctx.fillRect(x + 1, y + 22, 4, 10);
        ctx.fillRect(x + player.width - 5, y + 22, 4, 10);
    }

    // Pants (darker blue/navy)
    ctx.fillStyle = '#1a1a4e';
    ctx.fillRect(x + 6, y + 34, player.width - 12, 6);

    // Legs
    ctx.fillStyle = '#1a1a4e';
    if (player.onGround && (keys.left || keys.right)) {
        // Walking animation
        const legOffset = Math.sin(player.animFrame * 0.3) * 4;
        ctx.fillRect(x + 6, y + 34, 6, 6 + legOffset);
        ctx.fillRect(x + player.width - 12, y + 34, 6, 6 - legOffset);
    } else if (!player.onGround) {
        // Jumping pose
        ctx.fillRect(x + 4, y + 34, 6, 4);
        ctx.fillRect(x + player.width - 10, y + 34, 6, 4);
    } else {
        ctx.fillRect(x + 6, y + 34, 6, 6);
        ctx.fillRect(x + player.width - 12, y + 34, 6, 6);
    }

    // Shoes (brown)
    ctx.fillStyle = '#8B4513';
    if (player.onGround && (keys.left || keys.right)) {
        const legOffset = Math.sin(player.animFrame * 0.3) * 4;
        ctx.fillRect(x + 4, y + 36 + Math.max(0, legOffset), 8, 4);
        ctx.fillRect(x + player.width - 12, y + 36 + Math.max(0, -legOffset), 8, 4);
    } else {
        ctx.fillRect(x + 4, y + 36, 8, 4);
        ctx.fillRect(x + player.width - 12, y + 36, 8, 4);
    }

    ctx.restore();
}

// Draw ground and platforms
function drawPlatforms() {
    platforms.forEach(platform => {
        const screenX = platform.x - cameraX;
        if (screenX > -TILE_SIZE && screenX < canvas.width + TILE_SIZE) {
            if (platform.type === 'ground') {
                // Top grass layer
                ctx.fillStyle = '#5abd39';
                ctx.fillRect(screenX, platform.y, platform.width, 8);
                // Dirt
                ctx.fillStyle = '#c84c0c';
                ctx.fillRect(screenX, platform.y + 8, platform.width, platform.height - 8);
                // Grass details
                ctx.fillStyle = '#7dd35b';
                ctx.fillRect(screenX + 2, platform.y, 4, 4);
                ctx.fillRect(screenX + 14, platform.y + 2, 6, 3);
                ctx.fillRect(screenX + 26, platform.y, 4, 5);
            } else {
                // Underground
                ctx.fillStyle = '#c84c0c';
                ctx.fillRect(screenX, platform.y, platform.width, platform.height);
                ctx.fillStyle = '#a33c08';
                ctx.fillRect(screenX + 2, platform.y + 2, 8, 8);
                ctx.fillRect(screenX + 20, platform.y + 18, 10, 10);
            }
        }
    });
}

// Draw bricks
function drawBricks() {
    bricks.forEach(brick => {
        const screenX = brick.x - cameraX;
        if (screenX > -TILE_SIZE && screenX < canvas.width + TILE_SIZE) {
            // Brick color
            ctx.fillStyle = '#c84c0c';
            ctx.fillRect(screenX, brick.y, brick.width, brick.height);

            // Brick pattern
            ctx.fillStyle = '#000';
            ctx.fillRect(screenX, brick.y + 7, brick.width, 2);
            ctx.fillRect(screenX, brick.y + 15, brick.width, 2);
            ctx.fillRect(screenX, brick.y + 23, brick.width, 2);
            ctx.fillRect(screenX + 15, brick.y, 2, 8);
            ctx.fillRect(screenX + 7, brick.y + 8, 2, 8);
            ctx.fillRect(screenX + 23, brick.y + 8, 2, 8);
            ctx.fillRect(screenX + 15, brick.y + 16, 2, 8);
            ctx.fillRect(screenX + 7, brick.y + 24, 2, 8);
            ctx.fillRect(screenX + 23, brick.y + 24, 2, 8);
        }
    });
}

// Draw question blocks
function drawQuestionBlocks() {
    questionBlocks.forEach(block => {
        const screenX = block.x - cameraX;
        if (screenX > -TILE_SIZE && screenX < canvas.width + TILE_SIZE) {
            if (block.hit) {
                // Used block
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(screenX, block.y, block.width, block.height);
                ctx.strokeStyle = '#5D2E0C';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX + 2, block.y + 2, block.width - 4, block.height - 4);
            } else {
                // Active question block
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(screenX, block.y, block.width, block.height);

                // Border
                ctx.strokeStyle = '#B8860B';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX + 2, block.y + 2, block.width - 4, block.height - 4);

                // Question mark with animation
                ctx.fillStyle = '#8B4513';
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                const bounce = Math.sin(Date.now() / 200) * 2;
                ctx.fillText('?', screenX + block.width / 2, block.y + 22 + bounce);
            }
        }
    });
}

// Draw coins
function drawCoins() {
    coins_array.forEach(coin => {
        if (!coin.collected) {
            const screenX = coin.x - cameraX;
            if (screenX > -TILE_SIZE && screenX < canvas.width + TILE_SIZE) {
                // Coin animation
                const wobble = Math.sin(Date.now() / 150) * 0.2 + 0.8;

                ctx.save();
                ctx.translate(screenX + coin.width / 2, coin.y + coin.height / 2);
                ctx.scale(wobble, 1);

                // Gold coin
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();

                // Inner circle
                ctx.fillStyle = '#FFA500';
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();

                // Dollar sign or star
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('★', 0, 4);

                ctx.restore();
            }
        }
    });
}

// Draw pipes
function drawPipes() {
    pipes.forEach(pipe => {
        const screenX = pipe.x - cameraX;
        if (screenX > -pipe.width && screenX < canvas.width + pipe.width) {
            // Pipe body (dark green)
            ctx.fillStyle = '#228B22';
            ctx.fillRect(screenX + 4, pipe.y + 32, pipe.width - 8, pipe.height - 32);

            // Pipe top (lighter green)
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(screenX, pipe.y, pipe.width, 32);

            // Pipe highlights
            ctx.fillStyle = '#90EE90';
            ctx.fillRect(screenX + 4, pipe.y + 4, 8, 24);
            ctx.fillRect(screenX + 8, pipe.y + 36, 6, pipe.height - 44);

            // Pipe shadows
            ctx.fillStyle = '#006400';
            ctx.fillRect(screenX + pipe.width - 12, pipe.y + 4, 8, 24);
            ctx.fillRect(screenX + pipe.width - 14, pipe.y + 36, 6, pipe.height - 44);

            // Pipe rim
            ctx.fillStyle = '#006400';
            ctx.fillRect(screenX, pipe.y + 28, pipe.width, 4);
        }
    });
}

// Draw enemies
function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.alive) {
            const screenX = enemy.x - cameraX;
            if (screenX > -enemy.width && screenX < canvas.width + enemy.width) {
                if (enemy.type === 'goomba') {
                    // Goomba body (brown mushroom enemy)
                    ctx.fillStyle = '#8B4513';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2, enemy.y + 10, 14, Math.PI, 0);
                    ctx.fill();

                    // Body bottom
                    ctx.fillStyle = '#D2691E';
                    ctx.fillRect(screenX + 4, enemy.y + 10, enemy.width - 8, 14);

                    // Feet with walking animation
                    ctx.fillStyle = '#8B4513';
                    const footOffset = Math.sin(Date.now() / 100) * 3;
                    ctx.fillRect(screenX + 2, enemy.y + 22 + footOffset, 10, 8);
                    ctx.fillRect(screenX + enemy.width - 12, enemy.y + 22 - footOffset, 10, 8);

                    // Angry eyes
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2 - 5, enemy.y + 8, 4, 0, Math.PI * 2);
                    ctx.arc(screenX + enemy.width / 2 + 5, enemy.y + 8, 4, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2 - 5 + enemy.velX, enemy.y + 9, 2, 0, Math.PI * 2);
                    ctx.arc(screenX + enemy.width / 2 + 5 + enemy.velX, enemy.y + 9, 2, 0, Math.PI * 2);
                    ctx.fill();

                    // Eyebrows (angry)
                    ctx.strokeStyle = '#8B4513';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(screenX + enemy.width / 2 - 9, enemy.y + 3);
                    ctx.lineTo(screenX + enemy.width / 2 - 2, enemy.y + 5);
                    ctx.moveTo(screenX + enemy.width / 2 + 2, enemy.y + 5);
                    ctx.lineTo(screenX + enemy.width / 2 + 9, enemy.y + 3);
                    ctx.stroke();

                } else if (enemy.type === 'koopa') {
                    // Koopa (turtle) - green shell
                    ctx.fillStyle = '#228B22';
                    ctx.beginPath();
                    ctx.ellipse(screenX + enemy.width / 2, enemy.y + 20, 14, 18, 0, 0, Math.PI * 2);
                    ctx.fill();

                    // Shell pattern
                    ctx.strokeStyle = '#006400';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(screenX + enemy.width / 2, enemy.y + 4);
                    ctx.lineTo(screenX + enemy.width / 2, enemy.y + 36);
                    ctx.moveTo(screenX + 6, enemy.y + 20);
                    ctx.lineTo(screenX + enemy.width - 6, enemy.y + 20);
                    ctx.stroke();

                    // Head
                    ctx.fillStyle = '#90EE90';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2 + (enemy.velX > 0 ? 10 : -10), enemy.y + 6, 8, 0, Math.PI * 2);
                    ctx.fill();

                    // Eyes
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2 + (enemy.velX > 0 ? 12 : -8), enemy.y + 4, 3, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2 + (enemy.velX > 0 ? 13 : -7), enemy.y + 4, 1.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Feet
                    ctx.fillStyle = '#FFD700';
                    const footOffset = Math.sin(Date.now() / 100) * 2;
                    ctx.fillRect(screenX + 4, enemy.y + 34 + footOffset, 8, 6);
                    ctx.fillRect(screenX + enemy.width - 12, enemy.y + 34 - footOffset, 8, 6);
                }
            }
        }
    });
}

// Draw flag pole
function drawFlagPole() {
    if (flagPole) {
        const screenX = flagPole.x - cameraX;

        // Pole
        ctx.fillStyle = '#228B22';
        ctx.fillRect(screenX, flagPole.y, flagPole.width, flagPole.height);

        // Ball on top
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.arc(screenX + flagPole.width / 2, flagPole.y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Flag
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.moveTo(screenX + flagPole.width, flagPole.y + 20);
        ctx.lineTo(screenX + flagPole.width + 50, flagPole.y + 40);
        ctx.lineTo(screenX + flagPole.width, flagPole.y + 60);
        ctx.closePath();
        ctx.fill();

        // Star on flag
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('★', screenX + flagPole.width + 15, flagPole.y + 46);

        // Base
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(screenX - 20, flagPole.y + flagPole.height - 32, 48, 32);
    }
}

// Draw background elements (clouds, hills, bushes)
function drawBackground() {
    // Sky gradient is in CSS, draw clouds
    const clouds = [
        { x: 100, y: 80, scale: 1 },
        { x: 400, y: 60, scale: 1.2 },
        { x: 700, y: 100, scale: 0.8 },
        { x: 1100, y: 70, scale: 1.1 },
        { x: 1500, y: 90, scale: 0.9 },
        { x: 1900, y: 65, scale: 1.3 },
        { x: 2300, y: 85, scale: 1 },
        { x: 2700, y: 75, scale: 1.1 }
    ];

    clouds.forEach(cloud => {
        const screenX = (cloud.x - cameraX * 0.3) % (canvas.width + 200);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(screenX, cloud.y, 25 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(screenX + 25 * cloud.scale, cloud.y - 10 * cloud.scale, 30 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(screenX + 55 * cloud.scale, cloud.y, 25 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(screenX + 25 * cloud.scale, cloud.y + 5 * cloud.scale, 20 * cloud.scale, 0, Math.PI * 2);
        ctx.fill();
    });

    // Hills in background
    const hills = [
        { x: 50, width: 200, height: 80 },
        { x: 350, width: 150, height: 60 },
        { x: 600, width: 250, height: 100 },
        { x: 1000, width: 180, height: 70 },
        { x: 1400, width: 220, height: 90 },
        { x: 1800, width: 160, height: 65 },
        { x: 2200, width: 200, height: 85 },
        { x: 2600, width: 180, height: 75 }
    ];

    hills.forEach(hill => {
        const screenX = hill.x - cameraX * 0.5;
        ctx.fillStyle = '#5abd39';
        ctx.beginPath();
        ctx.moveTo(screenX, 536);
        ctx.quadraticCurveTo(screenX + hill.width / 2, 536 - hill.height, screenX + hill.width, 536);
        ctx.fill();

        // Hill spots
        ctx.fillStyle = '#7dd35b';
        ctx.beginPath();
        ctx.arc(screenX + hill.width * 0.3, 520 - hill.height * 0.3, 8, 0, Math.PI * 2);
        ctx.arc(screenX + hill.width * 0.6, 510 - hill.height * 0.5, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    // Bushes
    const bushes = [
        { x: 150, scale: 1 },
        { x: 500, scale: 0.7 },
        { x: 850, scale: 1.2 },
        { x: 1250, scale: 0.9 },
        { x: 1650, scale: 1.1 },
        { x: 2050, scale: 0.8 },
        { x: 2450, scale: 1 }
    ];

    bushes.forEach(bush => {
        const screenX = bush.x - cameraX;
        if (screenX > -100 && screenX < canvas.width + 100) {
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.arc(screenX, 536, 20 * bush.scale, Math.PI, 0);
            ctx.arc(screenX + 25 * bush.scale, 536, 25 * bush.scale, Math.PI, 0);
            ctx.arc(screenX + 55 * bush.scale, 536, 20 * bush.scale, Math.PI, 0);
            ctx.fill();
        }
    });
}

// Collision detection
function rectCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Update player
function updatePlayer() {
    // Horizontal movement
    if (keys.left) {
        player.velX = -player.speed;
        player.facingRight = false;
    } else if (keys.right) {
        player.velX = player.speed;
        player.facingRight = true;
    } else {
        player.velX *= FRICTION;
    }

    // Jumping
    if (keys.up && player.onGround) {
        player.velY = -player.jumpStrength;
        player.onGround = false;
        player.isJumping = true;
    }

    // Apply gravity
    player.velY += GRAVITY;

    // Animation
    if (keys.left || keys.right) {
        player.animTimer++;
        if (player.animTimer > 5) {
            player.animFrame++;
            player.animTimer = 0;
        }
    } else {
        player.animFrame = 0;
    }

    // Invincibility timer
    if (player.invincible) {
        player.invincibleTimer++;
        if (player.invincibleTimer > 120) {
            player.invincible = false;
            player.invincibleTimer = 0;
        }
    }

    // Move X
    player.x += player.velX;

    // Collision with platforms, bricks, pipes
    player.onGround = false;

    // Platform collisions
    [...platforms, ...bricks.filter(b => b.solid), ...pipes].forEach(obj => {
        if (rectCollision(player, obj)) {
            // Horizontal collision
            if (player.velX > 0 && player.x + player.width > obj.x && player.x < obj.x) {
                player.x = obj.x - player.width;
                player.velX = 0;
            } else if (player.velX < 0 && player.x < obj.x + obj.width && player.x + player.width > obj.x + obj.width) {
                player.x = obj.x + obj.width;
                player.velX = 0;
            }
        }
    });

    // Move Y
    player.y += player.velY;

    // Ground collision
    [...platforms, ...bricks, ...pipes].forEach(obj => {
        if (rectCollision(player, obj)) {
            if (player.velY > 0) {
                // Landing on top
                player.y = obj.y - player.height;
                player.velY = 0;
                player.onGround = true;
                player.isJumping = false;
            } else if (player.velY < 0) {
                // Hitting from below
                player.y = obj.y + obj.height;
                player.velY = 0;
            }
        }
    });

    // Question block collision (from below)
    questionBlocks.forEach(block => {
        if (rectCollision(player, block) && player.velY < 0 && !block.hit) {
            player.y = block.y + block.height;
            player.velY = 0;
            block.hit = true;

            if (block.content === 'coin' || block.content === 'multi') {
                coins++;
                score += 200;
                updateUI();
            }
        }
    });

    // Brick collision from below
    bricks.forEach(brick => {
        if (rectCollision(player, brick) && player.velY < 0 && !brick.solid) {
            player.y = brick.y + brick.height;
            player.velY = 0;
        }
    });

    // Coin collection
    coins_array.forEach(coin => {
        if (!coin.collected && rectCollision(player, coin)) {
            coin.collected = true;
            coins++;
            score += 100;
            updateUI();
        }
    });

    // Enemy collision
    enemies.forEach(enemy => {
        if (enemy.alive && rectCollision(player, enemy)) {
            if (player.velY > 0 && player.y + player.height - 10 < enemy.y + enemy.height / 2) {
                // Stomp enemy
                enemy.alive = false;
                player.velY = -8;
                score += 100;
                updateUI();
            } else if (!player.invincible) {
                // Take damage
                lives--;
                updateUI();
                if (lives <= 0) {
                    gameOver();
                } else {
                    player.invincible = true;
                    player.invincibleTimer = 0;
                }
            }
        }
    });

    // Flag pole collision (win)
    if (flagPole && rectCollision(player, { x: flagPole.x - 20, y: flagPole.y, width: 48, height: flagPole.height })) {
        winGame();
    }

    // Boundaries
    if (player.x < 0) player.x = 0;
    if (player.x > levelWidth - player.width) player.x = levelWidth - player.width;

    // Fall off screen
    if (player.y > canvas.height) {
        lives--;
        updateUI();
        if (lives <= 0) {
            gameOver();
        } else {
            resetPlayer();
        }
    }

    // Update camera
    const targetCameraX = player.x - CAMERA_OFFSET;
    cameraX = Math.max(0, Math.min(targetCameraX, levelWidth - canvas.width));
}

// Update enemies
function updateEnemies() {
    enemies.forEach(enemy => {
        if (enemy.alive) {
            enemy.x += enemy.velX;

            // Check collision with pipes and bricks
            [...pipes, ...bricks.filter(b => b.solid)].forEach(obj => {
                if (rectCollision(enemy, obj)) {
                    enemy.velX *= -1;
                    enemy.x += enemy.velX * 2;
                }
            });

            // Turn around at edges (simple AI)
            if (enemy.x < 100 || enemy.x > levelWidth - 100) {
                enemy.velX *= -1;
            }
        }
    });
}

// Reset player position
function resetPlayer() {
    player.x = 100;
    player.y = 400;
    player.velX = 0;
    player.velY = 0;
    player.invincible = true;
    player.invincibleTimer = 0;
    cameraX = 0;
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('coins').textContent = coins;
    document.getElementById('lives').textContent = lives;
    document.getElementById('time').textContent = time;
}

// Game over
function gameOver() {
    gameState = 'gameover';
    clearInterval(timerInterval);
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').classList.remove('hidden');
}

// Win game
function winGame() {
    gameState = 'win';
    clearInterval(timerInterval);
    score += time * 10;
    document.getElementById('win-score').textContent = score;
    document.getElementById('win-screen').classList.remove('hidden');
}

// Start game
function startGame() {
    gameState = 'playing';
    score = 0;
    coins = 0;
    lives = 3;
    time = 300;
    cameraX = 0;

    initLevel();
    resetPlayer();
    updateUI();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');

    // Timer
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (gameState === 'playing') {
            time--;
            updateUI();
            if (time <= 0) {
                lives = 0;
                gameOver();
            }
        }
    }, 1000);
}

// Main game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sky background
    ctx.fillStyle = '#5c94fc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'playing') {
        updatePlayer();
        updateEnemies();
    }

    // Draw everything
    drawBackground();
    drawPlatforms();
    drawPipes();
    drawBricks();
    drawQuestionBlocks();
    drawCoins();
    drawEnemies();
    drawFlagPole();
    drawPlayer();

    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = true;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
            keys.up = true;
            e.preventDefault();
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = false;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
            keys.up = false;
            break;
    }
});

// Button listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('win-restart-btn').addEventListener('click', startGame);

// Initialize
gameLoop();
