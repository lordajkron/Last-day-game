/* LAST DAY - 2.5D Engine & Logic with Full Boss Fight System */

// Canvas & Web Audio Setup
const canvas = document.getElementById('viewport');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let audioCtx = null;

// Audio Synthesizer Engine
function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'slash') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  } else if (type === 'magic') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'hit') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.1);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'soul') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'roar') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  } else if (type === 'boss_blast') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

// Map Data & Dungeon Generation
const MAP_SIZE = 24;
let map = [];

function generateDungeon() {
  map = Array(MAP_SIZE).fill(0).map(() => Array(MAP_SIZE).fill(1));
  for (let y = 2; y < MAP_SIZE - 2; y++) {
    for (let x = 2; x < MAP_SIZE - 2; x++) {
      if (Math.random() > 0.3) map[y][x] = 0;
    }
  }
  // Clear center arena for boss fighting floor
  for (let y = 8; y <= 16; y++) {
    for (let x = 8; x <= 16; x++) {
      map[y][x] = 0;
    }
  }
}

// Game Entities & State
const player = {
  x: 12, y: 15,
  vx: 0, vy: 0,
  hp: 100, maxHp: 100,
  stamina: 100, maxStamina: 100,
  mana: 50, maxMana: 50,
  souls: 0,
  isRolling: false,
  rollTimer: 0,
  attackTimer: 0
};

// Boss Object
const boss = {
  active: true,
  x: 12, y: 9,
  hp: 400, maxHp: 400,
  phase: 1, // Phase 1: Melee/Summon, Phase 2: Frenzy/Shockwaves
  attackTimer: 0,
  castTimer: 0,
  roarTimer: 0
};

let enemies = [];
let projectiles = [];
let particles = [];
let floor = 1;
let screenShake = 0;

function spawnEnemies() {
  enemies = [];
  for (let i = 0; i < 3; i++) {
    let ex = Math.floor(Math.random() * 6) + 9;
    let ey = Math.floor(Math.random() * 6) + 9;
    if (map[ey][ex] === 0) {
      enemies.push({
        x: ex, y: ey,
        hp: 30,
        type: Math.random() > 0.5 ? 'skeleton' : 'shadow'
      });
    }
  }
}

// Touch & Joystick Controls
const input = { left: 0, top: 0 };
const joystick = document.getElementById('joystick');
const knob = document.getElementById('knob');
let joyActive = false;
let joyStart = { x: 0, y: 0 };

joystick.addEventListener('touchstart', (e) => {
  joyActive = true;
  const t = e.touches[0];
  joyStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!joyActive) return;
  const t = e.touches[0];
  const dx = t.clientX - joyStart.x;
  const dy = t.clientY - joyStart.y;
  const dist = Math.min(Math.hypot(dx, dy), 35);
  const angle = Math.atan2(dy, dx);

  const kx = Math.cos(angle) * dist;
  const ky = Math.sin(angle) * dist;

  knob.style.transform = `translate(${kx}px, ${ky}px)`;
  input.left = kx / 35;
  input.top = ky / 35;
}, { passive: true });

window.addEventListener('touchend', () => {
  joyActive = false;
  knob.style.transform = 'translate(0px, 0px)';
  input.left = 0;
  input.top = 0;
});

// Action Buttons
document.getElementById('btn-attack').addEventListener('pointerdown', () => triggerAttack());
document.getElementById('btn-magic').addEventListener('pointerdown', () => triggerMagic());
document.getElementById('btn-roll').addEventListener('pointerdown', () => triggerRoll());

function triggerAttack() {
  if (player.stamina < 15 || player.attackTimer > 0) return;
  player.stamina -= 15;
  player.attackTimer = 10;
  playSound('slash');

  // Hit regular enemies
  enemies.forEach(e => {
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist < 1.8) {
      e.hp -= 25;
      playSound('hit');
      if (e.hp <= 0) {
        player.souls += 10;
        playSound('soul');
      }
    }
  });

  // Hit boss
  if (boss.active) {
    const bDist = Math.hypot(boss.x - player.x, boss.y - player.y);
    if (bDist < 2.2) {
      boss.hp -= 20;
      playSound('hit');
      screenShake = 3;
    }
  }
}

function triggerMagic() {
  if (player.mana < 20) return;
  player.mana -= 20;
  playSound('magic');

  enemies.forEach(e => {
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist < 3.5) e.hp -= 35;
  });

  if (boss.active) {
    const bDist = Math.hypot(boss.x - player.x, boss.y - player.y);
    if (bDist < 4.0) {
      boss.hp -= 45;
      screenShake = 5;
    }
  }
}
