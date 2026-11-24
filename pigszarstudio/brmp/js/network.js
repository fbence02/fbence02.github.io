import Peer from 'peerjs';
import { MAX_PLAYERS, ROOM_CODE_ALPHABET } from './config.js';

function makeRoomCode() {
  let code = '';
  for (let i = 0; i < 4; i++) code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  return code;
}

export function validRoomCode(value) { return /^[A-HJ-NP-Z2-9]{4}$/.test(String(value || '').trim().toUpperCase()); }

export class NetworkManager {
  constructor() {
    this.peer = null; this.role = 'offline'; this.roomCode = ''; this.hostPeerId = '';
    this.connections = new Map(); this.hostRecord = null; this.handlers = new Map(); this.localStream = null;
    this.voiceCalls = new Map(); this.heartbeat = null; this.lastSeen = new Map();
    this.reconnectAttempts = 0; this.reconnectTimer = null; this.joined = false;
    this.playerInfo = { name: 'WANDERER', customization: {} };
    this.lastSentState = {}; this.lastReceivedState = {}; this.closed = false;
  }

  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event, payload) {
    for (const handler of this.handlers.get(event) || []) {
      try { handler(payload); } catch (error) { console.error(`Network event ${event} failed:`, error); }
    }
  }

  createPeer(id) {
    // PeerJS only handles signaling here. Game state and voice streams travel over WebRTC peer connections.
    return new Peer(id, {
      host: '0.peerjs.com', port: 443, secure: true, path: '/', debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ]
      }
    });
  }

  waitForPeerOpen(peer, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => finish(new Error('PeerJS signaling timed out. Check the network or try again.')), timeoutMs);
      const finish = error => {
        if (settled) return; settled = true; clearTimeout(timeout);
        if (error) reject(error); else resolve(peer.id);
      };
      peer.once('open', () => finish());
      peer.once('error', error => finish(error));
    });
  }

  async host(customization = {}, name = 'HOST') {
    this.close(); this.closed = false; this.role = 'host'; this.joined = true;
    this.playerInfo = { name, customization: structuredClone(customization) };
    let lastError = null;
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = makeRoomCode();
      try {
        const peer = this.createPeer(`bld-room-${code}`); this.peer = peer;
        await this.waitForPeerOpen(peer);
        this.roomCode = code; this.hostPeerId = peer.id;
        this.bindPeer(); this.startHeartbeat();
        this.emit('status', { state: 'host-ready', roomCode: code, peerId: peer.id });
        return code;
      } catch (error) {
        lastError = error;
        try { this.peer?.destroy(); } catch { /* Peer may already be closed. */ }
        this.peer = null;
      }
    }
    this.role = 'offline';
    throw lastError || new Error('Could not reserve a room code.');
  }

  async join(code, customization = {}, name = 'SURVIVOR') {
    const normalized = String(code || '').trim().toUpperCase();
    if (!validRoomCode(normalized)) throw new Error('Room code must contain four valid characters.');
    this.close(); this.closed = false; this.joined = false;
    this.role = 'client'; this.roomCode = normalized; this.hostPeerId = `bld-room-${normalized}`;
    this.playerInfo = { name, customization: structuredClone(customization) };
    const peer = this.createPeer(); this.peer = peer;
    await this.waitForPeerOpen(peer);
    this.bindPeer();

    const control = peer.connect(this.hostPeerId, { reliable: true, serialization: 'json', metadata: { channel: 'control' } });
    const state = peer.connect(this.hostPeerId, { reliable: false, serialization: 'json', metadata: { channel: 'state' } });
    this.attachConnection(control); this.attachConnection(state);

    // Install the welcome/reject listeners BEFORE opening can send hello.
    // Otherwise a very fast local/nearby WebRTC connection could deliver
    // welcome before the join promise has subscribed and time out incorrectly.
    const welcomePromise = new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => finish(new Error('Room not found, host offline, or WebRTC could not establish a route.')), 18000);
      const offWelcome = this.on('welcome', () => finish());
      const offReject = this.on('rejected', reason => finish(new Error(reason || 'Room rejected the connection.')));
      const finish = error => {
        if (settled) return; settled = true; clearTimeout(timeout); offWelcome(); offReject();
        if (error) reject(error); else resolve();
      };
      const fail = error => finish(error instanceof Error ? error : new Error('WebRTC data connection failed.'));
      control.on('error', fail); state.on('error', fail);
      control.on('close', () => { if (!settled) fail(new Error('Host closed the room before joining completed.')); });
      state.on('close', () => { if (!settled) fail(new Error('Host state channel closed before joining completed.')); });
    });

    // The host accepts a peer only after both data channels are established.
    let helloSent = false;
    const onChannelOpen = () => {
      if (helloSent || !control.open || !state.open) return;
      helloSent = true;
      try { control.send({ type: 'hello', player: this.playerInfo, peerId: peer.id }); }
      catch (error) { this.emit('error', error); }
    };
    control.on('open', onChannelOpen);
    state.on('open', onChannelOpen);
    onChannelOpen();
    await welcomePromise;

    this.startHeartbeat(); this.emit('status', { state: 'joined', roomCode: normalized });
    return normalized;
  }

  bindPeer() {
    if (!this.peer) return;
    this.peer.on('connection', connection => this.attachConnection(connection));
    this.peer.on('call', call => {
      const speakerId = call.metadata?.voicePeerId || call.peer;
      try { call.answer(); } catch (error) { this.emit('error', error); return; }
      call.on('stream', stream => {
        this.emit('voice-stream', { peerId: speakerId, stream });
        if (this.role === 'host') this.forwardVoice(speakerId, stream);
      });
      call.on('close', () => this.emit('voice-close', { peerId: speakerId }));
      call.on('error', error => this.emit('error', error));
    });
    this.peer.on('disconnected', () => {
      if (this.closed) return;
      this.emit('status', { state: 'signaling-disconnected' });
      try { this.peer.reconnect(); } catch (error) { this.emit('error', error); }
    });
    this.peer.on('error', error => this.emit('error', error));
  }

  attachConnection(connection) {
    const channel = connection.metadata?.channel === 'state' ? 'state' : 'control';
    const peerId = connection.peer;
    let record = this.connections.get(peerId);
    if (!record) {
      record = { peerId, control: null, state: null, player: null, lastHeartbeat: Date.now(), openedAt: 0 };
      this.connections.set(peerId, record);
    }
    record[channel] = connection;
    if (this.role === 'client' && peerId === this.hostPeerId) this.hostRecord = record;

    connection.on('data', packet => this.handlePacket(peerId, channel, packet));
    connection.on('open', () => {
      record.lastHeartbeat = Date.now(); record.openedAt = Date.now();
      if (channel === 'control' && this.role === 'host') {
        this.emit('peer-connection', { peerId });
        if (this.localStream) this.callPeer(peerId, this.localStream, `local:${peerId}`, this.peer?.id);
      }
    });
    connection.on('close', () => {
      if (record[channel] === connection) record[channel] = null;
      if (this.role === 'host' && !record.control && !record.state) {
        this.connections.delete(peerId); this.lastSeen.delete(peerId);
        this.emit('peer-disconnected', { peerId });
        this.broadcast({ type: 'roster', players: this.getRoster() });
      } else if (this.role === 'client' && peerId === this.hostPeerId) {
        // A single missing channel is enough to invalidate host-authoritative sync.
        // Tear down the sibling channel too, then establish a clean pair.
        const sibling = channel === 'control' ? record.state : record.control;
        if (sibling?.open) sibling.close();
        this.scheduleReconnect();
      }
    });
    connection.on('error', error => this.emit('error', error));
  }

  handlePacket(peerId, channel, packet) {
    if (!packet || typeof packet !== 'object') return;
    const record = this.connections.get(peerId);
    if (record) record.lastHeartbeat = Date.now();
    this.lastSeen.set(peerId, Date.now());

    if (packet.type === 'hello' && this.role === 'host' && channel === 'control') {
      const isNew = !record?.player;
      const connectedCount = Array.from(this.connections.values()).filter(item => item.player).length;
      if (isNew && connectedCount >= MAX_PLAYERS - 1) {
        this.sendTo(peerId, { type: 'reject', reason: 'Room is full (4 players maximum).' }); return;
      }
      if (record) record.player = packet.player || { name: 'SURVIVOR', customization: {} };
      this.sendTo(peerId, { type: 'welcome', hostPeerId: this.peer?.id, roster: this.getRoster() });
      if (isNew) this.emit('player-joined', { peerId, player: record?.player });
      this.broadcast({ type: 'roster', players: this.getRoster() });
      return;
    }
    if (packet.type === 'welcome' && this.role === 'client') {
      this.joined = true; this.reconnectAttempts = 0; this.emit('roster', packet.roster || []); this.emit('welcome', packet); return;
    }
    if (packet.type === 'heartbeat') {
      if (channel === 'control') this.sendTo(peerId, { type: 'heartbeat-ack', time: Date.now() });
      return;
    }
    if (packet.type === 'heartbeat-ack') return;
    if (packet.type === 'state-delta' && this.role === 'client') {
      Object.assign(this.lastReceivedState, packet.delta || {});
      this.emit('state', this.lastReceivedState); return;
    }
    if (packet.type === 'roster') { this.emit('roster', packet.players || []); return; }
    if (packet.type === 'reject') { this.emit('rejected', packet.reason); return; }
    this.emit('packet', { peerId, channel, packet });
  }

  getRoster() {
    return [
      { peerId: this.peer?.id || 'local', player: this.playerInfo },
      ...Array.from(this.connections.values()).filter(record => record.player).map(record => ({ peerId: record.peerId, player: record.player }))
    ];
  }

  send(packet) {
    if (this.role !== 'client') return false;
    const record = this.hostRecord || this.connections.get(this.hostPeerId);
    const connection = record?.control?.open ? record.control : record?.state?.open ? record.state : null;
    if (!connection) return false;
    try { connection.send(packet); return true; } catch (error) { this.emit('error', error); return false; }
  }

  sendState(packet) {
    if (this.role !== 'client') return false;
    const record = this.hostRecord || this.connections.get(this.hostPeerId);
    const connection = record?.state?.open ? record.state : record?.control;
    if (!connection?.open) return this.send(packet);
    try { connection.send(packet); return true; } catch (error) { this.emit('error', error); return false; }
  }

  sendTo(peerId, packet, channel = 'control') {
    const record = this.connections.get(peerId);
    const connection = record?.[channel]?.open ? record[channel] : record?.control?.open ? record.control : record?.state;
    if (!connection?.open) return false;
    try { connection.send(packet); return true; } catch (error) { this.emit('error', error); return false; }
  }

  broadcast(packet) {
    if (this.role !== 'host') return;
    const channel = packet.type === 'state-delta' ? 'state' : 'control';
    for (const peerId of this.connections.keys()) this.sendTo(peerId, packet, channel);
  }

  broadcastState(state) {
    if (this.role !== 'host') return;
    const delta = {};
    for (const [key, value] of Object.entries(state)) {
      const oldValue = this.lastSentState[key];
      const changed = typeof value === 'object' ? JSON.stringify(value) !== JSON.stringify(oldValue) : value !== oldValue;
      if (changed) delta[key] = value;
    }
    this.lastSentState = structuredClone(state);
    if (Object.keys(delta).length) this.broadcast({ type: 'state-delta', delta, sentAt: Date.now() });
  }

  startHeartbeat() {
    clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      if (this.closed) return;
      const now = Date.now();
      if (this.role === 'client') this.send({ type: 'heartbeat', time: now });
      if (this.role === 'host') {
        for (const [peerId, record] of this.connections) {
          if (now - (record.lastHeartbeat || now) > 18000) {
            record.control?.close(); record.state?.close();
            this.connections.delete(peerId); this.lastSeen.delete(peerId);
            this.emit('peer-disconnected', { peerId });
          } else this.sendTo(peerId, { type: 'heartbeat', time: now });
        }
      }
    }, 3000);
  }

  scheduleReconnect() {
    if (this.closed || this.reconnectTimer || this.role !== 'client') return;
    if (this.reconnectAttempts >= 6) { this.emit('status', { state: 'reconnect-failed' }); return; }
    this.reconnectAttempts++;
    const wait = Math.min(1200 * this.reconnectAttempts, 6500);
    this.emit('status', { state: 'reconnecting', attempt: this.reconnectAttempts });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.closed || !this.peer) return;
      const control = this.peer.connect(this.hostPeerId, { reliable: true, serialization: 'json', metadata: { channel: 'control' } });
      const state = this.peer.connect(this.hostPeerId, { reliable: false, serialization: 'json', metadata: { channel: 'state' } });
      this.attachConnection(control); this.attachConnection(state);
      let helloSent = false;
      let welcomed = false;
      const timeout = setTimeout(() => {
        if (!welcomed) { control.close(); state.close(); this.scheduleReconnect(); }
      }, 8000);
      const offWelcome = this.on('welcome', () => {
        welcomed = true; this.joined = true; clearTimeout(timeout); offWelcome();
        this.emit('status', { state: 'reconnected' });
      });
      const onOpen = () => {
        if (helloSent || !control.open || !state.open) return;
        helloSent = true;
        try { control.send({ type: 'hello', player: this.playerInfo, peerId: this.peer.id }); }
        catch (error) { this.emit('error', error); }
      };
      control.on('open', onOpen); state.on('open', onOpen); onOpen();
      control.on('error', error => this.emit('error', error)); state.on('error', error => this.emit('error', error));
    }, wait);
  }

  async setLocalStream(stream) {
    if (stream !== this.localStream) {
      for (const [key, call] of this.voiceCalls) {
        if (key.startsWith('local:')) { try { call.close(); } catch { /* Already closed. */ } this.voiceCalls.delete(key); }
      }
    }
    this.localStream = stream;
    if (!stream || !this.peer) return;
    if (this.role === 'client') this.callPeer(this.hostPeerId, stream, `local:${this.hostPeerId}`, this.peer.id);
    if (this.role === 'host') for (const peerId of this.connections.keys()) this.callPeer(peerId, stream, `local:${peerId}`, this.peer.id);
  }

  callPeer(peerId, stream, callKey = peerId, speakerId = this.peer?.id) {
    if (!this.peer || !stream || this.voiceCalls.has(callKey)) return;
    try {
      const call = this.peer.call(peerId, stream, { metadata: { voicePeerId: speakerId } });
      if (!call) return;
      this.voiceCalls.set(callKey, call);
      call.on('close', () => this.voiceCalls.delete(callKey));
      call.on('error', error => { this.voiceCalls.delete(callKey); this.emit('error', error); });
    } catch (error) { this.emit('error', error); }
  }

  forwardVoice(fromPeerId, stream) {
    if (this.role !== 'host') return;
    for (const peerId of this.connections.keys()) {
      if (peerId !== fromPeerId) this.callPeer(peerId, stream, `forward:${fromPeerId}:${peerId}`, fromPeerId);
    }
  }

  close() {
    this.closed = true; clearInterval(this.heartbeat); clearTimeout(this.reconnectTimer);
    this.heartbeat = null; this.reconnectTimer = null; this.joined = false;
    for (const call of this.voiceCalls.values()) { try { call.close(); } catch { /* No-op during teardown. */ } }
    this.voiceCalls.clear();
    for (const record of this.connections.values()) { record.control?.close(); record.state?.close(); }
    this.connections.clear(); this.hostRecord = null;
    try { this.peer?.destroy(); } catch { /* Peer may already be destroyed. */ }
    this.peer = null; this.role = 'offline'; this.roomCode = ''; this.hostPeerId = ''; this.localStream = null;
    this.lastSentState = {}; this.lastReceivedState = {}; this.reconnectAttempts = 0; this.lastSeen.clear();
  }
}
