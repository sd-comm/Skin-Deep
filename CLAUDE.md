# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Digital Exhibition Faith** is a browser-based 3D interactive WebGL experience for [Skin Deep magazine](https://skindeepmag.com). The visitor navigates a dimly lit liminal space as a glowing orb, discovering floating geometric exhibition pieces that trigger individual art pieces when interacted with.

The app is **buildless ES modules** — no bundler, no package manager, no compile step. `digital_exhibition_faith.html` holds the markup + CSS and loads Three.js r128 (CDN, global) then `js/main.js` as `<script type="module">`. Each exhibition lives in its **own file** under `js/exhibits/` so multiple people (or agents) can work on different exhibitions without touching the same file. The browser loads the modules directly over HTTP; deployment is still static files, no build.

## Running locally

```
python -m http.server 8080
```

Then open `http://localhost:8080/digital_exhibition_faith.html`.

> Must be served over HTTP — not `file://` — because textures load as separate files.

## Deployment

Push to `main` → Cloudflare Pages auto-deploys. No build step. The experience is embedded as an `<iframe>` on the Skin Deep site.

## Architecture

### File layout

```
digital_exhibition_faith.html   — markup + CSS; loads THREE (CDN) then js/main.js (module)
js/
  main.js          — manifest: imports the core + each exhibition module, then core.start()
  core.js          — shared runtime: scene, player, lights, floaters, dust, input, tutorial,
                     minimap, the animation loop, the exhibition REGISTRY, and the carousel engine
  exhibits/
    alim-photographer.js   — floater 1, photo carousel (data + info card)
    masjid-uncles.js       — floater 2, photo carousel (data + info card)
    vinyl-crate.js         — floater 3, bespoke (records, disc-focus, SoundCloud embed)
    crt-tv.js              — floater 6, bespoke (retro TV)
orb_tex.png                — Player orb texture
tile.png                   — Floor and wall tile texture
```

### Exhibition module system

`core.js` owns everything that is **not** specific to one exhibition and exposes it as a single
exported `core` object plus `registerExhibit` / `registerPhotoExhibit`. An exhibition module
imports `core`, manages its **own** private state, and registers itself — the core loop and
input dispatch drive every exhibition generically (no exhibition is named in `core.js`).

**The registry / lifecycle contract** (`core.registerExhibit(def)`): the core tracks one
`activeExhibit` for arbitration. A def is:

```js
registerExhibit({
  id, floater,                 // unique id + floater index it attaches to
  open(px, pz, yaw),           // begin opening; core sets activeExhibit
  isActive(),                  // truthy while any phase != null
  dismiss(),                   // begin closing (Escape / walk-away / mobile tap)
  update(ctx),                 // per-frame while active. ctx = { dt, t, eEdge, escEdge, iCD, setCD }
  locksMovement?(), dimsRoom?(), wantsHint?(),   // optional generic hooks the core loop reads
})
```

`core` exposes: `THREE, scene, camera, renderer, player, isMobile, floaters`, timing/positioning
(`CRATE_DIST, OPEN_DUR, CLOSE_DUR`), services (`setFloaterVisible, restoreFloater, setTriggerFloater,
disposeObject3D, beginExhibitDPR/endExhibitDPR, setCD, hidePrompt, computeFocusTarget, syncCamera,
showFocusEscapeHint/hideFocusEscapeHint, initTex, scheduleIdle, showToast`), input (`keys`), and
shared HUD element refs (`elPrompt, elAimReticle, elIprLabel, elIprIcon, elMmWrap, elUi, jZone`).

**To ADD an exhibition:** create `js/exhibits/<name>.js`, `import { core } from '../core.js'`,
build/cache its model + textures, and `core.registerExhibit({...})`. Then add ONE import line to
`js/main.js`. Nothing in `core.js` or other exhibition files changes. Two bespoke pieces (crate,
crt) are full self-contained modules; **photo carousels share an engine** — a new photo exhibit is
just a data file calling `registerPhotoExhibit({ id, floater, paths, cardTex })`.

### Internal structure of `core.js`

Logical sections separated by `// ══ SECTION NAME ══` headers:

1. **PROCEDURAL TEXTURES** — `makeOrbTexture()` loads `orb_tex.png`; `makeFloaterTex(type)` generates emissive maps for 8 floater types; `makeExhibitFrameTex` + the carousel texture helpers (shared engine).

2. **SCENE** — scene, renderer (ACES Filmic on desktop; off on mobile), fog, floor/walls/ceiling.

3. **PLAYER / ORB** — player group with orb mesh + 3 nested point lights + blob shadow.

4. **DUST MOTES** — 3 000 / 600 `BufferGeometry` particles. **Throttled to every 2nd frame.**

5. **FLOATERS** — 9 geometric objects (mesh, aura shell, orbit ring, shadow, light). Proximity drives emissive glow; `near.ref` is the floater within interact radius. Floaters with no registered exhibition just show a toast.

6. **INPUT** — WASD + arrows + `Space`/`E` (desktop); joystick + tap (mobile). Touch-look delegates focus-swipe to the active exhibition.

7. **TOAST / TUTORIAL / PARTICLE TRAIL / MINIMAP** — UI systems (5-stage tutorial, 120px GTA-style minimap, etc.).

8. **EXHIBITION REGISTRY** — `registerExhibit`, `registerPhotoExhibit`, `activeExhibit`, the `core` object, exports, `start()`.

9. **LOOP** — `requestAnimationFrame` loop (mobile 60 fps cap): movement, boundary clamp, orb pulse, room reveal, floater bob/proximity, generic interaction dispatch (`activeExhibit.open/dismiss/update`), then `activeExhibit?.update(ctx)`.

The carousel ENGINE (photo orbit, focus slideshow, frame textures) lives in `core.js` as shared
machinery; the bespoke crate/crt logic lives entirely in their own modules.

### Key constants

| Constant | Value | Purpose |
|---|---|---|
| `SPEED` | 4.2 | Player movement units/sec |
| `BOUND` | 15 | Player boundary clamp |
| `CAM_TURN` | 2.2 | Camera rotation rad/sec |
| `MOTE_N` | 3000 / 600 | Dust particle count desktop/mobile |
| `MAX_P` | 90 | Particle trail max |
| `MM_SIZE` | 120 | Minimap canvas px |

## Performance rules

These optimisations are already in place — all changes must stay consistent with them.

- **No DOM queries inside the loop** — cache all `getElementById` / `querySelector` refs as `const` at init time (in `core.js` just above `function animate()`, or at the top of an exhibition module for its own elements). Never query the DOM per-frame.
- **Squared distance comparisons** — use `dx*dx + dz*dz < r*r` instead of `Math.sqrt(...) < r` everywhere except when the actual distance value is required.
- **Throttle bulk attribute updates** — follow the `_moteFrame % 2 === 0` pattern for any new particle systems or per-frame array writes. Ask whether new work can run every 2nd frame or be skipped when the player hasn't moved.
- **Never embed textures as base64** — always save image assets as separate files and load with `new THREE.TextureLoader().load('filename.png')`. New textures should be compressed to <2 MB (use `python optimize_textures.py` on the dev branch).
- **Dispose WebGL resources explicitly** — geometries, materials, and textures created dynamically must call `.dispose()` and be set to `null` when no longer needed.

## Code style

- Buildless ES modules + vanilla Three.js. Do **not** introduce npm, bundlers, or build tools — the browser loads the modules directly and Cloudflare serves them as static files.
- `THREE` is a global (CDN classic script). Modules read it via `core.THREE` (or the destructured `THREE`).
- Exhibition modules talk to the rest of the app **only** through the imported `core` object — never reach across to another exhibition's internals.
- Section headers: `// ══ SECTION NAME ══` style.
- Prefer `const` over `let` for values that don't change.
