import * as THREE from 'three';
import { OUTFITS } from './config.js';
import { createCookieTexture } from './textures.js';

function disposeObject(root) {
  root?.traverse(object => {
    object.geometry?.dispose();
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
    else object.material?.dispose();
  });
}

export function buildAvatar(custom = {}, scale = 1) {
  const outfit = OUTFITS[custom.outfit] || OUTFITS.hazmat;
  const primary = new THREE.Color(custom.primaryColor || outfit.base);
  const accent = new THREE.Color(custom.accentColor || outfit.accent);
  const group = new THREE.Group(); group.scale.setScalar(scale);
  const suitMat = new THREE.MeshStandardMaterial({ color: primary, roughness: .82 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: .42, metalness: .12, emissive: accent, emissiveIntensity: .08 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x202a28, roughness: .74 });
  const paleMat = new THREE.MeshStandardMaterial({ color: 0xd7ded5, roughness: .84 });
  const add = (geometry, material, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };

  // A complete primitive-built body keeps the avatar independent of downloaded model files.
  add(new THREE.CapsuleGeometry(.29, .72, 4, 8), suitMat, 0, 1.12, 0);
  add(new THREE.SphereGeometry(.23, 12, 10), accentMat, 0, 1.88, 0);
  const visor = add(new THREE.SphereGeometry(.18, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55), darkMat, 0, 1.91, -.07);
  visor.scale.set(1.05, .72, .72);
  add(new THREE.BoxGeometry(.39, .055, .32), accentMat, 0, 1.94, -.13);
  for (const side of [-1, 1]) {
    const arm = add(new THREE.CapsuleGeometry(.105, .53, 3, 7), suitMat, side * .39, 1.18, 0); arm.rotation.z = side * -.16;
    add(new THREE.SphereGeometry(.12, 8, 8), darkMat, side * .42, .79, -.02);
    const leg = add(new THREE.CapsuleGeometry(.12, .52, 3, 7), suitMat, side * .16, .39, 0); leg.rotation.z = side * -.025;
    add(new THREE.BoxGeometry(.25, .13, .42), darkMat, side * .16, .08, -.07);
  }
  add(new THREE.BoxGeometry(.62, .08, .23), accentMat, 0, .72, .12);

  const style = custom.outfit || 'hazmat';
  if (style === 'hazmat') {
    const hood = add(new THREE.SphereGeometry(.3, 12, 10, 0, Math.PI * 2, .15, Math.PI * .76), suitMat, 0, 1.92, 0);
    hood.scale.set(1.12, .98, 1.08);
    add(new THREE.TorusGeometry(.25, .035, 7, 18), accentMat, 0, 1.87, -.06);
  } else if (style === 'tactical') {
    add(new THREE.BoxGeometry(.58, .48, .18), darkMat, 0, 1.28, -.2);
    add(new THREE.BoxGeometry(.18, .18, .08), accentMat, -.13, 1.32, -.3);
    add(new THREE.BoxGeometry(.18, .18, .08), accentMat, .13, 1.32, -.3);
    const helmet = add(new THREE.SphereGeometry(.28, 12, 8, 0, Math.PI * 2, 0, Math.PI * .52), darkMat, 0, 2.02, 0);
    helmet.scale.set(1.15, .66, 1.05);
  } else if (style === 'maintenance') {
    add(new THREE.BoxGeometry(.68, .1, .36), darkMat, 0, .78, 0);
    for (let i = -1; i <= 1; i++) add(new THREE.BoxGeometry(.12, .16, .12), accentMat, i * .2, .78, -.2);
    add(new THREE.BoxGeometry(.12, .58, .035), accentMat, .16, 1.18, -.31);
  } else if (style === 'researcher') {
    add(new THREE.BoxGeometry(.59, .82, .1), paleMat, 0, 1.16, -.23);
    add(new THREE.BoxGeometry(.19, .12, .035), accentMat, .13, 1.36, -.3);
    add(new THREE.BoxGeometry(.035, .45, .035), accentMat, 0, 1.1, -.31);
  }

  const misc = custom.accessories || {};
  if (misc.backpack) {
    add(new THREE.BoxGeometry(.42, .55, .22), darkMat, 0, 1.26, .28);
    add(new THREE.BoxGeometry(.5, .08, .26), accentMat, 0, 1.42, .29);
    for (const side of [-1, 1]) add(new THREE.BoxGeometry(.09, .42, .12), accentMat, side * .25, 1.22, .24);
  }
  if (misc.shoulderLight) {
    const lamp = add(new THREE.CylinderGeometry(.06, .07, .22, 8), accentMat, -.44, 1.55, -.06); lamp.rotation.z = Math.PI / 2;
    const beam = new THREE.PointLight(0xffe6a8, .35, 2.5); beam.position.set(-.52, 1.55, -.08); group.add(beam);
  }
  if (misc.gasMask) {
    add(new THREE.BoxGeometry(.28, .2, .14), darkMat, 0, 1.73, -.22);
    for (const side of [-1, 1]) add(new THREE.CylinderGeometry(.065, .065, .1, 10), accentMat, side * .18, 1.73, -.19).rotation.z = Math.PI / 2;
  }
  if (misc.bodycam) {
    add(new THREE.BoxGeometry(.18, .12, .1), darkMat, .15, 2.1, .03);
    const led = add(new THREE.SphereGeometry(.025, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3434 }), .15, 2.1, -.035);
    led.userData.blink = true;
  }
  if (misc.glowsticks) {
    for (const side of [-1, 1]) {
      const glow = add(new THREE.CylinderGeometry(.025, .025, .32, 8), new THREE.MeshStandardMaterial({ color: 0x6cffb3, emissive: 0x38ff9c, emissiveIntensity: 1.8 }), side * .28, .7, .18);
      glow.rotation.z = Math.PI / 4;
    }
  }
  if (misc.antenna) {
    const rod = add(new THREE.CylinderGeometry(.012, .012, .75, 6), darkMat, .25, 2.28, .1); rod.rotation.z = -.12;
    add(new THREE.SphereGeometry(.045, 8, 8), accentMat, .2, 2.67, .1);
  }
  group.userData.customization = structuredClone(custom);
  return group;
}

export class AvatarPreview {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111a17);
    this.camera = new THREE.PerspectiveCamera(34, 1, .1, 30);
    this.camera.position.set(0, 2.1, 6.3); this.camera.lookAt(0, 1.08, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.add(new THREE.HemisphereLight(0xd8eadf, 0x29342d, 2.1));
    const key = new THREE.DirectionalLight(0xffe7c6, 2.6); key.position.set(-3, 6, 4); this.scene.add(key);
    const rim = new THREE.PointLight(0x66cdb6, 1.7, 10); rim.position.set(2, 2, -2); this.scene.add(rim);
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.25, .18, 36), new THREE.MeshStandardMaterial({ color: 0x26332e, metalness: .65, roughness: .3 }));
    platform.position.y = .09; this.scene.add(platform);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.04, .025, 7, 56), new THREE.MeshBasicMaterial({ color: 0x6ed5b8 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = .2; this.scene.add(ring);
    this.avatar = null; this.visible = true; this.time = 0;
    this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.resize()) : null;
    this.resizeObserver?.observe(canvas);
    this.setCustomization({ outfit: 'hazmat', primaryColor: '#b7a65c', accentColor: '#55d7d0', accessories: { backpack: true } });
    this.resize();
    this.frame = this.frame.bind(this); this.raf = requestAnimationFrame(this.frame);
  }

  setCustomization(custom) {
    if (this.avatar) { this.scene.remove(this.avatar); disposeObject(this.avatar); }
    this.avatar = buildAvatar(custom, .94); this.avatar.position.y = .18; this.avatar.rotation.y = Math.PI;
    this.scene.add(this.avatar);
  }
  setVisible(value) { this.visible = !!value; this.canvas.classList.toggle('preview-hidden', !this.visible); }
  resize() {
    const width = Math.max(1, this.canvas.clientWidth || 250), height = Math.max(1, this.canvas.clientHeight || 250);
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  }
  frame() {
    this.raf = requestAnimationFrame(this.frame);
    if (!this.visible) return;
    this.time += .016;
    if (this.avatar) {
      this.avatar.rotation.y = Math.PI + Math.sin(this.time * .32) * .28;
      this.avatar.traverse(object => {
        if (object.userData.blink) object.visible = Math.sin(this.time * 3.7) > -.72;
      });
    }
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    cancelAnimationFrame(this.raf); this.resizeObserver?.disconnect();
    if (this.avatar) disposeObject(this.avatar);
    this.renderer.dispose();
  }
}

export class PlayerController {
  constructor(camera, domElement, scene, settings, callbacks = {}) {
    this.camera = camera; this.domElement = domElement; this.scene = scene; this.settings = settings;
    this.callbacks = callbacks; this.position = new THREE.Vector3(0, 0, 4); this.yaw = 0; this.pitch = 0;
    this.velocity = new THREE.Vector3(); this.stamina = 100; this.battery = 100; this.sanity = 100;
    this.batteries = 0; this.almondWater = 0; this.health = 100; this.isDowned = false; this.isCrouching = false;
    this.flashlightOn = true; this.keys = new Set(); this.active = false; this.lastFootstep = 0; this.walkie = false; this.isMoving = false;
    this.isHiding = false; this.hideSpot = null; this.jumpQueued = false; this.verticalVelocity = 0; this.grounded = true; this.inWater = false; this._hideFlashlight = false;
    this.slideVelocity = new THREE.Vector3(); this.hazardCooldown = 0;
    this.avatar = null; this._lookHandler = event => this.onMouseMove(event);
    this._down = event => this.onKeyDown(event); this._up = event => this.onKeyUp(event);
    window.addEventListener('keydown', this._down); window.addEventListener('keyup', this._up);
    this.domElement.addEventListener('click', () => { if (this.active && !this.pointerLocked) this.domElement.requestPointerLock?.(); });
    this.pointerLocked = false;
    this._pointerLockChange = () => { this.pointerLocked = document.pointerLockElement === this.domElement; };
    document.addEventListener('pointerlockchange', this._pointerLockChange);
    document.addEventListener('mousemove', this._lookHandler);
    this.camera.rotation.order = 'YXZ';
    this.flashTarget = new THREE.Object3D(); this.flashTarget.position.set(0, 0, -1); this.camera.add(this.flashTarget);
    this.flashlight = new THREE.SpotLight(0xfff1ca, 5.2, 22, Math.PI / 7, .42, 1.3);
    this.flashlight.position.set(0, 0, 0); this.flashlight.target = this.flashTarget; this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(512, 512); this.camera.add(this.flashlight);
    this.flashlight.cookie = createCookieTexture();
    this.camera.add(this.flashlight.target);
    this.flashVolume = new THREE.Mesh(new THREE.ConeGeometry(3.2, 12, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9b5, map: createCookieTexture(), transparent: true, opacity: .045, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.flashVolume.rotation.x = Math.PI / 2; this.flashVolume.position.set(0, 0, -6); this.camera.add(this.flashVolume);
    this.avatarRoot = new THREE.Group(); this.scene.add(this.avatarRoot);
    this.setCustomization({ outfit: 'hazmat', primaryColor: '#b7a65c', accentColor: '#55d7d0', accessories: { backpack: true } });
    this.camera.position.copy(this.position).add(new THREE.Vector3(0, 1.68, 0));
  }

  setCustomization(custom) {
    const wasVisible = this.avatarRoot.visible;
    if (this.avatar) { this.avatarRoot.remove(this.avatar); disposeObject(this.avatar); }
    this.avatar = buildAvatar(custom, 1); this.avatarRoot.add(this.avatar);
    this.avatarRoot.visible = wasVisible && !this.isHiding;
    this.callbacks.onCustomization?.(custom);
  }

  onMouseMove(event) {
    if (!this.active || !this.pointerLocked || this.isHiding) return;
    const s = this.settings().sensitivity ?? .8;
    this.yaw -= event.movementX * .0022 * s;
    const invert = this.settings().invertY ? -1 : 1;
    this.pitch -= event.movementY * .0022 * s * invert;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.48, 1.48);
  }

  getBind(action) {
    return this.settings().keybinds?.[action] || ({ forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', sprint: 'ShiftLeft', crouch: 'ControlLeft', flashlight: 'KeyF', interact: 'KeyE', walkie: 'KeyV', jump: 'Space' })[action];
  }

  onKeyDown(event) {
    if (event.code === 'Escape' && this.active) { this.callbacks.onPause?.(); return; }
    if (event.code === this.getBind('jump')) { event.preventDefault(); if (!event.repeat && this.active && !this.isHiding) this.jumpQueued = true; }
    this.keys.add(event.code);
    if (!this.active || event.repeat) return;
    if (event.code === this.getBind('flashlight')) this.toggleFlashlight();
    if (event.code === this.getBind('interact')) this.callbacks.onInteract?.();
    if (event.code === this.getBind('walkie')) { this.walkie = true; this.callbacks.onWalkie?.(true); }
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
    if (event.code === this.getBind('walkie') && this.walkie) { this.walkie = false; this.callbacks.onWalkie?.(false); }
  }

  setActive(value) {
    this.active = value;
    if (!value) { this.keys.clear(); this.jumpQueued = false; if (document.pointerLockElement) document.exitPointerLock?.(); }
  }

  setPosition(position) {
    this.position.copy(position); this.velocity.set(0, 0, 0); this.slideVelocity.set(0, 0, 0); this.verticalVelocity = 0; this.grounded = true; this.jumpQueued = false;
    this.keys.clear(); this.isCrouching = false; this.isMoving = false; this.isHiding = false; this.hideSpot = null;
    this.camera.position.set(position.x, position.y + 1.68, position.z);
    this.avatarRoot.position.copy(position); this.avatarRoot.visible = false;
  }

  enterHideSpot(spot) {
    if (this.isHiding || !spot) return false;
    this.isHiding = true; this.hideSpot = spot; this.position.copy(spot.position); this.velocity.set(0, 0, 0); this.slideVelocity.set(0, 0, 0); this.verticalVelocity = 0; this.grounded = true;
    this._hideFlashlight = this.flashlightOn;
    if (this.flashlightOn) { this.flashlightOn = false; this.flashlight.visible = false; this.flashVolume.visible = false; }
    this.avatarRoot.visible = false; this.keys.clear(); this.isMoving = false;
    this.callbacks.onHide?.(true, spot);
    return true;
  }

  leaveHideSpot() {
    if (!this.isHiding) return false;
    const spot = this.hideSpot;
    if (spot?.exitPosition) this.position.copy(spot.exitPosition);
    this.isHiding = false; this.hideSpot = null; this.avatarRoot.visible = false;
    if (this._hideFlashlight && this.battery > 0) { this.flashlightOn = true; this.flashlight.visible = true; this.flashVolume.visible = true; }
    this._hideFlashlight = false; this.callbacks.onHide?.(false, spot);
    return true;
  }

  toggleFlashlight() {
    if (this.isHiding) return;
    this.flashlightOn = !this.flashlightOn && this.battery > 0;
    this.flashlight.visible = this.flashlightOn; this.flashVolume.visible = this.flashlightOn;
    this.callbacks.onCaption?.(this.flashlightOn ? '[Flashlight clicks on]' : '[Flashlight clicks off]');
  }

  addBattery(amount = 32) { this.battery = Math.min(100, this.battery + amount); }
  addWater() { this.almondWater++; this.sanity = Math.min(100, this.sanity + 22); this.health = Math.min(100, this.health + 25); }

  update(dt, world, difficulty = 'NORMAL', time = 0) {
    if (!this.active || this.isDowned) return;
    const cfg = {
      EXPLORER: { staminaDrain: 0, batteryDrain: 0, sanityDrain: 0 },
      EASY: { staminaDrain: .65, batteryDrain: .42, sanityDrain: .5 },
      NORMAL: { staminaDrain: 1, batteryDrain: .72, sanityDrain: .85 },
      HARD: { staminaDrain: 1.2, batteryDrain: 1.15, sanityDrain: 1.4 }
    }[difficulty] || { staminaDrain: 1, batteryDrain: .72, sanityDrain: .85 };

    if (this.isHiding) {
      this.camera.position.set(this.position.x, this.position.y + 1.2, this.position.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      this.flashlight.visible = false; this.flashVolume.visible = false;
      return;
    }

    const forward = (this.keys.has(this.getBind('forward')) ? 1 : 0) - (this.keys.has(this.getBind('backward')) ? 1 : 0);
    const strafe = (this.keys.has(this.getBind('right')) ? 1 : 0) - (this.keys.has(this.getBind('left')) ? 1 : 0);
    const moving = forward !== 0 || strafe !== 0;
    this.isMoving = moving;
    this.isCrouching = this.keys.has(this.getBind('crouch'));
    this.inWater = !!world?.isInWaterAt?.(this.position.x, this.position.z, this.position.y);
    const wantsSprint = this.keys.has(this.getBind('sprint')) && moving && !this.isCrouching && this.stamina > 1 && difficulty !== 'EXPLORER';
    const onIce = !!world?.isOnIceAt?.(this.position.x, this.position.z, this.position.y);
    const speed = (this.isCrouching ? 1.4 : wantsSprint ? 6.3 : 3.5) * (this.inWater ? .68 : 1) * (onIce ? 1.04 : 1);
    if (wantsSprint) this.stamina = Math.max(0, this.stamina - 20 * cfg.staminaDrain * dt);
    else this.stamina = Math.min(100, this.stamina + 23 * dt);

    if (this.jumpQueued && this.grounded) {
      this.verticalVelocity = 5.45; this.grounded = false; this.callbacks.onFootstep?.('jump', this.position.clone());
    }
    this.jumpQueued = false;

    const forwardDir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const rightDir = new THREE.Vector3(forwardDir.z, 0, -forwardDir.x);
    const inputDirection = forwardDir.multiplyScalar(-forward).add(rightDir.multiplyScalar(strafe));
    if (inputDirection.lengthSq() > 0) inputDirection.normalize().multiplyScalar(speed);
    let movement;
    if (onIce) {
      this.slideVelocity.lerp(inputDirection, Math.min(1, dt * 3.2));
      if (!moving) this.slideVelocity.multiplyScalar(Math.max(0, 1 - dt * .72));
      movement = this.slideVelocity.clone().multiplyScalar(dt);
    } else {
      this.slideVelocity.set(0, 0, 0);
      movement = inputDirection.multiplyScalar(dt);
    }

    const radius = .29;
    const blocked = (x, z, footY) => (world?.colliders || []).some(box => {
      const minY = box.minY ?? -Infinity, maxY = box.maxY ?? Infinity;
      const verticalOverlap = footY + 1.72 > minY && footY + .12 < maxY;
      return verticalOverlap && x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ;
    });
    const canStandAt = (x, z) => {
      const ground = world?.getGroundHeightAt?.(x, z, this.position.y);
      if (ground == null || !Number.isFinite(ground)) return false;
      if (this.grounded && Math.abs(ground - this.position.y) > .58) return false;
      return !blocked(x, z, Math.max(this.position.y, ground));
    };

    const beforeY = this.position.y;
    const tryX = this.position.x + movement.x, tryZ = this.position.z + movement.z;
    if (movement.x && canStandAt(tryX, this.position.z)) this.position.x = tryX;
    if (movement.z && canStandAt(this.position.x, tryZ)) this.position.z = tryZ;

    const groundHeight = world?.getGroundHeightAt?.(this.position.x, this.position.z, this.position.y);
    if (Number.isFinite(groundHeight)) {
      if (this.grounded) this.position.y = groundHeight;
      else {
        this.verticalVelocity -= 15.5 * dt;
        this.position.y += this.verticalVelocity * dt;
        if (this.position.y <= groundHeight) {
          this.position.y = groundHeight; this.verticalVelocity = 0; this.grounded = true;
          if (beforeY > groundHeight + .7) this.callbacks.onFootstep?.('land', this.position.clone());
        }
      }
    } else if (!this.grounded) {
      this.verticalVelocity -= 15.5 * dt; this.position.y += this.verticalVelocity * dt;
    }

    this.hazardCooldown = Math.max(0, this.hazardCooldown - dt);
    const nearbyHazard = world?.getHazardAt?.(this.position.x, this.position.z, this.position.y);
    if (nearbyHazard && this.hazardCooldown <= 0) {
      this.hazardCooldown = 2.4;
      this.stamina = Math.max(0, this.stamina - 9);
      this.sanity = Math.max(0, this.sanity - 3.5);
      this.callbacks.onHazard?.(nearbyHazard.type);
    }

    if (moving && time - this.lastFootstep > (this.isCrouching ? .82 : wantsSprint ? .3 : .48)) {
      this.lastFootstep = time;
      this.callbacks.onFootstep?.(wantsSprint ? 'run' : this.isCrouching ? 'crouch' : this.inWater ? 'splash' : 'walk', this.position.clone());
    }

    if (difficulty !== 'EXPLORER' && this.flashlightOn && this.battery > 0) {
      this.battery = Math.max(0, this.battery - cfg.batteryDrain * dt * .34);
      if (this.battery <= 0) { this.flashlightOn = false; this.flashlight.visible = false; this.flashVolume.visible = false; this.callbacks.onCaption?.('[Flashlight battery depleted]'); }
    }
    if (this.battery < 15 && this.flashlightOn && !this.settings().photosensitive && Math.random() < dt * (15 - this.battery) * .045) this.flashlight.intensity = .2;
    else this.flashlight.intensity = this.flashlightOn ? 5.2 * (.58 + this.battery / 240) : 0;
    this.flashVolume.visible = this.flashlightOn;
    this.sanity = Math.max(0, this.sanity - cfg.sanityDrain * dt * .08);

    const bob = moving && this.grounded ? Math.sin(time * (wantsSprint ? 15 : 10)) * (this.settings().bobbing ?? .5) * .045 : 0;
    const eyeHeight = this.isCrouching ? 1.05 : 1.68;
    this.camera.position.set(this.position.x, this.position.y + eyeHeight + bob, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.avatarRoot.position.copy(this.position); this.avatarRoot.rotation.y = this.yaw;
  }

  getState() {
    return {
      x: this.position.x, y: this.position.y, z: this.position.z, yaw: this.yaw, pitch: this.pitch,
      stamina: this.stamina, battery: this.battery, sanity: this.sanity, downed: this.isDowned,
      walkie: this.walkie, flashlight: this.flashlightOn, crouching: this.isCrouching,
      moving: this.isMoving, hiding: this.isHiding, inWater: this.inWater
    };
  }

  applyRemoteState(state) {
    this.position.set(state.x, state.y || 0, state.z); this.yaw = state.yaw || 0;
    this.avatarRoot.position.copy(this.position); this.avatarRoot.rotation.y = this.yaw;
  }

  dispose() {
    window.removeEventListener('keydown', this._down); window.removeEventListener('keyup', this._up);
    document.removeEventListener('mousemove', this._lookHandler); document.removeEventListener('pointerlockchange', this._pointerLockChange);
    disposeObject(this.avatar); this.scene.remove(this.avatarRoot); disposeObject(this.flashVolume);
  }
}

export function createRemoteAvatar(scene, customization) {
  const root = new THREE.Group(); let avatar = buildAvatar(customization, .98); root.add(avatar); scene.add(root);
  return {
    root,
    update(state) { root.position.set(state.x || 0, state.y || 0, state.z || 0); root.rotation.y = state.yaw || 0; root.visible = !state.hiding; },
    setCustomization(next) { root.remove(avatar); disposeObject(avatar); avatar = buildAvatar(next, .98); root.add(avatar); },
    dispose() { scene.remove(root); disposeObject(avatar); }
  };
}
