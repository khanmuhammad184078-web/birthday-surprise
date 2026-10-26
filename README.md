# Birthday Surprise Website: Cinematic Luxury Edition (source code)

An interactive birthday website: glowing envelope, playful anniversary passcode, personal letter, interactive cake, photo gallery with a full-screen viewer, and a final message. All five files below are plain HTML/CSS/JavaScript. Nothing has been deployed or published.

## Files and what changed

| File | Status | Notes |
|---|---|---|
| `cake.js` | **New** | The whole cake scene: layered SVG cake, canvas flames, glow, gust, smoke and crumbs, camera, and the state machine. Goes in the same folder as `index.html`. |
| `index.html` | Updated | One added line: `<script src="cake.js"></script>`, loaded before `script.js`. |
| `style.css` | Updated | Old CSS cake removed; new cake-scene styles added; fixed sideways overflow on small phones. |
| `script.js` | Updated | `cakeScreen()` rewritten to drive `cake.js`; screens can now clean up when you leave them. Everything else is unchanged. |
| `config.js` | Unchanged | Same `cake` keys still work: `candles`, `wishPrompt`, `blowLabel`, `cutLabel`, `afterCutMessage`. |
| `README.md` | Updated | This file. |

No image files are needed. The cake, flames, smoke and knife are drawn in code, so there are no new assets to place.

## How the cake scene works

Sequence: cake fades in, flames flicker (each with its own timing), you press the blow button, a visible gust crosses the candles, flames bend and shrink, go out one by one, thin smoke curls up and fades, the warm light fades slowly, the camera eases in, then the cut button unlocks. Cutting: a knife descends along one side, a dark cut line appears, the knife lifts, the same on the other side, then the slice separates and slides out onto the plate, revealing red-velvet and cream layers. Your `afterCutMessage` then appears and the Continue button shows.

- Interaction order is enforced by a state machine (entering, lit, blowing, out, cutting, cut). Double-clicks do nothing. You can still tap individual candles.
- If an animation ever fails or stalls, the scene finishes that step instantly so the visitor can continue.
- With "reduce motion" on, flames stay steady, there is no smoke or camera movement, and each step completes immediately.
- The scene's loop stops when you leave the screen or the tab is hidden, and "Start over" resets the cake so it can be played again.
- The labels come from your `config.js` ("Blow out the candles", "Cut the cake"); I did not rename them.
- This is a layered 2D illustration with real motion, not a 3D model or photograph.

## Save and run on Windows

1. Make a folder, for example `C:\birthday-site`.
2. Save `index.html`, `style.css`, `cake.js`, `script.js`, `config.js`, `README.md` into it with exactly those names. In Notepad choose **Save as type: All files** so Windows does not add `.txt`.
3. Put the `photos` folder (with your images) inside the same folder.
4. Double-click `index.html`, or in PowerShell: `cd C:\birthday-site` then `start index.html`.
5. Use a current Chrome, Edge, Firefox or Safari. If something looks wrong, press **F12** and read the Console.

## Testing checklist

- Passcode: wrong answer shows "Not quite. Try again." and shakes; each of `1st october`, `1 October`, `october 1`, `01 OCTOBER` unlocks; Enter key submits; no hint button.
- Name visibility: not on the opening screen or browser tab title; appears on the letter.
- Animations: envelope opens, headings animate word by word, background moves, nothing blocks clicking or typing.
- Cake: flames flicker; press the blow button (gust, bending, staggered going-out, smoke, light fades); the cut button unlocks only afterwards; knife cuts, slice slides out, message and confetti appear; pressing buttons twice does nothing; Start over resets the cake.
- Photos: images load, arrows and swipe work, tapping a photo opens the viewer, Esc/arrows/Close work.
- Final: headline animates, gold sparkles play, "Start over" returns to the envelope.
- Mobile: no sideways scrolling, text readable, buttons easy to tap, input does not zoom the page.
- Reduced motion: turn on "Reduce motion" in your device settings; the site should be calm and fully usable.

## Testing status (honest report)

Run in real headless Chromium with temporary placeholder photos: full click-through from envelope to final and back to a replay of the cake, at 1280x800, with reduced motion, and at a 375x700 touch phone viewport. Results: no console errors or warnings, no sideways overflow, the cut button stayed locked until all 6 candles were out, double-clicks were harmless, and the replay started with all candles lit. I also looked at screenshots of the lit, gust, smoke, knife, slice and finished states. `cake.js`, `script.js` and `config.js` pass Node syntax checks.

**Not tested:** real iPhones and Android phones, Firefox and Safari, frame rate and battery on low-end devices, touch tapping of the small individual candles on a real screen, screen readers, and your actual photos. The knife and slice are stylized artwork, so judge how realistic they look on your own screen.

## The passcode is playful, not secure

It runs in the page, so anyone who views the source can read the answers. Never protect private information with it.
