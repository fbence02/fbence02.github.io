import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LEVELS, MAX_PLAYERS, DIFFICULTIES } from './config.js';
import { buildLevel, buildSafeRoom } from './levelGenerator.js';
import { PlayerController, createRemoteAvatar, AvatarPreview } from './player.js';
import { EntitySystem } from './entities.js';
import { NetworkManager } from './network.js';
import { AudioEngine } from './audio.js';
import { UIManager } from './ui.js';

const canvas = document.getElementById('game-canvas');
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x111613);
const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, .08, 180);
camera.position.set(0, 1.68, 6); camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8)); renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const VHSShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uEnabled: { value: 1 }, uIntensity: { value: .34 }, uChromatic: { value: 0 }, uBrightness: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uEnabled; uniform float uIntensity; uniform float uChromatic; uniform float uBrightness; varying vec2 vUv;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    void main(){
      vec2 uv=vUv; float bend=dot(uv-.5,uv-.5); uv=(uv-.5)*(1.0+0.035*bend*uEnabled)+.5;
      float jitter=(hash(vec2(floor(uTime*13.0),floor(uv.y*95.0)))-.5)*.0035*uEnabled;
      uv.x+=jitter; float ca=(.0015+uChromatic*.008)*uEnabled;
      vec2 dir=normalize(uv-.5+vec2(.0001));
      vec3 col; col.r=texture2D(tDiffuse,uv+dir*ca).r; col.g=texture2D(tDiffuse,uv).g; col.b=texture2D(tDiffuse,uv-dir*ca).b;
      float scan=sin(uv.y*930.0+uTime*2.0)*.035*uIntensity*uEnabled;
      float grain=(hash(uv*vec2(1200.0,700.0)+uTime)-.5)*.08*uIntensity*uEnabled;
      float vignette=1.0-smoothstep(.25,.82,length(uv-.5))*0.28*uEnabled;
      float tracking=step(.992,hash(vec2(floor(uTime*2.4),floor(uv.y*40.0))))*.12*uEnabled;
      col=(col+grain+tracking-scan)*uBrightness*vignette;
      gl_FragColor=vec4(col,1.0);
    }`
};
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const vhsPass = new ShaderPass(VHSShader); composer.addPass(vhsPass); composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0xd8e1d5, 0x28302b, 1.05); scene.add(hemi);
const keyLight = new THREE.DirectionalLight(0xd7dec9, 1.15); keyLight.position.set(-7, 12, 5); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.camera.left = -18; keyLight.shadow.camera.right = 18; keyLight.shadow.camera.top = 18; keyLight.shadow.camera.bottom = -18; scene.add(keyLight);

let safeRoom = buildSafeRoom(scene);
const avatarPreview = new AvatarPreview(document.getElementById('avatar-preview-canvas'));
let world = null, entities = null, gameState = 'menu', gameMode = 'solo', difficulty = 'NORMAL', levelId = 0, levelSeed = 781239;
let gameTime = 0, snapshotClock = 0, localMicLevel = 0, interactionText = '', spectating = false;
let recentLevelIds = [0];
let blackoutCooldown = 55 + Math.random() * 35, blackoutRemaining = 0;
let exitRequestPending = false, lastExitRequestAt = 0, micAlertCooldown = 0, lastSpawnAssignments = {};
const network = new NetworkManager();
const remotePlayers = new Map();
const raycaster = new THREE.Raycaster();

const ui = new UIManager({
  onSettings: settings => applySettings(settings),
  onSettingsClose: () => ui.showSettings(false),
  onCustomization: custom => {
    player.setCustomization(custom); avatarPreview.setCustomization(custom); network.playerInfo.customization = custom;
    if (network.role === 'client') network.send({ type: 'customization', customization: custom });
    else if (network.role === 'host') network.broadcast({ type: 'customization', peerId: network.peer?.id, customization: custom });
  },
  onRequestMic: () => enableMicrophone(),
});
const audio = new AudioEngine(() => ui.settings, message => ui.caption(message));

const player = new PlayerController(camera, canvas, scene, () => ui.settings, {
  onPause: () => pauseGame(),
  onFootstep: (kind, position) => {
    const pan = Math.sin(player.yaw) * .15; audio.footstep(kind === 'splash' ? 'walk' : kind === 'land' ? 'run' : kind, pan);
    if (gameState === 'playing') {
      const noise = ({ run: [1.3, 27], walk: [.62, 13], crouch: [.16, 4.2], splash: [1.05, 23], jump: [.92, 16], land: [1.25, 18] })[kind] || [.55, 12];
      if (gameMode === 'solo' || network.role === 'host') entities?.investigate(position, noise[0], noise[1]);
      else network.send({ type: 'sound-event', kind, x: position.x, y: position.y, z: position.z, intensity: noise[0], radius: noise[1] });
    }
  },
  onInteract: () => handleInteract(),
  onCaption: message => ui.caption(message),
  onHazard: type => {
    if (type === 'steam') { ui.caption('[A pressure vent releases scalding vapor]'); audio.makeNoise(.18, .07, 'bandpass', 850); }
  },
  onHide: (hidden) => {
    ui.caption(hidden ? '[You hold your breath inside the hiding place]' : '[You leave the hiding place]');
    if (hidden) ui.toast('HIDDEN // STAY QUIET', 1700);
  },
  onWalkie: active => {
    audio.setWalkieMode(active); audio.setPushToTalk(active);
    if (network.role === 'client') network.send({ type: 'walkie-state', active });
    if (network.role === 'host') network.broadcast({ type: 'walkie-state', peerId: network.peer?.id, active });
    if (active && entities) entities.investigate(player.position, .95);
  }
});
player.setPosition(new THREE.Vector3(0, 0, 6));

function applySettings(settings) {
  renderer.setPixelRatio(Math.min((window.devicePixelRatio || 1) * settings.resolutionScale, 2));
  camera.fov = settings.fov; camera.updateProjectionMatrix();
  composer.setPixelRatio?.(Math.min((window.devicePixelRatio || 1) * settings.resolutionScale, 2));
  vhsPass.uniforms.uEnabled.value = settings.vhsEnabled ? 1 : 0;
  vhsPass.uniforms.uBrightness.value = settings.brightness;
  vhsPass.uniforms.uIntensity.value = settings.photosensitive ? .08 : .34;
  scene.fog && (scene.fog.density = settings.fogDensity);
  keyLight.castShadow = settings.shadowQuality !== 'Off';
  keyLight.shadow.mapSize.set(settings.shadowQuality === 'High' ? 2048 : settings.shadowQuality === 'Low' ? 512 : 1024, settings.shadowQuality === 'High' ? 2048 : settings.shadowQuality === 'Low' ? 512 : 1024);
  audio?.setVolumes();
  audio?.setSpatialAudio(settings.spatialAudio);
  if (audio?.micDestination) audio.setPushToTalk(settings.voiceMode === 'open' || player?.walkie);
  ui.showVHS(settings.vhsEnabled);
}

async function activateAudio() {
  try { await audio.init(); return true; } catch (error) { ui.toast(error.message || 'Audio could not start.'); return false; }
}

async function enableMicrophone() {
  try {
    await activateAudio();
    const stream = await audio.requestMicrophone(ui.settings.audioInput);
    await network.setLocalStream(stream);
    ui.toast('MICROPHONE CONNECTED'); ui.populateAudioInputs();
    if (ui.settings.voiceMode === 'ptt') audio.setPushToTalk(player.walkie);
    else audio.setPushToTalk(true);
    return true;
  } catch (error) { ui.toast(`MICROPHONE: ${error.message || 'ACCESS DENIED'}`); return false; }
}

function openLobby(code = 'SOLO', status = 'READY FOR DESCENT') {
  gameState = 'lobby'; ui.showScreen('lobby-screen'); ui.showHUD(false); ui.showPause(false); ui.showSettings(false);
  ui.setRoomCode(code); ui.setLobbyStatus(status);
  ui.setPlayerRoster([{ peerId: 'local', isLocal: true, player: { name: 'YOU' } }]);
  if (safeRoom) { safeRoom.visible = true; }
  camera.position.set(0, 1.68, 6); camera.rotation.set(0, 0, 0);
  const savedCustomization = ui.getCustomization();
  player.setCustomization(savedCustomization);
  player.avatarRoot.visible = false;
  avatarPreview.setCustomization(savedCustomization); avatarPreview.setVisible(true);
  player.setActive(false);
  const start = document.getElementById('start-game-btn'); if (start) start.disabled = gameMode === 'client';
}

async function enterSoloLobby() {
  gameMode = 'solo'; difficulty = ui.getDifficulty();
  network.close(); await activateAudio(); openLobby('SOLO', 'LOCAL SESSION // NO SIGNAL REQUIRED');
}

async function createHostedLobby() {
  await activateAudio(); gameMode = 'host'; difficulty = ui.getDifficulty();
  ui.setLobbyStatus('CONTACTING PEERJS SIGNALING...');
  try {
    const code = await network.host(ui.getCustomization(), 'HOST');
    openLobby(code, 'ROOM OPEN // SHARE THE FOUR-CHARACTER CODE');
    ui.setPlayerRoster([{ peerId: 'local', isLocal: true, player: { name: 'HOST' } }]);
  } catch (error) { gameMode = 'solo'; ui.toast(`HOST FAILED: ${error.message || error}`); openLobby('SOLO', 'OFFLINE SESSION'); }
}

async function joinHostedLobby() {
  const input = document.getElementById('room-code-input'); const code = input?.value?.trim().toUpperCase() || '';
  await activateAudio(); gameMode = 'client';
  ui.setLobbyStatus('CONNECTING TO ROOM...');
  try {
    await network.join(code, ui.getCustomization(), 'SURVIVOR');
    openLobby(code, 'CONNECTED // WAITING FOR HOST TO BEGIN');
    if (document.getElementById('start-game-btn')) document.getElementById('start-game-btn').disabled = true;
  } catch (error) { network.close(); gameMode = 'solo'; ui.showScreen('main-menu'); ui.toast(`JOIN FAILED: ${error.message || error}`); }
}

function clearRemotePlayers() { for (const view of remotePlayers.values()) view.avatar.dispose(); remotePlayers.clear(); }

function makeRemote(peerId, customization) {
  let record = remotePlayers.get(peerId);
  if (record) { if (customization) { record.customization = customization; record.avatar.setCustomization(customization); } return record; }
  const avatar = createRemoteAvatar(scene, customization || {});
  const slot = remotePlayers.size; avatar.root.position.set(-3 + slot * 2, 0, -2.4); avatar.root.rotation.y = Math.PI;
  record = { avatar, customization: customization || {}, state: { x: avatar.root.position.x, y: 0, z: avatar.root.position.z, yaw: Math.PI, downed: false }, target: avatar.root.position.clone(), micLevel: 0, walkie: false, inventory: { water: 0, batteries: 0 } };
  avatar.root.visible = true; remotePlayers.set(peerId, record); return record;
}

function updateRoster(players = []) {
  const roster = players.map((item, index) => {
    const local = item.peerId === network.peer?.id || item.peerId === 'local';
    if (!local && item.peerId) makeRemote(item.peerId, item.player?.customization);
    return { ...item, isLocal: local };
  });
  if (!roster.some(item => item.isLocal)) roster.unshift({ peerId: 'local', isLocal: true, player: { name: 'YOU' } });
  ui.setPlayerRoster(roster);
}

const multiplayerSpawnOffsets = [
  new THREE.Vector3(0, 0, 0), new THREE.Vector3(1.05, 0, 0),
  new THREE.Vector3(-1.05, 0, 0), new THREE.Vector3(0, 0, 1.05)
];

function pointRecord(position) { return { x: position.x, y: position.y, z: position.z }; }

function setRemoteSpawn(record, position) {
  record.target.copy(position); record.avatar.root.position.copy(position);
  record.state = { ...record.state, x: position.x, y: position.y, z: position.z, yaw: -Math.PI / 2, downed: false, hiding: false, moving: false, crouching: false };
}

function startLevel(nextLevelId = 0, nextSeed = 781239, nextDifficulty = difficulty, fromNetwork = false, spawnAssignments = null) {
  const freshRun = !world;
  if (freshRun) recentLevelIds = [nextLevelId];
  if (entities) entities.dispose(); entities = null;
  if (world) { world.dispose(); world = null; }
  if (safeRoom) { scene.remove(safeRoom); safeRoom = null; }
  levelId = nextLevelId; levelSeed = nextSeed; difficulty = nextDifficulty;
  blackoutRemaining = 0; blackoutCooldown = 55 + Math.random() * 35; exitRequestPending = false; hemi.intensity = 1.05; keyLight.intensity = 1.15;
  world = buildLevel(scene, levelId, levelSeed, difficulty);
  entities = new EntitySystem(scene, world, difficulty, { onJumpscare: event => onEntityJumpscare(event), onCue: message => ui.caption(message) });
  hemi.intensity = world.lighting.ambient; keyLight.intensity = world.lighting.directional;
  scene.fog = new THREE.FogExp2(levelFogColor(world.style), ui.settings.fogDensity);
  scene.background = new THREE.Color(levelFogColor(world.style));
  lastSpawnAssignments = {};
  if (network.role === 'host') {
    if (network.peer?.id) lastSpawnAssignments[network.peer.id] = pointRecord(world.spawn);
    let slot = 1;
    for (const [peerId, record] of remotePlayers) {
      const offset = multiplayerSpawnOffsets[slot] || new THREE.Vector3(0, 0, -1.05 * slot);
      const spawn = world.spawn.clone().add(offset);
      setRemoteSpawn(record, spawn); lastSpawnAssignments[peerId] = pointRecord(spawn); slot++;
    }
  } else if (network.role === 'client' && spawnAssignments) {
    for (const [peerId, record] of remotePlayers) {
      const assigned = spawnAssignments[peerId];
      if (assigned) setRemoteSpawn(record, new THREE.Vector3(assigned.x, assigned.y || 0, assigned.z));
    }
  }
  const localAssignment = network.role === 'client' ? spawnAssignments?.[network.peer?.id] : null;
  const localSpawn = localAssignment ? new THREE.Vector3(localAssignment.x, localAssignment.y || 0, localAssignment.z) : world.spawn;
  player.setPosition(localSpawn); player.yaw = -Math.PI / 2; player.pitch = 0; player.isDowned = false; player.isCrouching = false;
  if (network.role === 'host') network.lastSentState = {};
  if (network.role === 'client') network.lastReceivedState = {};
  micAlertCooldown = 0;
  player.avatarRoot.visible = false; avatarPreview.setVisible(false);
  if (freshRun) { player.stamina = 100; player.battery = 100; player.sanity = 100; player.health = 100; player.batteries = 0; player.almondWater = 0; }
  player.avatarRoot.visible = false; player.setActive(true); player.flashlightOn = player.battery > 0; player.flashlight.visible = player.flashlightOn; player.flashVolume.visible = player.flashlightOn;
  for (const record of remotePlayers.values()) record.avatar.root.visible = true;
  gameState = 'playing'; spectating = false; avatarPreview.setVisible(false); ui.showScreen(null); ui.showHUD(true); ui.showPause(false); ui.showSettings(false); ui.showDowned(false);
  ui.toast(`OBJECTIVE: ${world.mission.title} // ${world.mission.verb} ${world.objectiveCount} ${world.mission.plural}`, 5200);
  ui.caption('[Fluorescent buzz]'); audio.exitTone();
  if (gameMode === 'host' && !fromNetwork) network.broadcast({ type: 'start-game', levelId, seed: levelSeed, difficulty, spawns: lastSpawnAssignments });
}

function levelFogColor(style) {
  return ({ wallpaper: 0x99916a, carpet: 0x66654e, tile: 0x537d7b, rust: 0x464c48, foliage: 0x2e4c38, ice: 0x6794aa, void: 0x080d14, concrete: 0x515b58 })[style] || 0x5a625d;
}

function onEntityJumpscare({ entity, player: target }) {
  if (!target) return;
  if (target.id === 'local') {
    if (player.isDowned) return;
    if (player.isHiding) player.leaveHideSpot();
    player.isDowned = true; player.setActive(false); camera.lookAt(entity.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)));
    const canSpectate = Array.from(remotePlayers.values()).some(record => !record.state.downed);
    ui.showDowned(true, { singlePlayer: gameMode === 'solo', canSpectate }); ui.showJumpscare(); audio.jumpscare();
    if (gameMode === 'host') network.broadcast({ type: 'player-downed', peerId: network.peer?.id });
  } else {
    const record = remotePlayers.get(target.id); if (record) record.state.downed = true;
    if (network.role === 'host') network.broadcast({ type: 'player-downed', peerId: target.id });
  }
  const allDown = player.isDowned && Array.from(remotePlayers.values()).every(r => r.state.downed);
  if (allDown) ui.toast('NO SURVIVORS LEFT STANDING', 5000);
}

function nearestPickup() {
  if (!world) return null;
  let found = null, min = 2.15;
  world.pickups.forEach((pickup, index) => {
    const d = pickup.position.distanceTo(player.position);
    if (d < min) { min = d; found = { pickup, index, distance: d }; }
  });
  return found;
}

function nearestHideSpot() {
  if (!world || player.isHiding) return null;
  let found = null, minimum = 2.15;
  for (const spot of world.hideSpots) {
    const distance = spot.position.distanceTo(player.position);
    if (distance < minimum) { minimum = distance; found = { spot, distance }; }
  }
  return found;
}

function nearestObjective() {
  if (!world) return null;
  let found = null, min = 2.35;
  world.objectives.forEach((objective, index) => {
    if (objective.userData.active) return;
    const distance = objective.position.distanceTo(player.position);
    if (distance < min) { min = distance; found = { objective, index, distance }; }
  });
  return found;
}

function activateObjective(index, playerId = 'local') {
  if (!world || !world.objectives[index] || world.objectives[index].userData.active) return false;
  const origin = playerId === 'local' ? player.position : remotePlayers.get(playerId)?.avatar.root.position;
  if (!origin || origin.distanceTo(world.objectives[index].position) > 2.8) return false;
  const changed = world.activateObjective(index);
  if (!changed) return false;
  audio.pickup();
  ui.toast(`${world.mission.item} ${world.objectiveProgress}/${world.objectiveCount} // COMPLETE`);
  ui.caption(`[${world.mission.item} online]`);
  if (world.exitUnlocked) ui.toast(`EXIT UNLOCKED // ${world.mission.exit}`, 3500);
  if (gameMode === 'host') network.broadcast({ type: 'objective-activated', index });
  return true;
}

function handleInteract() {
  if (gameState !== 'playing' || player.isDowned) return;
  if (player.isHiding) { player.leaveHideSpot(); return; }
  const hideSpot = nearestHideSpot();
  if (hideSpot) { player.enterHideSpot(hideSpot.spot); return; }
  const pickup = nearestPickup();
  if (pickup) {
    if (gameMode === 'client') { network.send({ type: 'pickup-request', index: pickup.index }); return; }
    collectPickup(pickup.index, 'local'); return;
  }
  const objective = nearestObjective();
  if (objective) {
    if (gameMode === 'client') network.send({ type: 'objective-request', index: objective.index });
    else activateObjective(objective.index, 'local');
    return;
  }
  let revived = false;
  for (const [id, record] of remotePlayers) {
    if (record.state.downed && record.avatar.root.position.distanceTo(player.position) < 3 && player.almondWater > 0) {
      if (gameMode === 'client') { network.send({ type: 'revive-request', targetId: id }); return; }
      player.almondWater--; record.state.downed = false; network.sendTo(id, { type: 'player-revived' }); network.broadcast({ type: 'player-revive-update', peerId: id }); ui.toast('TEAMMATE REVIVED'); audio.pickup(); revived = true; break;
    }
  }
  if (revived) return;
  if (world && player.position.distanceTo(world.exitPosition) < 2.4) {
    if (!world.exitUnlocked) { ui.toast(`EXIT SEALED // ${world.mission.verb} ${world.objectiveCount - world.objectiveProgress} MORE ${world.mission.plural}`); return; }
    if (gameMode === 'client') { if (!exitRequestPending) { exitRequestPending = true; network.send({ type: 'exit-request' }); } } else advanceLevel();
  }
}

function collectPickup(index, playerId) {
  if (!world || !world.pickups[index]) return;
  const pickup = world.pickups[index]; const kind = pickup.userData.kind;
  if (playerId === 'local') {
    if (kind === 'battery') { player.addBattery(38); player.batteries++; }
    else player.addWater();
    ui.toast(kind === 'battery' ? '9V BATTERY ACQUIRED' : 'ALMOND WATER ACQUIRED');
  } else {
    const record = remotePlayers.get(playerId);
    if (record) { if (kind === 'battery') record.inventory.batteries++; else record.inventory.water++; }
    network.sendTo(playerId, { type: 'pickup-result', index, kind });
  }
  audio.pickup(); world.root.remove(pickup); pickup.traverse(o => { o.geometry?.dispose(); if (o.material) o.material.dispose(); });
  world.pickups.splice(index, 1);
  if (gameMode === 'host') network.broadcast({ type: 'pickup-removed', index });
}

function advanceLevel() {
  if (gameMode === 'client') return;
  const recent = new Set(recentLevelIds.slice(-8));
  const choices = LEVELS.slice(1).map(item => item.id).filter(id => !recent.has(id));
  const pool = choices.length ? choices : LEVELS.slice(1).map(item => item.id);
  const next = pool[Math.floor(Math.random() * pool.length)];
  recentLevelIds.push(next);
  if (recentLevelIds.length > 9) recentLevelIds.shift();
  const seed = Math.floor(Math.random() * 0x7fffffff);
  lastExitRequestAt = Date.now();
  startLevel(next, seed, difficulty, true);
  if (gameMode === 'host') network.broadcast({ type: 'level-change', levelId: next, seed, difficulty, spawns: lastSpawnAssignments });
}

function restartCurrentLevel() {
  if (gameMode !== 'solo' || !world) return;
  ui.showDowned(false);
  player.stamina = 100; player.battery = 100; player.sanity = 100; player.health = 100; player.batteries = 0; player.almondWater = 0;
  startLevel(levelId, levelSeed, difficulty, true);
  canvas.requestPointerLock?.();
}

function returnToSafeRoom() {
  if (gameMode !== 'solo') { leaveToTitle(); return; }
  player.setActive(false); player.isDowned = false; player.setPosition(new THREE.Vector3(0, 0, 6));
  if (entities) entities.dispose(); entities = null;
  if (world) world.dispose(); world = null;
  if (safeRoom) scene.remove(safeRoom); safeRoom = buildSafeRoom(scene);
  scene.fog = null; scene.background = new THREE.Color(0x111613);
  camera.position.set(0, 1.68, 6); camera.rotation.set(0, 0, 0);
  player.avatarRoot.visible = false; avatarPreview.setCustomization(ui.getCustomization()); avatarPreview.setVisible(true);
  spectating = false; gameState = 'lobby';
  ui.showDowned(false); ui.showHUD(false); ui.showPause(false); ui.showSettings(false); ui.showScreen('lobby-screen');
  ui.setRoomCode('SOLO'); ui.setLobbyStatus('RUN ENDED // SAFE ROOM READY');
  ui.setPlayerRoster([{ peerId: 'local', isLocal: true, player: { name: 'YOU' } }]);
  const start = document.getElementById('start-game-btn'); if (start) start.disabled = false;
}

function pauseGame() {
  if (gameState !== 'playing' || player.isDowned) return;
  gameState = 'paused'; player.setActive(false); ui.showPause(true);
}
function resumeGame() { if (gameState !== 'paused') return; gameState = 'playing'; player.setActive(true); ui.showPause(false); canvas.requestPointerLock?.(); }
function leaveToTitle() {
  player.setActive(false); network.close(); audio.stopMicrophone(); avatarPreview.setVisible(false); for (const id of Array.from(audio.voiceNodes.keys())) audio.disconnectVoice(id);
  if (entities) entities.dispose(); entities = null; if (world) world.dispose(); world = null;
  clearRemotePlayers(); if (safeRoom) scene.remove(safeRoom); safeRoom = buildSafeRoom(scene);
  player.isDowned = false; player.setPosition(new THREE.Vector3(0, 0, 6)); player.avatarRoot.visible = false;
  scene.fog = null; scene.background = new THREE.Color(0x111613); gameState = 'menu'; gameMode = 'solo';
  ui.showHUD(false); ui.showDowned(false); ui.showPause(false); ui.showSettings(false); ui.showScreen('main-menu');
}

// Host-authoritative networking events and peer lifecycle.
network.on('status', status => {
  if (status.state === 'reconnected') ui.toast('SIGNAL RESTORED');
  if (status.state === 'reconnect-failed') ui.toast('HOST CONNECTION LOST');
});
network.on('error', error => ui.toast(`NETWORK: ${error?.message || error}`));
network.on('player-joined', ({ peerId, player: info }) => {
  const record = makeRemote(peerId, info?.customization); ui.toast('SURVIVOR CONNECTED');
  if (network.role === 'host' && gameState === 'playing' && world) {
    const slot = Math.max(1, Array.from(remotePlayers.keys()).indexOf(peerId) + 1);
    const offset = multiplayerSpawnOffsets[slot] || new THREE.Vector3(0, 0, -1.05 * slot);
    const spawn = world.spawn.clone().add(offset); setRemoteSpawn(record, spawn);
    const spawns = { ...(lastSpawnAssignments || {}), [network.peer.id]: pointRecord(player.position), [peerId]: pointRecord(spawn) };
    lastSpawnAssignments = spawns;
    // Keep the initial state snapshot on the reliable channel after start-game
    // so a late joiner cannot receive world state before its level exists.
    network.sendTo(peerId, { type: 'start-game', levelId, seed: levelSeed, difficulty, spawns });
    network.sendTo(peerId, { type: 'state-delta', delta: { players: serializePlayers(), entities: entities?.serialize() || [], objectives: world.objectives.map(item => !!item.userData.active), pickups: world.pickups.map(item => item.userData.spawnId) } }, 'control');
  }
});
network.on('peer-disconnected', ({ peerId }) => { const item = remotePlayers.get(peerId); if (item) { item.avatar.dispose(); remotePlayers.delete(peerId); audio.disconnectVoice(peerId); } ui.toast('A SURVIVOR DISCONNECTED'); });
network.on('roster', roster => updateRoster(roster));
network.on('voice-stream', ({ peerId, stream }) => audio.connectRemoteVoice(peerId, stream));
network.on('voice-close', ({ peerId }) => audio.disconnectVoice(peerId));
network.on('rejected', reason => ui.toast(reason || 'ROOM REJECTED CONNECTION'));
network.on('state', state => {
  for (const [id, snap] of Object.entries(state.players || {})) {
    if (id === network.peer?.id) continue;
    const record = makeRemote(id, snap.customization); record.state = { ...record.state, ...snap }; record.target.set(snap.x ?? 0, snap.y ?? 0, snap.z ?? 0); record.walkie = !!snap.walkie; record.micLevel = snap.micLevel || 0;
  }
  entities?.applyRemote(state.entities || []);
  if (Array.isArray(state.objectives)) world?.applyObjectiveStates(state.objectives);
  if (Array.isArray(state.pickups) && world) {
    const remaining = new Set(state.pickups);
    for (let index = world.pickups.length - 1; index >= 0; index--) {
      const pickup = world.pickups[index];
      if (!remaining.has(pickup.userData.spawnId)) { world.root.remove(pickup); world.pickups.splice(index, 1); }
    }
  }
  if (state.pickupsRemoved) for (const index of state.pickupsRemoved) { if (world?.pickups[index]) { world.root.remove(world.pickups[index]); world.pickups.splice(index, 1); } }
});
network.on('packet', ({ peerId, packet }) => {
  if (packet.type === 'start-game' && gameMode === 'client') startLevel(packet.levelId, packet.seed, packet.difficulty, true, packet.spawns);
  else if (packet.type === 'level-change' && gameMode === 'client') startLevel(packet.levelId, packet.seed, packet.difficulty, true, packet.spawns);
  else if (packet.type === 'player-input' && network.role === 'host') {
    const record = makeRemote(peerId, packet.customization); record.state = { ...record.state, ...packet.state }; record.target.set(packet.state.x, packet.state.y || 0, packet.state.z); record.walkie = !!packet.state.walkie; record.micLevel = packet.micLevel || 0;
  } else if (packet.type === 'customization') {
    const targetId = packet.peerId || peerId;
    if (network.role === 'host') { makeRemote(targetId, packet.customization); network.broadcast({ type: 'customization', peerId: targetId, customization: packet.customization }); }
    else if (targetId !== network.peer?.id) makeRemote(targetId, packet.customization);
  } else if (packet.type === 'walkie-state') {
    const targetId = packet.peerId || peerId; const record = remotePlayers.get(targetId); if (record) record.walkie = !!packet.active;
    audio.setRemoteRadio(targetId, !!packet.active);
    if (packet.active && entities) { const p = record?.avatar.root.position || new THREE.Vector3(); entities.investigate(p, 1); }
  } else if (packet.type === 'sound-event' && entities) entities.investigate(new THREE.Vector3(packet.x, packet.y || 0, packet.z), packet.intensity || (packet.kind === 'run' ? 1 : .55), packet.radius || (packet.kind === 'run' ? 23 : 12));
  else if (packet.type === 'objective-request' && network.role === 'host') {
    activateObjective(packet.index, peerId);
  } else if (packet.type === 'objective-activated') {
    if (world) world.activateObjective(packet.index);
  }
  else if (packet.type === 'pickup-request' && network.role === 'host') {
    const remote = remotePlayers.get(peerId), item = world?.pickups[packet.index];
    if (remote && item && remote.avatar.root.position.distanceTo(item.position) < 2.65) collectPickup(packet.index, peerId);
  }
  else if (packet.type === 'pickup-result') {
    if (packet.kind === 'battery') { player.addBattery(38); player.batteries++; } else player.addWater(); ui.toast(packet.kind === 'battery' ? '9V BATTERY ACQUIRED' : 'ALMOND WATER ACQUIRED'); audio.pickup();
  } else if (packet.type === 'pickup-removed') {
    if (world?.pickups[packet.index]) { world.root.remove(world.pickups[packet.index]); world.pickups.splice(packet.index, 1); }
  } else if (packet.type === 'exit-request' && network.role === 'host') {
    const remote = remotePlayers.get(peerId);
    if (remote && world?.exitUnlocked && remote.avatar.root.position.distanceTo(world.exitPosition) < 2.6 && Date.now() - lastExitRequestAt > 2500) {
      lastExitRequestAt = Date.now(); advanceLevel();
    } else network.sendTo(peerId, { type: 'exit-denied', reason: world && !world.exitUnlocked ? `${world.mission.verb} ALL ${world.mission.plural} FIRST` : 'MOVE CLOSER TO THE EXIT' });
  } else if (packet.type === 'exit-denied') {
    exitRequestPending = false; ui.toast(packet.reason || 'EXIT REQUEST DENIED');
  } else if (packet.type === 'blackout') triggerBlackout(packet.duration || 5);
  else if (packet.type === 'revive-request' && network.role === 'host') {
    const helper = remotePlayers.get(peerId);
    if (helper && helper.inventory.water > 0) {
      const targetId = packet.targetId;
      const targetPosition = targetId === network.peer?.id ? player.position : remotePlayers.get(targetId)?.avatar.root.position;
      if (!targetPosition || helper.avatar.root.position.distanceTo(targetPosition) > 3.1) return;
      helper.inventory.water--;
      if (targetId === network.peer?.id) { player.isDowned = false; player.health = 75; player.sanity = Math.max(35, player.sanity); player.setActive(true); spectating = false; ui.showDowned(false); }
      else { const target = remotePlayers.get(targetId); if (target) target.state.downed = false; network.sendTo(targetId, { type: 'player-revived' }); }
      network.sendTo(peerId, { type: 'revive-success' }); network.broadcast({ type: 'player-revive-update', peerId: targetId });
    }
  } else if (packet.type === 'revive-success') { player.almondWater = Math.max(0, player.almondWater - 1); ui.toast('TEAMMATE REVIVED'); audio.pickup();
  } else if (packet.type === 'player-downed') {
    if (!packet.peerId || packet.peerId === network.peer?.id) { player.isDowned = true; player.setActive(false); ui.showDowned(true, { singlePlayer: false, canSpectate: Array.from(remotePlayers.values()).some(record => !record.state.downed) }); ui.showJumpscare(); audio.jumpscare(); }
    else { const record = remotePlayers.get(packet.peerId); if (record) record.state.downed = true; }
  } else if (packet.type === 'player-revived') {
    player.isDowned = false; player.health = 75; player.sanity = Math.max(35, player.sanity); spectating = false; ui.showDowned(false); player.setActive(true); ui.toast('YOU HAVE BEEN REVIVED');
  } else if (packet.type === 'player-revive-update') {
    const record = remotePlayers.get(packet.peerId); if (record) record.state.downed = false;
  }
});

function updateVoiceOcclusion() {
  if (!world) return;
  audio.updateListener(camera.position, player.yaw, player.pitch);
  for (const [id, record] of remotePlayers) {
    const from = camera.position.clone(); const to = record.avatar.root.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const direction = to.clone().sub(from); const distance = direction.length(); direction.normalize();
    raycaster.set(from, direction); raycaster.far = Math.max(0, distance - .3);
    const hits = ui.settings.spatialAudio ? raycaster.intersectObjects(world.root.children, true).filter(hit => hit.object.isMesh && hit.object.material && hit.object.material.transparent !== true) : [];
    audio.updateVoicePosition(id, to.x, to.y, to.z, hits.length > 0);
    audio.setRemoteRadio(id, record.walkie);
  }
}

function updateRemoteAvatars(dt) {
  for (const record of remotePlayers.values()) {
    record.avatar.root.position.lerp(record.target, Math.min(1, dt * 11));
    record.avatar.root.rotation.y = record.state.yaw || 0;
    record.avatar.root.visible = gameState === 'playing' && !record.state.hiding;
  }
}

function serializePlayers() {
  const result = {};
  if (network.peer?.id) result[network.peer.id] = { ...player.getState(), customization: ui.getCustomization(), micLevel: localMicLevel };
  for (const [id, record] of remotePlayers) result[id] = { ...record.state, x: record.avatar.root.position.x, y: record.avatar.root.position.y, z: record.avatar.root.position.z, micLevel: record.micLevel, downed: record.state.downed, customization: record.customization };
  return result;
}

function triggerBlackout(duration = 5) {
  if (!world) return;
  blackoutRemaining = Math.max(1, duration); hemi.intensity = .12; keyLight.intensity = .045;
  for (const entry of world.lights) entry.light.intensity = 0;
  ui.caption('[The fluorescent lights cut out]'); ui.toast('POWER FAILURE', 1800); audio.screech();
}

function handleSpectate() {
  if (!player.isDowned) return;
  const first = Array.from(remotePlayers.values()).find(r => !r.state.downed);
  if (!first) { ui.toast('NO ACTIVE TEAMMATE TO SPECTATE'); return; }
  spectating = true; ui.showDowned(false); ui.toast('SPECTATING TEAMMATE');
}

function updateInteractionHint() {
  interactionText = '';
  const pickup = nearestPickup();
  const objective = nearestObjective();
  const hideSpot = nearestHideSpot();
  if (player.isHiding) interactionText = 'E  LEAVE HIDING PLACE';
  else if (hideSpot) interactionText = 'E  HIDE / TAKE COVER';
  else if (pickup) interactionText = `E  PICK UP ${pickup.pickup.userData.kind === 'battery' ? '9V BATTERY' : 'ALMOND WATER'}`;
  else if (objective) interactionText = `E  ${world.mission.verb} ${world.mission.item} ${objective.index + 1}`;
  else if (world && player.position.distanceTo(world.exitPosition) < 3.2) interactionText = world.exitUnlocked ? `E  ${world.mission.exit}` : `EXIT SEALED  ·  ${world.mission.plural} ${world.objectiveProgress}/${world.objectiveCount}`;
  else if (player.almondWater > 0) {
    for (const record of remotePlayers.values()) if (record.state.downed && record.avatar.root.position.distanceTo(player.position) < 3.4) { interactionText = 'E  REVIVE TEAMMATE'; break; }
  }
  const floorIndex = world ? world.floorIndexForPosition(player.position) : 0;
  ui.updateHUD({ levelId, levelName: world?.meta.name || 'Unknown', floor: world ? `FLOOR ${floorIndex + 1} / ${world.floors.length}  ·  ${world.getFloorTheme(player.position)}` : 'SAFE ROOM', stealth: player.isHiding ? 'HIDDEN // STAY QUIET' : '', objective: world ? `${world.mission.plural} ${world.objectiveProgress}/${world.objectiveCount}` : 'NO ACTIVE OBJECTIVE', sanity: player.sanity, stamina: player.stamina, battery: player.battery, batteries: player.batteries, water: player.almondWater, interaction: interactionText, voice: audio.micStream ? (ui.settings.voiceMode === 'ptt' ? 'V  RADIO READY' : 'MIC OPEN') : 'MIC OFFLINE' });
}

// UI controls.
document.getElementById('solo-btn').addEventListener('click', enterSoloLobby);
document.getElementById('host-btn').addEventListener('click', createHostedLobby);
document.getElementById('join-btn').addEventListener('click', joinHostedLobby);
document.getElementById('room-code-input').addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 4); });
document.getElementById('start-game-btn').addEventListener('click', () => {
  if (gameMode === 'client') return;
  difficulty = ui.getDifficulty(); startLevel(0, Math.floor(Math.random() * 0x7fffffff), difficulty, false); canvas.requestPointerLock?.();
});
document.getElementById('lobby-back-btn').addEventListener('click', leaveToTitle);
document.getElementById('copy-code-btn').addEventListener('click', async () => {
  const code = network.roomCode; if (!code) { ui.toast('SOLO SESSION HAS NO ROOM CODE'); return; }
  try { await navigator.clipboard.writeText(code); ui.toast('ROOM CODE COPIED'); } catch { ui.toast(`ROOM CODE: ${code}`); }
});
document.getElementById('mic-enable-btn').addEventListener('click', enableMicrophone);
document.getElementById('settings-open-main').addEventListener('click', () => ui.showSettings(true));
document.getElementById('settings-open-pause').addEventListener('click', () => ui.showSettings(true));
document.getElementById('resume-btn').addEventListener('click', resumeGame);
document.getElementById('leave-btn').addEventListener('click', leaveToTitle);
document.getElementById('spectate-btn').addEventListener('click', handleSpectate);
document.getElementById('downed-restart-btn').addEventListener('click', restartCurrentLevel);
document.getElementById('downed-return-btn').addEventListener('click', returnToSafeRoom);
document.getElementById('audio-input').addEventListener('change', () => { ui.settings.audioInput = document.getElementById('audio-input').value; ui.save(); if (audio.micStream) enableMicrophone(); });

// Main render and simulation loop.
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), .05); gameTime += dt;
  if (world) world.update(dt, gameTime, ui.settings.photosensitive);
  if (gameState === 'playing') {
    if (blackoutRemaining > 0) {
      blackoutRemaining -= dt;
      if (world) for (const entry of world.lights) entry.light.intensity = 0;
      if (blackoutRemaining <= 0) { hemi.intensity = world?.lighting.ambient ?? 1.05; keyLight.intensity = world?.lighting.directional ?? 1.15; ui.caption('[Fluorescent lights flicker back on]'); }
    } else if (difficulty === 'HARD' && (gameMode === 'solo' || network.role === 'host')) {
      blackoutCooldown -= dt;
      if (blackoutCooldown <= 0) { const duration = 3.5 + Math.random() * 4; triggerBlackout(duration); blackoutCooldown = 58 + Math.random() * 48; if (network.role === 'host') network.broadcast({ type: 'blackout', duration }); }
    }
    if (!spectating) player.update(dt, world, difficulty, gameTime);
    localMicLevel = audio.getMicLevel();
    micAlertCooldown = Math.max(0, micAlertCooldown - dt);
    if (difficulty === 'HARD' && !player.isHiding && localMicLevel > .095 && entities && micAlertCooldown <= 0 && (gameMode === 'solo' || network.role === 'host')) { entities.investigate(player.position, 1.15); micAlertCooldown = 2.1; }
    if (entities && (gameMode === 'solo' || network.role === 'host')) {
      const targets = [{ id: 'local', position: player.position, yaw: player.yaw, downed: player.isDowned, flashlight: player.flashlightOn, micLevel: player.isHiding ? 0 : localMicLevel, crouching: player.isCrouching, moving: player.isMoving, hiding: player.isHiding, noiseLevel: player.isHiding ? 0 : player.isMoving ? (player.isCrouching ? .12 : 1) : 0 }, ...Array.from(remotePlayers.entries()).map(([id, record]) => ({ id, position: record.avatar.root.position, yaw: record.state.yaw, downed: record.state.downed, flashlight: !!record.state.flashlight, micLevel: record.state.hiding ? 0 : record.micLevel, crouching: !!record.state.crouching, moving: !!record.state.moving, hiding: !!record.state.hiding, noiseLevel: record.state.hiding ? 0 : record.state.moving ? (record.state.crouching ? .12 : 1) : 0 }))];
      entities.update(dt, targets, gameTime);
    }
    updateRemoteAvatars(dt); updateVoiceOcclusion(); updateInteractionHint(); audio.update(dt, player.sanity);
    if (spectating) {
      const target = Array.from(remotePlayers.values()).find(record => !record.state.downed);
      if (target) {
        const wanted = target.avatar.root.position.clone().add(new THREE.Vector3(0, 2.1, 4));
        camera.position.lerp(wanted, Math.min(1, dt * 3));
        camera.lookAt(target.avatar.root.position.clone().add(new THREE.Vector3(0, 1.3, 0)));
      } else {
        spectating = false;
        ui.showDowned(true, { singlePlayer: false, canSpectate: false });
        ui.toast('NO ACTIVE SURVIVORS // SESSION ENDED');
      }
    }
    vhsPass.uniforms.uTime.value = gameTime;
    const near = entities?.entities.reduce((min, e) => Math.min(min, e.mesh.position.distanceTo(player.position)), 99) ?? 99;
    vhsPass.uniforms.uChromatic.value = THREE.MathUtils.clamp((8 - near) / 8, 0, 1) * (ui.settings.photosensitive ? .15 : 1);
    if (!ui.settings.photosensitive && near < 4.5 && !player.isDowned) {
      const shake = ui.settings.shake * (1 - near / 4.5) * .018;
      camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake;
    }
    snapshotClock += dt;
    if (snapshotClock >= .05) {
      snapshotClock = 0;
      const state = { ...player.getState(), micLevel: localMicLevel };
      if (gameMode === 'client') network.sendState({ type: 'player-input', state, micLevel: localMicLevel, customization: ui.getCustomization() });
      if (gameMode === 'host') {
        network.broadcastState({ players: serializePlayers(), entities: entities?.serialize() || [], objectives: world?.objectives.map(item => !!item.userData.active) || [], pickups: world?.pickups.map(item => item.userData.spawnId) || [] });
      }
    }
  } else if (gameState === 'lobby' || gameState === 'menu') {
    player.avatarRoot.rotation.y += dt * .08;
  }
  composer.render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); applySettings(ui.settings);
});

applySettings(ui.settings);
ui.showScreen('main-menu'); ui.showHUD(false); ui.setPlayerRoster([{ peerId: 'local', isLocal: true, player: { name: 'YOU' } }]);
tick();
