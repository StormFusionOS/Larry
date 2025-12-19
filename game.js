// Larry's Adventure - A Mario-style Platformer
// Character: Short bald man in a blue shirt

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.5;
const FRICTION = 0.8;
const TILE_SIZE = 32;
const CAMERA_OFFSET = 300;
const TOTAL_LEVELS = 6;

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameover', 'levelcomplete', 'win'
let score = 0;
let coins = 0;
let lives = 3;
let time = 300;
let currentLevel = 1;
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
let levelTheme = 'overworld'; // 'overworld', 'underground', 'sky', 'castle'

// Level configurations
const levelConfigs = {
    1: { name: '1-1', theme: 'overworld', width: 3200, time: 300 },
    2: { name: '1-2', theme: 'underground', width: 3500, time: 350 },
    3: { name: '2-1', theme: 'overworld', width: 3800, time: 350 },
    4: { name: '2-2', theme: 'sky', width: 3200, time: 300 },
    5: { name: '3-1', theme: 'castle', width: 4000, time: 400 },
    6: { name: '3-2', theme: 'castle', width: 4500, time: 450 }
};

// Helper function to add ground
function addGround(startX, endX, gapStart = null, gapEnd = null) {
    for (let x = startX; x < endX; x += TILE_SIZE) {
        if (gapStart !== null && x >= gapStart && x < gapEnd) continue;
        platforms.push({ x: x, y: 568, width: TILE_SIZE, height: TILE_SIZE, type: 'ground' });
        platforms.push({ x: x, y: 536, width: TILE_SIZE, height: TILE_SIZE, type: 'underground' });
    }
}

// Helper function to add brick staircase
function addStaircase(startX, startY, height, ascending = true) {
    for (let i = 0; i < height; i++) {
        const steps = ascending ? i + 1 : height - i;
        for (let j = 0; j < steps; j++) {
            bricks.push({ x: startX + i * TILE_SIZE, y: startY - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
        }
    }
}

// Level 1: Grassy Plains - Easy intro
function initLevel1() {
    levelTheme = 'overworld';
    levelWidth = 3200;

    // Ground with one gap
    addGround(0, 2000);
    addGround(2128, 3200);

    // First set of blocks
    bricks.push({ x: 256, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });
    questionBlocks.push({ x: 288, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    bricks.push({ x: 320, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });
    questionBlocks.push({ x: 352, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    bricks.push({ x: 384, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });

    questionBlocks.push({ x: 320, y: 272, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'multi' });

    // Second set of blocks
    bricks.push({ x: 608, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });
    questionBlocks.push({ x: 640, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    bricks.push({ x: 672, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false });

    // Staircases
    addStaircase(896, 536, 4, true);
    addStaircase(1024, 536, 4, false);

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

    // Final staircase
    addStaircase(1760, 536, 8, true);

    // Coins
    coins_array.push({ x: 288, y: 340, width: 24, height: 24, collected: false });
    coins_array.push({ x: 352, y: 340, width: 24, height: 24, collected: false });
    coins_array.push({ x: 640, y: 340, width: 24, height: 24, collected: false });
    for (let i = 0; i < 6; i++) {
        coins_array.push({ x: 1360 + i * 40, y: 290, width: 24, height: 24, collected: false });
    }

    // Enemies
    enemies.push({ x: 352, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 640, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 800, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 550, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });

    flagPole = { x: 2900, y: 200, width: 8, height: 368 };
}

// Level 2: Underground Caverns
function initLevel2() {
    levelTheme = 'underground';
    levelWidth = 3500;

    // Ground with multiple gaps
    addGround(0, 800);
    addGround(864, 1400);
    addGround(1528, 2200);
    addGround(2328, 3500);

    // Ceiling bricks (underground feel)
    for (let x = 0; x < 3500; x += TILE_SIZE) {
        bricks.push({ x: x, y: 32, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
        bricks.push({ x: x, y: 64, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }

    // Floating platforms over gaps
    for (let i = 0; i < 3; i++) {
        bricks.push({ x: 816 + i * TILE_SIZE, y: 450, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 4; i++) {
        bricks.push({ x: 1430 + i * TILE_SIZE, y: 420, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 3; i++) {
        bricks.push({ x: 2230 + i * TILE_SIZE, y: 480, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }

    // Question blocks
    questionBlocks.push({ x: 300, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 500, y: 350, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 1000, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 1700, y: 380, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'multi' });

    // Brick platforms
    for (let i = 0; i < 6; i++) {
        bricks.push({ x: 600 + i * TILE_SIZE, y: 380, width: TILE_SIZE, height: TILE_SIZE, hit: false });
    }

    // Pipes (some coming from ceiling)
    pipes.push({ x: 200, y: 472, width: 64, height: 96 });
    pipes.push({ x: 1100, y: 440, width: 64, height: 128 });
    pipes.push({ x: 1900, y: 472, width: 64, height: 96 });
    pipes.push({ x: 2700, y: 408, width: 64, height: 160 });

    // Coins
    for (let i = 0; i < 5; i++) {
        coins_array.push({ x: 616 + i * 40, y: 330, width: 24, height: 24, collected: false });
    }
    for (let i = 0; i < 4; i++) {
        coins_array.push({ x: 1446 + i * 32, y: 370, width: 24, height: 24, collected: false });
    }

    // More enemies in underground
    enemies.push({ x: 300, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 500, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 700, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1000, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1200, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 1800, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 2500, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });

    flagPole = { x: 3300, y: 200, width: 8, height: 368 };
}

// Level 3: Hill Country - More platforming
function initLevel3() {
    levelTheme = 'overworld';
    levelWidth = 3800;

    // Ground with gaps
    addGround(0, 600);
    addGround(700, 1200);
    addGround(1350, 1800);
    addGround(1950, 2500);
    addGround(2650, 3800);

    // Elevated platforms
    for (let i = 0; i < 4; i++) {
        bricks.push({ x: 620 + i * TILE_SIZE, y: 470, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 3; i++) {
        bricks.push({ x: 1220 + i * TILE_SIZE, y: 440, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 5; i++) {
        bricks.push({ x: 1820 + i * TILE_SIZE, y: 450, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 4; i++) {
        bricks.push({ x: 2550 + i * TILE_SIZE, y: 420, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }

    // Question blocks
    questionBlocks.push({ x: 200, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 400, y: 350, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 900, y: 380, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 1500, y: 350, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'multi' });
    questionBlocks.push({ x: 2100, y: 380, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });

    // Multiple staircases
    addStaircase(450, 536, 3, true);
    addStaircase(1050, 536, 4, true);
    addStaircase(1600, 536, 3, false);
    addStaircase(2300, 536, 5, true);
    addStaircase(3000, 536, 6, true);

    // Pipes
    pipes.push({ x: 150, y: 472, width: 64, height: 96 });
    pipes.push({ x: 850, y: 440, width: 64, height: 128 });
    pipes.push({ x: 1700, y: 472, width: 64, height: 96 });
    pipes.push({ x: 2800, y: 376, width: 64, height: 192 });

    // Coins across gaps
    for (let i = 0; i < 3; i++) {
        coins_array.push({ x: 636 + i * 40, y: 420, width: 24, height: 24, collected: false });
    }
    for (let i = 0; i < 4; i++) {
        coins_array.push({ x: 1836 + i * 40, y: 400, width: 24, height: 24, collected: false });
    }
    coins_array.push({ x: 1280, y: 390, width: 24, height: 24, collected: false });

    // More enemies
    enemies.push({ x: 300, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 500, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 800, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1000, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 1400, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1600, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 2000, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 2200, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 2700, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });

    flagPole = { x: 3600, y: 200, width: 8, height: 368 };
}

// Level 4: Sky World - Floating platforms
function initLevel4() {
    levelTheme = 'sky';
    levelWidth = 3200;

    // Minimal ground - mostly platforms
    addGround(0, 300);
    addGround(2900, 3200);

    // Cloud/floating platforms (using bricks styled as clouds)
    const cloudPlatforms = [
        { x: 250, y: 480 }, { x: 400, y: 420 }, { x: 550, y: 360 },
        { x: 700, y: 400 }, { x: 900, y: 450 }, { x: 1050, y: 380 },
        { x: 1200, y: 320 }, { x: 1400, y: 380 }, { x: 1550, y: 440 },
        { x: 1700, y: 360 }, { x: 1900, y: 420 }, { x: 2050, y: 350 },
        { x: 2200, y: 400 }, { x: 2400, y: 460 }, { x: 2600, y: 400 },
        { x: 2750, y: 480 }
    ];

    cloudPlatforms.forEach(plat => {
        for (let i = 0; i < 4; i++) {
            bricks.push({ x: plat.x + i * TILE_SIZE, y: plat.y, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
        }
    });

    // Question blocks floating
    questionBlocks.push({ x: 450, y: 320, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 750, y: 300, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 1100, y: 280, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'multi' });
    questionBlocks.push({ x: 1450, y: 280, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 1950, y: 300, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 2250, y: 300, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });

    // Coins along platforms
    cloudPlatforms.forEach((plat, idx) => {
        if (idx % 2 === 0) {
            coins_array.push({ x: plat.x + 48, y: plat.y - 50, width: 24, height: 24, collected: false });
        }
    });

    // Flying enemies (koopas only - they have wings in spirit)
    enemies.push({ x: 500, y: 380, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 950, y: 410, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 1300, y: 340, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 1600, y: 400, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 2000, y: 380, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 2500, y: 420, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });

    flagPole = { x: 3000, y: 200, width: 8, height: 368 };
}

// Level 5: Castle Entrance - Tricky jumps
function initLevel5() {
    levelTheme = 'castle';
    levelWidth = 4000;

    // Ground with lava gaps (deadly)
    addGround(0, 500);
    addGround(600, 1000);
    addGround(1150, 1600);
    addGround(1800, 2300);
    addGround(2500, 3000);
    addGround(3200, 4000);

    // Castle brick platforms
    for (let i = 0; i < 5; i++) {
        bricks.push({ x: 520 + i * TILE_SIZE, y: 480, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 4; i++) {
        bricks.push({ x: 1020 + i * TILE_SIZE, y: 450, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 6; i++) {
        bricks.push({ x: 1650 + i * TILE_SIZE, y: 460, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 4; i++) {
        bricks.push({ x: 2350 + i * TILE_SIZE, y: 440, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 5; i++) {
        bricks.push({ x: 3050 + i * TILE_SIZE, y: 470, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }

    // Castle walls/obstacles
    for (let j = 0; j < 4; j++) {
        bricks.push({ x: 800, y: 440 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let j = 0; j < 3; j++) {
        bricks.push({ x: 1400, y: 472 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let j = 0; j < 5; j++) {
        bricks.push({ x: 2100, y: 440 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }

    // Question blocks
    questionBlocks.push({ x: 300, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 700, y: 350, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 1300, y: 380, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'multi' });
    questionBlocks.push({ x: 2000, y: 360, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 2700, y: 380, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });

    // Staircases
    addStaircase(350, 536, 4, true);
    addStaircase(1900, 536, 5, true);
    addStaircase(3400, 536, 8, true);

    // Coins
    for (let i = 0; i < 4; i++) {
        coins_array.push({ x: 536 + i * 40, y: 430, width: 24, height: 24, collected: false });
    }
    for (let i = 0; i < 5; i++) {
        coins_array.push({ x: 1666 + i * 40, y: 410, width: 24, height: 24, collected: false });
    }

    // Many enemies
    enemies.push({ x: 250, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 400, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 700, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 900, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 1250, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1400, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1550, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 1950, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 2150, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 2600, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 2800, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });

    flagPole = { x: 3800, y: 200, width: 8, height: 368 };
}

// Level 6: Final Castle - The ultimate challenge
function initLevel6() {
    levelTheme = 'castle';
    levelWidth = 4500;

    // Ground with many gaps
    addGround(0, 400);
    addGround(500, 900);
    addGround(1050, 1400);
    addGround(1550, 1900);
    addGround(2100, 2500);
    addGround(2700, 3100);
    addGround(3300, 3700);
    addGround(3900, 4500);

    // Platforms over gaps
    for (let i = 0; i < 3; i++) {
        bricks.push({ x: 420 + i * TILE_SIZE, y: 480, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 4; i++) {
        bricks.push({ x: 920 + i * TILE_SIZE, y: 450, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 3; i++) {
        bricks.push({ x: 1420 + i * TILE_SIZE, y: 470, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 5; i++) {
        bricks.push({ x: 1950 + i * TILE_SIZE, y: 440, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 4; i++) {
        bricks.push({ x: 2550 + i * TILE_SIZE, y: 460, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 3; i++) {
        bricks.push({ x: 3150 + i * TILE_SIZE, y: 450, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let i = 0; i < 4; i++) {
        bricks.push({ x: 3750 + i * TILE_SIZE, y: 470, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }

    // Walls/pillars
    for (let j = 0; j < 4; j++) {
        bricks.push({ x: 700, y: 440 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let j = 0; j < 5; j++) {
        bricks.push({ x: 1200, y: 440 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let j = 0; j < 4; j++) {
        bricks.push({ x: 1700, y: 440 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let j = 0; j < 6; j++) {
        bricks.push({ x: 2300, y: 440 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let j = 0; j < 4; j++) {
        bricks.push({ x: 2900, y: 440 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }
    for (let j = 0; j < 5; j++) {
        bricks.push({ x: 3500, y: 440 - j * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, hit: false, solid: true });
    }

    // Question blocks - scattered rewards
    questionBlocks.push({ x: 250, y: 400, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 600, y: 350, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 1100, y: 360, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'multi' });
    questionBlocks.push({ x: 1600, y: 380, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 2200, y: 350, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });
    questionBlocks.push({ x: 2800, y: 360, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'multi' });
    questionBlocks.push({ x: 3400, y: 380, width: TILE_SIZE, height: TILE_SIZE, hit: false, content: 'coin' });

    // Final staircase
    addStaircase(4000, 536, 10, true);

    // Coins
    for (let i = 0; i < 3; i++) {
        coins_array.push({ x: 436 + i * 32, y: 430, width: 24, height: 24, collected: false });
    }
    for (let i = 0; i < 4; i++) {
        coins_array.push({ x: 1966 + i * 40, y: 390, width: 24, height: 24, collected: false });
    }
    for (let i = 0; i < 3; i++) {
        coins_array.push({ x: 3166 + i * 32, y: 400, width: 24, height: 24, collected: false });
    }

    // Maximum enemies
    enemies.push({ x: 200, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 350, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 600, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 800, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 1100, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1300, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 1600, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 1800, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 2200, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 2400, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 2800, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 3000, y: 524, width: 32, height: 40, velX: -1, alive: true, type: 'koopa' });
    enemies.push({ x: 3400, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });
    enemies.push({ x: 3600, y: 528, width: 32, height: 32, velX: -1, alive: true, type: 'goomba' });

    flagPole = { x: 4300, y: 200, width: 8, height: 368 };
}

// Initialize level based on current level number
function initLevel() {
    platforms = [];
    bricks = [];
    questionBlocks = [];
    coins_array = [];
    enemies = [];
    pipes = [];
    flagPole = null;

    const config = levelConfigs[currentLevel];
    levelWidth = config.width;
    levelTheme = config.theme;

    switch (currentLevel) {
        case 1: initLevel1(); break;
        case 2: initLevel2(); break;
        case 3: initLevel3(); break;
        case 4: initLevel4(); break;
        case 5: initLevel5(); break;
        case 6: initLevel6(); break;
    }
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
    ctx.fillStyle = '#FFDAB9';
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
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 4, y + 20, player.width - 8, 14);

    // Shirt collar
    ctx.fillStyle = '#3158D3';
    ctx.fillRect(x + 8, y + 20, player.width - 16, 3);

    // Arms (skin)
    ctx.fillStyle = '#FFDAB9';
    if (player.onGround && (keys.left || keys.right)) {
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
        const legOffset = Math.sin(player.animFrame * 0.3) * 4;
        ctx.fillRect(x + 6, y + 34, 6, 6 + legOffset);
        ctx.fillRect(x + player.width - 12, y + 34, 6, 6 - legOffset);
    } else if (!player.onGround) {
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

// Get sky color based on theme
function getSkyColor() {
    switch (levelTheme) {
        case 'underground': return '#000000';
        case 'sky': return '#87CEEB';
        case 'castle': return '#1a1a2e';
        default: return '#5c94fc';
    }
}

// Get ground colors based on theme
function getGroundColors() {
    switch (levelTheme) {
        case 'underground':
            return { top: '#4a4a4a', dirt: '#2d2d2d', detail: '#5a5a5a' };
        case 'castle':
            return { top: '#4a4a4a', dirt: '#2d2d2d', detail: '#5a5a5a' };
        case 'sky':
            return { top: '#ffffff', dirt: '#e0e0e0', detail: '#f0f0f0' };
        default:
            return { top: '#5abd39', dirt: '#c84c0c', detail: '#7dd35b' };
    }
}

// Draw ground and platforms
function drawPlatforms() {
    const colors = getGroundColors();
    platforms.forEach(platform => {
        const screenX = platform.x - cameraX;
        if (screenX > -TILE_SIZE && screenX < canvas.width + TILE_SIZE) {
            if (platform.type === 'ground') {
                ctx.fillStyle = colors.top;
                ctx.fillRect(screenX, platform.y, platform.width, 8);
                ctx.fillStyle = colors.dirt;
                ctx.fillRect(screenX, platform.y + 8, platform.width, platform.height - 8);
                ctx.fillStyle = colors.detail;
                ctx.fillRect(screenX + 2, platform.y, 4, 4);
                ctx.fillRect(screenX + 14, platform.y + 2, 6, 3);
                ctx.fillRect(screenX + 26, platform.y, 4, 5);
            } else {
                ctx.fillStyle = colors.dirt;
                ctx.fillRect(screenX, platform.y, platform.width, platform.height);
                ctx.fillStyle = levelTheme === 'underground' || levelTheme === 'castle' ? '#1a1a1a' : '#a33c08';
                ctx.fillRect(screenX + 2, platform.y + 2, 8, 8);
                ctx.fillRect(screenX + 20, platform.y + 18, 10, 10);
            }
        }
    });
}

// Draw bricks
function drawBricks() {
    const brickColor = levelTheme === 'underground' || levelTheme === 'castle' ? '#4a4a4a' : '#c84c0c';
    bricks.forEach(brick => {
        const screenX = brick.x - cameraX;
        if (screenX > -TILE_SIZE && screenX < canvas.width + TILE_SIZE) {
            ctx.fillStyle = brickColor;
            ctx.fillRect(screenX, brick.y, brick.width, brick.height);

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
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(screenX, block.y, block.width, block.height);
                ctx.strokeStyle = '#5D2E0C';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX + 2, block.y + 2, block.width - 4, block.height - 4);
            } else {
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(screenX, block.y, block.width, block.height);
                ctx.strokeStyle = '#B8860B';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX + 2, block.y + 2, block.width - 4, block.height - 4);
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
                const wobble = Math.sin(Date.now() / 150) * 0.2 + 0.8;
                ctx.save();
                ctx.translate(screenX + coin.width / 2, coin.y + coin.height / 2);
                ctx.scale(wobble, 1);
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFA500';
                ctx.beginPath();
                ctx.arc(0, 0, 6, 0, Math.PI * 2);
                ctx.fill();
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
            ctx.fillStyle = '#228B22';
            ctx.fillRect(screenX + 4, pipe.y + 32, pipe.width - 8, pipe.height - 32);
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(screenX, pipe.y, pipe.width, 32);
            ctx.fillStyle = '#90EE90';
            ctx.fillRect(screenX + 4, pipe.y + 4, 8, 24);
            ctx.fillRect(screenX + 8, pipe.y + 36, 6, pipe.height - 44);
            ctx.fillStyle = '#006400';
            ctx.fillRect(screenX + pipe.width - 12, pipe.y + 4, 8, 24);
            ctx.fillRect(screenX + pipe.width - 14, pipe.y + 36, 6, pipe.height - 44);
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
                    ctx.fillStyle = '#8B4513';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2, enemy.y + 10, 14, Math.PI, 0);
                    ctx.fill();
                    ctx.fillStyle = '#D2691E';
                    ctx.fillRect(screenX + 4, enemy.y + 10, enemy.width - 8, 14);
                    ctx.fillStyle = '#8B4513';
                    const footOffset = Math.sin(Date.now() / 100) * 3;
                    ctx.fillRect(screenX + 2, enemy.y + 22 + footOffset, 10, 8);
                    ctx.fillRect(screenX + enemy.width - 12, enemy.y + 22 - footOffset, 10, 8);
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
                    ctx.strokeStyle = '#8B4513';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(screenX + enemy.width / 2 - 9, enemy.y + 3);
                    ctx.lineTo(screenX + enemy.width / 2 - 2, enemy.y + 5);
                    ctx.moveTo(screenX + enemy.width / 2 + 2, enemy.y + 5);
                    ctx.lineTo(screenX + enemy.width / 2 + 9, enemy.y + 3);
                    ctx.stroke();
                } else if (enemy.type === 'koopa') {
                    ctx.fillStyle = '#228B22';
                    ctx.beginPath();
                    ctx.ellipse(screenX + enemy.width / 2, enemy.y + 20, 14, 18, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#006400';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(screenX + enemy.width / 2, enemy.y + 4);
                    ctx.lineTo(screenX + enemy.width / 2, enemy.y + 36);
                    ctx.moveTo(screenX + 6, enemy.y + 20);
                    ctx.lineTo(screenX + enemy.width - 6, enemy.y + 20);
                    ctx.stroke();
                    ctx.fillStyle = '#90EE90';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2 + (enemy.velX > 0 ? 10 : -10), enemy.y + 6, 8, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2 + (enemy.velX > 0 ? 12 : -8), enemy.y + 4, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(screenX + enemy.width / 2 + (enemy.velX > 0 ? 13 : -7), enemy.y + 4, 1.5, 0, Math.PI * 2);
                    ctx.fill();
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
        ctx.fillStyle = '#228B22';
        ctx.fillRect(screenX, flagPole.y, flagPole.width, flagPole.height);
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.arc(screenX + flagPole.width / 2, flagPole.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.moveTo(screenX + flagPole.width, flagPole.y + 20);
        ctx.lineTo(screenX + flagPole.width + 50, flagPole.y + 40);
        ctx.lineTo(screenX + flagPole.width, flagPole.y + 60);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('★', screenX + flagPole.width + 15, flagPole.y + 46);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(screenX - 20, flagPole.y + flagPole.height - 32, 48, 32);
    }
}

// Draw background elements
function drawBackground() {
    if (levelTheme === 'underground' || levelTheme === 'castle') {
        // Dark background, no clouds
        return;
    }

    const clouds = [
        { x: 100, y: 80, scale: 1 },
        { x: 400, y: 60, scale: 1.2 },
        { x: 700, y: 100, scale: 0.8 },
        { x: 1100, y: 70, scale: 1.1 },
        { x: 1500, y: 90, scale: 0.9 },
        { x: 1900, y: 65, scale: 1.3 },
        { x: 2300, y: 85, scale: 1 },
        { x: 2700, y: 75, scale: 1.1 },
        { x: 3100, y: 80, scale: 0.9 },
        { x: 3500, y: 70, scale: 1.2 },
        { x: 3900, y: 90, scale: 1 },
        { x: 4300, y: 65, scale: 1.1 }
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

    if (levelTheme === 'overworld') {
        const hills = [
            { x: 50, width: 200, height: 80 },
            { x: 350, width: 150, height: 60 },
            { x: 600, width: 250, height: 100 },
            { x: 1000, width: 180, height: 70 },
            { x: 1400, width: 220, height: 90 },
            { x: 1800, width: 160, height: 65 },
            { x: 2200, width: 200, height: 85 },
            { x: 2600, width: 180, height: 75 },
            { x: 3000, width: 220, height: 95 },
            { x: 3400, width: 170, height: 70 },
            { x: 3800, width: 200, height: 80 },
            { x: 4200, width: 190, height: 85 }
        ];

        hills.forEach(hill => {
            const screenX = hill.x - cameraX * 0.5;
            ctx.fillStyle = '#5abd39';
            ctx.beginPath();
            ctx.moveTo(screenX, 536);
            ctx.quadraticCurveTo(screenX + hill.width / 2, 536 - hill.height, screenX + hill.width, 536);
            ctx.fill();
            ctx.fillStyle = '#7dd35b';
            ctx.beginPath();
            ctx.arc(screenX + hill.width * 0.3, 520 - hill.height * 0.3, 8, 0, Math.PI * 2);
            ctx.arc(screenX + hill.width * 0.6, 510 - hill.height * 0.5, 6, 0, Math.PI * 2);
            ctx.fill();
        });

        const bushes = [
            { x: 150, scale: 1 },
            { x: 500, scale: 0.7 },
            { x: 850, scale: 1.2 },
            { x: 1250, scale: 0.9 },
            { x: 1650, scale: 1.1 },
            { x: 2050, scale: 0.8 },
            { x: 2450, scale: 1 },
            { x: 2850, scale: 0.9 },
            { x: 3250, scale: 1.1 },
            { x: 3650, scale: 0.8 },
            { x: 4050, scale: 1 }
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
    if (keys.left) {
        player.velX = -player.speed;
        player.facingRight = false;
    } else if (keys.right) {
        player.velX = player.speed;
        player.facingRight = true;
    } else {
        player.velX *= FRICTION;
    }

    if (keys.up && player.onGround) {
        player.velY = -player.jumpStrength;
        player.onGround = false;
        player.isJumping = true;
    }

    player.velY += GRAVITY;

    if (keys.left || keys.right) {
        player.animTimer++;
        if (player.animTimer > 5) {
            player.animFrame++;
            player.animTimer = 0;
        }
    } else {
        player.animFrame = 0;
    }

    if (player.invincible) {
        player.invincibleTimer++;
        if (player.invincibleTimer > 120) {
            player.invincible = false;
            player.invincibleTimer = 0;
        }
    }

    player.x += player.velX;
    player.onGround = false;

    [...platforms, ...bricks.filter(b => b.solid), ...pipes].forEach(obj => {
        if (rectCollision(player, obj)) {
            if (player.velX > 0 && player.x + player.width > obj.x && player.x < obj.x) {
                player.x = obj.x - player.width;
                player.velX = 0;
            } else if (player.velX < 0 && player.x < obj.x + obj.width && player.x + player.width > obj.x + obj.width) {
                player.x = obj.x + obj.width;
                player.velX = 0;
            }
        }
    });

    player.y += player.velY;

    [...platforms, ...bricks, ...pipes].forEach(obj => {
        if (rectCollision(player, obj)) {
            if (player.velY > 0) {
                player.y = obj.y - player.height;
                player.velY = 0;
                player.onGround = true;
                player.isJumping = false;
            } else if (player.velY < 0) {
                player.y = obj.y + obj.height;
                player.velY = 0;
            }
        }
    });

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

    bricks.forEach(brick => {
        if (rectCollision(player, brick) && player.velY < 0 && !brick.solid) {
            player.y = brick.y + brick.height;
            player.velY = 0;
        }
    });

    coins_array.forEach(coin => {
        if (!coin.collected && rectCollision(player, coin)) {
            coin.collected = true;
            coins++;
            score += 100;
            updateUI();
        }
    });

    enemies.forEach(enemy => {
        if (enemy.alive && rectCollision(player, enemy)) {
            if (player.velY > 0 && player.y + player.height - 10 < enemy.y + enemy.height / 2) {
                enemy.alive = false;
                player.velY = -8;
                score += 100;
                updateUI();
            } else if (!player.invincible) {
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

    if (flagPole && rectCollision(player, { x: flagPole.x - 20, y: flagPole.y, width: 48, height: flagPole.height })) {
        levelComplete();
    }

    if (player.x < 0) player.x = 0;
    if (player.x > levelWidth - player.width) player.x = levelWidth - player.width;

    if (player.y > canvas.height) {
        lives--;
        updateUI();
        if (lives <= 0) {
            gameOver();
        } else {
            resetPlayer();
        }
    }

    const targetCameraX = player.x - CAMERA_OFFSET;
    cameraX = Math.max(0, Math.min(targetCameraX, levelWidth - canvas.width));
}

// Update enemies
function updateEnemies() {
    enemies.forEach(enemy => {
        if (enemy.alive) {
            enemy.x += enemy.velX;
            [...pipes, ...bricks.filter(b => b.solid)].forEach(obj => {
                if (rectCollision(enemy, obj)) {
                    enemy.velX *= -1;
                    enemy.x += enemy.velX * 2;
                }
            });
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
    document.getElementById('level').textContent = levelConfigs[currentLevel].name;
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

// Level complete
function levelComplete() {
    gameState = 'levelcomplete';
    clearInterval(timerInterval);
    score += time * 10;
    document.getElementById('completed-level').textContent = levelConfigs[currentLevel].name;
    document.getElementById('level-score').textContent = score;
    document.getElementById('level-complete-screen').classList.remove('hidden');
}

// Win game (all levels complete)
function winGame() {
    gameState = 'win';
    clearInterval(timerInterval);
    document.getElementById('win-score').textContent = score;
    document.getElementById('win-screen').classList.remove('hidden');
}

// Next level
function nextLevel() {
    currentLevel++;
    if (currentLevel > TOTAL_LEVELS) {
        winGame();
        return;
    }

    document.getElementById('level-complete-screen').classList.add('hidden');
    time = levelConfigs[currentLevel].time;
    initLevel();
    resetPlayer();
    updateUI();
    gameState = 'playing';

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

// Start game
function startGame() {
    gameState = 'playing';
    score = 0;
    coins = 0;
    lives = 3;
    currentLevel = 1;
    time = levelConfigs[currentLevel].time;
    cameraX = 0;

    initLevel();
    resetPlayer();
    updateUI();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('level-complete-screen').classList.add('hidden');
    document.getElementById('win-screen').classList.add('hidden');

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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = getSkyColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'playing') {
        updatePlayer();
        updateEnemies();
    }

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
document.getElementById('next-level-btn').addEventListener('click', nextLevel);
document.getElementById('win-restart-btn').addEventListener('click', startGame);

// Initialize
gameLoop();
