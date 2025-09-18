// Ensure canvas exists
let canvas = document.getElementById('lightning-canvas');
if (!canvas) {
  console.warn('Canvas element not found, creating one');
  canvas = document.createElement('canvas');
  canvas.id = 'lightning-canvas';
  canvas.width = 800;
  canvas.height = 600;
  document.body.appendChild(canvas);
}
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const W = canvas.width;
const H = canvas.height;

// Lightning parameters
const DECAY = 0.82;
const BOLT_CHANCE = 0.05;
const BOLT_SPEED = 25;
const MAX_ACTIVE_BOLTS = 10;
const SEG_MIN_LEN = 10;
const SEG_MAX_LEN = 30;
const MAX_KINK = 2;
const KINK_CHANCE = 0.1;

// Frame buffer and bolt/flash lists
let buffer = new Float32Array(W * H);
let activeBolts = [];
let activeFlashes = [];
let hasInteracted = false; // Track user interaction for audio

// Thunder sound (optional)
let thunderSound = null;
try {
  thunderSound = new Audio('assets/audio/thunder.wav');
  thunderSound.preload = 'auto';
} catch (e) {
  console.log('Thunder sound not loaded:', e);
}

// Utility
function rand(n) {
  return Math.floor(Math.random() * n);
}

// Bolt class
class Bolt {
  constructor({ x = rand(W), y = 0, segLen = SEG_MIN_LEN + rand(SEG_MAX_LEN - SEG_MIN_LEN), dx = [-1, 0, 1][rand(3)] } = {}) {
    this.x = x;
    this.y = y;
    this.segLen = segLen;
    this.dx = dx;
  }
  step() {
    if (Math.random() < KINK_CHANCE) this.x += rand(2 * MAX_KINK + 1) - MAX_KINK;
    this.x = Math.max(0, Math.min(W - 1, this.x + this.dx));
    if (--this.segLen <= 0) {
      this.segLen = SEG_MIN_LEN + rand(SEG_MAX_LEN - SEG_MIN_LEN);
      this.dx = [-1, 0, 1][rand(3)];
    }
    this.y++;
  }
}

// Flash class for button clicks
class Flash {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = 100;
    this.active = true;
  }
  update() {
    this.radius += 5;
    if (this.radius > this.maxRadius) {
      this.active = false;
      return;
    }
    for (let dx = -this.radius; dx <= this.radius; dx++) {
      for (let dy = -this.radius; dy <= this.radius; dy++) {
        if (dx * dx + dy * dy <= this.radius * this.radius) {
          const px = Math.floor(this.x + dx);
          const py = Math.floor(this.y + dy);
          if (px >= 0 && px < W && py >= 0 && py < H) {
            buffer[py * W + px] = 1;
          }
        }
      }
    }
  }
}

// Animation loop
let lastTime = 0;
const FRAME_INT = 1000 / 30;

function fade() {
  for (let i = 0; i < buffer.length; i++) buffer[i] *= DECAY;
}

function spawnBolts() {
  if (activeBolts.length < MAX_ACTIVE_BOLTS && Math.random() < BOLT_CHANCE) {
    activeBolts.push(new Bolt());
    if (hasInteracted && thunderSound && thunderSound.paused) {
      thunderSound.playbackRate = 0.8 + Math.random() * 0.4;
      thunderSound.currentTime = 0;
      thunderSound.play().catch(e => console.log('Audio play failed:', e));
    }
  }
}

function updateBolts() {
  for (let i = activeBolts.length - 1; i >= 0; i--) {
    const b = activeBolts[i];
    for (let s = 0; s < BOLT_SPEED; s++) {
      if (b.y >= H) break;
      buffer[b.y * W + b.x] = 1;
      b.step();
    }
    if (b.y >= H) activeBolts.splice(i, 1);
  }
}

function updateFlashes() {
  activeFlashes = activeFlashes.filter(f => f.active);
  activeFlashes.forEach(f => f.update());
}

function render() {
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < buffer.length; i++) {
    const v = Math.min(255, Math.floor(buffer[i] * 255));
    img.data[4 * i] = v;
    img.data[4 * i + 1] = v;
    img.data[4 * i + 2] = v;
    img.data[4 * i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function loop(time) {
  if (time - lastTime < FRAME_INT) {
    requestAnimationFrame(loop);
    return;
  }
  lastTime = time;
  fade();
  spawnBolts();
  updateBolts();
  updateFlashes();
  render();
  requestAnimationFrame(loop);
}

// Button click handler
const ctaButton = document.getElementById('cta-button');
if (ctaButton) {
  ctaButton.addEventListener('click', (e) => {
    hasInteracted = true; // Enable audio after interaction
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    activeFlashes.push(new Flash(x, y));
    if (thunderSound && thunderSound.paused) {
      thunderSound.playbackRate = 0.8 + Math.random() * 0.4;
      thunderSound.currentTime = 0;
      thunderSound.play().catch(e => console.log('Audio play failed:', e));
    }
  });
} else {
  console.warn('CTA button not found');
}

// Start animation
requestAnimationFrame(loop);

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  buffer = new Float32Array(canvas.width * canvas.height);
});