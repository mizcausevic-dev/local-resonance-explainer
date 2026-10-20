# Local resonance

An interactive, 34.000-second 3D anatomy of a simply supported beam with eight local mass-and-flexure resonators. Built with TypeScript, Three.js, Vite, and browser-native Web Audio. No API key, runtime service, paid asset, or external media file is required.

## Evidence level

**Scientific schematic (Path B): “Schematic response—not a calculated wave solution.”**

The beam shape, resonator relative motion, qualitative response chart, and reduced output envelope come from one deterministic authored response family in `src/model.ts`. They are *not* Euler–Bernoulli finite-element solutions, measured transmissibility, experimental validation, a calculated band gap, or an energy balance. Chart curves are qualitative and use the same authored output envelope that drives the displayed sensor. Material names describe appearance.

The fixture is a continuous beam of displayed length 10 scene units, simply supported at both ends. Prescribed Y displacement is at an interior left station (normalized X = 0.115). Eight cells occupy X = 0.225–0.771, and the non-contact output sensor is at X = 0.885. The plain reference uses the same host, input amplitude, supports, sensor location, motion phase, and display scale. The apparent input-side interference and envelope reduction are illustrative. Damping, force, power, strain, reflection coefficient, and heat generation are not modeled.

Mass motion uses `u_j = w(x_j) + q_j`; the visible physical flexures join each local beam attachment to its mass while vibrating. In the shot 2 freeze-frame, the inspected unit is temporarily exploded and motion is held. Cyan, gold, and violet marks are explanatory overlays, distinct from the steel and tungsten appearance materials.

Excitation frequency is shown qualitatively as below / near / beyond the isolated-resonator reference frequency. The visible oscillation is deliberately slower than a physical beam vibration. The sweep is a set of quasi-steady authored states, not a transient chirp. The integrated visible phase is continuous across changing speed.

## Run

Verified with Node.js 24.11.0 and npm. Use a Node.js version supported by the locked Vite release.

```powershell
cd 'C:\Users\chaus\Documents\Codex\2026-10-20\files-pasted-by-the-user-act\outputs\local-resonance-explainer'
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite. Press Play to start the score. Space plays/pauses when focus is outside a control; left/right arrows seek by a second; R replays; M mutes; F toggles fullscreen. The timeline, chapter buttons, volume levels, and reduced-motion inspection mode are also operable by keyboard.

## Verify and package

```powershell
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd audit --omit=dev
```

The deployable static site is `dist/`. The Vite `base: './'` setting makes assets work beneath a GitHub Pages repository path.

## GitHub Pages

No repository target is assumed. Once the exact owner/repo and authorized branch are selected, copy this project into that checkout without replacing unrelated files, commit it on a reviewable branch, and use the included workflow at `.github/workflows/pages.yml` (or integrate its build/deploy steps into the repository's established workflow). Configure Pages to use **GitHub Actions** as its build source. The workflow uploads `dist/`; verify the resulting URL, asset loading, and controls in a real browser after deployment.

Rollback: redeploy the last known good Actions artifact or revert the deployment commit. Keep the prior artifact or commit SHA available before publication.

## Limitations

- This is an educational 3D schematic, not a design tool or validated mechanical simulation.
- The WebGL fallback is a static diagram plus the same chapter narrative and controls.
- Browser audio requires a user gesture. Music and effects are original procedural synthesis and do not represent mechanical power.
- Some browsers or embedded contexts do not support fullscreen.

## Scientific context

Primary research on locally resonant beams shows why resonator coupling can produce frequency-selective changes in flexural response. These papers inform the explanation, not the authored curves or a validation claim for this app:

- [Qureshi, Li & Tan, *Scientific Reports* 6, 28314 (2016)](https://www.nature.com/articles/srep28314)
- [Beli et al., *Scientific Reports* 9, 5617 (2019)](https://www.nature.com/articles/s41598-019-41999-0)
