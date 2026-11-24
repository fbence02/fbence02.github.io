import { DEFAULT_SETTINGS, OUTFITS } from './config.js';

const SETTINGS_KEY = 'bld-settings-v1';
const CUSTOM_KEY = 'bld-customization-v1';
const CONTROL_NAMES = { forward:'Forward', backward:'Backward', left:'Left', right:'Right', sprint:'Sprint', crouch:'Crouch', flashlight:'Flashlight', interact:'Interact', walkie:'Walkie-talkie', jump:'Jump' };
const KEY_LABELS = { ShiftLeft:'L SHIFT', ShiftRight:'R SHIFT', ControlLeft:'L CTRL', ControlRight:'R CTRL', Space:'SPACE', Escape:'ESC', AltLeft:'L ALT' };
const el = id => document.getElementById(id);

function mergeSettings(saved) {
  const copy = structuredClone(DEFAULT_SETTINGS);
  if (!saved || typeof saved !== 'object') return copy;
  for (const [key, value] of Object.entries(saved)) {
    if (key === 'keybinds' && value && typeof value === 'object') copy.keybinds = { ...copy.keybinds, ...value };
    else if (key in copy) copy[key] = value;
  }
  return copy;
}
function prettyKey(code) { return KEY_LABELS[code] || String(code || '').replace(/^Key/, '').replace(/^Digit/, '').toUpperCase(); }

export class UIManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    let saved = null; try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch { saved = null; }
    this.settings = mergeSettings(saved); this.pendingBind = null; this.captionTimer = null; this.toastTimer = null;
    this.customization = this.loadCustomization();
    this.bindSettings(); this.bindCustomizer(); this.renderKeybinds(); this.populateAudioInputs(); this.syncSettingsToDOM(); this.applyCustomizationToDOM();
  }

  bindSettings() {
    const sliderIds = ['resolution-scale','fog-density','fov','brightness','master-volume','sfx-volume','ambient-volume','voice-volume','mic-gain','sensitivity','bobbing','shake'];
    const checkboxIds = ['vhs-enabled','spatial-audio','invert-y','captions','photosensitive','high-contrast'];
    const selectMap = { 'shadow-quality':'shadowQuality','audio-input':'audioInput','voice-mode':'voiceMode' };
    const valueMap = {
      'resolution-scale':['resolutionScale','resolution-value',v=>`${Number(v).toFixed(2)}×`],
      'fog-density':['fogDensity','fog-value',v=>Number(v).toFixed(3)], 'fov':['fov','fov-value',v=>`${v}°`],
      'brightness':['brightness','brightness-value',v=>Number(v).toFixed(2)], 'master-volume':['masterVolume','master-volume-value',v=>`${Math.round(v*100)}%`],
      'sfx-volume':['sfxVolume','sfx-volume-value',v=>`${Math.round(v*100)}%`], 'ambient-volume':['ambientVolume','ambient-volume-value',v=>`${Math.round(v*100)}%`],
      'voice-volume':['voiceVolume','voice-volume-value',v=>`${Math.round(v*100)}%`], 'mic-gain':['micGain','mic-gain-value',v=>`${Math.round(v*100)}%`],
      'sensitivity':['sensitivity','sensitivity-value',v=>Number(v).toFixed(2)], 'bobbing':['bobbing','bobbing-value',v=>`${Math.round(v*100)}%`],
      'shake':['shake','shake-value',v=>`${Math.round(v*100)}%`]
    };
    for (const id of sliderIds) {
      const node = el(id); if (!node) continue;
      node.addEventListener('input', () => {
        const [key, output, fmt] = valueMap[id]; const value = Number(node.value); this.settings[key] = value;
        if (el(output)) el(output).textContent = fmt(value); this.save(); this.callbacks.onSettings?.(this.settings);
      });
    }
    for (const id of checkboxIds) {
      const node = el(id); if (!node) continue;
      node.addEventListener('change', () => {
        const key = ({'vhs-enabled':'vhsEnabled','spatial-audio':'spatialAudio','invert-y':'invertY','captions':'captions','photosensitive':'photosensitive','high-contrast':'highContrast'})[id];
        this.settings[key] = node.checked; document.body.classList.toggle('high-contrast', this.settings.highContrast);
        this.save(); this.callbacks.onSettings?.(this.settings);
      });
    }
    for (const [id, key] of Object.entries(selectMap)) el(id)?.addEventListener('change', e => { this.settings[key] = e.target.value; this.save(); this.callbacks.onSettings?.(this.settings); });
    document.querySelectorAll('.settings-tabs .tab').forEach(button => button.addEventListener('click', () => this.showTab(button.dataset.tab)));
    el('settings-close')?.addEventListener('click', () => this.callbacks.onSettingsClose?.());
    el('settings-done')?.addEventListener('click', () => this.callbacks.onSettingsClose?.());
    el('settings-mic-btn')?.addEventListener('click', () => this.callbacks.onRequestMic?.());
    window.addEventListener('keydown', event => {
      if (!this.pendingBind) return;
      if (['Escape','Tab'].includes(event.code)) { event.preventDefault(); this.pendingBind = null; this.renderKeybinds(); return; }
      event.preventDefault(); this.settings.keybinds[this.pendingBind] = event.code; this.pendingBind = null; this.save(); this.renderKeybinds(); this.callbacks.onSettings?.(this.settings);
    }, true);
  }

  loadCustomization() {
    const fallback = { outfit: 'hazmat', primaryColor: OUTFITS.hazmat.base, accentColor: OUTFITS.hazmat.accent, accessories: { backpack: true } };
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOM_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return fallback;
      return { ...fallback, ...saved, accessories: { ...fallback.accessories, ...(saved.accessories || {}) } };
    } catch { return fallback; }
  }

  applyCustomizationToDOM() {
    const custom = this.customization;
    if (el('outfit-select')) el('outfit-select').value = custom.outfit || 'hazmat';
    if (el('primary-color')) el('primary-color').value = custom.primaryColor || OUTFITS[custom.outfit]?.base || OUTFITS.hazmat.base;
    if (el('accent-color')) el('accent-color').value = custom.accentColor || OUTFITS[custom.outfit]?.accent || OUTFITS.hazmat.accent;
    document.querySelectorAll('[data-misc]').forEach(input => { input.checked = !!custom.accessories?.[input.dataset.misc]; });
  }

  bindCustomizer() {
    for (const id of ['outfit-select', 'primary-color', 'accent-color']) {
      const node = el(id); if (!node) continue;
      node.addEventListener(id.includes('color') ? 'input' : 'change', () => this.commitCustomization());
    }
    document.querySelectorAll('[data-misc]').forEach(input => input.addEventListener('change', () => this.commitCustomization()));
    el('difficulty-select')?.addEventListener('change', () => this.callbacks.onDifficulty?.(this.getDifficulty()));
  }

  commitCustomization() {
    this.customization = this.getCustomization();
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(this.customization)); } catch { /* Browser storage can be disabled. */ }
    this.callbacks.onCustomization?.(this.customization);
  }

  setCustomization(custom) {
    if (!custom || typeof custom !== 'object') return;
    const outfit = OUTFITS[custom.outfit] ? custom.outfit : 'hazmat';
    this.customization = {
      outfit,
      primaryColor: /^#[0-9a-f]{6}$/i.test(custom.primaryColor || '') ? custom.primaryColor : OUTFITS[outfit].base,
      accentColor: /^#[0-9a-f]{6}$/i.test(custom.accentColor || '') ? custom.accentColor : OUTFITS[outfit].accent,
      accessories: { ...(custom.accessories || {}) }
    };
    this.applyCustomizationToDOM();
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(this.customization)); } catch { /* Browser storage can be disabled. */ }
  }

  getCustomization() {
    const accessories = {};
    document.querySelectorAll('[data-misc]').forEach(input => accessories[input.dataset.misc] = input.checked);
    const outfit = el('outfit-select')?.value || 'hazmat';
    return {
      outfit,
      primaryColor: el('primary-color')?.value || OUTFITS[outfit].base,
      accentColor: el('accent-color')?.value || OUTFITS[outfit].accent,
      accessories
    };
  }
  getDifficulty() { return el('difficulty-select')?.value || 'NORMAL'; }

  syncSettingsToDOM() {
    const map = {
      'resolution-scale':'resolutionScale','fog-density':'fogDensity','fov':'fov','brightness':'brightness','master-volume':'masterVolume','sfx-volume':'sfxVolume','ambient-volume':'ambientVolume','voice-volume':'voiceVolume','mic-gain':'micGain','sensitivity':'sensitivity','bobbing':'bobbing','shake':'shake',
      'shadow-quality':'shadowQuality','audio-input':'audioInput','voice-mode':'voiceMode','vhs-enabled':'vhsEnabled','spatial-audio':'spatialAudio','invert-y':'invertY','captions':'captions','photosensitive':'photosensitive','high-contrast':'highContrast'
    };
    for (const [id, key] of Object.entries(map)) {
      const node = el(id); if (!node) continue;
      if (node.type === 'checkbox') node.checked = !!this.settings[key]; else node.value = this.settings[key];
    }
    const outputValues = {
      'resolution-value': `${Number(this.settings.resolutionScale).toFixed(2)}×`, 'fog-value': Number(this.settings.fogDensity).toFixed(3),
      'fov-value': `${this.settings.fov}°`, 'brightness-value': Number(this.settings.brightness).toFixed(2),
      'master-volume-value': `${Math.round(this.settings.masterVolume * 100)}%`, 'sfx-volume-value': `${Math.round(this.settings.sfxVolume * 100)}%`,
      'ambient-volume-value': `${Math.round(this.settings.ambientVolume * 100)}%`, 'voice-volume-value': `${Math.round(this.settings.voiceVolume * 100)}%`,
      'mic-gain-value': `${Math.round(this.settings.micGain * 100)}%`, 'sensitivity-value': Number(this.settings.sensitivity).toFixed(2),
      'bobbing-value': `${Math.round(this.settings.bobbing * 100)}%`, 'shake-value': `${Math.round(this.settings.shake * 100)}%`
    };
    for (const [id, value] of Object.entries(outputValues)) if (el(id)) el(id).textContent = value;
    document.body.classList.toggle('high-contrast', this.settings.highContrast);
  }

  save() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (error) { console.warn('Settings could not be saved:', error); } }
  showTab(name) {
    document.querySelectorAll('.settings-tabs .tab').forEach(node => node.classList.toggle('active', node.dataset.tab === name));
    document.querySelectorAll('.tab-page').forEach(node => node.classList.toggle('active', node.dataset.page === name));
  }

  renderKeybinds() {
    const root = el('keybind-list'); if (!root) return; root.replaceChildren();
    for (const [action, label] of Object.entries(CONTROL_NAMES)) {
      const row = document.createElement('div'); row.className = 'keybind-row';
      const text = document.createElement('span'); text.textContent = label;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = this.pendingBind === action ? 'PRESS' : prettyKey(this.settings.keybinds[action]);
      button.addEventListener('click', () => { this.pendingBind = action; this.renderKeybinds(); });
      row.append(text, button); root.append(row);
    }
  }

  async populateAudioInputs() {
    const select = el('audio-input'); if (!select || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      for (const device of devices.filter(d => d.kind === 'audioinput')) {
        const option = document.createElement('option'); option.value = device.deviceId; option.textContent = device.label || `Microphone ${select.length}`; select.append(option);
      }
      select.value = this.settings.audioInput || '';
    } catch { /* Browser permissions may be required before labels are visible. */ }
  }

  setRoomCode(code) { if (el('lobby-room-code')) el('lobby-room-code').textContent = code || 'SOLO'; }
  setLobbyStatus(text) { if (el('lobby-status')) el('lobby-status').textContent = text; }
  setPlayerRoster(players = []) {
    const list = el('lobby-player-list'); if (!list) return; list.replaceChildren();
    for (const item of players) {
      const row = document.createElement('div'); row.className = 'player-entry';
      const dot = document.createElement('i'); dot.className = 'player-dot';
      const name = document.createElement('span'); name.textContent = item.player?.name || 'WANDERER';
      const status = document.createElement('small'); status.textContent = item.peerId === 'local' || item.isLocal ? 'YOU' : 'CONNECTED';
      row.append(dot, name, status); list.append(row);
    }
    if (el('player-count')) el('player-count').textContent = `${players.length} / 4`;
  }
  toast(message, duration = 2500) {
    const node = el('toast'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => node.classList.remove('show'), duration);
  }
  caption(message) {
    if (!this.settings.captions) return;
    const node = el('subtitle-box'); if (!node) return; node.textContent = message; node.classList.add('show'); clearTimeout(this.captionTimer); this.captionTimer = setTimeout(() => node.classList.remove('show'), 2600);
  }
  updateHUD(data) {
    if (el('level-name')) el('level-name').textContent = `LEVEL ${data.levelId} — ${data.levelName.toUpperCase()}`;
    if (el('floor-label')) el('floor-label').textContent = data.floor || 'FLOOR 1 / 3';
    if (el('objective-label')) el('objective-label').textContent = data.objective || 'SIGNAL RELAYS 0/3';
    if (el('sanity-meter')) el('sanity-meter').style.width = `${Math.max(0, data.sanity)}%`;
    if (el('stamina-meter')) el('stamina-meter').style.width = `${Math.max(0, data.stamina)}%`;
    if (el('battery-meter')) el('battery-meter').style.width = `${Math.max(0, data.battery)}%`;
    if (el('inventory-label')) el('inventory-label').textContent = `BATTERIES ${data.batteries} · ALMOND WATER ${data.water}`;
    if (el('interaction-hint')) el('interaction-hint').textContent = data.interaction || '';
    if (el('voice-indicator')) el('voice-indicator').textContent = data.voice || 'MIC OFFLINE';
    if (el('stealth-indicator')) el('stealth-indicator').textContent = data.stealth || '';
    if (el('stealth-indicator')) el('stealth-indicator').classList.toggle('active', !!data.stealth);
  }
  showDowned(value, options = {}) {
    const overlay = el('downed-overlay');
    overlay?.classList.toggle('hidden', !value);
    if (!value) return;
    const solo = !!options.singlePlayer;
    const canSpectate = !!options.canSpectate;
    const spectate = el('spectate-btn');
    const restart = el('downed-restart-btn');
    const returnButton = el('downed-return-btn');
    const message = el('downed-message');
    if (spectate) spectate.classList.toggle('hidden', !canSpectate);
    if (restart) restart.classList.toggle('hidden', !solo);
    if (returnButton) returnButton.textContent = solo ? 'RETURN TO SAFE ROOM' : 'LEAVE SESSION';
    if (message) message.textContent = solo
      ? 'No teammates are connected. Restart this level or return to the safe room.'
      : canSpectate ? 'Wait for a teammate to revive you, or spectate an active survivor.' : 'No active teammate can revive you. You can leave the session.';
  }
  showSettings(value) { el('settings-modal')?.classList.toggle('hidden', !value); }
  showPause(value) { el('pause-screen')?.classList.toggle('visible', !!value); }
  showScreen(id) { for (const node of document.querySelectorAll('.screen')) node.classList.remove('visible'); if (id) el(id)?.classList.add('visible'); }
  showHUD(value) { el('game-hud')?.classList.toggle('hidden', !value); }
  showVHS(value) { el('vhs-overlay')?.classList.toggle('hidden', !value); }
  showJumpscare() { const node = el('jumpscare-flash'); if (this.settings.photosensitive) { node.classList.remove('active'); return; } node.classList.remove('active'); void node.offsetWidth; node.classList.add('active'); }
}
