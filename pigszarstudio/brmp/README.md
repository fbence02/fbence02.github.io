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
