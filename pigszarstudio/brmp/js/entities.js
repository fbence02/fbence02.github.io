import * as THREE from 'three';
import { buildAvatar } from './player.js';
import { makeRng } from './levelGenerator.js';

export class NavGrid {
  constructor(worldOrMaze, cellSize = 4, cols, rows) {
    this.world = worldOrMaze?.floors ? worldOrMaze : null;
    this.maze = this.world ? this.world.floors[0].maze : worldOrMaze;
    this.cellSize = this.world?.cellSize || cellSize;
    this.cols = this.world?.cols || cols || this.maze[0].length;
    this.rows = this.world?.rows || rows || this.maze.length;
  }

  floorIndex(position) { return this.world?.floorIndexForPosition(position) ?? 0; }
  worldToCell(position, floorIndex = this.floorIndex(position)) {
    const floor = this.world?.floors[floorIndex];
    const originX = floor?.originX ?? -(this.cols * this.cellSize) / 2;
    return {
      x: THREE.MathUtils.clamp(Math.floor((position.x - originX) / this.cellSize), 0, this.cols - 1),
      y: THREE.MathUtils.clamp(Math.floor(position.z / this.cellSize + this.rows / 2), 0, this.rows - 1)
    };
  }

  cellToWorld(cell, floorIndex = 0) {
    const floor = this.world?.floors[floorIndex];
    const originX = floor?.originX ?? -(this.cols * this.cellSize) / 2;
    const y = floor?.y ?? 0;
    return new THREE.Vector3(originX + (cell.x + .5) * this.cellSize, y, (cell.y - this.rows / 2 + .5) * this.cellSize);
  }

  hasLineOfSight(fromWorld, toWorld) {
    if (this.floorIndex(fromWorld) !== this.floorIndex(toWorld)) return false;
    const floorIndex = this.floorIndex(fromWorld);
    const maze = this.world?.floors[floorIndex]?.maze || this.maze;
    const dx = toWorld.x - fromWorld.x, dz = toWorld.z - fromWorld.z;
    const distance = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(distance / (this.cellSize * .08)));
    let previous = this.worldToCell(fromWorld, floorIndex);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const current = this.worldToCell({ x: fromWorld.x + dx * t, z: fromWorld.z + dz * t }, floorIndex);
      if (current.x === previous.x && current.y === previous.y) continue;
      const cell = maze[previous.y]?.[previous.x];
      if (!cell) return false;
      if (current.x > previous.x && cell.E) return false;
      if (current.x < previous.x && cell.W) return false;
      if (current.y > previous.y && cell.S) return false;
      if (current.y < previous.y && cell.N) return false;
      previous = current;
    }
    return true;
  }

  neighbors(cell, floorIndex) {
    const maze = this.world?.floors[floorIndex]?.maze || this.maze;
    const c = maze[cell.y]?.[cell.x]; if (!c) return [];
    const out = [];
    if (!c.N && cell.y > 0) out.push({ x: cell.x, y: cell.y - 1 });
    if (!c.E && cell.x < this.cols - 1) out.push({ x: cell.x + 1, y: cell.y });
    if (!c.S && cell.y < this.rows - 1) out.push({ x: cell.x, y: cell.y + 1 });
    if (!c.W && cell.x > 0) out.push({ x: cell.x - 1, y: cell.y });
    return out;
  }

  findPathOnFloor(fromWorld, toWorld, floorIndex) {
    const start = this.worldToCell(fromWorld, floorIndex), goal = this.worldToCell(toWorld, floorIndex);
    const key = cell => `${cell.x},${cell.y}`;
    const startKey = key(start), goalKey = key(goal);
    if (startKey === goalKey) return [];
    const open = [start], came = new Map(), costs = new Map([[startKey, 0]]);
    const scores = new Map([[startKey, Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y)]]);
    const visited = new Set(); let iterations = 0;
    while (open.length && iterations++ < 1800) {
      open.sort((a, b) => (scores.get(key(a)) ?? Infinity) - (scores.get(key(b)) ?? Infinity));
      const current = open.shift(), currentKey = key(current);
      if (currentKey === goalKey) {
        const path = []; let cursor = currentKey;
        while (came.has(cursor)) {
          const cell = came.get(cursor); path.unshift(cell); cursor = key(cell);
        }
        return path.map(cell => this.cellToWorld(cell, floorIndex));
      }
      visited.add(currentKey);
      for (const next of this.neighbors(current, floorIndex)) {
        const nextKey = key(next); if (visited.has(nextKey)) continue;
        const candidate = (costs.get(currentKey) ?? Infinity) + 1;
        if (candidate < (costs.get(nextKey) ?? Infinity)) {
          came.set(nextKey, current); costs.set(nextKey, candidate);
          scores.set(nextKey, candidate + Math.abs(next.x - goal.x) + Math.abs(next.y - goal.y));
          if (!open.some(cell => key(cell) === nextKey)) open.push(next);
        }
      }
    }
    return [];
  }

  findPath(fromWorld, toWorld) {
    if (!this.world) return this.findPathOnFloor(fromWorld, toWorld, 0);
    let current = fromWorld.clone();
    let currentFloor = this.floorIndex(fromWorld);
    const targetFloor = this.floorIndex(toWorld);
    const result = [];
    if (currentFloor === targetFloor) return this.findPathOnFloor(current, toWorld, currentFloor);

    while (currentFloor < targetFloor) {
      const stair = this.world.stairs.find(item => item.fromFloor === currentFloor);
      if (!stair) break;
      const lowerLanding = this.cellToWorld(stair.fromCell, currentFloor);
      result.push(...this.findPathOnFloor(current, lowerLanding, currentFloor));
      result.push(...stair.waypoints.slice(1));
      current = stair.to.clone(); currentFloor++;
    }
    while (currentFloor > targetFloor) {
      const stair = this.world.stairs.find(item => item.toFloor === currentFloor);
      if (!stair) break;
      const upperLanding = this.cellToWorld(stair.toCell, currentFloor);
      result.push(...this.findPathOnFloor(current, upperLanding, currentFloor));
      result.push(...stair.waypoints.slice(0, -1).reverse());
      current = stair.from.clone(); currentFloor--;
    }
    result.push(...this.findPathOnFloor(current, toWorld, targetFloor));
    return result;
  }
}

function makeHowler() {
  const root = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: 0x070b0b, roughness: .27, metalness: .15 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x293c38, roughness: .42, emissive: 0x081714 });
  const eye = new THREE.MeshStandardMaterial({ color: 0xfff0ca, emissive: 0xf3b9aa, emissiveIntensity: 1.7 });
  const add = (geometry, material, x, y, z) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; root.add(mesh); return mesh; };
  add(new THREE.SphereGeometry(.34, 12, 10), dark, 0, 2.75, 0).scale.set(.8, 1.25, .8);
  add(new THREE.CapsuleGeometry(.27, 1.15, 4, 8), skin, 0, 1.55, 0);
  for (const side of [-1, 1]) {
    const arm = add(new THREE.CapsuleGeometry(.075, 1.55, 3, 6), dark, side * .48, 1.65, 0); arm.rotation.z = side * -.21;
    add(new THREE.SphereGeometry(.14, 8, 8), skin, side * .7, .8, -.05);
    const leg = add(new THREE.CapsuleGeometry(.09, 1.1, 3, 6), dark, side * .2, .55, 0); leg.rotation.z = side * .12;
    add(new THREE.SphereGeometry(.065, 8, 8), eye, side * .12, 2.8, -.27);
  }
  add(new THREE.TorusGeometry(.23, .035, 6, 18), skin, 0, 1.55, -.25).scale.set(1.2, 1.5, 1);
  return root;
}

function makeSmiler() {
  const root = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(.56, 16, 12), new THREE.MeshBasicMaterial({ color: 0x010203 }));
  root.add(head); head.position.y = 1.8;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff2ca });
  for (const side of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.075, 8, 8), eyeMat); eye.position.set(side * .2, 1.93, -.48); root.add(eye); }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 5, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0xe6e1cf }));
  smile.position.set(0, 1.59, -.48); smile.rotation.z = Math.PI; root.add(smile);
  const body = new THREE.Mesh(new THREE.ConeGeometry(.3, 1.3, 8), new THREE.MeshBasicMaterial({ color: 0x050809 })); body.position.y = .75; root.add(body);
  const glow = new THREE.PointLight(0xf4ead1, .22, 3); glow.position.set(0, 1.8, -.3); root.add(glow);
  return root;
}

function makeSkinStealer() {
  const avatar = buildAvatar({ outfit: 'maintenance', primaryColor: '#424b46', accentColor: '#8d9a8b', accessories: { backpack: false, gasMask: false } }, 1.06);
  avatar.traverse(object => {
    if (!object.isMesh || !object.material?.color) return;
    object.material = object.material.clone(); object.material.color.multiplyScalar(.46); object.material.emissive = new THREE.Color(0x120b0b);
  });
  return avatar;
}

export class EntitySystem {
  constructor(scene, world, difficulty = 'NORMAL', callbacks = {}) {
    this.scene = scene; this.world = world; this.difficulty = difficulty; this.callbacks = callbacks;
    this.entities = []; this.nav = new NavGrid(world); this.time = 0; this.rand = makeRng((world.seed ^ 0xa53c9e17) >>> 0);
    const count = ({ EXPLORER: 0, EASY: 1, NORMAL: 2, HARD: 3 })[difficulty] ?? 0;
    const types = world.style === 'void' ? ['smiler', 'howler', 'smiler', 'skinstealer'] : ['howler', 'skinstealer', 'smiler', 'howler'];
    for (let index = 0; index < count; index++) this.spawn(types[(world.levelId + index) % types.length], index);
  }

  spawn(type, index) {
    const floorIndex = (index + this.world.levelId) % this.world.floors.length;
    const floor = this.world.floors[floorIndex];
    const candidates = [];
    for (let y = 1; y < this.world.rows - 1; y++) for (let x = 1; x < this.world.cols - 1; x++) {
      const point = this.nav.cellToWorld({ x, y }, floorIndex);
      if (point.distanceTo(this.world.spawn) > 10 && this.world.objectives.every(objective => objective.position.distanceTo(point) > 4)) candidates.push(point);
    }
    const spawn = candidates.length ? candidates[Math.floor(this.rand() * candidates.length)].clone() : this.nav.cellToWorld({ x: Math.floor(this.world.cols / 2), y: Math.floor(this.world.rows / 2) }, floorIndex);
    const mesh = type === 'smiler' ? makeSmiler() : type === 'skinstealer' ? makeSkinStealer() : makeHowler();
    mesh.position.copy(spawn); this.scene.add(mesh);
    // The player has a genuine speed advantage while sprinting. Monsters win
    // by cutting routes, using sound, and searching; they are not unavoidable homing missiles.
    const baseSpeed = ({ EASY: 1.35, NORMAL: 1.65, HARD: 1.9 })[this.difficulty] || 0;
    this.entities.push({
      id: `entity-${index}`, type, mesh, state: 'patrol', stateTime: 2 + this.rand() * 4,
      route: [], routeIndex: 0, routeTarget: null, target: null, speed: baseSpeed * Math.min(this.world.meta.difficulty || 1, 1.2),
      scareCooldown: 0, phase: index * 2.1, lastKnown: mesh.position.clone(), searchTime: 0,
      chaseLostTime: 0, repathCooldown: 0, suspicion: 0, searchOffset: null, searchStarted: false, micAlertCooldown: 0
    });
  }

  setDifficulty(value) { this.difficulty = value; }

  investigate(position, intensity = 1, radius = 18) {
    if (!position) return;
    for (const entity of this.entities) {
      const distance = entity.mesh.position.distanceTo(position);
      if (distance > radius * Math.max(.35, intensity)) continue;
      if (entity.state === 'chase' || entity.state === 'jumpscare') continue;
      const sameFloor = this.nav.floorIndex(entity.mesh.position) === this.nav.floorIndex(position);
      if (!sameFloor && distance > radius * .45) continue;
      entity.state = 'investigate'; entity.target = position.clone(); entity.lastKnown.copy(position);
      entity.stateTime = 5.5 + intensity * 2.2; entity.searchTime = 0; entity.searchOffset = null; entity.searchStarted = false;
      entity.route = []; entity.routeTarget = null; entity.repathCooldown = 0;
    }
  }

  update(dt, players = [], time = 0) {
    this.time = time;
    const activePlayers = players.filter(player => !player.downed);
    for (const entity of this.entities) {
      const previousState = entity.state;
      entity.scareCooldown = Math.max(0, entity.scareCooldown - dt);
      entity.repathCooldown = Math.max(0, entity.repathCooldown - dt);
      let targetPlayer = null, nearest = Infinity, targetVisible = false, closeToHidingPlayer = false;
      entity.micAlertCooldown = Math.max(0, entity.micAlertCooldown - dt);

      for (const candidate of activePlayers) {
        const distance = entity.mesh.position.distanceTo(candidate.position);
        const sameFloor = this.nav.floorIndex(entity.mesh.position) === this.nav.floorIndex(candidate.position);
        if (candidate.hiding) {
          // A locker is safe only while the player remains quiet. Investigating
          // entities can discover a hiding player if they spend time searching nearby.
          if (sameFloor && distance < 1.85 && entity.state === 'investigate') {
            closeToHidingPlayer = true;
            entity.suspicion += dt * (candidate.noiseLevel > .35 ? 1.75 : .52);
            if (entity.suspicion > 2.35) {
              targetPlayer = candidate; nearest = distance; targetVisible = true;
            }
          }
          continue;
        }
        const crouched = !!candidate.crouching;
        const baseRange = entity.type === 'smiler' ? 13 : entity.type === 'skinstealer' ? 16 : 19;
        const visualRange = baseRange * (crouched ? (candidate.moving ? .58 : .43) : 1) * (candidate.flashlight ? 1.17 : .83);
        const toPlayer = candidate.position.clone().sub(entity.mesh.position); toPlayer.y = 0;
        const enemyForward = new THREE.Vector3(-Math.sin(entity.mesh.rotation.y), 0, -Math.cos(entity.mesh.rotation.y));
        const viewDot = toPlayer.lengthSq() > .001 ? enemyForward.dot(toPlayer.normalize()) : 1;
        const fieldOfViewDot = entity.type === 'smiler' ? .70 : entity.type === 'skinstealer' ? .55 : .42;
        const insideFieldOfView = viewDot >= fieldOfViewDot;
        const visibleByWalls = sameFloor && distance < visualRange && insideFieldOfView && this.nav.hasLineOfSight(entity.mesh.position, candidate.position);
        const lookDirection = new THREE.Vector3(-Math.sin(candidate.yaw || 0), 0, -Math.cos(candidate.yaw || 0));
        const toEntity = entity.mesh.position.clone().sub(candidate.position); toEntity.y = 0;
        const lookingAtSmiler = entity.type === 'smiler' && toEntity.lengthSq() > .001 && lookDirection.dot(toEntity.normalize()) > .68;
        const visible = visibleByWalls && !lookingAtSmiler;
        if (visible && distance < nearest) { nearest = distance; targetPlayer = candidate; targetVisible = true; }
        if (entity.type === 'smiler' && lookingAtSmiler && candidate.flashlight && distance < 12) {
          const away = entity.mesh.position.clone().sub(candidate.position); away.y = 0;
          if (away.lengthSq() > .001) away.normalize();
          entity.target = entity.mesh.position.clone().addScaledVector(away, 6);
          entity.state = 'stalk'; entity.stateTime = 1.8; entity.route = []; entity.routeTarget = null;
        }
      }

      if (!closeToHidingPlayer) entity.suspicion = Math.max(0, entity.suspicion - dt * .8);
      if (this.difficulty === 'HARD' && entity.micAlertCooldown <= 0) {
        const heard = activePlayers.filter(player => !player.hiding && (player.micLevel || 0) > .085)
          .sort((a, b) => entity.mesh.position.distanceTo(a.position) - entity.mesh.position.distanceTo(b.position))[0];
        if (heard && entity.state !== 'chase' && entity.state !== 'jumpscare' && entity.mesh.position.distanceTo(heard.position) < 23) {
          entity.state = 'investigate'; entity.target = heard.position.clone(); entity.lastKnown.copy(entity.target);
          entity.stateTime = 6; entity.searchTime = 0; entity.route = []; entity.routeTarget = null; entity.micAlertCooldown = 2.1;
        }
      }

      if (targetVisible && targetPlayer) {
        if (!targetPlayer.hiding) entity.suspicion = 0;
        if (entity.type === 'smiler' && targetPlayer.flashlight && nearest > 3.4) {
          const away = entity.mesh.position.clone().sub(targetPlayer.position); away.y = 0;
          if (away.lengthSq() > .001) away.normalize();
          entity.target = entity.mesh.position.clone().addScaledVector(away, 7);
          entity.state = 'stalk'; entity.stateTime = 1.6; entity.route = []; entity.routeTarget = null;
        } else {
          entity.state = 'chase'; entity.target = targetPlayer.position.clone(); entity.lastKnown.copy(targetPlayer.position);
          entity.chaseLostTime = 0; entity.stateTime = 2.8; entity.route = [];
        }
      } else if (entity.state === 'chase') {
        entity.chaseLostTime += dt;
        entity.stateTime -= dt;
        if (entity.stateTime <= 0 || entity.chaseLostTime > 1.9) {
          entity.state = 'investigate'; entity.target = entity.lastKnown.clone();
          entity.stateTime = 7.2; entity.searchTime = 0; entity.searchOffset = null; entity.searchStarted = false; entity.route = []; entity.routeTarget = null;
        }
      } else if (entity.state === 'investigate') {
        entity.searchTime += dt; entity.stateTime -= dt;
        if (!entity.searchStarted) {
          entity.target = entity.lastKnown.clone(); entity.searchStarted = true;
          entity.searchOffset = null; entity.route = []; entity.routeTarget = null;
        } else if (entity.searchTime > 2.0 && (!entity.searchOffset || entity.mesh.position.distanceTo(entity.target) < 1.15)) {
          const floorIndex = this.nav.floorIndex(entity.lastKnown);
          const baseCell = this.nav.worldToCell(entity.lastKnown, floorIndex);
          const radius = 1 + Math.floor(this.rand() * 3);
          const targetCell = {
            x: THREE.MathUtils.clamp(baseCell.x + Math.floor((this.rand() - .5) * radius * 2), 0, this.world.cols - 1),
            y: THREE.MathUtils.clamp(baseCell.y + Math.floor((this.rand() - .5) * radius * 2), 0, this.world.rows - 1)
          };
          entity.searchOffset = this.nav.cellToWorld(targetCell, floorIndex);
          entity.target = entity.searchOffset.clone(); entity.searchTime = 0; entity.route = []; entity.routeTarget = null;
        }
        if (entity.stateTime <= 0 || entity.searchTime > 8.5) {
          entity.state = 'patrol'; entity.target = this.randomWaypoint(); entity.stateTime = 5 + this.rand() * 5;
          entity.route = []; entity.routeTarget = null; entity.suspicion = 0;
        }
      } else if (entity.state === 'stalk') {
        entity.stateTime -= dt;
        if (entity.stateTime <= 0) { entity.state = 'patrol'; entity.target = this.randomWaypoint(); entity.stateTime = 4 + this.rand() * 4; }
      } else if (entity.state === 'patrol' && (entity.stateTime <= 0 || !entity.target)) {
        entity.target = this.randomWaypoint(); entity.stateTime = 5 + this.rand() * 6; entity.route = []; entity.routeTarget = null;
      } else {
        entity.stateTime -= dt;
      }

      if (entity.state === 'chase' && targetPlayer && targetVisible && nearest < 1.42 && entity.scareCooldown <= 0) {
        entity.scareCooldown = 10; entity.state = 'jumpscare';
        this.callbacks.onJumpscare?.({ entity, player: targetPlayer });
      }
      if (entity.state !== previousState && entity.state === 'chase') this.callbacks.onCue?.('[Heavy footsteps approaching]');
      if (entity.state !== previousState && entity.state === 'investigate') this.callbacks.onCue?.('[Something searches nearby]');
      if (entity.state === 'jumpscare') continue;

      this.moveEntity(entity, dt);
      if (entity.target) entity.mesh.rotation.y = Math.atan2(entity.target.x - entity.mesh.position.x, entity.target.z - entity.mesh.position.z);
      const ground = this.world.getGroundHeightAt(entity.mesh.position.x, entity.mesh.position.z, entity.mesh.position.y);
      const bob = Math.sin(time * (entity.state === 'chase' ? 9 : 5) + entity.phase) * .035;
      if (Number.isFinite(ground)) entity.mesh.position.y = ground + (entity.type === 'smiler' ? .22 + Math.sin(time * 2 + entity.phase) * .14 : bob);
      if (entity.type === 'howler') entity.mesh.rotation.z = Math.sin(time * 3 + entity.phase) * .035;
    }
  }

  randomWaypoint() {
    const floorIndex = Math.floor(this.rand() * this.world.floors.length);
    const x = 1 + Math.floor(this.rand() * (this.world.cols - 2));
    const y = 1 + Math.floor(this.rand() * (this.world.rows - 2));
    return this.nav.cellToWorld({ x, y }, floorIndex);
  }

  moveEntity(entity, dt) {
    if (!entity.target) { entity.target = this.randomWaypoint(); return; }
    const needsPath = !entity.route.length || entity.routeIndex >= entity.route.length || !entity.routeTarget || entity.routeTarget.distanceTo(entity.target) > 1.8;
    if (needsPath && entity.repathCooldown <= 0) {
      entity.route = this.nav.findPath(entity.mesh.position, entity.target);
      entity.routeIndex = 0; entity.routeTarget = entity.target.clone(); entity.repathCooldown = entity.state === 'chase' ? .38 : .85;
    }
    const waypoint = entity.route[entity.routeIndex] || entity.target;
    const direction = waypoint.clone().sub(entity.mesh.position); direction.y = 0;
    const distance = direction.length();
    if (distance < .42) { entity.routeIndex++; return; }
    direction.normalize();
    const multiplier = entity.state === 'chase' ? (entity.type === 'howler' ? 1.28 : 1.16) : entity.state === 'stalk' ? .58 : .78;
    entity.mesh.position.addScaledVector(direction, entity.speed * multiplier * dt);
  }

  serialize() {
    return this.entities.map(entity => ({
      id: entity.id, type: entity.type, x: entity.mesh.position.x, y: entity.mesh.position.y,
      z: entity.mesh.position.z, state: entity.state, yaw: entity.mesh.rotation.y
    }));
  }

  applyRemote(states) {
    for (const state of states || []) {
      const entity = this.entities.find(item => item.id === state.id);
      if (!entity) continue;
      entity.mesh.position.set(state.x, state.y || 0, state.z);
      entity.mesh.rotation.y = state.yaw || 0; entity.state = state.state || entity.state;
    }
  }

  dispose() {
    for (const entity of this.entities) {
      this.scene.remove(entity.mesh);
      entity.mesh.traverse(object => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material?.dispose();
      });
    }
    this.entities.length = 0;
  }
}
