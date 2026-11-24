export class AudioEngine {
  constructor(settings = () => ({}), onCaption = () => {}) {
    this.settings = settings; this.onCaption = onCaption; this.context = null; this.master = null; this.sfx = null; this.ambient = null; this.voice = null;
    this.micStream = null; this.micSource = null; this.micGain = null; this.micAnalyser = null; this.micDestination = null; this.voiceNodes = new Map();
    this.radioActive = false; this.spatialEnabled = true; this.humNodes = null; this.started = false; this.heartbeatClock = 0; this.lastScreech = 0;
  }

  async init() {
    if (this.context) { await this.context.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API is not available in this browser.');
    this.context = new Ctx();
    this.master = this.context.createGain(); this.sfx = this.context.createGain(); this.ambient = this.context.createGain(); this.voice = this.context.createGain();
    this.sfx.connect(this.master); this.ambient.connect(this.master); this.voice.connect(this.master); this.master.connect(this.context.destination);
    this.setVolumes(); await this.context.resume(); this.startAmbient(); this.started = true;
  }

  setVolumes() {
    if (!this.context) return;
    const s = this.settings();
    this.master.gain.setTargetAtTime(s.masterVolume ?? .8, this.context.currentTime, .04);
    this.sfx.gain.setTargetAtTime(s.sfxVolume ?? .9, this.context.currentTime, .04);
    this.ambient.gain.setTargetAtTime(s.ambientVolume ?? .65, this.context.currentTime, .04);
    this.voice.gain.setTargetAtTime(s.voiceVolume ?? .85, this.context.currentTime, .04);
    if (this.micGain) this.micGain.gain.setTargetAtTime(s.micGain ?? 1, this.context.currentTime, .04);
  }

  startAmbient() {
    if (!this.context || this.humNodes) return;
    const now = this.context.currentTime;
    const hum = this.context.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 58;
    const humFilter = this.context.createBiquadFilter(); humFilter.type = 'lowpass'; humFilter.frequency.value = 155;
    const humGain = this.context.createGain(); humGain.gain.value = .055;
    const wobble = this.context.createOscillator(); wobble.frequency.value = .17;
    const wobbleGain = this.context.createGain(); wobbleGain.gain.value = 9;
    wobble.connect(wobbleGain); wobbleGain.connect(hum.frequency); hum.connect(humFilter); humFilter.connect(humGain); humGain.connect(this.ambient);
    hum.start(now); wobble.start(now); this.humNodes = { hum, humGain, wobble, wobbleGain };
  }

  makeNoise(duration = .18, volume = .12, filterType = 'lowpass', frequency = 900) {
    if (!this.context) return;
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate); const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource(); source.buffer = buffer;
    const filter = this.context.createBiquadFilter(); filter.type = filterType; filter.frequency.value = frequency;
    const gain = this.context.createGain(); gain.gain.setValueAtTime(volume, this.context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.sfx); source.start(); source.stop(this.context.currentTime + duration);
  }

  tone(frequency, duration = .2, volume = .1, type = 'sine', endFrequency = null, destination = null) {
    if (!this.context) return;
    const now = this.context.currentTime; const osc = this.context.createOscillator(); const gain = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, now);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(.001, now); gain.gain.linearRampToValueAtTime(volume, now + .015); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(gain); gain.connect(destination || this.sfx); osc.start(now); osc.stop(now + duration + .02);
  }

  footstep(kind = 'walk', pan = 0) {
    if (!this.context) return;
    const duration = kind === 'run' ? .13 : .18;
    const osc = this.context.createOscillator(), gain = this.context.createGain(), panner = this.context.createStereoPanner();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(kind === 'run' ? 92 : 68, this.context.currentTime); osc.frequency.exponentialRampToValueAtTime(32, this.context.currentTime + duration);
    gain.gain.setValueAtTime(.001, this.context.currentTime); gain.gain.linearRampToValueAtTime(kind === 'crouch' ? .025 : .07, this.context.currentTime + .012); gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
    panner.pan.value = Math.max(-1, Math.min(1, pan)); osc.connect(gain); gain.connect(panner); panner.connect(this.sfx); osc.start(); osc.stop(this.context.currentTime + duration);
    this.makeNoise(.07, kind === 'run' ? .045 : .022, 'lowpass', 520);
  }

  pickup() { this.tone(520, .1, .08, 'sine', 860); this.tone(780, .16, .05, 'sine', 1120); }
  exitTone() { this.tone(210, .7, .12, 'sine', 520); this.tone(540, .8, .04, 'triangle', 880); }
  screech() { this.makeNoise(.9, .11, 'bandpass', 1200); this.tone(880, .55, .04, 'sawtooth', 230); this.onCaption('[Distant metallic screech]'); }
  heartbeat(strength = 1) {
    this.tone(54, .12, .12 * strength, 'sine', 35); setTimeout(() => this.tone(46, .14, .09 * strength, 'sine', 30), 145);
  }
  jumpscare() {
    if (!this.context) return;
    this.makeNoise(.75, .35, 'highpass', 1050); this.tone(48, .8, .45, 'sawtooth', 24); this.tone(1460, .42, .13, 'square', 540);
    this.onCaption('[A sudden distorted shriek]');
  }

  async requestMicrophone(deviceId = '') {
    await this.init();
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is unavailable in this browser.');
    this.stopMicrophone();
    const audio = { echoCancellation: true, noiseSuppression: true, autoGainControl: false };
    if (deviceId) audio.deviceId = { exact: deviceId };
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
    this.micSource = this.context.createMediaStreamSource(this.micStream);
    this.micGain = this.context.createGain(); this.micGain.gain.value = this.settings().micGain ?? 1;
    this.micAnalyser = this.context.createAnalyser(); this.micAnalyser.fftSize = 512;
    this.micDestination = this.context.createMediaStreamDestination();
    this.micSource.connect(this.micGain); this.micGain.connect(this.micAnalyser); this.micGain.connect(this.micDestination);
    this.setPushToTalk(this.settings().voiceMode !== 'ptt');
    this.setVolumes(); return this.micDestination.stream;
  }

  stopMicrophone() {
    this.micStream?.getTracks().forEach(t => t.stop()); this.micStream = null;
    try { this.micSource?.disconnect(); this.micGain?.disconnect(); this.micAnalyser?.disconnect(); } catch {}
    this.micSource = this.micGain = this.micAnalyser = this.micDestination = null;
  }

  setPushToTalk(active) {
    if (!this.micDestination) return;
    const enabled = this.settings().voiceMode === 'open' || !!active;
    this.micDestination.stream.getAudioTracks().forEach(track => { track.enabled = enabled; });
  }

  getMicLevel() {
    if (!this.micAnalyser) return 0;
    const buffer = new Uint8Array(this.micAnalyser.frequencyBinCount); this.micAnalyser.getByteTimeDomainData(buffer);
    let sum = 0; for (const value of buffer) { const v = (value - 128) / 128; sum += v * v; }
    return Math.sqrt(sum / buffer.length);
  }

  connectRemoteVoice(peerId, stream) {
    if (!this.context || this.voiceNodes.has(peerId)) return;
    const source = this.context.createMediaStreamSource(stream);
    const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 20000;
    const radio = this.context.createBiquadFilter(); radio.type = 'bandpass'; radio.frequency.value = 1600; radio.Q.value = .85;
    const gain = this.context.createGain(); gain.gain.value = .92;
    const panner = this.context.createPanner(); panner.panningModel = this.spatialEnabled ? 'HRTF' : 'equalpower'; panner.distanceModel = 'inverse'; panner.refDistance = 1.5; panner.maxDistance = this.spatialEnabled ? 26 : 10000; panner.rolloffFactor = this.spatialEnabled ? 1.2 : .05;
    source.connect(filter); filter.connect(radio); radio.connect(gain); gain.connect(panner); panner.connect(this.voice);
    this.voiceNodes.set(peerId, { source, filter, radio, gain, panner, occluded: false, radioMode: false });
  }

  updateVoicePosition(peerId, x, y, z, occluded = false) {
    const node = this.voiceNodes.get(peerId); if (!node || !this.context) return;
    const now = this.context.currentTime;
    if (node.panner.positionX) { node.panner.positionX.setTargetAtTime(x, now, .08); node.panner.positionY.setTargetAtTime(y, now, .08); node.panner.positionZ.setTargetAtTime(z, now, .08); }
    else node.panner.setPosition(x, y, z);
    node.occluded = occluded; node.filter.frequency.setTargetAtTime(occluded && !node.radioMode ? 650 : 20000, now, .12);
  }


  updateListener(position, yaw = 0, pitch = 0) {
    if (!this.context) return;
    const listener = this.context.listener; const now = this.context.currentTime;
    const fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
    if (listener.positionX) {
      listener.positionX.setTargetAtTime(position.x, now, .06); listener.positionY.setTargetAtTime(position.y, now, .06); listener.positionZ.setTargetAtTime(position.z, now, .06);
      listener.forwardX.setTargetAtTime(fx, now, .06); listener.forwardY.setTargetAtTime(fy, now, .06); listener.forwardZ.setTargetAtTime(fz, now, .06);
      listener.upX.setValueAtTime(0, now); listener.upY.setValueAtTime(1, now); listener.upZ.setValueAtTime(0, now);
    } else { listener.setPosition(position.x, position.y, position.z); listener.setOrientation(fx, fy, fz, 0, 1, 0); }
  }

  setSpatialAudio(enabled) {
    this.spatialEnabled = !!enabled;
    for (const node of this.voiceNodes.values()) {
      node.panner.panningModel = enabled ? 'HRTF' : 'equalpower';
      node.panner.rolloffFactor = enabled ? (node.radioMode ? .05 : 1.2) : .05;
      node.panner.maxDistance = enabled ? (node.radioMode ? 10000 : 26) : 10000;
    }
  }

  setRemoteRadio(peerId, active) {
    const node = this.voiceNodes.get(peerId); if (!node || !this.context) return;
    node.radioMode = active; node.radio.type = active ? 'bandpass' : 'allpass'; node.radio.frequency.setTargetAtTime(active ? 1450 : 1600, this.context.currentTime, .06);
    node.panner.maxDistance = this.spatialEnabled ? (active ? 10000 : 26) : 10000; node.panner.rolloffFactor = this.spatialEnabled ? (active ? .05 : 1.2) : .05;
    node.radio.Q.setTargetAtTime(active ? 1.6 : .85, this.context.currentTime, .06);
    node.gain.gain.setTargetAtTime(active ? .72 : .92, this.context.currentTime, .06);
  }

  disconnectVoice(peerId) {
    const node = this.voiceNodes.get(peerId); if (!node) return;
    try { node.source.disconnect(); node.filter.disconnect(); node.radio.disconnect(); node.gain.disconnect(); node.panner.disconnect(); } catch {}
    this.voiceNodes.delete(peerId);
  }

  setWalkieMode(active) { this.radioActive = active; if (!active && this.context) this.makeNoise(.11, .13, 'bandpass', 1600); }

  update(dt, sanity = 100) {
    if (!this.context) return;
    this.heartbeatClock += dt;
    if (sanity < 42 && this.heartbeatClock > Math.max(.7, 2.6 - (42 - sanity) * .045)) { this.heartbeatClock = 0; this.heartbeat((42 - sanity) / 42); }
    this.lastScreech += dt;
    if (this.lastScreech > 44 + Math.random() * 55) { this.lastScreech = 0; this.screech(); }
  }

  dispose() {
    this.stopMicrophone(); for (const id of this.voiceNodes.keys()) this.disconnectVoice(id);
    if (this.humNodes) { try { this.humNodes.hum.stop(); this.humNodes.wobble.stop(); } catch {} this.humNodes = null; }
    this.context?.close(); this.context = null;
  }
}
