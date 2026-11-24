# BACKROOMS: LIMINAL DESCENT — complete source bundle (build 0.3.1)

Each file is listed in repository upload order. Copy the contents into the same relative path in your GitHub repository.


### FILE: .nojekyll

````text

````


### FILE: README.md

````markdown
# BACKROOMS: LIMINAL DESCENT — build 0.3.1

A browser-based, procedural 3D co-op survival-horror prototype built with native ES modules, Three.js and WebRTC. The project is designed for static hosting such as GitHub Pages: there is no game backend, no Python server requirement, no npm install, no bundler, and no downloaded model, image or audio assets.

## What changed in 0.3.1

- Larger generated environments: each descent contains **4–5 connected floors**, each with a **16–19 cell** maze grid, its own randomized architectural feature, landmarks, rooms and props.
- Floor-to-floor stair flights connect the separate floor wings. Space jumps work on every floor and stair section.
- Theme-specific environments include flooded poolroom-style floors with animated water, ice with sliding movement, steam vents, dark sectors, red emergency lighting, overgrown spaces, warehouse racks, mirror halls, atriums, wide chambers and narrow service corridors.
- Every floor gets multiple hiding places: maintenance lockers, curtained alcoves and crate-cover pockets. Their exits are aligned to a verified open maze passage.
- Objectives are spread from the entrance floor to the upper floors. The exit remains sealed until a randomized **2–5 theme-specific objectives** are activated.
- Enemies now use a forward-facing field of view as well as wall-aware line of sight, A* navigation across floors, sound and (on HARD) microphone-level investigation, last-known-position searches and suspicion when checking nearby hiding places. Sneaking behind an entity and breaking sight around corners can interrupt a chase; sprint speed and stamina provide a real escape window.
- Multiplayer spawn positions are assigned by the host so players do not overlap. The host sends level seed, per-player spawn positions, objectives, enemies and remaining pickup IDs. Late joiners receive a reliable start packet followed by a complete current-state snapshot. The join handshake subscribes to the welcome event before sending hello, avoiding a fast-connection race.
- The safe-room customizer includes an always-visible rotating 3D avatar preview that updates when outfits, colors or accessories change.

## Run locally

The deployed game does **not** require Python or any custom server. For a local preview, browser ES modules need an HTTP origin; use VS Code Live Server or any static file server. That server only serves files and does not run game logic. Opening `index.html` directly with `file://` is not supported by browsers for native module imports.

## Deploy to GitHub Pages

1. Extract the ZIP and upload the contents of this folder to the repository root so that `index.html` is at the root.
2. In GitHub, open **Settings → Pages**.
3. Select **Deploy from a branch**, choose the branch that contains the files, and select `/(root)`.
4. Save and open the generated `https://<user>.github.io/<repo>/` URL.

All project paths are relative, so deployment under a repository subpath is supported.

## Controls

| Action | Default |
|---|---|
| Move | WASD |
| Sprint | Left Shift |
| Crouch / quieter movement | Left Ctrl |
| Jump | Space |
| Flashlight | F |
| Interact / collect / hide / objective / exit / revive | E |
| Walkie-talkie push-to-talk | V |
| Pause | Escape |
| Look | Mouse; click the game view to capture the pointer |

Controls can be remapped in Settings. Voice chat is optional and requires the microphone permission button in the lobby.

## Gameplay loop

1. Enter a generated level with four or five connected floors.
2. Read the mission prompt; the objective type changes with the level's primary environmental feature (for example, drain valves, power nodes, garden beacons, pressure valves, heat regulators, freight consoles or mirror anchors).
3. Explore the entrance, middle and upper floors. Use the stair flights, jump where useful, gather 9V batteries and Almond Water, and use hiding places to break enemy pursuit.
4. Activate the randomly selected two to five objectives to unlock the level exit.
5. Reach the exit and descend into another randomly selected level with a new seed.

Running, jumping, splashing and voice can attract entities. Crouching reduces the distance at which enemies notice you. Breaking line of sight makes entities investigate the last location they saw rather than tracking a player through walls. Hiding prevents normal visual detection, but an entity that investigates close to a hiding place can gradually become suspicious—stay quiet and leave after it moves away.

## Multiplayer and WebRTC

The game uses **PeerJS for signaling** and **WebRTC peer connections** for game data and media. The host uses a `bld-room-XXXX` ID and displays the matching four-character room code. Data flows in a host-star topology using reliable control messages and a separate lower-reliability state channel. Voice streams are routed through the host to the other connected peers.

There is no Python backend, dedicated game server or server-side simulation. Once established, game-state and voice connections are direct WebRTC peer connections where the network permits. A signaling service is still needed to let browsers discover each other and negotiate the WebRTC connection. This build uses the public PeerJS signaling service plus Google/Cloudflare STUN. It does not include a TURN relay, so some symmetric-NAT, school/work or restrictive firewall networks may prevent a direct connection. For reliable public release, configure a TURN relay and load-test multiple browsers.

Microphone access requires explicit permission and a secure context (HTTPS, or localhost). Voice is optional; the game remains playable without enabling it. Browser device labels may remain generic until microphone permission is granted.

## Project layout

- `index.html` — DOM, HUD, safe-room lobby, avatar preview, settings and import map
- `css/style.css` — responsive menu/HUD, VHS overlays and lobby layout
- `js/config.js` — 101-level roster, difficulties, outfits, accessories and defaults
- `js/network.js` — PeerJS room codes, WebRTC data/media, heartbeat, reconnect and state deltas
- `js/audio.js` — Web Audio synthesis, spatial voice, wall-muffling, walkie mode and microphone analysis
- `js/textures.js` — procedural CanvasTexture PBR maps
- `js/levelGenerator.js` — seeded multi-floor generation, architecture, stairs, water, cover, objectives and pickups
- `js/entities.js` — procedural entities, multi-floor A*, wall-aware perception, sound investigation and stealth/chase/search states
- `js/player.js` — first-person movement, jumping, crouch/sprint, hide spots, flashlight and procedural avatars/preview
- `js/ui.js` — settings persistence, keybind remapping, captions, roster, HUD and downed flow
- `js/main.js` — renderer, post-processing, game states, mission progression and multiplayer orchestration

## Dependencies and known limits

The import map pins Three.js `0.187.0` and PeerJS `1.5.5` from ESM/CDN endpoints. These are JavaScript module dependencies; the game does not request external `.glb`, `.mp3` or `.png` assets. An internet connection is needed to load those libraries and use PeerJS signaling.

This is an expanded playable prototype, **not a certified production release**. Static JavaScript syntax and project-structure checks pass, but a full browser playthrough and real-world WebRTC/NAT matrix have not been completed in this environment. For a public release, still do cross-browser and device testing, TURN setup, authoritative health/inventory validation, reconnection recovery, network abuse prevention, accessibility QA and performance profiling on low-end hardware.
````


### FILE: index.html

````html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <meta name="theme-color" content="#090b0b">
  <meta name="description" content="Backrooms: Liminal Descent — a procedural co-op liminal horror experience.">
  <title>BACKROOMS: LIMINAL DESCENT</title>
  <link rel="stylesheet" href="./css/style.css">
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/",
      "peerjs": "https://esm.sh/peerjs@1.5.5"
    }
  }
  </script>
</head>
<body>
  <div id="game-root">
    <canvas id="game-canvas" aria-label="3D game view"></canvas>
    <div id="vhs-overlay" class="vhs-overlay" aria-hidden="true"><div class="scanlines"></div><div class="vignette"></div><div class="noise"></div><div class="tracking"></div></div>

    <section id="main-menu" class="screen visible">
      <div class="brand-block"><div class="brand-kicker">AN INTERACTIVE LIMINAL NIGHTMARE</div><h1>BACKROOMS<span>:</span><br><em>LIMINAL DESCENT</em></h1><p class="tagline">NO MAP. NO SIGNAL. NO WAY BACK.</p></div>
      <div class="menu-panel">
        <button id="solo-btn" class="button primary">DESCEND ALONE</button>
        <button id="host-btn" class="button">HOST CO-OP GAME</button>
        <div class="join-row"><input id="room-code-input" maxlength="4" autocomplete="off" spellcheck="false" placeholder="ROOM CODE" aria-label="Room code"><button id="join-btn" class="button">JOIN</button></div>
        <button id="settings-open-main" class="button subtle">SETTINGS</button>
        <div class="menu-foot"><span>BUILD 0.3.1 // ESCAPE & MULTI-FLOOR UPDATE</span><span>HEADPHONES RECOMMENDED</span></div>
      </div>
    </section>

    <section id="lobby-screen" class="screen">
      <div class="lobby-top"><div><div class="eyebrow">SAFE ROOM // CHECK-IN</div><h2>PRE-DESCENT LOBBY</h2></div><div class="room-badge">ROOM <strong id="lobby-room-code">SOLO</strong></div></div>
      <div class="lobby-grid">
        <div class="panel player-panel"><div class="panel-heading"><span>CONNECTED SURVIVORS</span><span id="player-count">1 / 4</span></div><div id="lobby-player-list" class="player-list"></div><div class="panel-actions"><button id="copy-code-btn" class="button subtle">COPY ROOM CODE</button><button id="mic-enable-btn" class="button subtle">ENABLE MICROPHONE</button></div></div>
        <div class="panel customize-panel"><div class="panel-heading"><span>FIELD EQUIPMENT</span><span>AVATAR CONFIG</span></div><div class="avatar-preview-wrap"><canvas id="avatar-preview-canvas" aria-label="Live 3D character preview"></canvas><div class="preview-caption"><span>LIVE 3D PREVIEW</span><small>ROTATING MODEL // LOADOUT SYNCED</small></div></div>
          <label class="field-label" for="outfit-select">OUTFIT</label><select id="outfit-select"><option value="hazmat">Hazmat Suit</option><option value="tactical">Tactical Explorer</option><option value="maintenance">Maintenance Worker</option><option value="researcher">Lab Researcher</option></select>
          <div class="color-row"><label>PRIMARY SUIT<input id="primary-color" type="color" value="#b7a65c"></label><label>VISOR / ACCENT<input id="accent-color" type="color" value="#55d7d0"></label></div>
          <div class="field-label misc-label">ATTACHMENTS</div><div class="misc-grid">
            <label><input type="checkbox" data-misc="shoulderLight"> Shoulder flashlight</label><label><input type="checkbox" data-misc="backpack" checked> Tactical backpack</label>
            <label><input type="checkbox" data-misc="gasMask"> Dual-filter mask</label><label><input type="checkbox" data-misc="bodycam"> Head bodycam</label>
            <label><input type="checkbox" data-misc="glowsticks"> Belt glowsticks</label><label><input type="checkbox" data-misc="antenna"> Radio antenna</label>
          </div>
          <div class="difficulty-row"><label class="field-label" for="difficulty-select">THREAT PROFILE</label><select id="difficulty-select"><option value="EXPLORER">EXPLORER — NO ENTITIES</option><option value="EASY">EASY</option><option value="NORMAL" selected>NORMAL</option><option value="HARD">HARD</option></select></div>
          <p class="mission-note">EVERY DESCENT GENERATES A DIFFERENT OBJECTIVE: drain valves, power nodes, garden beacons, mirror anchors, pressure systems and more. Explore four to five massive floors with different randomized architecture, water, ice, steam, darkness, atriums and warehouse zones. Use stair flights, jump over obstacles, and hide in lockers, curtained alcoves or crate cover. Crouch with LEFT CTRL and jump with SPACE. Sprinting and voice attract nearby entities.</p>
        </div>
      </div>
      <div class="lobby-bottom"><button id="lobby-back-btn" class="button subtle">BACK</button><p id="lobby-status">WAITING FOR DESCENT AUTHORIZATION</p><button id="start-game-btn" class="button primary">BEGIN DESCENT</button></div>
    </section>

    <section id="settings-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="modal-card settings-card"><div class="modal-head"><div><div class="eyebrow">SYSTEM CONFIGURATION</div><h2 id="settings-title">SETTINGS</h2></div><button id="settings-close" class="icon-button" aria-label="Close settings">×</button></div>
        <div class="settings-layout"><nav class="settings-tabs" aria-label="Settings categories"><button class="tab active" data-tab="graphics">GRAPHICS</button><button class="tab" data-tab="audio">AUDIO & VOICE</button><button class="tab" data-tab="controls">CONTROLS</button><button class="tab" data-tab="accessibility">ACCESSIBILITY</button></nav>
          <div class="settings-content">
            <div class="tab-page active" data-page="graphics">
              <label>Resolution scale <output id="resolution-value">1.0×</output><input id="resolution-scale" type="range" min="0.5" max="1" step="0.05" value="1"></label>
              <label>Shadow quality<select id="shadow-quality"><option>Off</option><option>Low</option><option selected>Medium</option><option>High</option></select></label>
              <label>Fog density <output id="fog-value">0.035</output><input id="fog-density" type="range" min="0.005" max="0.09" step="0.005" value="0.035"></label>
              <label>Field of view <output id="fov-value">78°</output><input id="fov" type="range" min="60" max="110" step="1" value="78"></label>
              <label>Brightness <output id="brightness-value">1.0</output><input id="brightness" type="range" min="0.7" max="1.5" step="0.05" value="1"></label>
              <label class="check-line"><input id="vhs-enabled" type="checkbox" checked> VHS post-processing</label>
            </div>
            <div class="tab-page" data-page="audio">
              <label>Master volume <output id="master-volume-value">80%</output><input id="master-volume" type="range" min="0" max="1" step="0.01" value="0.8"></label>
              <label>Effects volume <output id="sfx-volume-value">90%</output><input id="sfx-volume" type="range" min="0" max="1" step="0.01" value="0.9"></label>
              <label>Ambient volume <output id="ambient-volume-value">65%</output><input id="ambient-volume" type="range" min="0" max="1" step="0.01" value="0.65"></label>
              <label>Voice chat volume <output id="voice-volume-value">85%</output><input id="voice-volume" type="range" min="0" max="1" step="0.01" value="0.85"></label>
              <label>Microphone gain <output id="mic-gain-value">100%</output><input id="mic-gain" type="range" min="0" max="2" step="0.05" value="1"></label>
              <label>Input device<select id="audio-input"><option value="">Default microphone</option></select></label>
              <label>Voice mode<select id="voice-mode"><option value="ptt">Push to talk (V)</option><option value="open">Open microphone</option></select></label>
              <label class="check-line"><input id="spatial-audio" type="checkbox" checked> Spatial voice audio</label>
              <button id="settings-mic-btn" class="button subtle">REQUEST MICROPHONE ACCESS</button>
            </div>
            <div class="tab-page" data-page="controls">
              <label>Mouse sensitivity <output id="sensitivity-value">0.8</output><input id="sensitivity" type="range" min="0.2" max="2" step="0.05" value="0.8"></label>
              <label class="check-line"><input id="invert-y" type="checkbox"> Invert Y-axis</label>
              <label>Head-bobbing <output id="bobbing-value">50%</output><input id="bobbing" type="range" min="0" max="1" step="0.05" value="0.5"></label>
              <label>Camera shake <output id="shake-value">60%</output><input id="shake" type="range" min="0" max="1" step="0.05" value="0.6"></label>
              <div class="keybinds" id="keybind-list"></div>
            </div>
            <div class="tab-page" data-page="accessibility">
              <label class="check-line"><input id="captions" type="checkbox" checked> Closed captions</label>
              <label class="check-line"><input id="photosensitive" type="checkbox"> Photosensitivity mode</label>
              <label class="check-line"><input id="high-contrast" type="checkbox"> High-contrast HUD</label>
              <p class="settings-note">Photosensitivity mode reduces intense flicker and camera shake. Captions describe important ambient and entity audio cues.</p>
            </div>
          </div>
        </div>
        <div class="modal-foot"><span>CHANGES SAVE AUTOMATICALLY</span><button id="settings-done" class="button primary">DONE</button></div>
      </div>
    </section>

    <section id="pause-screen" class="screen pause-screen"><div class="pause-card"><div class="eyebrow">SIGNAL INTERRUPTED</div><h2>PAUSED</h2><button id="resume-btn" class="button primary">RESUME</button><button id="settings-open-pause" class="button">SETTINGS</button><button id="leave-btn" class="button subtle">RETURN TO TITLE</button></div></section>

    <div id="game-hud" class="game-hud hidden">
      <div class="hud-top"><div class="level-label"><span>LOCATION</span><strong id="level-name">LEVEL 0 — THE LOBBY</strong><small id="floor-label">FLOOR 1 / 3</small><small id="objective-label">SIGNAL RELAYS 0/3</small></div><div class="sanity-wrap"><span>SANITY</span><div class="meter"><i id="sanity-meter"></i></div></div></div>
      <div class="hud-bottom"><div class="status-stack"><div>STAMINA <div class="meter"><i id="stamina-meter"></i></div></div><div>FLASHLIGHT <div class="meter"><i id="battery-meter"></i></div></div><div class="inventory" id="inventory-label">BATTERIES 0 · ALMOND WATER 0</div></div><div class="crosshair">+</div><div class="interaction-hint" id="interaction-hint"></div><div class="voice-indicator" id="voice-indicator">MIC READY</div><div class="stealth-indicator" id="stealth-indicator"></div></div>
    </div>
    <div id="subtitle-box" class="subtitle-box" aria-live="polite"></div>
    <div id="toast" class="toast" aria-live="polite"></div>
    <div id="jumpscare-flash" class="jumpscare-flash" aria-hidden="true"></div>
    <div id="downed-overlay" class="downed-overlay hidden"><div class="downed-card"><div class="eyebrow">LIFE SUPPORT CRITICAL</div><h2>YOU ARE DOWN</h2><p id="downed-message">A teammate can revive you with Almond Water.</p><button id="spectate-btn" class="button subtle">SPECTATE TEAMMATE</button><button id="downed-restart-btn" class="button primary">RESTART LEVEL</button><button id="downed-return-btn" class="button">RETURN TO SAFE ROOM</button></div></div>
  </div>
  <script type="module" src="./js/main.js"></script>
</body>
</html>
````


### FILE: css/style.css

````css
:root{color-scheme:dark;--bg:#080b0b;--panel:rgba(11,16,16,.91);--line:rgba(178,199,184,.18);--text:#e3e9df;--muted:#8b9890;--accent:#d2c56e;--cyan:#70c7bb;--danger:#e16f64;font-family:'Consolas','Courier New',monospace}*{box-sizing:border-box}html,body,#game-root{width:100%;height:100%;margin:0;overflow:hidden;background:var(--bg);color:var(--text)}body{user-select:none}button,input,select{font:inherit}button{cursor:pointer}#game-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:0}.vhs-overlay{position:absolute;inset:0;pointer-events:none;z-index:2;opacity:.47;mix-blend-mode:screen}.scanlines{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.15) 0px,rgba(0,0,0,.15) 1px,transparent 2px,transparent 4px)}.vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.55) 100%)}.noise{position:absolute;inset:-40%;opacity:.1;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.6'/%3E%3C/svg%3E");animation:noise-shift .22s steps(3) infinite}.tracking{position:absolute;top:25%;left:0;width:100%;height:2px;background:rgba(200,220,210,.13);animation:tracking 8s linear infinite}@keyframes noise-shift{0%{transform:translate(0,0)}33%{transform:translate(2%,-1%)}66%{transform:translate(-1%,2%)}100%{transform:translate(1%,1%)}}@keyframes tracking{0%{top:-5%;opacity:0}5%{opacity:.4}12%{top:110%;opacity:0}100%{top:110%;opacity:0}}
.screen{position:absolute;inset:0;z-index:5;display:none;padding:clamp(20px,4vw,58px);background:linear-gradient(90deg,rgba(4,7,7,.83),rgba(4,7,7,.26) 60%,rgba(4,7,7,.1))}.screen.visible{display:flex}.brand-block{position:absolute;top:10%;left:8%;max-width:650px}.brand-kicker,.eyebrow{font-size:10px;letter-spacing:.26em;color:var(--cyan);font-weight:600}.brand-block h1{font:800 clamp(48px,8vw,112px)/.82 'Arial Narrow',Impact,sans-serif;letter-spacing:.02em;margin:22px 0 14px;text-shadow:0 4px 26px #000}.brand-block h1 span{color:var(--accent)}.brand-block h1 em{font-style:normal;color:#d8d8c8}.tagline{font-size:11px;letter-spacing:.34em;color:#a5b0a5}.menu-panel{position:absolute;left:8%;bottom:9%;display:flex;flex-direction:column;gap:10px;width:min(330px,84vw)}.button{min-height:43px;padding:11px 17px;border:1px solid var(--line);background:rgba(16,23,22,.82);color:var(--text);letter-spacing:.12em;font-size:10px;font-weight:600;text-align:center;transition:.18s ease}.button:hover{border-color:var(--cyan);background:rgba(40,64,59,.8);transform:translateY(-1px)}.button.primary{background:var(--accent);color:#17190f;border-color:var(--accent)}.button.primary:hover{background:#e9db82}.button.subtle{background:rgba(0,0,0,.25);color:#aebbb1}.join-row{display:grid;grid-template-columns:1fr 92px;gap:8px}.join-row input{min-width:0;background:#0c1110;border:1px solid var(--line);padding:12px;color:var(--accent);letter-spacing:.25em;text-align:center;font-size:13px;outline:0}.join-row input:focus{border-color:var(--cyan)}.menu-foot{display:flex;justify-content:space-between;gap:12px;margin-top:16px;color:#79857d;font-size:8px;letter-spacing:.08em}
#lobby-screen{flex-direction:column;background:linear-gradient(125deg,rgba(5,10,9,.91),rgba(7,12,11,.72))}.lobby-top,.lobby-bottom{display:flex;align-items:center;justify-content:space-between;gap:20px}.lobby-top h2,.modal-head h2,.pause-card h2,.downed-card h2{font:700 clamp(26px,4vw,44px)/1 'Arial Narrow',Impact,sans-serif;letter-spacing:.08em;margin:8px 0}.room-badge{border:1px solid var(--line);padding:10px 14px;font-size:10px;letter-spacing:.12em;color:var(--muted)}.room-badge strong{font-size:15px;color:var(--accent);margin-left:8px;letter-spacing:.2em}.lobby-grid{display:grid;grid-template-columns:minmax(230px,.9fr) minmax(300px,1.2fr);gap:18px;max-width:1040px;width:100%;margin:auto}.panel,.modal-card{background:var(--panel);border:1px solid var(--line);backdrop-filter:blur(16px);box-shadow:0 24px 70px rgba(0,0,0,.32)}.panel{padding:18px}.panel-heading{display:flex;justify-content:space-between;padding-bottom:13px;border-bottom:1px solid var(--line);font-size:9px;letter-spacing:.17em;color:var(--muted)}.panel-heading span:last-child{color:var(--cyan)}.player-list{min-height:174px;padding:12px 0}.player-entry{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid rgba(255,255,255,.05);font-size:10px}.player-dot{width:8px;height:8px;border-radius:50%;background:var(--cyan);box-shadow:0 0 10px var(--cyan)}.player-entry small{margin-left:auto;color:var(--muted)}.panel-actions{display:flex;gap:8px}.panel-actions .button{flex:1;font-size:8px;padding-inline:7px}.field-label{display:block;font-size:9px;letter-spacing:.17em;color:var(--muted);margin:17px 0 8px}.customize-panel select,.settings-content select{width:100%;background:#0d1412;border:1px solid var(--line);color:var(--text);padding:10px;font-size:10px;outline:0}.color-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.color-row label{display:flex;align-items:center;justify-content:space-between;font-size:8px;letter-spacing:.1em;color:var(--muted)}input[type=color]{width:43px;height:27px;background:transparent;border:0;padding:0;cursor:pointer}.misc-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.misc-grid label{font-size:9px;color:#b7c1b7;display:flex;align-items:center;gap:7px}.misc-grid input,.check-line input{accent-color:var(--cyan)}.difficulty-row{margin-top:12px}.lobby-bottom{max-width:1040px;width:100%;margin:0 auto}.lobby-bottom p{font-size:9px;letter-spacing:.15em;color:var(--muted);text-align:center}.lobby-bottom .button{min-width:130px}
.modal{position:absolute;inset:0;z-index:20;display:grid;place-items:center;background:rgba(0,0,0,.74);padding:18px}.modal.hidden{display:none}.modal-card{width:min(850px,96vw);max-height:92vh;overflow:auto;padding:22px}.modal-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding-bottom:15px}.icon-button{border:1px solid var(--line);background:transparent;color:var(--text);width:36px;height:36px;font-size:23px}.settings-layout{display:grid;grid-template-columns:160px 1fr;min-height:390px}.settings-tabs{display:flex;flex-direction:column;gap:5px;padding:18px 14px 18px 0;border-right:1px solid var(--line)}.tab{background:transparent;border:1px solid transparent;text-align:left;padding:12px 10px;color:var(--muted);font-size:9px;letter-spacing:.1em}.tab.active{background:rgba(112,199,187,.1);border-color:rgba(112,199,187,.25);color:var(--cyan)}.settings-content{padding:18px 20px}.tab-page{display:none;flex-direction:column;gap:16px}.tab-page.active{display:flex}.settings-content label:not(.check-line){display:grid;grid-template-columns:1fr auto;gap:8px;font-size:10px;color:#bec8bf}.settings-content label output{color:var(--accent)}.settings-content input[type=range]{grid-column:1/3;width:100%;accent-color:var(--cyan)}.settings-content label select{grid-column:1/3}.check-line{font-size:10px;color:#bec8bf;display:flex;align-items:center;gap:9px}.settings-note{font-size:10px;line-height:1.7;color:var(--muted)}.modal-foot{display:flex;align-items:center;justify-content:space-between;padding-top:15px;border-top:1px solid var(--line);font-size:8px;color:var(--muted);letter-spacing:.15em}.modal-foot .button{min-width:100px}.keybinds{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:5px}.keybind-row{display:flex;align-items:center;justify-content:space-between;padding:8px;background:rgba(255,255,255,.035);font-size:9px;color:#aeb9b0}.keybind-row button{background:#111b18;border:1px solid var(--line);color:var(--accent);padding:5px 9px;font-size:9px;min-width:46px}
.pause-screen{z-index:15;align-items:center;justify-content:center;background:rgba(3,6,6,.72)}.pause-card{text-align:center;width:min(320px,90vw);padding:34px;background:var(--panel);border:1px solid var(--line)}.pause-card .button{width:100%;margin-top:9px}.pause-card h2{font-size:48px;margin:14px 0 20px}.game-hud{position:absolute;inset:0;z-index:4;pointer-events:none;padding:24px 28px;color:#d7e0d6;text-shadow:0 1px 5px #000}.game-hud.hidden{display:none}.hud-top{display:flex;justify-content:space-between;align-items:flex-start}.level-label span,.sanity-wrap>span{display:block;font-size:8px;letter-spacing:.2em;color:#90a097;margin-bottom:5px}.level-label strong{font-size:11px;letter-spacing:.12em}.sanity-wrap{width:160px;font-size:9px}.meter{height:5px;width:100%;background:rgba(190,210,195,.2);margin-top:5px;overflow:hidden}.meter i{display:block;height:100%;width:100%;background:var(--cyan);transition:width .15s}.hud-bottom{position:absolute;bottom:25px;left:28px;right:28px;display:flex;align-items:flex-end;justify-content:space-between}.status-stack{width:180px;font-size:8px;letter-spacing:.1em;color:#a6b2a8}.status-stack>div{margin-top:10px}.status-stack .meter{width:150px}.inventory{font-size:8px;color:var(--accent);margin-top:13px}.crosshair{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:19px;color:rgba(220,235,220,.6)}.interaction-hint{position:absolute;left:50%;top:56%;transform:translateX(-50%);font-size:10px;letter-spacing:.12em;color:#e6dfad}.voice-indicator{font-size:8px;letter-spacing:.15em;color:var(--cyan)}.subtitle-box{position:absolute;z-index:7;bottom:14%;left:50%;transform:translateX(-50%);max-width:80vw;text-align:center;color:#d4ded4;background:rgba(0,0,0,.55);padding:8px 16px;font-size:10px;letter-spacing:.06em;opacity:0;transition:opacity .2s;pointer-events:none}.subtitle-box.show{opacity:1}.toast{position:absolute;z-index:25;top:16px;left:50%;transform:translate(-50%,-10px);padding:10px 15px;border:1px solid var(--line);background:rgba(4,10,9,.94);color:var(--accent);font-size:9px;letter-spacing:.12em;opacity:0;transition:.2s;pointer-events:none}.toast.show{opacity:1;transform:translate(-50%,0)}.jumpscare-flash{position:absolute;inset:0;z-index:10;pointer-events:none;background:rgba(220,240,230,0);opacity:0}.jumpscare-flash.active{animation:jolt .85s steps(2) forwards}@keyframes jolt{0%{opacity:0;background:#dce6d4}12%{opacity:.75;background:#dce6d4}25%{opacity:.1;background:#090b0a}45%{opacity:.55;background:#a9b8aa}70%{opacity:.08;background:#000}100%{opacity:0}}.downed-overlay{position:absolute;inset:0;z-index:12;display:grid;place-items:center;background:rgba(2,5,5,.84)}.downed-overlay.hidden{display:none}.downed-card{width:min(400px,90vw);padding:30px;background:var(--panel);border:1px solid rgba(225,111,100,.35);text-align:center}.downed-card h2{font-size:42px;color:var(--danger)}.downed-card p{font-size:10px;line-height:1.8;color:var(--muted)}.downed-card .button{margin-top:15px}.high-contrast .game-hud{color:#fff;text-shadow:0 0 5px #000,0 0 10px #000}.high-contrast .meter{outline:1px solid white}.hidden{display:none!important}
@media(max-width:760px){.brand-block{top:8%;left:7%;right:7%}.brand-block h1{font-size:clamp(48px,14vw,80px)}.menu-panel{left:7%;bottom:7%}.lobby-grid{grid-template-columns:1fr;margin:20px auto;overflow:auto}.player-panel{min-height:200px}.lobby-bottom{flex-wrap:wrap}.lobby-bottom p{order:3;width:100%;margin:0}.settings-layout{grid-template-columns:1fr}.settings-tabs{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid var(--line);padding:10px 0}.tab{white-space:nowrap}.settings-content{padding:16px 3px}.modal-card{padding:16px}.hud-bottom{left:15px;right:15px;bottom:16px}.game-hud{padding:16px}.sanity-wrap{width:120px}.menu-foot{font-size:7px}}

/* Objective progress and complete downed-state actions */
.level-label small{display:block;margin-top:7px;color:var(--accent);font-size:9px;letter-spacing:.14em}
.downed-card .button{display:block;width:100%;margin:9px 0 0}
.downed-card .button.hidden{display:none!important}
.mission-note{margin:14px 0 0;color:var(--muted);font-size:9px;line-height:1.7;letter-spacing:.035em}

/* Live model preview and expanded multi-floor HUD. */
.avatar-preview-wrap{display:grid;grid-template-columns:210px 1fr;align-items:center;gap:14px;margin:10px 0 12px;padding:8px;border:1px solid rgba(137,196,174,.17);background:linear-gradient(135deg,rgba(18,31,26,.8),rgba(7,12,11,.56))}
#avatar-preview-canvas{display:block;width:210px;height:190px;background:#111a17;border:1px solid rgba(137,196,174,.14)}
#avatar-preview-canvas.preview-hidden{opacity:.25}
.preview-caption{display:flex;flex-direction:column;gap:7px;font-size:9px;letter-spacing:.16em;color:var(--cyan)}
.preview-caption small{font-size:8px;letter-spacing:.08em;color:var(--muted);line-height:1.6}
#floor-label{display:block;margin-top:4px;color:var(--cyan);font-size:9px;letter-spacing:.14em}
.stealth-indicator{position:absolute;right:24px;bottom:55px;padding:8px 12px;border:1px solid rgba(117,232,194,.36);background:rgba(5,18,13,.78);color:#8cf0c5;font-size:10px;letter-spacing:.18em;opacity:0;transform:translateY(5px);transition:opacity .18s,transform .18s;pointer-events:none}
.stealth-indicator.active{opacity:1;transform:translateY(0)}
@media(max-width:760px){.avatar-preview-wrap{grid-template-columns:1fr 1fr;gap:8px}#avatar-preview-canvas{width:100%;height:165px}.preview-caption{font-size:8px}.stealth-indicator{right:14px;bottom:65px}}
````


### FILE: js/config.js

````javascript
export const LEVELS = [
  'The Lobby','Habitable Zone','Pipe Dreams','Electrical Station','Abandoned Office','Terror Hotel','Lights Out','Thalassophobia','Cave System','Darkened Suburbs','The Bumper Crop','The Endless City','Matrix','The Infinite Apartments','Paradise','Futuristic Halls','Altered Topography','The Carrier','Memories','Attic Floor','Warehouse','Numbered Doors','Ruins Left Behind','Petrified Garden','The Moon','The Quarter Hub','Otherworldly','Bunker Woodwork','Stormstone Keep','Hyperian','Shift Beyond Reality','Roller Rink','Forest of the Skeleton Queen','The Infinite Mall','Sewer System','An Empty Car Park','Airport','Sublimity (The Poolrooms)','Intersecting Dimensions','Enchanted Forest','Roller Rockin\' Pizza','Black Lake','Horizon','Water World','Corroding Retail','Deepwell Corporation','Arabian Desert','Snake Forest','Sunset Beach','Trenches of War','The Moribund Highway','Olympia','School Halls','Alone','Stairwell of Spirals','Ice Kingdom','Frostbite','Art Gallery','Mudslide','Backway','Bayous','Train','Jungle Courtyard','Tranquility','Lurking Darkness','Bloodstained Garden','Swamp Exhibits','The Bakery','Eatery','The Road Trip of Affliction','Storage','Void Basement','The Iron Sea','The Red Lands','Stage Fright','Gallium Caves','Infinite Sewer System','Underground Train','Space Station','Watchtower','Highway','The Zoological Office','Trade Center','Sunken Submarine','Shifting Hedge Maze','Ship in a Bottle','Rivergate','Corridors of Time','Hallways of Love','Taste of Home','Newly Built Houses','Darkness','Crimson Glow','Overlook','Motion','Down Below','Ventilation System','The Lighthouse','Downtown Diner','The Ghastly Town','Silent Sounds'
].map((name, id) => ({ id, name, difficulty: 1 + (id % 7) * 0.08 }));

export const DIFFICULTIES = {
  EXPLORER: { entityCount: 0, entitySpeed: 0, batteryDrain: 0, staminaDrain: 0, spawnRate: 0, sanityDrain: 0 },
  EASY:     { entityCount: 1, entitySpeed: 1.45, batteryDrain: 0.42, staminaDrain: 0.65, spawnRate: 0.9, sanityDrain: 0.5 },
  NORMAL:   { entityCount: 2, entitySpeed: 2.05, batteryDrain: 0.72, staminaDrain: 1, spawnRate: 1.1, sanityDrain: 0.85 },
  HARD:     { entityCount: 3, entitySpeed: 2.7, batteryDrain: 1.15, staminaDrain: 1.2, spawnRate: 1.35, sanityDrain: 1.4 }
};

export const OUTFITS = {
  hazmat: { label: 'Hazmat Suit', base: '#b7a65c', accent: '#55d7d0', helmet: true },
  tactical: { label: 'Tactical Explorer', base: '#59685b', accent: '#c6b884', helmet: true },
  maintenance: { label: 'Maintenance Worker', base: '#b87532', accent: '#e2d4a1', helmet: false },
  researcher: { label: 'Lab Researcher', base: '#c5c9c2', accent: '#6eafb1', helmet: false }
};

export const DEFAULT_SETTINGS = {
  resolutionScale: 1, shadowQuality: 'Medium', fogDensity: 0.035, fov: 78, brightness: 1, vhsEnabled: true,
  masterVolume: 0.8, sfxVolume: 0.9, ambientVolume: 0.65, voiceVolume: 0.85, micGain: 1, audioInput: '', voiceMode: 'ptt', spatialAudio: true,
  sensitivity: 0.8, invertY: false, bobbing: 0.5, shake: 0.6,
  captions: true, photosensitive: false, highContrast: false,
  keybinds: { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', sprint: 'ShiftLeft', crouch: 'ControlLeft', flashlight: 'KeyF', interact: 'KeyE', walkie: 'KeyV', jump: 'Space' }
};

export const ACCESSORIES = [
  { id: 'shoulderLight', label: 'Shoulder flashlight' }, { id: 'backpack', label: 'Tactical backpack' },
  { id: 'gasMask', label: 'Dual-filter gas mask' }, { id: 'bodycam', label: 'Head-mounted bodycam' },
  { id: 'glowsticks', label: 'Belt glowsticks' }, { id: 'antenna', label: 'Long-range radio antenna' }
];

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_PLAYERS = 4;
export const NETWORK_TICK_MS = 50;
export const WORLD_SEED_DEFAULT = 781239;
````


### FILE: js/network.js

````javascript
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
````


### FILE: js/audio.js

````javascript
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
````


### FILE: js/textures.js

````javascript
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
````


### FILE: js/levelGenerator.js

````javascript
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
````


### FILE: js/entities.js

````javascript
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
````


### FILE: js/player.js

````javascript
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
````


### FILE: js/ui.js

````javascript
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
````


### FILE: js/main.js

````javascript
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
````
