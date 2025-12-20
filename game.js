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

// ============ MUSIC SYSTEM ============
let audioCtx = null;
let musicPlaying = false;
let currentMusicType = 'normal'; // 'normal' or 'boss'

// Note frequencies (Hz)
const NOTES = {
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    REST: 0
};

// Music patterns - "I'm a Little Horsey" by Doctor Waffle (Haru Urara tribute)
const normalMelody = [
    // "I'm a little horsey, running around"
    'E4', 'E4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4',
    'E4', 'D4', 'D4', 'REST', 'E4', 'E4', 'E4', 'D4',
    'C4', 'C4', 'D4', 'E4', 'D4', 'C4', 'C4', 'REST',
    // "I don't ever wanna stop"
    'D4', 'D4', 'E4', 'D4', 'C4', 'REST', 'E4', 'G4',
    'G4', 'E4', 'D4', 'C4', 'C4', 'REST', 'REST', 'REST',
    // "I'm a little horsey, running around"
    'E4', 'E4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4',
    'E4', 'D4', 'D4', 'REST', 'E4', 'E4', 'E4', 'D4',
    'C4', 'C4', 'D4', 'E4', 'D4', 'C4', 'C4', 'REST',
    // "Clip clop clip clop"
    'G4', 'E4', 'G4', 'E4', 'G4', 'A4', 'G4', 'REST',
    'E4', 'D4', 'C4', 'REST', 'C4', 'REST', 'REST', 'REST'
];

const normalBass = [
    // Bouncy accompaniment like ukulele strums
    'C3', 'G3', 'C3', 'G3', 'C3', 'G3', 'C3', 'G3',
    'G2', 'D3', 'G2', 'D3', 'C3', 'G3', 'C3', 'G3',
    'F2', 'C3', 'F2', 'C3', 'G2', 'D3', 'C3', 'REST',
    'G2', 'D3', 'G2', 'D3', 'C3', 'REST', 'C3', 'G3',
    'C3', 'G3', 'G2', 'D3', 'C3', 'REST', 'REST', 'REST',
    'C3', 'G3', 'C3', 'G3', 'C3', 'G3', 'C3', 'G3',
    'G2', 'D3', 'G2', 'D3', 'C3', 'G3', 'C3', 'G3',
    'F2', 'C3', 'F2', 'C3', 'G2', 'D3', 'C3', 'REST',
    'C3', 'G3', 'C3', 'G3', 'C3', 'G3', 'C3', 'REST',
    'G2', 'D3', 'C3', 'REST', 'C3', 'REST', 'REST', 'REST'
];

const bossMelody = [
    'E3', 'E3', 'E4', 'E3', 'E3', 'D4', 'E3', 'E3',
    'C4', 'B3', 'A3', 'REST', 'A3', 'B3', 'C4', 'REST',
    'E3', 'E3', 'E4', 'E3', 'E3', 'D4', 'E3', 'E3',
    'G4', 'F4', 'E4', 'D4', 'C4', 'REST', 'REST', 'REST',
    'A3', 'A3', 'C4', 'A3', 'A3', 'E4', 'A3', 'A3',
    'D4', 'C4', 'B3', 'A3', 'G3', 'REST', 'REST', 'REST'
];

const bossBass = [
    'A2', 'REST', 'A2', 'A2', 'REST', 'A2', 'A2', 'REST',
    'F2', 'REST', 'F2', 'F2', 'REST', 'G2', 'G2', 'REST',
    'A2', 'REST', 'A2', 'A2', 'REST', 'A2', 'A2', 'REST',
    'E2', 'REST', 'E2', 'E2', 'REST', 'E2', 'E2', 'REST',
    'A2', 'REST', 'A2', 'A2', 'REST', 'A2', 'A2', 'REST',
    'D2', 'REST', 'D2', 'D2', 'REST', 'E2', 'E2', 'REST'
];

let melodyIndex = 0;
let bassIndex = 0;
let musicInterval = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playNote(frequency, duration, type = 'square', volume = 0.1) {
    if (!audioCtx || frequency === 0) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

function playMusicStep() {
    const isBoss = currentMusicType === 'boss';
    const melody = isBoss ? bossMelody : normalMelody;
    const bass = isBoss ? bossBass : normalBass;
    const tempo = isBoss ? 0.12 : 0.15;

    // Play melody note
    const melodyNote = melody[melodyIndex % melody.length];
    if (melodyNote !== 'REST') {
        playNote(NOTES[melodyNote], tempo * 2, 'square', 0.08);
    }

    // Play bass note
    const bassNote = bass[bassIndex % bass.length];
    if (bassNote !== 'REST') {
        playNote(NOTES[bassNote], tempo * 2, 'triangle', 0.12);
    }

    melodyIndex++;
    bassIndex++;
}

function startMusic(type = 'normal') {
    initAudio();

    if (musicInterval) {
        clearInterval(musicInterval);
    }

    currentMusicType = type;
    melodyIndex = 0;
    bassIndex = 0;
    musicPlaying = true;

    const tempo = type === 'boss' ? 160 : 240;
    musicInterval = setInterval(playMusicStep, tempo);
}

function stopMusic() {
    if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
    }
    musicPlaying = false;
}

function switchToBossMusic() {
    if (currentMusicType !== 'boss') {
        startMusic('boss');
    }
}

function switchToNormalMusic() {
    if (currentMusicType !== 'normal') {
        startMusic('normal');
    }
}
// ============ END MUSIC SYSTEM ============

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

// Enemy spawn points - defined with level layout
let enemySpawnPoints = [];

// Generate level - challenging platforming with enemies spread throughout
function generateLevel() {
    platforms = [];
    enemySpawnPoints = [];

    // === SECTION 1: Starting safe zone (no enemies here) ===
    platforms.push({ x: 0, y: 520, width: 300, height: 80, type: 'ground' });

    // === SECTION 2: First platforming challenge - going UP ===
    // Stepping stones going up and right
    platforms.push({ x: 350, y: 480, width: 120, height: 20, type: 'platform' });
    platforms.push({ x: 520, y: 420, width: 140, height: 20, type: 'platform', hasEnemy: true });
    platforms.push({ x: 380, y: 350, width: 100, height: 20, type: 'platform' });
    platforms.push({ x: 550, y: 290, width: 150, height: 20, type: 'platform', hasEnemy: true });
    platforms.push({ x: 400, y: 220, width: 120, height: 20, type: 'platform' });

    // Upper route with enemy
    platforms.push({ x: 580, y: 160, width: 180, height: 20, type: 'floating', hasEnemy: true });

    // === SECTION 3: Descent and ground section ===
    platforms.push({ x: 750, y: 250, width: 100, height: 20, type: 'platform' });
    platforms.push({ x: 900, y: 320, width: 120, height: 20, type: 'platform', hasEnemy: true });
    platforms.push({ x: 1050, y: 400, width: 100, height: 20, type: 'platform' });

    // Ground island with enemies
    platforms.push({ x: 1000, y: 520, width: 250, height: 80, type: 'ground', hasEnemy: true });

    // === SECTION 4: Vertical tower section ===
    // Base platform
    platforms.push({ x: 1300, y: 520, width: 150, height: 80, type: 'ground' });

    // Tower going up (alternating sides)
    platforms.push({ x: 1350, y: 440, width: 100, height: 20, type: 'platform', hasEnemy: true });
    platforms.push({ x: 1250, y: 360, width: 100, height: 20, type: 'platform' });
    platforms.push({ x: 1380, y: 280, width: 120, height: 20, type: 'platform', hasEnemy: true });
    platforms.push({ x: 1250, y: 200, width: 110, height: 20, type: 'platform' });
    platforms.push({ x: 1350, y: 130, width: 140, height: 20, type: 'floating', hasEnemy: true });

    // === SECTION 5: High bridge section ===
    platforms.push({ x: 1530, y: 150, width: 100, height: 20, type: 'floating' });
    platforms.push({ x: 1680, y: 180, width: 150, height: 20, type: 'floating', hasEnemy: true });
    platforms.push({ x: 1880, y: 150, width: 120, height: 20, type: 'floating' });
    platforms.push({ x: 2050, y: 180, width: 140, height: 20, type: 'floating', hasEnemy: true });

    // === SECTION 6: Descent to mid-level ===
    platforms.push({ x: 2200, y: 260, width: 100, height: 20, type: 'platform' });
    platforms.push({ x: 2100, y: 340, width: 120, height: 20, type: 'platform', hasEnemy: true });
    platforms.push({ x: 2250, y: 420, width: 100, height: 20, type: 'platform' });

    // Mid-level ground
    platforms.push({ x: 2150, y: 520, width: 200, height: 80, type: 'ground', hasEnemy: true });

    // === SECTION 7: Final gauntlet ===
    // Series of challenging jumps
    platforms.push({ x: 2400, y: 480, width: 80, height: 20, type: 'platform' });
    platforms.push({ x: 2530, y: 420, width: 100, height: 20, type: 'platform', hasEnemy: true });
    platforms.push({ x: 2680, y: 350, width: 90, height: 20, type: 'platform' });
    platforms.push({ x: 2820, y: 280, width: 120, height: 20, type: 'platform', hasEnemy: true });

    // Final arena (for boss fight or last enemies)
    platforms.push({ x: 2750, y: 520, width: 250, height: 80, type: 'ground' });

    // Collect spawn points from platforms marked with enemies
    for (const plat of platforms) {
        if (plat.hasEnemy) {
            enemySpawnPoints.push({
                x: plat.x + plat.width / 2 - 20,
                y: plat.y - 65,
                platX: plat.x,
                platWidth: plat.width
            });
        }
    }
}

// Enemies array
let enemies = [];

// Boss state
let boss = null;
let isBossFight = false;
let fireballs = []; // Boss fireballs
let steaks = []; // Health pickup steaks dropped by boss

// Enemy class - Haru Urara style horse girls
class Enemy {
    constructor(x, y, type = 'urara', patrolLeft = null, patrolRight = null) {
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
        this.speed = type === 'urara_fast' ? 3 : type === 'urara_strong' ? 1.2 : 1.8; // Slower than player (5)
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

        // Patrol behavior
        this.patrolLeft = patrolLeft;
        this.patrolRight = patrolRight;
        this.patrolDir = 1; // 1 = right, -1 = left
        this.isChasing = false;
        this.detectionRange = type === 'urara_fast' ? 300 : type === 'urara_strong' ? 200 : 250;
        this.chaseRange = 400; // Stop chasing if player gets too far
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

        // Calculate distance to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        // Determine if should chase or patrol
        if (distToPlayer < this.detectionRange) {
            this.isChasing = true;
        } else if (distToPlayer > this.chaseRange) {
            this.isChasing = false;
        }

        if (this.isChasing) {
            // Chase mode - move towards player BUT stay on platform
            this.facing = dx > 0 ? 1 : -1;

            if (Math.abs(dx) > 30) {
                // Check if moving would take us off the platform
                let canMove = true;
                if (this.patrolLeft !== null && this.patrolRight !== null) {
                    if (this.facing > 0 && this.x + this.width >= this.patrolRight - 5) {
                        canMove = false; // At right edge, can't go right
                    } else if (this.facing < 0 && this.x <= this.patrolLeft + 5) {
                        canMove = false; // At left edge, can't go left
                    }
                }

                if (canMove) {
                    this.velX = this.facing * this.speed;
                } else {
                    this.velX = 0; // Stop at platform edge
                }
            } else {
                this.velX = 0;
            }

            // NO jumping - stay on platform
            // (removed jump behavior so enemies don't leave their platforms)
        } else {
            // Patrol mode - walk back and forth on platform
            if (this.patrolLeft !== null && this.patrolRight !== null) {
                // Check patrol boundaries
                if (this.x <= this.patrolLeft) {
                    this.patrolDir = 1;
                } else if (this.x + this.width >= this.patrolRight) {
                    this.patrolDir = -1;
                }

                this.velX = this.patrolDir * this.speed * 0.5; // Slower patrol speed
                this.facing = this.patrolDir;
            } else {
                // No patrol bounds, just stand and look around
                this.velX = 0;
                // Occasionally change facing direction
                if (Math.random() < 0.01) {
                    this.facing *= -1;
                }
            }
        }

        if (this.jumpCooldown > 0) this.jumpCooldown--;

        // Extra safety: clamp position to platform bounds
        if (this.patrolLeft !== null && this.patrolRight !== null) {
            if (this.x < this.patrolLeft) {
                this.x = this.patrolLeft;
                this.velX = 0;
            }
            if (this.x + this.width > this.patrolRight) {
                this.x = this.patrolRight - this.width;
                this.velX = 0;
            }
        }

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

// Boss class - Marioman the Furry with learnable attack patterns
class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 140;
        this.velX = 0;
        this.velY = 0;
        this.health = 1500; // More health for longer fight
        this.maxHealth = 1500;
        this.speed = 3.5; // Faster boss
        this.damage = 12; // Reduced from 25
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
        this.steakDropTimer = 0; // Timer for dropping health steaks

        // Helicopter rescue system
        this.isBeingRescued = false;
        this.rescuePhase = 0; // 0=not rescuing, 1=heli approaching, 2=rope lowering, 3=lifting, 4=flying back, 5=dropping
        this.rescueTimer = 0;
        this.helicopterX = 0;
        this.helicopterY = 0;
        this.ropeLength = 0;
        this.savedX = x; // Where to return the boss
        this.savedY = 380; // Safe Y position on platform

        // Pattern system - learnable attack sequences
        this.currentPattern = 0;
        this.patternStep = 0;
        this.patternTimer = 0;
        this.patternCooldown = 0;
        this.isExecutingPattern = false;
        this.telegraphTimer = 0; // Warning before attacks
        this.isTelegraphing = false;
        this.currentAttackType = null;

        // Attack patterns (each is a sequence of moves)
        // Pattern types: 'fireball_single', 'fireball_spread', 'fireball_wave',
        //                'charge', 'jump_slam', 'rest'
        this.patterns = {
            1: [ // Phase 1 - Simple patterns
                ['telegraph', 'fireball_single', 'rest', 'rest'],
                ['telegraph', 'charge', 'rest', 'rest', 'rest'],
                ['telegraph', 'fireball_single', 'rest', 'telegraph', 'fireball_single', 'rest'],
            ],
            2: [ // Phase 2 - More complex
                ['telegraph', 'fireball_spread', 'rest', 'telegraph', 'charge', 'rest'],
                ['telegraph', 'jump_slam', 'rest', 'telegraph', 'fireball_single', 'rest'],
                ['telegraph', 'fireball_single', 'telegraph', 'fireball_single', 'telegraph', 'fireball_single', 'rest', 'rest'],
            ],
            3: [ // Phase 3 - Intense but still learnable
                ['telegraph', 'fireball_wave', 'rest', 'telegraph', 'charge', 'telegraph', 'jump_slam', 'rest'],
                ['telegraph', 'jump_slam', 'telegraph', 'fireball_spread', 'rest', 'rest'],
                ['telegraph', 'charge', 'telegraph', 'fireball_wave', 'rest', 'telegraph', 'charge', 'rest'],
            ]
        };
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

        // Check if boss fell off screen - trigger helicopter rescue!
        if (this.y > 650 && !this.isBeingRescued) {
            this.isBeingRescued = true;
            this.rescuePhase = 1;
            this.rescueTimer = 0;
            this.helicopterX = this.x - 400; // Helicopter comes from left
            this.helicopterY = 100;
            this.ropeLength = 0;
            this.velX = 0;
            this.velY = 0;
            // Save a safe return position
            this.savedX = Math.max(2750, Math.min(2950, player.x + 200));
            this.savedY = 380;
        }

        // Handle helicopter rescue animation
        if (this.isBeingRescued) {
            this.updateHelicopterRescue();
            return; // Skip normal update during rescue
        }

        // Phase based on health
        this.phase = this.health > 1000 ? 1 : this.health > 500 ? 2 : 3;

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

        // Pattern-based attack system
        this.executePatternSystem();

        // Basic movement when not executing special attacks
        if (!this.isExecutingPattern || this.currentAttackType === 'rest') {
            const dx = player.x - this.x;
            this.facing = dx > 0 ? 1 : -1;

            // Move towards player slowly when resting
            if (Math.abs(dx) > 150) {
                this.velX = this.facing * this.speed * 0.5;
            } else {
                this.velX *= 0.8;
            }
        }

        // Drop ribeye steaks periodically for player health recovery
        this.steakDropTimer++;
        if (this.steakDropTimer >= 600) { // Drop a steak every 10 seconds
            this.steakDropTimer = 0;
            steaks.push({
                x: this.x + this.width / 2 + (Math.random() - 0.5) * 100,
                y: this.y + 50,
                velY: -5,
                width: 40,
                height: 25,
                grounded: false,
                life: 600 // 10 seconds to collect
            });
        }

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

    executePatternSystem() {
        // Start a new pattern if not executing one
        if (!this.isExecutingPattern && this.patternCooldown <= 0) {
            const phasePatterns = this.patterns[this.phase];
            this.currentPattern = Math.floor(Math.random() * phasePatterns.length);
            this.patternStep = 0;
            this.isExecutingPattern = true;
            this.patternTimer = 0;
        }

        if (this.patternCooldown > 0) {
            this.patternCooldown--;
            return;
        }

        if (!this.isExecutingPattern) return;

        const phasePatterns = this.patterns[this.phase];
        const pattern = phasePatterns[this.currentPattern];

        if (this.patternStep >= pattern.length) {
            // Pattern complete, rest before next pattern
            this.isExecutingPattern = false;
            this.patternCooldown = 60; // 1 second between patterns
            this.currentAttackType = null;
            return;
        }

        const currentAction = pattern[this.patternStep];
        this.currentAttackType = currentAction;

        this.patternTimer++;

        switch (currentAction) {
            case 'telegraph':
                this.executeTelegraph();
                break;
            case 'fireball_single':
                this.executeFireballSingle();
                break;
            case 'fireball_spread':
                this.executeFireballSpread();
                break;
            case 'fireball_wave':
                this.executeFireballWave();
                break;
            case 'charge':
                this.executeCharge();
                break;
            case 'jump_slam':
                this.executeJumpSlam();
                break;
            case 'rest':
                this.executeRest();
                break;
        }
    }

    executeTelegraph() {
        // Visual warning before attack - lasts 45 frames (0.75 seconds)
        this.isTelegraphing = true;
        if (this.patternTimer >= 45) {
            this.isTelegraphing = false;
            this.patternStep++;
            this.patternTimer = 0;
        }
    }

    executeFireballSingle() {
        // Single aimed fireball
        if (this.patternTimer === 1) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 5;

            fireballs.push({
                x: this.x + this.width / 2,
                y: this.y + 30,
                velX: (dx / dist) * speed,
                velY: (dy / dist) * speed,
                size: 18,
                damage: 8, // Reduced damage
                life: 180
            });
            screenShake = 3;
        }

        if (this.patternTimer >= 30) {
            this.patternStep++;
            this.patternTimer = 0;
        }
    }

    executeFireballSpread() {
        // 3 fireballs in a spread pattern
        if (this.patternTimer === 1) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const baseAngle = Math.atan2(dy, dx);
            const speed = 4.5;

            for (let i = -1; i <= 1; i++) {
                const angle = baseAngle + i * 0.3; // 0.3 radian spread
                fireballs.push({
                    x: this.x + this.width / 2,
                    y: this.y + 30,
                    velX: Math.cos(angle) * speed,
                    velY: Math.sin(angle) * speed,
                    size: 15,
                    damage: 6, // Reduced damage
                    life: 150
                });
            }
            screenShake = 4;
        }

        if (this.patternTimer >= 40) {
            this.patternStep++;
            this.patternTimer = 0;
        }
    }

    executeFireballWave() {
        // Wave of 5 fireballs fired in sequence
        if (this.patternTimer % 12 === 1 && this.patternTimer < 60) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = 4;

            fireballs.push({
                x: this.x + this.width / 2,
                y: this.y + 30,
                velX: (dx / dist) * speed,
                velY: (dy / dist) * speed,
                size: 14,
                damage: 5, // Lower damage per fireball
                life: 180
            });
            screenShake = 2;
        }

        if (this.patternTimer >= 70) {
            this.patternStep++;
            this.patternTimer = 0;
        }
    }

    executeCharge() {
        // Charge attack - dash towards player
        if (this.patternTimer === 1) {
            this.facing = player.x > this.x ? 1 : -1;
            this.velX = this.facing * 8; // Fast charge
            this.isAttacking = true;
            this.attackFrame = 0;
        }

        // Maintain charge speed
        if (this.patternTimer < 30) {
            this.velX = this.facing * 8;

            // Damage on contact
            if (Math.abs(player.x - this.x) < 80 && Math.abs(player.y - this.y) < 80) {
                if (this.patternTimer > 5 && !this.hitPlayer) {
                    player.health -= this.damage;
                    screenShake = 8;
                    this.hitPlayer = true;
                }
            }
        } else {
            this.velX *= 0.8; // Slow down
            this.isAttacking = false;
        }

        if (this.patternTimer >= 50) {
            this.patternStep++;
            this.patternTimer = 0;
            this.hitPlayer = false;
        }
    }

    executeJumpSlam() {
        // Jump up and slam down
        if (this.patternTimer === 1) {
            this.velY = -18; // Big jump
            this.facing = player.x > this.x ? 1 : -1;
            this.onGround = false;
        }

        // Move towards player while in air
        if (!this.onGround && this.patternTimer < 40) {
            const dx = player.x - this.x;
            this.velX = Math.sign(dx) * 3;
        }

        // Slam damage when landing
        if (this.onGround && this.patternTimer > 20 && !this.slamDone) {
            screenShake = 12;
            this.slamDone = true;

            // Damage in area around landing
            const slamRange = 120;
            if (Math.abs(player.x - this.x) < slamRange && Math.abs(player.y - this.y) < 100) {
                player.health -= this.damage + 5;
            }

            // Ground slam particles
            for (let i = 0; i < 8; i++) {
                particles.push({
                    x: this.x + this.width / 2 + (Math.random() - 0.5) * 100,
                    y: this.y + this.height,
                    velX: (Math.random() - 0.5) * 8,
                    velY: -Math.random() * 6,
                    size: 5 + Math.random() * 5,
                    color: '#8B4513',
                    life: 30
                });
            }
        }

        if (this.patternTimer >= 60) {
            this.patternStep++;
            this.patternTimer = 0;
            this.slamDone = false;
        }
    }

    executeRest() {
        // Recovery period - player's chance to attack
        this.velX *= 0.9;

        if (this.patternTimer >= 45) { // 0.75 seconds of rest
            this.patternStep++;
            this.patternTimer = 0;
        }
    }

    updateHelicopterRescue() {
        this.rescueTimer++;

        switch (this.rescuePhase) {
            case 1: // Helicopter approaching
                // Fly helicopter towards boss position
                const targetX = this.x;
                this.helicopterX += 6;

                if (this.helicopterX >= targetX) {
                    this.helicopterX = targetX;
                    this.rescuePhase = 2;
                    this.rescueTimer = 0;
                }

                // Keep boss falling but slow down
                this.y = Math.min(this.y + 1, 700);
                break;

            case 2: // Rope lowering
                // Lower rope towards boss
                const targetRopeLength = this.y - this.helicopterY + 50;
                this.ropeLength += 8;

                if (this.ropeLength >= targetRopeLength) {
                    this.ropeLength = targetRopeLength;
                    this.rescuePhase = 3;
                    this.rescueTimer = 0;
                }
                break;

            case 3: // Lifting boss
                // Pull boss up
                this.ropeLength -= 4;
                this.y = this.helicopterY + this.ropeLength - 50;

                if (this.ropeLength <= 80) {
                    this.ropeLength = 80;
                    this.rescuePhase = 4;
                    this.rescueTimer = 0;
                }
                break;

            case 4: // Flying to safe location
                // Fly helicopter to saved position
                const dx = this.savedX - this.helicopterX;
                const dy = 150 - this.helicopterY;

                this.helicopterX += Math.sign(dx) * 5;
                this.helicopterY += Math.sign(dy) * 2;
                this.x = this.helicopterX;
                this.y = this.helicopterY + this.ropeLength - 50;

                if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                    this.helicopterX = this.savedX;
                    this.helicopterY = 150;
                    this.rescuePhase = 5;
                    this.rescueTimer = 0;
                }
                break;

            case 5: // Dropping boss
                // Lower boss to platform
                this.ropeLength += 5;
                this.y = this.helicopterY + this.ropeLength - 50;

                // Check if boss reached ground
                if (this.y >= this.savedY) {
                    this.y = this.savedY;
                    this.x = this.savedX;
                    this.velY = 0;
                    this.velX = 0;

                    // Finish rescue after a short delay
                    if (this.rescueTimer > 30) {
                        this.isBeingRescued = false;
                        this.rescuePhase = 0;
                        this.rescueTimer = 0;
                        this.ropeLength = 0;

                        // Reset pattern system
                        this.isExecutingPattern = false;
                        this.patternCooldown = 60;
                        this.currentAttackType = null;

                        // Screen shake when dropped
                        screenShake = 8;
                    }
                }
                break;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.isHit = true;
        this.hitTimer = 8;
        screenShake = 10;

        // Knockback resistant
        this.velY = -3;
        this.velX = -this.facing * 2;

        // 10% chance to drop a steak when hit
        if (Math.random() < 0.10) {
            steaks.push({
                x: this.x + this.width / 2 + (Math.random() - 0.5) * 60,
                y: this.y + 30,
                velY: -8 - Math.random() * 4,
                width: 40,
                height: 25,
                grounded: false,
                life: 600
            });
        }

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

// Spawn wave of enemies - distributed across platforms
function spawnWave(wave) {
    enemies = [];
    boss = null;
    isBossFight = false;
    fireballs = []; // Clear fireballs
    steaks = []; // Clear steaks

    if (wave === 6) {
        // Boss fight! Boss spawns at the final arena
        isBossFight = true;
        boss = new Boss(2800, 350);
        return;
    }

    // Calculate how many enemies for this wave
    const baseEnemies = 3 + wave;
    const numEnemies = Math.min(baseEnemies, enemySpawnPoints.length);

    // Shuffle spawn points to randomize which platforms get enemies
    const shuffledSpawns = [...enemySpawnPoints].sort(() => Math.random() - 0.5);

    // Spawn enemies on platforms throughout the level
    for (let i = 0; i < numEnemies; i++) {
        const spawn = shuffledSpawns[i];

        // Determine enemy type based on wave
        const types = ['urara', 'urara', 'urara_fast', 'urara_strong'];
        const typeIndex = Math.floor(Math.random() * Math.min(wave + 1, types.length));
        const type = types[typeIndex];

        // Create enemy with patrol bounds matching their platform
        const enemy = new Enemy(
            spawn.x,
            spawn.y,
            type,
            spawn.platX + 5, // Left patrol bound
            spawn.platX + spawn.platWidth - 5 // Right patrol bound
        );

        enemies.push(enemy);
    }

    // In later waves, add extra enemies on random platforms
    if (wave >= 3) {
        const extraCount = wave - 2;
        for (let i = 0; i < extraCount && i < shuffledSpawns.length - numEnemies; i++) {
            const spawn = shuffledSpawns[numEnemies + i];
            const type = Math.random() < 0.5 ? 'urara_fast' : 'urara_strong';
            const enemy = new Enemy(
                spawn.x,
                spawn.y,
                type,
                spawn.platX + 5,
                spawn.platX + spawn.platWidth - 5
            );
            enemies.push(enemy);
        }
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

// Mobile touch controls
function setupMobileControls() {
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump = document.getElementById('btn-jump');
    const btnSmash = document.getElementById('btn-smash');

    if (!btnLeft || !btnRight || !btnJump || !btnSmash) return;

    // Helper to add touch events
    function addTouchEvents(button, keyName, isAction = false) {
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            keys[keyName] = true;
            if (isAction && gameState === 'start') {
                startGame();
            }
        }, { passive: false });

        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            keys[keyName] = false;
        }, { passive: false });

        button.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            keys[keyName] = false;
        }, { passive: false });

        // Also handle mouse for testing on desktop
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            keys[keyName] = true;
            if (isAction && gameState === 'start') {
                startGame();
            }
        });

        button.addEventListener('mouseup', (e) => {
            e.preventDefault();
            keys[keyName] = false;
        });

        button.addEventListener('mouseleave', (e) => {
            keys[keyName] = false;
        });
    }

    addTouchEvents(btnLeft, 'left');
    addTouchEvents(btnRight, 'right');
    addTouchEvents(btnJump, 'jump', true);
    addTouchEvents(btnSmash, 'smash');

    // Prevent scrolling when touching controls
    document.getElementById('mobile-controls').addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
}

// Initialize mobile controls when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMobileControls);
} else {
    setupMobileControls();
}

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
    startMusic('normal'); // Start background music
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
                    boss.takeDamage(15); // Reduced damage to boss

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

    // Update steaks (ribeye health pickups)
    steaks = steaks.filter(steak => {
        // Apply gravity
        if (!steak.grounded) {
            steak.velY += GRAVITY * 0.5;
            steak.y += steak.velY;

            // Ground collision
            for (const plat of platforms) {
                if (steak.velY >= 0 &&
                    steak.x + steak.width > plat.x &&
                    steak.x < plat.x + plat.width &&
                    steak.y + steak.height >= plat.y &&
                    steak.y + steak.height <= plat.y + plat.height + steak.velY + 5) {
                    steak.y = plat.y - steak.height;
                    steak.velY = 0;
                    steak.grounded = true;
                }
            }
        }

        steak.life--;

        // Check player collection
        if (player.x + player.width > steak.x &&
            player.x < steak.x + steak.width &&
            player.y + player.height > steak.y &&
            player.y < steak.y + steak.height) {
            // Heal player
            const healAmount = 25;
            player.health = Math.min(player.health + healAmount, player.maxHealth);

            // Healing particles
            for (let i = 0; i < 10; i++) {
                particles.push({
                    x: steak.x + steak.width / 2,
                    y: steak.y + steak.height / 2,
                    velX: (Math.random() - 0.5) * 8,
                    velY: -Math.random() * 6 - 2,
                    size: 4 + Math.random() * 4,
                    color: `hsl(${Math.random() * 30 + 10}, 80%, 50%)`,
                    life: 30
                });
            }
            return false; // Remove collected steak
        }

        // Remove if expired or fell off screen
        return steak.life > 0 && steak.y < 700;
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
        // Switch to boss music
        switchToBossMusic();
        // Boss fight completion
        if (boss && boss.isDead && boss.deathTimer > 100) {
            gameState = 'win';
            stopMusic();
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
        stopMusic();
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

    // Draw ribeye steaks
    for (const steak of steaks) {
        const sx = steak.x;
        const sy = steak.y;

        // Flashing effect when about to expire
        if (steak.life < 120 && Math.floor(steak.life / 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Glow effect
        ctx.fillStyle = 'rgba(255, 150, 100, 0.3)';
        ctx.beginPath();
        ctx.ellipse(sx + steak.width / 2, sy + steak.height / 2, steak.width / 2 + 8, steak.height / 2 + 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ribeye steak shape
        const steakGrad = ctx.createRadialGradient(sx + steak.width / 2, sy + steak.height / 2, 5, sx + steak.width / 2, sy + steak.height / 2, 25);
        steakGrad.addColorStop(0, '#DC143C'); // Crimson center (medium-rare)
        steakGrad.addColorStop(0.4, '#8B0000'); // Dark red
        steakGrad.addColorStop(0.7, '#A0522D'); // Sienna (seared edge)
        steakGrad.addColorStop(1, '#654321'); // Dark brown crust

        ctx.fillStyle = steakGrad;
        ctx.beginPath();
        // Irregular steak shape
        ctx.moveTo(sx + 5, sy + steak.height / 2);
        ctx.quadraticCurveTo(sx, sy + 5, sx + steak.width / 2, sy);
        ctx.quadraticCurveTo(sx + steak.width, sy + 5, sx + steak.width - 3, sy + steak.height / 2);
        ctx.quadraticCurveTo(sx + steak.width, sy + steak.height - 3, sx + steak.width / 2, sy + steak.height);
        ctx.quadraticCurveTo(sx, sy + steak.height - 5, sx + 5, sy + steak.height / 2);
        ctx.fill();

        // Marbling (fat streaks)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy + 8);
        ctx.quadraticCurveTo(sx + steak.width / 2, sy + 12, sx + steak.width - 10, sy + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + 12, sy + steak.height - 8);
        ctx.quadraticCurveTo(sx + steak.width / 2, sy + steak.height - 10, sx + steak.width - 8, sy + steak.height - 6);
        ctx.stroke();

        // Bone (for ribeye)
        ctx.fillStyle = '#F5F5DC'; // Beige bone
        ctx.beginPath();
        ctx.ellipse(sx + steak.width - 8, sy + steak.height / 2, 4, 10, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D2B48C';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Sparkle effect
        ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
        const sparkleX = sx + 10 + Math.sin(Date.now() / 150) * 3;
        const sparkleY = sy + 6 + Math.cos(Date.now() / 150) * 2;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
        ctx.fill();

        // +25 HP text floating above
        ctx.fillStyle = '#44FF44';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('+25 HP', sx + steak.width / 2, sy - 5);

        ctx.globalAlpha = 1;
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

// Draw helicopter for boss rescue
function drawHelicopter(boss) {
    const hx = boss.helicopterX;
    const hy = boss.helicopterY;

    ctx.save();

    // Rope from helicopter to boss
    if (boss.ropeLength > 0) {
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(hx + 50, hy + 40);
        ctx.lineTo(boss.x + boss.width / 2, boss.y);
        ctx.stroke();

        // Rope segments
        ctx.strokeStyle = '#A0522D';
        ctx.lineWidth = 2;
        const segments = Math.floor(boss.ropeLength / 20);
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const rx = hx + 50 + (boss.x + boss.width / 2 - hx - 50) * t;
            const ry = hy + 40 + (boss.y - hy - 40) * t;
            ctx.beginPath();
            ctx.moveTo(rx - 5, ry);
            ctx.lineTo(rx + 5, ry);
            ctx.stroke();
        }

        // Hook at the end
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(boss.x + boss.width / 2, boss.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Helicopter body
    const heliGrad = ctx.createLinearGradient(hx, hy, hx, hy + 50);
    heliGrad.addColorStop(0, '#2F4F4F');
    heliGrad.addColorStop(0.5, '#1C3A3A');
    heliGrad.addColorStop(1, '#0F2525');
    ctx.fillStyle = heliGrad;

    // Main body
    ctx.beginPath();
    ctx.ellipse(hx + 50, hy + 25, 50, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#4682B4';
    ctx.beginPath();
    ctx.ellipse(hx + 75, hy + 20, 20, 18, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(hx + 80, hy + 15, 10, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.fillStyle = '#2F4F4F';
    ctx.beginPath();
    ctx.moveTo(hx + 10, hy + 20);
    ctx.lineTo(hx - 40, hy + 15);
    ctx.lineTo(hx - 40, hy + 25);
    ctx.lineTo(hx + 10, hy + 30);
    ctx.closePath();
    ctx.fill();

    // Tail rotor
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.ellipse(hx - 40, hy + 20, 5, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main rotor hub
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(hx + 50, hy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Spinning main rotor blades
    const rotorAngle = Date.now() / 30;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        const angle = rotorAngle + (i * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(hx + 50, hy);
        ctx.lineTo(hx + 50 + Math.cos(angle) * 70, hy + Math.sin(angle) * 8);
        ctx.stroke();
    }

    // Rotor blur effect
    ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.beginPath();
    ctx.ellipse(hx + 50, hy, 70, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Skids (landing gear)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hx + 25, hy + 40);
    ctx.lineTo(hx + 25, hy + 50);
    ctx.lineTo(hx + 75, hy + 50);
    ctx.lineTo(hx + 75, hy + 40);
    ctx.stroke();

    // "RESCUE" text on side
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RESCUE', hx + 45, hy + 30);

    // Red cross symbol
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(hx + 20, hy + 18, 12, 4);
    ctx.fillRect(hx + 24, hy + 14, 4, 12);

    ctx.restore();
}

// Draw boss - Marioman the Furry
function drawBoss(boss) {
    // Draw helicopter if rescuing (draw even if boss is off screen)
    if (boss.isBeingRescued) {
        drawHelicopter(boss);
    }

    if (boss.x + boss.width < camera.x - 100 || boss.x > camera.x + SCREEN_WIDTH + 100) {
        // Still draw helicopter rope to boss if being rescued
        if (!boss.isBeingRescued) return;
    }

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

    // Telegraph warning glow (pulsing red when about to attack)
    if (boss.isTelegraphing) {
        const pulse = 0.4 + Math.sin(Date.now() / 80) * 0.3;
        ctx.fillStyle = `rgba(255, 50, 50, ${pulse})`;
        ctx.beginPath();
        ctx.ellipse(50, 70, 65, 85, 0, 0, Math.PI * 2);
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

        // Telegraph warning indicator
        if (boss.isTelegraphing) {
            const warningY = by - 60 + Math.sin(Date.now() / 100) * 3;
            const pulse = 0.7 + Math.sin(Date.now() / 100) * 0.3;

            // Warning background
            ctx.fillStyle = `rgba(255, 0, 0, ${pulse * 0.8})`;
            ctx.beginPath();
            ctx.roundRect(nameX - 45, warningY - 12, 90, 24, 5);
            ctx.fill();

            // Warning border
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Warning text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('⚠️ ATTACK! ⚠️', nameX, warningY + 5);
        }

        // Show current attack type for learning
        if (boss.currentAttackType && boss.currentAttackType !== 'rest' && boss.currentAttackType !== 'telegraph') {
            const attackY = by + boss.height + 20;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(nameX - 50, attackY - 10, 100, 20, 4);
            ctx.fill();

            ctx.fillStyle = '#FFAA00';
            ctx.font = 'bold 11px Arial';
            const attackName = boss.currentAttackType.replace('_', ' ').toUpperCase();
            ctx.fillText(attackName, nameX, attackY + 4);
        }
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

    // Health bar (large, at top when in boss fight) with "Mario man" under it
    if (!boss.isDead && boss.introTimer <= 0) {
        const healthPercent = boss.health / boss.maxHealth;
        const barWidth = 350;
        const barX = camera.x + SCREEN_WIDTH / 2 - barWidth / 2;
        const barY = 45;

        // Background panel
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(barX - 10, barY - 8, barWidth + 20, 60, 10);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(barX - 10, barY - 8, barWidth + 20, 60, 10);
        ctx.stroke();

        // Health bar background
        const healthColor = boss.phase === 3 ? '#FF0000' : boss.phase === 2 ? '#FF6600' : '#FFCC00';
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, 25);

        // Health bar fill with gradient
        const hpGrad = ctx.createLinearGradient(barX, barY, barX, barY + 25);
        if (boss.phase === 3) {
            hpGrad.addColorStop(0, '#FF4444');
            hpGrad.addColorStop(1, '#AA0000');
        } else if (boss.phase === 2) {
            hpGrad.addColorStop(0, '#FF9944');
            hpGrad.addColorStop(1, '#CC4400');
        } else {
            hpGrad.addColorStop(0, '#FFDD44');
            hpGrad.addColorStop(1, '#CC9900');
        }
        ctx.fillStyle = hpGrad;
        ctx.fillRect(barX, barY, barWidth * healthPercent, 25);

        // Health bar border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, 25);

        // Health text on bar
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.ceil(boss.health)} / ${boss.maxHealth}`, barX + barWidth / 2, barY + 18);

        // "Mario man" name UNDER the health bar with fire emojis
        ctx.shadowColor = '#FF4400';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#FF4444';
        ctx.font = 'bold 16px Impact';
        ctx.fillText('🔥 MARIO MAN 🔥', barX + barWidth / 2, barY + 45);
        ctx.shadowBlur = 0;
    }
}

function drawHUD() {
    // Health bar with player name
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(15, 15, 210, 55);

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

    // Player name "ToFu" under the HP bar
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Impact';
    ctx.fillText('ToFu', 120, 58);

    // Wave and enemies remaining
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(SCREEN_WIDTH - 150, 15, 135, 75);

    ctx.fillStyle = isBossFight ? '#FF4444' : '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    if (isBossFight) {
        ctx.fillText('BOSS FIGHT!', SCREEN_WIDTH - 25, 35);
    } else {
        ctx.fillText(`Wave: ${currentWave}/5`, SCREEN_WIDTH - 25, 35);
    }

    // Show enemies remaining (not in boss fight)
    if (!isBossFight) {
        const remainingEnemies = enemies.filter(e => !e.isDead).length;
        ctx.fillStyle = remainingEnemies > 0 ? '#FF8844' : '#44FF44';
        ctx.fillText(`Enemies: ${remainingEnemies}`, SCREEN_WIDTH - 25, 55);
    }

    ctx.fillStyle = '#fff';
    ctx.fillText(`Kills: ${totalKills}`, SCREEN_WIDTH - 25, 75);

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

    // Enemy direction indicators (arrows pointing to off-screen enemies)
    if (!isBossFight) {
        const aliveEnemies = enemies.filter(e => !e.isDead);
        for (const enemy of aliveEnemies) {
            const screenX = enemy.x - camera.x;
            const screenY = enemy.y - camera.y;

            // Check if enemy is off screen
            if (screenX < -50 || screenX > SCREEN_WIDTH + 50 ||
                screenY < -50 || screenY > SCREEN_HEIGHT + 50) {

                // Calculate arrow position at screen edge
                const playerScreenX = SCREEN_WIDTH / 2;
                const playerScreenY = player.y - camera.y;

                const dx = screenX - playerScreenX;
                const dy = screenY - playerScreenY;
                const angle = Math.atan2(dy, dx);

                // Position arrow at edge of screen
                let arrowX, arrowY;
                const margin = 40;

                if (Math.abs(dx) > Math.abs(dy)) {
                    // Enemy is more to the side
                    arrowX = dx > 0 ? SCREEN_WIDTH - margin : margin;
                    arrowY = Math.max(margin, Math.min(SCREEN_HEIGHT - margin, playerScreenY + dy * 0.3));
                } else {
                    // Enemy is more above/below
                    arrowY = dy > 0 ? SCREEN_HEIGHT - margin : margin;
                    arrowX = Math.max(margin, Math.min(SCREEN_WIDTH - margin, playerScreenX + dx * 0.3));
                }

                // Draw arrow
                ctx.save();
                ctx.translate(arrowX, arrowY);
                ctx.rotate(angle);

                // Pulsing effect
                const pulse = 0.8 + Math.sin(Date.now() / 200) * 0.2;

                // Arrow background
                ctx.fillStyle = 'rgba(255, 100, 50, 0.8)';
                ctx.beginPath();
                ctx.moveTo(15 * pulse, 0);
                ctx.lineTo(-8 * pulse, -8 * pulse);
                ctx.lineTo(-8 * pulse, 8 * pulse);
                ctx.closePath();
                ctx.fill();

                // Arrow border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.restore();
            }
        }
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
    ctx.fillText('Navigate the platforms and smash the horse-girls!', SCREEN_WIDTH/2, 300);
    ctx.fillStyle = '#FF8844';
    ctx.font = '14px Arial';
    ctx.fillText('Arrows point to off-screen enemies', SCREEN_WIDTH/2, 325);

    ctx.fillStyle = '#fff';
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
