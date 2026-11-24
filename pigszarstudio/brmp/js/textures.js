import * as THREE from 'three';

const PALETTES = {
  carpet: ['#a99d52', '#8f8548', '#c0b46a'], wallpaper: ['#d4c66f', '#b9aa58', '#e2d886'],
  tile: ['#b8d9d0', '#7ca99d', '#d7e8df'], concrete: ['#777b78', '#555c5a', '#a0a6a0'],
  rust: ['#754b36', '#a65c35', '#4c3a31'], foliage: ['#234e36', '#47764a', '#83a45e'],
  ice: ['#a9d7e5', '#6ca7bd', '#e0f0f4'], void: ['#111820', '#080d12', '#293341']
};

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function makeCanvas(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return [canvas, canvas.getContext('2d', { alpha: false })];
}

function makeSurface(type = 'carpet', seed = 1, size = 256) {
  const rand = seeded(seed + type.length * 991);
  const palette = PALETTES[type] || PALETTES.concrete;
  const [albedoCanvas, a] = makeCanvas(size);
  const [normalCanvas, n] = makeCanvas(size);
  const [roughCanvas, r] = makeCanvas(size);
  const base = palette[0];
  a.fillStyle = base; a.fillRect(0, 0, size, size);
  n.fillStyle = '#8080ff'; n.fillRect(0, 0, size, size);
  r.fillStyle = type === 'tile' || type === 'ice' ? '#777777' : '#d0d0d0'; r.fillRect(0, 0, size, size);

  if (type === 'carpet') {
    for (let i = 0; i < 16000; i++) {
      const x = rand() * size, y = rand() * size, v = rand();
      a.fillStyle = v > .5 ? palette[1] : palette[2]; a.globalAlpha = .09 + rand() * .19;
      a.fillRect(x, y, 1 + rand() * 2, 1);
      n.fillStyle = `rgb(${118 + Math.floor(rand() * 20)},${118 + Math.floor(rand() * 20)},${238 + Math.floor(rand() * 15)})`;
      n.fillRect(x, y, 1, 1); r.fillStyle = '#dedede'; r.fillRect(x, y, 1, 1);
    }
  } else if (type === 'wallpaper') {
    for (let y = 0; y < size; y += 30) {
      a.globalAlpha = .16; a.fillStyle = palette[1]; a.fillRect(0, y, size, 2);
      for (let x = 0; x < size; x += 44) {
        a.globalAlpha = .13; a.fillStyle = palette[2]; a.fillRect(x + 5, y + 7, 20, 10);
        n.globalAlpha = .45; n.fillStyle = '#8585ff'; n.fillRect(x + 5, y + 7, 20, 10);
      }
    }
  } else if (type === 'tile' || type === 'ice') {
    const step = type === 'tile' ? 48 : 64;
    for (let y = 0; y < size; y += step) for (let x = 0; x < size; x += step) {
      a.globalAlpha = .18 + rand() * .12; a.fillStyle = rand() > .5 ? palette[1] : palette[2]; a.fillRect(x + 2, y + 2, step - 4, step - 4);
      a.globalAlpha = 1; a.fillStyle = type === 'tile' ? '#e1e9df' : '#d9edf3'; a.fillRect(x, y, step, 2); a.fillRect(x, y, 2, step);
      n.fillStyle = '#8585ff'; n.fillRect(x, y, step, 2); n.fillRect(x, y, 2, step);
      r.fillStyle = type === 'tile' ? '#666666' : '#a0a0a0'; r.fillRect(x + 2, y + 2, step - 4, step - 4);
    }
  } else if (type === 'rust') {
    for (let i = 0; i < 950; i++) {
      const x = rand() * size, y = rand() * size, rad = 2 + rand() * 14;
      a.globalAlpha = .18 + rand() * .42; a.fillStyle = palette[1]; a.beginPath(); a.ellipse(x, y, rad * 1.7, rad, rand(), 0, Math.PI * 2); a.fill();
      n.globalAlpha = .8; n.fillStyle = '#8d77f0'; n.beginPath(); n.arc(x, y, rad, 0, Math.PI * 2); n.fill();
      r.globalAlpha = .65; r.fillStyle = '#b0b0b0'; r.beginPath(); r.arc(x, y, rad, 0, Math.PI * 2); r.fill();
    }
  } else if (type === 'foliage') {
    for (let i = 0; i < 420; i++) {
      const x = rand() * size, y = rand() * size, w = 6 + rand() * 24, h = 4 + rand() * 12;
      a.globalAlpha = .4 + rand() * .45; a.fillStyle = palette[Math.floor(rand() * palette.length)]; a.beginPath(); a.ellipse(x, y, w, h, rand() * 3.1, 0, Math.PI * 2); a.fill();
      n.globalAlpha = .8; n.fillStyle = '#7777ef'; n.beginPath(); n.ellipse(x, y, w, h, 0, 0, Math.PI * 2); n.fill();
      r.globalAlpha = .65; r.fillStyle = '#c0c0c0'; r.beginPath(); r.ellipse(x, y, w, h, 0, 0, Math.PI * 2); r.fill();
    }
  } else if (type === 'void') {
    for (let i = 0; i < 260; i++) {
      const x = rand() * size, y = rand() * size;
      a.globalAlpha = .2; a.fillStyle = palette[2]; a.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 30);
      n.globalAlpha = .3; n.fillStyle = '#7777ff'; n.fillRect(x, y, 2, 20);
    }
  } else {
    for (let i = 0; i < 5500; i++) {
      const x = rand() * size, y = rand() * size;
      a.globalAlpha = .04 + rand() * .12; a.fillStyle = rand() > .5 ? palette[1] : palette[2]; a.fillRect(x, y, 1 + rand() * 5, 1 + rand() * 3);
      n.globalAlpha = .7; n.fillStyle = '#8080ff'; n.fillRect(x, y, 1, 1);
    }
  }
  a.globalAlpha = n.globalAlpha = r.globalAlpha = 1;
  const map = new THREE.CanvasTexture(albedoCanvas); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
  const normalMap = new THREE.CanvasTexture(normalCanvas); normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  const roughnessMap = new THREE.CanvasTexture(roughCanvas); roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  return { map, normalMap, roughnessMap };
}

const cache = new Map();
export function getSurface(type, seed = 1) {
  const key = `${type}:${seed}`;
  if (!cache.has(key)) cache.set(key, makeSurface(type, seed));
  return cache.get(key);
}

export function createPBRMaterial(type, seed = 1, options = {}) {
  const maps = getSurface(type, seed);
  const metalness = options.metalness ?? (type === 'rust' ? 0.58 : type === 'ice' ? 0.12 : 0.02);
  return new THREE.MeshStandardMaterial({
    map: maps.map, normalMap: maps.normalMap, roughnessMap: maps.roughnessMap,
    roughness: options.roughness ?? (type === 'tile' ? 0.28 : 0.88), metalness,
    color: options.color ?? 0xffffff, side: options.side ?? THREE.FrontSide
  });
}

export function createCookieTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(.48, 'rgba(255,255,255,.72)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
