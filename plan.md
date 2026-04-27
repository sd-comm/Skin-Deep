# Void Walker — Performance Improvement Plan

Items listed in descending priority order.

---

## How to baseline and test

Before making any changes, record a baseline so each optimisation can be compared against it.

### Baseline recording (do this once before starting)
1. Open `void_walker.html` in Chrome or Edge
2. Open DevTools → **Performance** tab
3. Tick **Screenshots** and **Memory**
4. Press record, wait for the page to fully load, walk around for ~5 seconds, interact with the first object, then stop
5. Note down:
   - **LCP** (top-left of Insights panel)
   - **Scripting time** (Summary panel at the bottom)
   - **JS heap range** (bottom graph legend, e.g. `4.2 MB – 18.4 MB`)
   - **Frame durations** (hover the longest frames in the Frames row)
6. Save the profile via the download icon so you can compare later

Repeat the same recording steps after each optimisation is applied.

---

## 1. Extract the base64 wall texture to an external file
**Priority: Critical — Highest impact**

- Save the base64 string from the JS as an actual `wall.png` file on disk
- Replace the inline data URL reference with `new THREE.TextureLoader().load('wall.png')`
- Removes ~17 MB of encoded string from the HTML/JS payload
- Eliminates the ~1.3s JS parse and base64-decode block that happens at startup
- Fixes the LCP (currently 2.84s, should drop well under 1s)

### How to test
1. Record a new Performance profile using the same steps as the baseline
2. Check the **Network** tab — total transfer size should drop from ~17.4 MB to under ~500 KB
3. **LCP** should fall from 2.84s to under 1s
4. **Scripting time** in the Summary panel should drop noticeably (target: under 400ms)
5. The long early frames (208ms, 863ms, 466ms) should be gone — first few frames should be under 50ms
6. Visually confirm the wall texture still appears correctly in the scene

---

## 2. Cache DOM element references outside the animation loop
**Priority: High — Easy win, affects every frame**

The following elements are queried via `document.getElementById()` inside `animate()`, which runs 60 times per second:

- `'key-space'`
- `'interact-prompt'`
- `'toast'`
- `'ipr-label'`
- `'ipr-icon'`

Move all of them to `const` variables declared once at initialisation time and reference those variables inside the loop instead.

### How to test
1. Open DevTools → **Performance Monitor** (... menu → More tools → Performance monitor)
2. Watch the **CPU %** readout while walking around the scene
3. CPU % during movement should be measurably lower than baseline
4. Alternatively, record a profile and inspect the **Bottom-up** tab — `getElementById` calls should no longer appear in the hot path
5. Confirm all UI elements (key highlights, interact prompt, toast messages) still work correctly

---

## 3. Dispose the tutorial WebGL renderer after tutorial completes
**Priority: Medium**

- During tutorial step 3, a second `THREE.WebGLRenderer` (`_tutPreview.renderer`) is created and renders every frame alongside the main scene
- When `_tutDismiss()` is called, add cleanup:
  - `_tutPreview.renderer.dispose()`
  - Dispose the preview scene's geometries and materials
  - Set `_tutPreview = null`
- Removes a second GPU render loop and frees the associated memory after the tutorial ends

### How to test
1. Open DevTools → **Memory** tab
2. Take a heap snapshot **before** completing the tutorial
3. Complete the tutorial (press Space on the first object)
4. Take a second heap snapshot immediately after
5. Use **Comparison** view between the two snapshots — `WebGLRenderer` and associated `WebGLRenderTarget` objects should not appear as retained after dismissal
6. Alternatively, watch **GPU memory** in the Performance Monitor — it should dip slightly after the tutorial is dismissed rather than staying flat
7. Confirm the tutorial octahedron preview still renders correctly during step 3

---

## 4. Throttle or reduce dust motes on desktop
**Priority: Medium**

- Mobile is already throttled to every 2nd frame, but desktop runs all 3,000 motes with `sin`/`cos` calls every single frame
- Options (pick one or combine):
  - Reduce default count from 3,000 to ~1,000–1,500 (visually negligible difference)
  - Apply the same every-2nd-frame throttle on desktop that is already used on mobile
- Halves the trigonometric computation per second on desktop

### How to test
1. Record a Performance profile while walking around the scene
2. Open the **Bottom-up** tab and sort by **Self time** — the mote update loop (`sin`, `cos` calls) should rank lower or disappear from the top entries
3. Check **CPU %** in Performance Monitor during movement — should be lower than post-item-2 baseline
4. Visually confirm dust motes are still visible and moving naturally (the effect should be imperceptible to the eye at half the count or throttled rate)

---

## 5. Optimise floater proximity detection
**Priority: Low — Minor but free**

- `animate()` calls `Math.sqrt(dx*dx + dz*dz)` for all 9 floaters every frame
- Replace with squared distance comparison where possible:
  - `dx*dx + dz*dz < 7.84` instead of `Math.sqrt(...) < 2.8`
  - `dx*dx + dz*dz < 25` instead of `Math.sqrt(...) < 5`
- Only compute the actual `sqrt` when the prompt position needs to be projected onto screen space
- Eliminates 9 unnecessary square roots per frame

### How to test
1. This change is too small to measure reliably with the Performance tab alone
2. Use the **Bottom-up** tab after a profile recording — `Math.sqrt` should appear less frequently or not at all in the hot path
3. Functional test: walk up to each of the 9 floaters and confirm the interact prompt appears at the correct distance and disappears when walking away
4. Interact with each floater and confirm the toast message and burst animation still trigger correctly

---

## 6. Investigate and confirm memory growth is resolved
**Priority: Low — Dependent on item 1**

- The JS heap grows ~4× (4.2 MB → 18.4 MB) during the recorded session
- This is most likely caused by the wall texture base64 decode + GPU upload at startup
- After item 1 is implemented, re-profile to confirm heap growth stabilises
- If growth continues, audit `makeFloaterTex()` to confirm it is not creating new canvases or textures on repeated calls rather than reusing them

### How to test
1. Record a Performance profile with the same duration as the baseline (~10 seconds, walk + interact)
2. Look at the **JS heap** graph at the bottom of the timeline — the line should be relatively flat after initial load rather than climbing steeply
3. The heap range (shown in the legend) should be well under `18.4 MB` — target is under `8 MB` after initial scene load
4. If the heap is still growing, open the **Memory** tab and take three snapshots spaced 5 seconds apart while the scene is idle (no movement) — a growing heap at idle confirms a leak; a stable heap confirms the growth was load-related and is now resolved

