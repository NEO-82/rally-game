# Browser test evidence

Tested with Linux Chromium / Playwright, headless WebGL via SwiftShader, using a local HTTP server. This does not establish Windows Chrome/Edge compatibility, native GPU performance, or Unity readiness.

## Passed in a real browser

- WebGL scene and original procedural vehicle/course render; no JavaScript page errors.
- Race menu, three-second countdown, J acceleration: observed 22.2 km/h.
- K braking followed by automatic reverse: observed R and 9.0 km/h after near-standstill direction change.
- Automatic upshift: observed gear 2, 68.7 km/h, approximately 4,672 RPM.
- First gate crossing enables timer and advances expected gate to 2.
- D steering changes steering state and physical yaw (0.7223 to 0.7791 radians).
- C cycles 0 → 1 → 2 → 3 → 0. Cockpit render inspected.
- ESC pauses, clock remains frozen; resume and main menu work.
- All five vehicle selections and five course selections update the game state. All course lengths exceed 1 km.
- Four weather and four tire selections update state.
- Tarmac tire grip data: clear asphalt 1.38; rain asphalt 0.52; snow 0.108. These are data checks, not braking-distance measurements.
- Three.js npm archive SHA-512 verified against npm registry integrity; MIT license included.

## Not yet verified

- Direct file:// execution: blocked by the cloud browser's administrator policy. Local HTML uses classic scripts, no fetch/CDN/module imports, and no remotely loaded assets.
- Windows Chrome or Edge execution, native GPU performance, 60 FPS.
- Complete end-to-end stage finishes, three-lap circuit finishes, persistence after a browser restart.
- Quantitative braking/cornering comparison, precise handbrake/airborne/skid behavior, all car × course × tire × weather combinations.
- Unity import, C# compilation, Unity WheelCollider behavior or Unity WebGL build.

The browser prototype is a separate implementation. It provides a playable test of controls and presentation; it is not a substitute for the Unity validation plan.


# Version 2: sound, handling and graphics

- Live Chromium test: user-click AudioContext unlock, nonzero output waveform (~0.02 RMS), RPM-controlled engine frequency, wheel rolling audio, countdown 3/2/1/GO, handbrake/camera/recover controls, pause silence/resume, mute silence, volume slider. No BGM.
- Separate synthesis fixture: 17 event types generated without audio errors; dry tire squeal, gravel/mud slip, rain and airborne wheel silence verified via actual Web Audio gain nodes. This fixture does not constitute driving a full race or hearing every event in gameplay.
- A/D directions fixed for Three.js +Z vehicle coordinates: A positive yaw = screen left; D negative yaw = screen right. D exercised with browser keyboard input; both directions asserted in the physics fixture.
- Handling regression executes the actual physics function at 72 km/h on flat gravel, same car/tire, 0.6 s steering then 1 s release. Old peak lateral speed 1.2605 m/s; new 0.5292 m/s. Residual lateral speed 0.2471 → 0.00529 m/s. Handbrake still produces higher slip (7.15 m/s peak). This is a deterministic flat-ground fixture, not a whole-course measurement.
- New graphics: approximately 16,000 vehicle triangles including detail and outline, 42,441 terrain vertices in Finland, 720 trees, 4,500 grass instances. Clear Finland render approximately 480,000 visible triangles in the inspected view, versus ~27,000 in the old view. Counts vary with camera/course/culling; they are not FPS measurements.
- Physically based paint with clearcoat, glass, smooth geometry normals, road/terrain/rock grain and normal detail, procedural cloud sky, mountain ridges, vegetation and GPU grass movement. Chromium shader compilation and menu/race renders inspected.
- Fixed a negative first-frame delta during heavy startup that could displace the menu camera.

Tests provided: `tests/audio-smoke.cjs`, `tests/graphics-smoke.cjs` (Node.js + Playwright + Chromium; serve this folder locally), and `node tests/handling-regression.cjs` (Node.js only). Headless SwiftShader tests demonstrate function, not hardware performance. Windows Chrome/Edge and 60 FPS remain unverified. All original Unity limitations remain.
