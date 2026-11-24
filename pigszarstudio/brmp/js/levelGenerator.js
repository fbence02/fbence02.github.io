import * as THREE from 'three';
import { LEVELS } from './config.js';
import { createPBRMaterial } from './textures.js';

export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pick(rand, values) { return values[Math.floor(rand() * values.length)]; }

function chooseStyle(levelId, name, rand) {
  const text = name.toLowerCase();
  if (text.includes('pool') || text.includes('water') || text.includes('lake') || text.includes('submarine') || levelId === 7 || levelId === 83) return 'tile';
  if (text.includes('forest') || text.includes('garden') || text.includes('jungle') || text.includes('bayou') || text.includes('swamp')) return 'foliage';
  if (text.includes('ice') || text.includes('frost') || text.includes('moon')) return 'ice';
  if (text.includes('void') || text.includes('darkness') || text.includes('otherworld') || text.includes('down below') || text.includes('space')) return 'void';
  if (text.includes('pipe') || text.includes('sewer') || text.includes('iron') || text.includes('train') || text.includes('station') || text.includes('warehouse')) return 'rust';
  if (text.includes('lobby') || text.includes('office') || text.includes('hotel') || text.includes('apartment') || text.includes('school')) return 'wallpaper';
  return pick(rand, ['carpet', 'concrete', 'wallpaper', 'rust', 'ice']);
}

function carveMaze(cols, rows, rand, feature = 'office-maze') {
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ N: true, E: true, S: true, W: true, visited: false })));
  const stack = [{ x: Math.floor(cols / 2), y: Math.floor(rows / 2) }];
  cells[stack[0].y][stack[0].x].visited = true;
  const dirs = [
    { x: 0, y: -1, wall: 'N', opposite: 'S' }, { x: 1, y: 0, wall: 'E', opposite: 'W' },
    { x: 0, y: 1, wall: 'S', opposite: 'N' }, { x: -1, y: 0, wall: 'W', opposite: 'E' }
  ];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const options = dirs.filter(d => {
      const nx = cur.x + d.x, ny = cur.y + d.y;
      return nx >= 0 && nx < cols && ny >= 0 && ny < rows && !cells[ny][nx].visited;
    });
    if (!options.length) { stack.pop(); continue; }
    const d = pick(rand, options), nx = cur.x + d.x, ny = cur.y + d.y;
    cells[cur.y][cur.x][d.wall] = false;
    cells[ny][nx][d.opposite] = false;
    cells[ny][nx].visited = true;
    stack.push({ x: nx, y: ny });
  }
  for (const row of cells) for (const cell of row) delete cell.visited;

  // Each architectural feature gets a different connectivity profile.
  const loopChance = feature === 'narrow-service' ? .035 : feature === 'office-maze' ? .075 : feature === 'wide-chambers' || feature === 'atrium' ? .31 : feature === 'flooded-rooms' ? .19 : feature === 'warehouse' ? .16 : .12;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x < cols - 1 && cellWall(cells, x, y, 'E') && rand() < loopChance) openBetween(cells, x, y, 'E');
    if (y < rows - 1 && cellWall(cells, x, y, 'S') && rand() < loopChance) openBetween(cells, x, y, 'S');
  }
  const chamberMin = feature === 'wide-chambers' || feature === 'atrium' ? 9 : feature === 'narrow-service' ? 2 : 4;
  const chamberRange = feature === 'wide-chambers' || feature === 'atrium' ? 6 : 5;
  const chamberCount = chamberMin + Math.floor(rand() * chamberRange);
  for (let i = 0; i < chamberCount; i++) {
    const cx = 2 + Math.floor(rand() * (cols - 4));
    const cy = 2 + Math.floor(rand() * (rows - 4));
    const radiusX = feature === 'wide-chambers' || feature === 'atrium' ? 2 + Math.floor(rand() * 2) : feature === 'narrow-service' ? 1 : (rand() < .45 ? 1 : 2);
    const radiusY = feature === 'wide-chambers' || feature === 'atrium' ? 2 + Math.floor(rand() * 2) : feature === 'narrow-service' ? 1 : (rand() < .45 ? 1 : 2);
    for (let y = Math.max(0, cy - radiusY); y <= Math.min(rows - 1, cy + radiusY); y++) {
      for (let x = Math.max(0, cx - radiusX); x <= Math.min(cols - 1, cx + radiusX); x++) {
        if (x < cx + radiusX && x < cols - 1) openBetween(cells, x, y, 'E');
        if (y < cy + radiusY && y < rows - 1) openBetween(cells, x, y, 'S');
      }
    }
  }
  return cells;
}

function cellWall(cells, x, y, direction) { return !!cells[y]?.[x]?.[direction]; }
function openBetween(cells, x, y, direction) {
  const next = direction === 'E' ? { x: x + 1, y, opposite: 'W' } : { x, y: y + 1, opposite: 'N' };
  if (!cells[next.y]?.[next.x]) return;
  cells[y][x][direction] = false;
  cells[next.y][next.x][next.opposite] = false;
}

function cellCenter(floor, cell, size, cols, rows) {
  return new THREE.Vector3(floor.originX + (cell.x + .5) * size, floor.y, (cell.y - rows / 2 + .5) * size);
}

function wallMesh(group, material, x, y, z, width, depth, height, colliders) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  colliders.push({ minX: x - width / 2, maxX: x + width / 2, minY: y, maxY: y + height, minZ: z - depth / 2, maxZ: z + depth / 2 });
  return mesh;
}

function addLight(group, x, y, z, color, rand, lights, scale = 1) {
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0xd9ddca, emissive: color, emissiveIntensity: .6, roughness: .36 });
  const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.25 * scale, .07, .46 * scale), fixtureMat);
  fixture.position.set(x, y + 3.67, z); group.add(fixture);
  const light = new THREE.PointLight(color, 1.35 + rand() * .65, 11 * scale, 1.7);
  light.position.set(x, y + 3.1, z); group.add(light);
  lights.push({ light, base: light.intensity, phase: rand() * 10, rate: 1.5 + rand() * 6, flicker: rand() });
}

function addPillar(group, style, x, y, z, rand) {
  const width = .35 + rand() * .48, height = 2.2 + rand() * 2.1;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), createPBRMaterial(style, Math.floor(rand() * 900) + 20));
  mesh.position.set(x, y + height / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
}

function addFurniture(group, style, x, y, z, rand) {
  const type = Math.floor(rand() * 5);
  const mat = createPBRMaterial(type === 2 ? 'rust' : style, Math.floor(rand() * 999) + 1, { metalness: type === 2 ? .68 : .12 });
  if (type === 0) {
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.5, .13, .95), mat); table.position.set(x, y + .9, z); table.castShadow = true; group.add(table);
    for (const dx of [-.62, .62]) for (const dz of [-.34, .34]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.09, .9, .09), mat); leg.position.set(x + dx, y + .45, z + dz); group.add(leg); }
  } else if (type === 1) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(.65, 1.9, 1.45), mat); shelf.position.set(x, y + .95, z); shelf.castShadow = true; group.add(shelf);
    for (let h = .45; h < 1.7; h += .48) { const shelfBoard = new THREE.Mesh(new THREE.BoxGeometry(.72, .055, 1.5), mat); shelfBoard.position.set(x, y + h, z); group.add(shelfBoard); }
  } else if (type === 2) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, 2.3, 9), mat); pipe.position.set(x, y + 1.15, z); pipe.rotation.z = Math.PI / 2; group.add(pipe);
  } else if (type === 3) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(.8 + rand() * .7, .75 + rand() * .5, .8 + rand() * .7), mat); crate.position.set(x, y + crate.geometry.parameters.height / 2, z); crate.castShadow = true; group.add(crate);
  } else {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.6, .52, .55), mat); bench.position.set(x, y + .26, z); bench.castShadow = true; group.add(bench);
  }
}

function addHideSpot(group, cellPosition, rand, index, openingDirection = new THREE.Vector3(0, 0, -1)) {
  // Tuck cover against the side opposite its open approach so the exit stays
  // inside a verified corridor instead of depositing the player in a wall.
  const direction = openingDirection.clone().normalize();
  const position = cellPosition.clone().addScaledVector(direction, -1.12);
  const root = new THREE.Group(); root.position.copy(position); root.rotation.y = Math.atan2(-direction.x, -direction.z); root.userData.hideSpot = true;
  const type = Math.floor(rand() * 3);
  const metal = new THREE.MeshStandardMaterial({ color: type === 0 ? 0x4d5652 : type === 1 ? 0x554d3e : 0x3e5048, metalness: type === 0 ? .58 : .22, roughness: .76 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x080d0c, roughness: .98, side: THREE.DoubleSide });
  if (type === 0) {
    // An open-front maintenance locker.
    const width = 1.25, height = 2.3, depth = .9;
    const sideA = new THREE.Mesh(new THREE.BoxGeometry(.09, height, depth), metal); sideA.position.set(-width / 2, height / 2, 0); root.add(sideA);
    const sideB = sideA.clone(); sideB.position.x = width / 2; root.add(sideB);
    const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, .09), metal); back.position.set(0, height / 2, depth / 2); root.add(back);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width, .09, depth), metal); roof.position.y = height; root.add(roof);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width, .07, depth), metal); floor.position.y = .035; root.add(floor);
    const interior = new THREE.Mesh(new THREE.PlaneGeometry(width - .18, height - .2), dark); interior.position.set(0, height / 2, depth / 2 - .06); root.add(interior);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.07, .22, .06), new THREE.MeshStandardMaterial({ color: 0xc2b77e, metalness: .8 })); handle.position.set(width * .37, 1.1, -.43); root.add(handle);
  } else if (type === 1) {
    // A curtain-covered alcove with enough clearance for a standing player.
    const width = 1.5, height = 2.25, depth = 1.05;
    for (const side of [-1, 1]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(.1, height, .1), metal); support.position.set(side * width / 2, height / 2, 0); root.add(support);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width + .1, .12, depth), metal); roof.position.y = height; root.add(roof);
    const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, .08), metal); back.position.z = depth / 2; back.position.y = height / 2; root.add(back);
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(width - .08, height - .1), new THREE.MeshStandardMaterial({ color: pick(rand, [0x263c35, 0x45423a, 0x38424a]), roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: .86 }));
    curtain.position.set(0, height / 2, -.46); root.add(curtain);
  } else {
    // Stacked crates create a dark crawl-in pocket, useful when crouched.
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x51483a, roughness: .93 });
    for (const side of [-1, 1]) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(.64, 1.45, .88), crateMat); crate.position.set(side * .55, .72, 0); crate.castShadow = true; root.add(crate);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(.68, .08, .93), metal); brace.position.set(side * .55, .72, 0); root.add(brace);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.7, .12, 1.05), crateMat); canopy.position.set(0, 1.52, 0); root.add(canopy);
    const darkPocket = new THREE.Mesh(new THREE.PlaneGeometry(.62, 1.34), dark); darkPocket.position.set(0, .78, .43); root.add(darkPocket);
  }
  const label = new THREE.Mesh(new THREE.BoxGeometry(.25, .11, .025), new THREE.MeshBasicMaterial({ color: pick(rand, [0x8fcbb5, 0xb5aa73, 0xc57b61]) }));
  label.position.set(-.35, type === 2 ? 1.38 : 2.04, -.47); root.add(label);
  group.add(root);
  return { id: `hide-${index}`, type: ['locker', 'curtain-alcove', 'crate-cover'][type], position: position.clone(), exitPosition: position.clone().addScaledVector(direction, 2.05), radius: 1.35, mesh: root };
}

function makeExit(group, position, color = 0x8be8c9) {
  const root = new THREE.Group(); root.position.copy(position).add(new THREE.Vector3(0, 1.5, 0)); group.add(root);
  const glow = new THREE.MeshBasicMaterial({ color });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.9, .065, 12, 48), glow); root.add(ring);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.7), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .08, side: THREE.DoubleSide })); inner.position.z = -.015; root.add(inner);
  const beacon = new THREE.PointLight(color, 1, 8); beacon.position.set(0, .2, 0); root.add(beacon);
  return root;
}

function makeObjective(group, position, index, feature = 'office-maze') {
  const root = new THREE.Group(); root.position.copy(position); root.userData.index = index; root.userData.active = false;
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x222b27, metalness: .72, roughness: .38 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.48, .55, .25, 12), baseMaterial);
  base.position.y = .125; base.castShadow = true; root.add(base);
  const palette = {
    'flooded-rooms': [0x3a9b9e, 0x236c72], overgrown: [0x84c46c, 0x2b7f42],
    atrium: [0xd7bd6b, 0x917132], 'steam-vents': [0xd59b57, 0x805027],
    'red-emergency': [0xe35e52, 0x8a211c], 'ice-fault': [0x9fe7ed, 0x3d8fa5],
    warehouse: [0xd5a65e, 0x8a602e], 'dark-sector': [0x8d9eea, 0x4c569e],
    'mirror-hall': [0xb4e3dc, 0x4c7978], 'wide-chambers': [0xd0b5ed, 0x76509c],
    'narrow-service': [0xabb7ae, 0x5e726a], stairwell: [0xc6c8b7, 0x656c60]
  };
  const [glowColor, emissiveColor] = palette[feature] || [0xc18b40, 0x9c4b18];
  const coreMaterial = new THREE.MeshStandardMaterial({ color: glowColor, emissive: emissiveColor, emissiveIntensity: 1.25, metalness: .28, roughness: .32 });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: glowColor });
  let coreGeometry = new THREE.BoxGeometry(.3, .58, .2);
  if (feature === 'flooded-rooms' || feature === 'steam-vents') coreGeometry = new THREE.CylinderGeometry(.16, .2, .78, 12);
  else if (feature === 'overgrown') coreGeometry = new THREE.ConeGeometry(.3, .82, 7);
  else if (feature === 'ice-fault') coreGeometry = new THREE.OctahedronGeometry(.38, 1);
  else if (feature === 'mirror-hall') coreGeometry = new THREE.SphereGeometry(.3, 12, 10);
  const core = new THREE.Mesh(coreGeometry, coreMaterial); core.position.set(0, .72, -.04); root.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(feature === 'flooded-rooms' || feature === 'steam-vents' ? .43 : .51, .03, 7, 28), ringMaterial);
  ring.position.y = .77; ring.rotation.x = Math.PI / 2; root.add(ring);
  if (feature === 'flooded-rooms' || feature === 'steam-vents') {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.26, .045, 7, 18), ringMaterial); wheel.position.set(0, 1.1, -.05); root.add(wheel);
    for (let spoke = 0; spoke < 4; spoke++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(.08, .56, .07), coreMaterial); bar.position.set(0, 1.1, -.05); bar.rotation.z = spoke * Math.PI / 4; root.add(bar);
    }
  }
  const lamp = new THREE.PointLight(glowColor, .78, 4); lamp.position.set(0, 1.1, 0); root.add(lamp);
  root.userData.activate = () => {
    if (root.userData.active) return false;
    root.userData.active = true;
    coreMaterial.color.setHex(0x65e2bc); coreMaterial.emissive.setHex(0x168d68); coreMaterial.emissiveIntensity = 1.9;
    ringMaterial.color.setHex(0x75f4cb); lamp.color.setHex(0x65e2bc); lamp.intensity = 1.35;
    return true;
  };
  group.add(root); return root;
}

function spawnPickup(group, position, kind, rand) {
  const color = kind === 'battery' ? 0xe3bd57 : 0x83d5c7;
  const root = new THREE.Group(); root.position.copy(position).add(new THREE.Vector3(0, .42, 0)); root.userData.kind = kind; root.userData.phase = rand() * 5;
  const body = new THREE.Mesh(kind === 'battery' ? new THREE.CylinderGeometry(.12, .12, .42, 10) : new THREE.BoxGeometry(.32, .42, .2), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .55, metalness: .25, roughness: .35 }));
  if (kind === 'battery') body.rotation.z = Math.PI / 2;
  root.add(body);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.25, .018, 6, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .55 })); halo.rotation.x = Math.PI / 2; root.add(halo);
  group.add(root); return root;
}

function addWater(group, floor, width, depth, rand, waterZones, full = false) {
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x4ba6a8) }, uOpacity: { value: full ? .34 : .26 } },
    vertexShader: `varying vec2 vUv; varying vec3 vWorld; void main(){vUv=uv; vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying vec3 vWorld; void main(){float a=sin(vUv.x*34.0+uTime*1.25)*sin(vUv.y*28.0-uTime*.9);float b=sin((vUv.x+vUv.y)*65.0-uTime*1.6);float caustic=smoothstep(.1,.85,a*b*.5+.5);vec3 col=uColor+vec3(.13,.22,.23)*caustic;float edge=0.84+0.16*sin(vWorld.x*.7+vWorld.z*.8+uTime*.7);gl_FragColor=vec4(col,uOpacity*edge);}`
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth, 1, 1), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.set(floor.originX + width / 2, floor.y + .48, 0); group.add(mesh);
  waterZones.push({ minX: floor.originX, maxX: floor.originX + width, minZ: -depth / 2, maxZ: depth / 2, floorY: floor.y, depth: .38, mesh });
  return mesh;
}

function addThemeArchitecture(group, style, feature, floor, cols, rows, size, rand, waterZones, hazards) {
  const width = cols * size, depth = rows * size;
  if (style === 'rust') {
    for (let i = 0; i < 8 + Math.floor(rand() * 8); i++) {
      const z = -depth / 2 + 2 + rand() * (depth - 4), y = floor.y + 3.25 - (i % 3) * .34;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.12 + rand() * .08, .12 + rand() * .08, width * .8, 10), createPBRMaterial('rust', Math.floor(rand() * 900) + i, { metalness: .72, roughness: .35 }));
      pipe.rotation.z = Math.PI / 2; pipe.position.set(floor.originX + width / 2, y, z); group.add(pipe);
    }
  }
  if (style === 'foliage') {
    for (let i = 0; i < 24; i++) {
      const x = floor.originX + 2 + rand() * (width - 4), z = -depth / 2 + 2 + rand() * (depth - 4);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.08, .15, 2.2 + rand() * 1.3, 7), new THREE.MeshStandardMaterial({ color: 0x514633 }));
      trunk.position.set(x, floor.y + trunk.geometry.parameters.height / 2, z); group.add(trunk);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(.7 + rand() * .5, 1), createPBRMaterial('foliage', Math.floor(rand() * 900) + i));
      crown.position.set(x, floor.y + 2.3 + rand(), z); crown.scale.y = 1.25; group.add(crown);
    }
  }
  if (style === 'void') {
    for (let i = 0; i < 19; i++) {
      const x = floor.originX + 2 + rand() * (width - 4), z = -depth / 2 + 2 + rand() * (depth - 4), h = 2 + rand() * 4;
      const p = new THREE.Mesh(new THREE.BoxGeometry(.48 + rand() * .65, h, .48 + rand() * .65), createPBRMaterial('void', Math.floor(rand() * 900) + i));
      p.position.set(x, floor.y + h / 2, z); group.add(p);
    }
  }
  if (style === 'ice' || feature === 'ice-fault') {
    for (let i = 0; i < 17; i++) {
      const x = floor.originX + 2 + rand() * (width - 4), z = -depth / 2 + 2 + rand() * (depth - 4), h = 1.1 + rand() * 3.4;
      const crystal = new THREE.Mesh(new THREE.ConeGeometry(.35 + rand() * .42, h, 5), new THREE.MeshPhysicalMaterial({ color: 0x94cde0, roughness: .18, metalness: .12, transmission: .15, transparent: true, opacity: .82 }));
      crystal.position.set(x, floor.y + h / 2, z); crystal.rotation.y = rand() * Math.PI; group.add(crystal);
    }
  }
  if (feature === 'overgrown') {
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x355b3a, roughness: .94 });
    for (let i = 0; i < 30; i++) {
      const x = floor.originX + 1.5 + rand() * (width - 3), z = -depth / 2 + 1.5 + rand() * (depth - 3);
      const length = 1.1 + rand() * 2.4;
      const vine = new THREE.Mesh(new THREE.CylinderGeometry(.025, .045, length, 6), vineMat);
      vine.position.set(x, floor.y + 3.2 - length / 2, z); vine.rotation.z = (rand() - .5) * .6; group.add(vine);
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(.32 + rand() * .3, 0), createPBRMaterial('foliage', i + floor.index * 91, { roughness: .92 }));
      leaves.position.set(x + (rand() - .5) * .8, floor.y + 1.2 + rand() * 1.4, z + (rand() - .5) * .8); leaves.scale.y = 1.35; group.add(leaves);
    }
  }
  if (feature === 'warehouse') {
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x58635e, metalness: .72, roughness: .48 });
    const crateMat = createPBRMaterial('rust', 704 + floor.index, { metalness: .12, roughness: .9 });
    for (let row = 0; row < 5; row++) {
      const x = floor.originX + 4 + row * (width - 8) / 5;
      for (let section = 0; section < 3; section++) {
        const z = -depth / 2 + 4 + section * (depth - 8) / 3;
        const postA = new THREE.Mesh(new THREE.BoxGeometry(.1, 3.25, .1), rackMat); postA.position.set(x, floor.y + 1.62, z); group.add(postA);
        const postB = postA.clone(); postB.position.x = x + 2.1; group.add(postB);
        for (const shelfY of [.75, 1.7, 2.65]) {
          const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.25, .09, .72), rackMat); shelf.position.set(x + 1.05, floor.y + shelfY, z); group.add(shelf);
          if (rand() > .28) { const box = new THREE.Mesh(new THREE.BoxGeometry(.55 + rand() * .4, .42 + rand() * .24, .52), crateMat); box.position.set(x + .55 + rand() * 1.1, floor.y + shelfY + .27, z); group.add(box); }
        }
      }
    }
  }
  if (style === 'tile' || feature === 'flooded-rooms') addWater(group, floor, width - 1.2, depth - 1.2, rand, waterZones, style === 'tile');
  if (feature === 'red-emergency') {
    for (let i = 0; i < 8; i++) {
      const lamp = new THREE.PointLight(0xc52b27, .9, 13); lamp.position.set(floor.originX + 3 + rand() * (width - 6), floor.y + 3.1, -depth / 2 + rand() * depth); group.add(lamp);
    }
  }
  if (feature === 'atrium') {
    const columnMat = createPBRMaterial('concrete', 84, { roughness: .7 });
    for (const x of [.22, .5, .78]) for (const z of [.22, .5, .78]) {
      if (rand() < .56) continue;
      const px = floor.originX + width * x, pz = -depth / 2 + depth * z;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(.42, .55, 3.8, 12), columnMat); col.position.set(px, floor.y + 1.9, pz); col.castShadow = true; group.add(col);
    }
  }
  if (feature === 'steam-vents') {
    for (let i = 0; i < 7; i++) {
      const x = floor.originX + 3 + rand() * (width - 6), z = -depth / 2 + 3 + rand() * (depth - 6);
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .16, 12), createPBRMaterial('rust', i + floor.index * 21 + 102, { metalness: .65 }));
      vent.position.set(x, floor.y + .08, z); group.add(vent);
      const vapor = new THREE.Mesh(new THREE.CylinderGeometry(.18, .48, 2.8, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xbfc9bb, transparent: true, opacity: .075, depthWrite: false, side: THREE.DoubleSide }));
      vapor.position.set(x, floor.y + 1.55, z); group.add(vapor);
      hazards.push({ type: 'steam', position: new THREE.Vector3(x, floor.y, z), radius: 1.7, floor: floor.index });
    }
  }
  if (feature === 'mirror-hall') {
    const mirror = new THREE.MeshStandardMaterial({ color: 0x829b9b, metalness: .88, roughness: .12, transparent: true, opacity: .72 });
    for (let i = 0; i < 12; i++) {
      const x = floor.originX + 2 + rand() * (width - 4), z = -depth / 2 + 2 + rand() * (depth - 4);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.9, 1.8 + rand() * 1.4), mirror);
      panel.position.set(x, floor.y + 1.48, z); panel.rotation.y = rand() * Math.PI; group.add(panel);
    }
  }
  if (feature === 'narrow-service') {
    for (let i = 0; i < 11; i++) {
      const x = floor.originX + 2 + rand() * (width - 4), z = -depth / 2 + 2 + rand() * (depth - 4);
      const duct = new THREE.Mesh(new THREE.BoxGeometry(1.2 + rand(), .3, 1.4 + rand()), createPBRMaterial('rust', i + 401 + floor.index * 30, { metalness: .62 }));
      duct.position.set(x, floor.y + 3.65, z); group.add(duct);
    }
  }
}

export function buildLevel(scene, levelId, seed, difficulty = 'NORMAL') {
  const meta = LEVELS[levelId] || LEVELS[0];
  const rand = makeRng(seed >>> 0);
  const style = chooseStyle(levelId, meta.name, rand);
  const featurePool = ['flooded-rooms', 'overgrown', 'atrium', 'steam-vents', 'red-emergency', 'ice-fault', 'warehouse', 'dark-sector', 'mirror-hall', 'office-maze', 'wide-chambers', 'narrow-service'];
  let feature = levelId === 54 || levelId === 19 ? 'stairwell' : style === 'tile' ? 'flooded-rooms' : pick(rand, featurePool);
  if (levelId === 37 || levelId === 7 || levelId === 43 || levelId === 83) feature = 'flooded-rooms';
  if (levelId === 0) feature = 'office-maze';

  const cols = 16 + Math.floor(rand() * 4);
  const rows = 16 + Math.floor(rand() * 4);
  const size = 4.1 + rand() * .75;
  const floorsCount = 4 + Math.floor(rand() * 2);
  const wallH = 4.15;
  const floorRise = 5.25;
  const wingGap = 12.5;
  const floorWidth = cols * size;
  const floorDepth = rows * size;
  const worldStepX = floorWidth + wingGap + size;
  const root = new THREE.Group(); root.name = `Level_${levelId}_${seed}`;
  const colliders = [], lights = [], pickups = [], props = [], objectives = [], hideSpots = [], waterZones = [], hazards = [], floors = [], stairs = [];
  const hue = (levelId * .097 + rand() * .12) % 1;
  const hueTint = new THREE.Color().setHSL(hue, style === 'void' ? .2 : .12, style === 'void' ? .48 : .82);
  const floorMaterial = createPBRMaterial(style, seed % 997, { roughness: style === 'tile' ? .27 : style === 'ice' ? .34 : .92, color: hueTint });
  const wallMaterial = createPBRMaterial(style === 'wallpaper' ? 'wallpaper' : style, (seed + 17) % 997, { roughness: .82, color: hueTint.clone().lerp(new THREE.Color(0xffffff), .22) });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: style === 'void' ? 0x10151b : style === 'tile' ? 0xd2e5df : 0xaaa99d, roughness: .95 });

  const usedFloorFeatures = new Set([feature]);
  for (let floorIndex = 0; floorIndex < floorsCount; floorIndex++) {
    const availableFeatures = featurePool.filter(item => !usedFloorFeatures.has(item));
    const floorFeature = floorIndex === 0 ? feature : pick(rand, availableFeatures.length ? availableFeatures : featurePool);
    usedFloorFeatures.add(floorFeature);
    const floor = {
      index: floorIndex,
      originX: -floorWidth / 2 + floorIndex * worldStepX,
      y: floorIndex * floorRise,
      maze: null,
      cols, rows, size,
      stairRow: Math.floor(rows / 2) + (rand() < .5 ? -1 : 1),
      feature: floorFeature
    };
    floor.maze = carveMaze(cols, rows, rand, floor.feature);
    floors.push(floor);
  }

  // Make the stair doors part of the deterministic navigation graph.
  for (let i = 0; i < floorsCount - 1; i++) {
    const lower = floors[i], upper = floors[i + 1], row = lower.stairRow;
    lower.maze[row][cols - 1].E = false;
    upper.maze[row][0].W = false;
  }
  const exitFloor = floors[floorsCount - 1];
  const exitCell = { x: Math.floor(cols / 2) + (rand() < .5 ? -2 : 2), y: 0 };
  exitFloor.maze[0][exitCell.x].N = false;

  for (const floor of floors) {
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(floorWidth, floorDepth), floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2; floorMesh.position.set(floor.originX + floorWidth / 2, floor.y, 0); floorMesh.receiveShadow = true; root.add(floorMesh);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(floorWidth, floorDepth), ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2; ceiling.position.set(floor.originX + floorWidth / 2, floor.y + wallH, 0); root.add(ceiling);

    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const cell = floor.maze[y][x];
      const wx = floor.originX + (x + .5) * size;
      const wz = (y - rows / 2 + .5) * size;
      if (cell.N && !(floor.index === floorsCount - 1 && y === 0 && x === exitCell.x)) wallMesh(root, wallMaterial, wx, floor.y, wz - size / 2, size + .12, .22, wallH, colliders);
      if (cell.W) wallMesh(root, wallMaterial, wx - size / 2, floor.y, wz, .22, size + .12, wallH, colliders);
      if (x === cols - 1 && cell.E) wallMesh(root, wallMaterial, wx + size / 2, floor.y, wz, .22, size + .12, wallH, colliders);
      if (y === rows - 1 && cell.S) wallMesh(root, wallMaterial, wx, floor.y, wz + size / 2, size + .12, .22, wallH, colliders);

      const lightThreshold = floor.feature === 'dark-sector' ? .965 : floor.feature === 'red-emergency' ? .90 : .83;
      if (rand() > lightThreshold) addLight(root, wx, floor.y, wz, style === 'tile' ? 0x8fd6d0 : style === 'void' ? 0x537a92 : style === 'ice' ? 0x92cce9 : 0xd5d29a, rand, lights, .9 + rand() * .3);
      const central = Math.abs(x - Math.floor(cols / 2)) + Math.abs(y - Math.floor(rows / 2));
      if (central > 2 && rand() > (feature === 'wide-chambers' ? .67 : .82)) {
        const px = wx + (rand() - .5) * 1.8, pz = wz + (rand() - .5) * 1.8;
        if (style === 'foliage' && rand() < .5) addPillar(root, 'foliage', px, floor.y, pz, rand);
        else addFurniture(root, style, px, floor.y, pz, rand);
      }
    }

    // Wide halls, broken sightlines, and distinct rooms on every floor.
    addThemeArchitecture(root, style, floor.feature, floor, cols, rows, size, rand, waterZones, hazards);
    const hideCandidates = [];
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      const c = floor.maze[y][x];
      const openings = Number(!c.N) + Number(!c.E) + Number(!c.S) + Number(!c.W);
      if (openings >= 2 && Math.abs(x - Math.floor(cols / 2)) + Math.abs(y - Math.floor(rows / 2)) > 3) hideCandidates.push({ x, y });
    }
    const hideCount = 4 + Math.floor(rand() * 5);
    for (let i = 0; i < hideCount && hideCandidates.length; i++) {
      const at = hideCandidates.splice(Math.floor(rand() * hideCandidates.length), 1)[0];
      const cell = floor.maze[at.y][at.x];
      const openings = [
        !cell.N && new THREE.Vector3(0, 0, -1),
        !cell.E && new THREE.Vector3(1, 0, 0),
        !cell.S && new THREE.Vector3(0, 0, 1),
        !cell.W && new THREE.Vector3(-1, 0, 0)
      ].filter(Boolean);
      const direction = openings.length ? pick(rand, openings) : new THREE.Vector3(0, 0, -1);
      const position = cellCenter(floor, at, size, cols, rows);
      hideSpots.push(addHideSpot(root, position, rand, hideSpots.length, direction));
    }

    // Theme-specific side-room clusters and landmark structures.
    if (floor.feature === 'stairwell' || feature === 'stairwell') {
      const shaftX = floor.originX + floorWidth * .24;
      const shaftZ = -floorDepth * .28;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, wallH, 32, 1, true), createPBRMaterial('concrete', seed + floor.index + 402));
      shaft.position.set(shaftX, floor.y + wallH / 2, shaftZ); root.add(shaft);
      for (let s = 0; s < 16; s++) {
        const angle = s / 16 * Math.PI * 2;
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.3, .18, 1.15), createPBRMaterial('rust', seed + s + floor.index));
        step.position.set(shaftX + Math.cos(angle) * 1.3, floor.y + .12 + s * .19, shaftZ + Math.sin(angle) * 1.3);
        step.rotation.y = -angle; root.add(step);
      }
    }
  }

  // Physical stair flights bridge the separate floor wings. The walking surface follows a smooth ramp over visible steps.
  for (let i = 0; i < floorsCount - 1; i++) {
    const lower = floors[i], upper = floors[i + 1], row = lower.stairRow;
    const fromCell = { x: cols - 1, y: row }, toCell = { x: 0, y: row };
    const from = cellCenter(lower, fromCell, size, cols, rows);
    const to = cellCenter(upper, toCell, size, cols, rows);
    const steps = 18;
    const waypoints = [];
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      waypoints.push(new THREE.Vector3(THREE.MathUtils.lerp(from.x, to.x, t), THREE.MathUtils.lerp(lower.y, upper.y, t), THREE.MathUtils.lerp(from.z, to.z, t)));
    }
    for (let s = 0; s < steps; s++) {
      const t = (s + .5) / steps;
      const step = new THREE.Mesh(new THREE.BoxGeometry((to.x - from.x) / steps + .03, .18, 3.15), createPBRMaterial('rust', seed + i * 50 + s, { metalness: .45 }));
      step.position.set(THREE.MathUtils.lerp(from.x, to.x, t), lower.y + (s + 1) * (floorRise / steps) - .09, from.z);
      step.castShadow = true; step.receiveShadow = true; root.add(step);
      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, 1, 7), new THREE.MeshStandardMaterial({ color: 0x515b55, metalness: .75, roughness: .42 }));
        rail.position.set(step.position.x, lower.y + (s + 1) * (floorRise / steps) + .42, from.z + side * 1.63);
        rail.rotation.z = Math.atan2(floorRise, to.x - from.x); root.add(rail);
      }
    }
    stairs.push({ fromFloor: i, toFloor: i + 1, row, from, to, fromCell, toCell, waypoints, minX: Math.min(from.x, to.x) - .1, maxX: Math.max(from.x, to.x) + .1, minZ: from.z - 1.72, maxZ: from.z + 1.72 });
  }

  // Each run requires a different number of objectives, spread across the
  // lower, middle and upper floors so the route changes from descent to descent.
  const objectiveCount = 2 + Math.floor(rand() * 4);
  const usedObjectiveCells = new Set();
  for (let i = 0; i < objectiveCount; i++) {
    const objectiveFloor = Math.round(i * (floorsCount - 1) / Math.max(1, objectiveCount - 1));
    const floor = floors[objectiveFloor];
    const choices = [];
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      const key = `${objectiveFloor}:${x}:${y}`;
      const distanceFromStair = Math.abs(x - Math.floor(cols / 2)) + Math.abs(y - floor.stairRow);
      if (distanceFromStair > 2 && !usedObjectiveCells.has(key)) choices.push({ x, y, key });
    }
    const chosen = choices.length ? pick(rand, choices) : { x: Math.floor(cols / 2), y: Math.floor(rows / 2), key: `${objectiveFloor}:center` };
    usedObjectiveCells.add(chosen.key);
    objectives.push(makeObjective(root, cellCenter(floor, chosen, size, cols, rows), i, feature));
  }

  const exitBase = cellCenter(exitFloor, exitCell, size, cols, rows);
  // Place the exit just inside the open north wall, on walkable floor
  // geometry; keeping it outside the floor bounds made the trigger unreachable.
  const exitPosition = new THREE.Vector3(exitBase.x, exitFloor.y, -floorDepth / 2 + .55);
  const exit = makeExit(root, exitPosition, style === 'void' ? 0x9b8be9 : 0x8be8c9);
  colliders.push({ minX: exitPosition.x - size * .52, maxX: exitPosition.x + size * .52, minY: exitFloor.y, maxY: exitFloor.y + 2.9, minZ: exitPosition.z - .18, maxZ: exitPosition.z + .12 });

  const spawnCell = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
  const spawn = cellCenter(floors[0], spawnCell, size, cols, rows);

  // Items are seeded, plentiful enough to support detours, and spread across all floors.
  const pickupCount = difficulty === 'EXPLORER' ? 0 : difficulty === 'EASY' ? 34 : difficulty === 'HARD' ? 19 : 27;
  const pickupCells = [];
  for (const floor of floors) {
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      const p = cellCenter(floor, { x, y }, size, cols, rows);
      if (p.distanceTo(spawn) < 9 || objectives.some(o => o.position.distanceTo(p) < 3.2)) continue;
      pickupCells.push({ floor, x, y });
    }
  }
  const usedPickupKeys = new Set();
  for (let i = 0; i < pickupCount && pickupCells.length; i++) {
    const idx = Math.floor(rand() * pickupCells.length);
    const picked = pickupCells.splice(idx, 1)[0];
    const center = cellCenter(picked.floor, { x: picked.x, y: picked.y }, size, cols, rows);
    const key = `${picked.floor.index}:${picked.x}:${picked.y}`;
    if (usedPickupKeys.has(key)) continue;
    usedPickupKeys.add(key);
    const pickup = spawnPickup(root, center, rand() > .44 ? 'battery' : 'water', rand);
    pickup.userData.spawnId = i;
    pickups.push(pickup);
  }

  // Volumetric-style dust motes are spread over the complete multi-floor structure.
  const dustCount = 720;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const f = floors[Math.floor(rand() * floors.length)];
    dustPositions[i * 3] = f.originX + rand() * floorWidth;
    dustPositions[i * 3 + 1] = f.y + .25 + rand() * 3.4;
    dustPositions[i * 3 + 2] = (rand() - .5) * floorDepth;
  }
  const dustBasePositions = dustPositions.slice();
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: style === 'void' ? 0x8ca6b0 : 0xe6e0b8, size: .055, transparent: true, opacity: .27, depthWrite: false, sizeAttenuation: true })); root.add(dust);

  scene.add(root);
  const missionByFeature = {
    'flooded-rooms': { title: 'DRAIN THE FLOODED SECTOR', item: 'DRAIN VALVE', plural: 'DRAIN VALVES', verb: 'TURN', exit: 'OPEN THE DRAIN GATE' },
    overgrown: { title: 'RESTORE THE OVERGROWN GARDEN', item: 'GARDEN BEACON', plural: 'GARDEN BEACONS', verb: 'CALIBRATE', exit: 'REACH THE ROOT GATE' },
    atrium: { title: 'REACTIVATE THE ATRIUM LIFTS', item: 'LIFT CONTROL', plural: 'LIFT CONTROLS', verb: 'RESTART', exit: 'BOARD THE SERVICE LIFT' },
    'steam-vents': { title: 'STABILIZE PRESSURE SYSTEMS', item: 'PRESSURE VALVE', plural: 'PRESSURE VALVES', verb: 'CLOSE', exit: 'OPEN THE PRESSURE DOOR' },
    'red-emergency': { title: 'RESTORE EMERGENCY POWER', item: 'POWER NODE', plural: 'POWER NODES', verb: 'RESTORE', exit: 'UNLOCK THE SECURITY GATE' },
    'ice-fault': { title: 'RESTART THE HEAT GRID', item: 'HEAT REGULATOR', plural: 'HEAT REGULATORS', verb: 'RESTART', exit: 'OPEN THE WARM ACCESS SHAFT' },
    warehouse: { title: 'RELEASE THE FREIGHT LOCKS', item: 'FREIGHT CONSOLE', plural: 'FREIGHT CONSOLES', verb: 'UNLOCK', exit: 'OPEN THE LOADING BAY' },
    'dark-sector': { title: 'RESTORE LIGHT TO THE SECTOR', item: 'BREAKER PANEL', plural: 'BREAKER PANELS', verb: 'RESET', exit: 'FOLLOW THE EMERGENCY LIGHTS' },
    'mirror-hall': { title: 'ANCHOR THE MIRROR HALL', item: 'ANCHOR MIRROR', plural: 'ANCHOR MIRRORS', verb: 'ALIGN', exit: 'FIND THE REAL EXIT' },
    'office-maze': { title: 'RESTORE THE BUILDING NETWORK', item: 'ACCESS TERMINAL', plural: 'ACCESS TERMINALS', verb: 'ACTIVATE', exit: 'UNSEAL THE STAIR DOOR' },
    'wide-chambers': { title: 'STABILIZE THE RESONANCE FIELD', item: 'RESONANCE PYLON', plural: 'RESONANCE PYLONS', verb: 'TUNE', exit: 'CROSS THE RESONANCE GATE' },
    'narrow-service': { title: 'RELEASE THE SERVICE LOCKS', item: 'VENT CONTROLLER', plural: 'VENT CONTROLLERS', verb: 'RELEASE', exit: 'OPEN THE SERVICE HATCH' },
    stairwell: { title: 'RESTORE THE STAIRWELL LANDINGS', item: 'LANDING SWITCH', plural: 'LANDING SWITCHES', verb: 'ENGAGE', exit: 'DESCEND THROUGH THE STAIR DOOR' }
  };
  const mission = missionByFeature[feature] || missionByFeature['office-maze'];
  const featureLabels = { 'flooded-rooms': 'FLOODED', overgrown: 'OVERGROWN', atrium: 'ATRIUM', 'steam-vents': 'STEAM ZONE', 'red-emergency': 'RED ALERT', 'ice-fault': 'ICE FAULT', warehouse: 'WAREHOUSE', 'dark-sector': 'DARK SECTOR', 'mirror-hall': 'MIRROR HALL', 'office-maze': 'OFFICE MAZE', 'wide-chambers': 'OPEN CHAMBERS', 'narrow-service': 'SERVICE DUCTS', stairwell: 'STAIRWELL' };
  const lighting = feature === 'dark-sector' || style === 'void'
    ? { ambient: .17, directional: .12 }
    : feature === 'red-emergency' ? { ambient: .38, directional: .32 }
    : style === 'tile' ? { ambient: .66, directional: .42 }
    : { ambient: 1.05, directional: 1.15 };
  const world = {
    root, meta, seed, levelId, style, feature, mission, lighting, maze: floors[0].maze, floors, stairs, cols, rows, cellSize: size, wallHeight: wallH,
    colliders, lights, pickups, props, objectives, hideSpots, waterZones, hazards, exit, dust, dustBasePositions,
    halfWidth: floorWidth / 2, halfDepth: floorDepth / 2, floorRise,
    spawn, exitPosition, objectiveCount: objectives.length,
    floorIndexForPosition(position) {
      for (const stair of stairs) {
        if (position.x >= stair.minX && position.x <= stair.maxX && position.z >= stair.minZ && position.z <= stair.maxZ) {
          const t = THREE.MathUtils.clamp((position.x - stair.from.x) / Math.max(.001, stair.to.x - stair.from.x), 0, 1);
          return t < .5 ? stair.fromFloor : stair.toFloor;
        }
      }
      let best = 0, bestScore = Infinity;
      floors.forEach((floor, index) => {
        const inside = position.x >= floor.originX - .2 && position.x <= floor.originX + floorWidth + .2 && position.z >= -floorDepth / 2 - .2 && position.z <= floorDepth / 2 + .2;
        if (!inside) return;
        const score = Math.abs(position.y - floor.y);
        if (score < bestScore) { bestScore = score; best = index; }
      });
      return best;
    },
    getFloorTheme(position) { return featureLabels[floors[this.floorIndexForPosition(position)]?.feature] || 'UNKNOWN SECTOR'; },
    getGroundHeightAt(x, z, currentY = 0) {
      for (const stair of stairs) {
        if (x >= stair.minX && x <= stair.maxX && z >= stair.minZ && z <= stair.maxZ) {
          const t = THREE.MathUtils.clamp((x - stair.from.x) / Math.max(.001, stair.to.x - stair.from.x), 0, 1);
          return THREE.MathUtils.lerp(floors[stair.fromFloor].y, floors[stair.toFloor].y, t);
        }
      }
      let bestY = null, bestScore = Infinity;
      for (const floor of floors) {
        if (x < floor.originX - .18 || x > floor.originX + floorWidth + .18 || z < -floorDepth / 2 - .18 || z > floorDepth / 2 + .18) continue;
        const score = Math.abs(currentY - floor.y);
        if (score < bestScore) { bestScore = score; bestY = floor.y; }
      }
      return bestY;
    },
    isInWaterAt(x, z, y = 0) {
      return waterZones.some(zone => x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ && Math.abs(y - zone.floorY) < 1.0);
    },
    isOnIceAt(x, z, y = 0) {
      const floorIndex = this.floorIndexForPosition({ x, y, z });
      return this.style === 'ice' || this.floors[floorIndex]?.feature === 'ice-fault';
    },
    getHazardAt(x, z, y = 0) {
      return hazards.find(hazard => Math.abs(hazard.position.y - y) < 1.2 && Math.hypot(hazard.position.x - x, hazard.position.z - z) < hazard.radius) || null;
    },
    activateObjective(index) {
      const objective = objectives[index];
      return objective ? objective.userData.activate() : false;
    },
    applyObjectiveStates(states = []) { states.forEach((active, index) => { if (active) this.activateObjective(index); }); },
    get objectiveProgress() { return objectives.filter(item => item.userData.active).length; },
    get exitUnlocked() { return objectives.length > 0 && objectives.every(item => item.userData.active); },
    update(dt, time, photosensitive = false) {
      for (const item of lights) {
        const pulse = Math.sin(time * item.rate + item.phase);
        const flicker = photosensitive ? .98 + Math.sin(time * .5 + item.phase) * .015 : (Math.sin(time * .7 + item.phase) > .989 ? .04 : 1);
        item.light.intensity = item.base * (.82 + pulse * .1) * flicker;
      }
      for (const zone of waterZones) zone.mesh.material.uniforms.uTime.value = time;
      const positions = dust.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        positions.array[i * 3 + 1] = dustBasePositions[i * 3 + 1] + Math.sin(time * .55 + i * .7) * .035;
      }
      positions.needsUpdate = true;
      exit.rotation.z = Math.sin(time * .8) * .025;
      const unlocked = this.exitUnlocked;
      const exitColor = unlocked ? 0x78e8c2 : 0xcf7951;
      exit.children[0].material.color.setHex(exitColor);
      exit.children[1].material.color.setHex(exitColor);
      exit.children[1].material.opacity = unlocked ? .18 : .055;
      exit.children[2].color.setHex(exitColor);
      exit.children[2].intensity = (unlocked ? 2.3 : .4) + Math.sin(time * 2.1) * .18;
      for (const objective of objectives) if (!objective.userData.active) objective.rotation.y = Math.sin(time * 1.4 + objective.userData.index) * .035;
      for (const pickup of pickups) { pickup.rotation.y += dt * .8; pickup.position.y = pickup.userData.baseY + .42 + Math.sin(time * 2 + pickup.userData.phase) * .08; }
    },
    dispose() {
      scene.remove(root);
      root.traverse(object => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material?.dispose();
      });
    }
  };
  pickups.forEach(p => { p.userData.baseY = p.position.y - .42; });
  return world;
}

export function buildSafeRoom(scene) {
  const group = new THREE.Group(); group.name = 'SafeRoom';
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), createPBRMaterial('concrete', 42)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; group.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x5f6c62, roughness: .88 });
  const wall = (w, h, d, x, y, z) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); mesh.position.set(x, y, z); mesh.receiveShadow = true; group.add(mesh); };
  wall(22, 5, .4, 0, 2.5, -11); wall(22, 5, .4, 0, 2.5, 11); wall(.4, 5, 22, -11, 2.5, 0); wall(.4, 5, 22, 11, 2.5, 0);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshStandardMaterial({ color: 0x7b837a })); ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 5; group.add(ceiling);
  const light = new THREE.PointLight(0xd7e1ca, 3.2, 28); light.position.set(0, 4.2, 0); group.add(light);
  const displayRing = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.42, .22, 32), new THREE.MeshStandardMaterial({ color: 0x26332e, metalness: .62, roughness: .3, emissive: 0x214c3b, emissiveIntensity: .2 })); displayRing.position.set(0, .11, -1); group.add(displayRing);
  const displayLight = new THREE.SpotLight(0xcde5d1, 3.2, 13, Math.PI / 5, .5, 1.4); displayLight.position.set(0, 4.5, 1.2); displayLight.target.position.set(0, 1, -1); group.add(displayLight, displayLight.target);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.1, .14), new THREE.MeshStandardMaterial({ color: 0x19251f, emissive: 0x1b4a3a, emissiveIntensity: .7 })); panel.position.set(0, 2.45, -10.72); group.add(panel);
  const label = new THREE.Mesh(new THREE.BoxGeometry(2.4, .13, .04), new THREE.MeshBasicMaterial({ color: 0x8bd9bd })); label.position.set(0, 3.1, -10.62); group.add(label);
  for (let i = 0; i < 4; i++) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.1, .08, .5), new THREE.MeshStandardMaterial({ color: 0xdde3d1, emissive: 0xb7d9bf, emissiveIntensity: 1.1 })); lamp.position.set(-6 + i * 4, 4.85, 0); group.add(lamp);
  }
  scene.add(group); return group;
}
