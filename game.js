/* LAST DAY - 2.5D Engine & Logic */

// Canvas & Web Audio Setup
const canvas = document.getElementById('viewport');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let audioCtx = null;

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
  // Clear center spawn area
  for (let y = 10; y <= 14; y++) {
    for (let x = 10; x <= 14; x++) {
      map[y][x] = 0;
    }
  }
}

// Game Entities & State
const player = {
  x: 12, y: 12,
  vx: 0, vy: 0,
  hp: 100, maxHp: 100,
  stamina: 100, maxStamina: 100,
  mana: 50, maxMana: 50,
  souls: 0,
  facing: 'down',
  isRolling: false,
  rollTimer: 0,
  attackTimer: 0
};

let enemies = [];
let particles = [];
let floor = 1;

function spawnEnemies() {
  enemies = [];
  for (let i = 0; i < 5 + floor * 2; i++) {
    let ex = Math.floor(Math.random() * (MAP_SIZE - 4)) + 2;
    let ey = Math.floor(Math.random() * (MAP_SIZE - 4)) + 2;
    if (map[ey][ex] === 0) {
      enemies.push({
        x: ex, y: ey,
        hp: 30 + floor * 10,
        type: Math.random() > 0.5 ? 'skeleton' : 'shadow',
        vx: 0, vy: 0
      });
    }
  }
}

// Touch & Joystick Input Handling
const input = { left: 0, top: 0, attack: false, magic: false, roll: false };

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

  // Check hit logic
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
}

function triggerMagic() {
  if (player.mana < 20) return;
  player.mana -= 20;
  playSound('magic');
  // Radius area spell blast
  enemies.forEach(e => {
    const dist = Math.hypot(e.x - player.x, e.y - player.y);
    if (dist < 3.5) {
      e.hp -= 40;
    }
  });
}

function triggerRoll() {
  if (player.stamina < 25 || player.isRolling) return;
  player.stamina -= 25;
  player.isRolling = true;
  player.rollTimer = 12;
}

// Game Loop & Rendering Pipeline
function update() {
  // Regenerate stats
  player.stamina = Math.min(player.maxStamina, player.stamina + 0.4);
  player.mana = Math.min(player.maxMana, player.mana + 0.1);

  if (player.rollTimer > 0) player.rollTimer--;
  else player.isRolling = false;

  if (player.attackTimer > 0) player.attackTimer--;

  // Player movement
  const speed = player.isRolling ? 0.12 : 0.06;
  const nx = player.x + input.left * speed;
  const ny = player.y + input.top * speed;

  if (map[Math.floor(player.y)][Math.floor(nx)] === 0) player.x = nx;
  if (map[Math.floor(ny)][Math.floor(player.x)] === 0) player.y = ny;

  // Cleanup dead enemies
  enemies = enemies.filter(e => e.hp > 0);

  // Simple enemy AI tracking
  enemies.forEach(e => {
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (dist < 6 && dist > 0.5) {
      e.x += ((player.x - e.x) / dist) * 0.02;
      e.y += ((player.y - e.y) / dist) * 0.02;
    } else if (dist <= 0.5 && !player.isRolling) {
      player.hp = Math.max(0, player.hp - 0.2);
    }
  });

  // UI Updates
  document.getElementById('hp-bar').style.width = (player.hp / player.maxHp * 100) + '%';
  document.getElementById('st-bar').style.width = (player.stamina / player.maxStamina * 100) + '%';
  document.getElementById('mp-bar').style.width = (player.mana / player.maxMana * 100) + '%';
  document.getElementById('hp-txt').innerText = `${Math.ceil(player.hp)}/${player.maxHp}`;
  document.getElementById('st-txt').innerText = `${Math.ceil(player.stamina)}/${player.maxStamina}`;
  document.getElementById('mp-txt').innerText = `${Math.ceil(player.mana)}/${player.maxMana}`;
  document.getElementById('souls-count').innerText = player.souls;
}

function render() {
  ctx.fillStyle = '#070509';
  ctx.fillRect(0, 0, 128, 128);

  const camX = player.x - 4;
  const camY = player.y - 4;

  // 2.5D Isometric/Height Projection Map
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const mapX = Math.floor(camX + x);
      const mapY = Math.floor(camY + y);

      if (mapX >= 0 && mapX < MAP_SIZE && mapY >= 0 && mapY < MAP_SIZE) {
        const px = (x - y) * 8 + 64;
        const py = (x + y) * 4 + 16;

        if (map[mapY][mapX] === 1) {
          // Render 2.5D Wall Block
          ctx.fillStyle = '#221a2e';
          ctx.fillRect(px - 6, py - 10, 12, 10);
          ctx.fillStyle = '#3a2e4c';
          ctx.fillRect(px - 6, py - 14, 12, 4);
        } else {
          // Render Floor Tile
          ctx.fillStyle = (mapX + mapY) % 2 === 0 ? '#120e18' : '#181220';
          ctx.fillRect(px - 6, py, 12, 6);
        }
      }
    }
  }

  // Draw Enemies
  enemies.forEach(e => {
    const relX = e.x - camX;
    const relY = e.y - camY;
    const px = (relX - relY) * 8 + 64;
    const py = (relX + relY) * 4 + 16;

    ctx.fillStyle = e.type === 'skeleton' ? '#e2d8ee' : '#a8233c';
    ctx.fillRect(px - 3, py - 6, 6, 8);
  });

  // Draw Player
  ctx.fillStyle = player.isRolling ? '#2ecc71' : '#e94560';
  ctx.fillRect(61, 32, 6, 10);

  // Attack Slash Effect
  if (player.attackTimer > 0) {
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(64, 37, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Start Game Event
document.getElementById('btn-start').addEventListener('click', () => {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  document.getElementById('start-overlay').style.display = 'none';
  generateDungeon();
  spawnEnemies();
  gameLoop();
});
