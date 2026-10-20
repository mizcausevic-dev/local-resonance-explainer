# QA and release record

Date: 2026-10-20 (America/New_York)  
Release class: R2, public static educational app  
Evidence level: scientific schematic, not a calculated beam solution

## Executed checks

| Check | Result | Evidence and limit |
| --- | --- | --- |
| `npm.cmd run typecheck` | Exit 0 | TypeScript strict check passed. |
| `npm.cmd run test` | Exit 0 | Six tests: exact shot boundaries, 1,020-frame reference timing, deterministic states, phase continuity, camera continuity, fixture/input normalization, local mass relation, and schematic output curve relation. |
| `npm.cmd run build` | Exit 0 | Vite produced `dist/index.html`, CSS, and JS with relative asset paths. JS is 558.72 kB, 142.26 kB gzip; Vite emitted its 500 kB advisory. |
| `npm.cmd audit --omit=dev` | Exit 0 | npm reported zero production dependency advisories at check time. This is one dependency signal, not a general security certification. |
| Headless Chrome local browser pass | Exit 0 | At 1440×900: five shot states observed, play advanced, pause held, seek reproduced the same stage screenshot, anatomy freeze/callouts appeared, comparison appeared, and playback stopped at exactly 34. No uncaught page errors were recorded. |
| Mobile Chrome local browser pass | Exit 0 | At 390×844: all five primary controls visible; document width equaled viewport width, with no horizontal overflow. |
| WebGL-disabled Chrome pass | Exit 0 | Static diagram and explanatory status appeared. |
| In-app browser manual view | Observed | At approximately 1265×710, initial scene and controls fit the first viewport after the short-height layout adjustment. |
| Built bundle local preview | Observed | `npm.cmd run preview` at `http://127.0.0.1:4173/` loaded the static bundle with no console errors; the idle first frame was visible after repair. |
| GitHub Actions run [#2](https://github.com/mizcausevic-dev/local-resonance-explainer/actions/runs/39407935289) | Verified | Commit `70801ca6c7a51eb97cd59ec030c30697f2dbf7a5`: build and deploy jobs succeeded; the hosted test report recorded 6 passes. Pages artifact digest: `sha256:3bb95e95d164c3c8ea898038e80602b0973eb6b33df58ac04289ba200815359b`. |
| Public Pages browser pass | Verified | [Live site](https://mizcausevic-dev.github.io/local-resonance-explainer/) loaded with the 3D scene and relative CSS/JS assets. Chapter 5 navigation moved to 00:25, Play advanced the timeline, Pause held it, and the browser recorded no console errors. |

## Visual review

An internal full-screen visual concept was used for layout direction. It contained numerical attenuation and energy wording that did not fit the selected schematic evidence level, so the live app uses qualitative curves and qualified copy.

| Comparison point | Final inspection |
| --- | --- |
| Composition | Beam occupies the left stage, chapter narrative and chart the right rail, transport at bottom. |
| Palette | Obsidian background; steel beam; tungsten masses; cyan, gold, and violet explanatory overlays. |
| Typography | Editorial serif headings and compact sans-serif controls; no text baked into the WebGL canvas. |
| Fixture | Continuous curved beam, simple end supports, eight connected cells, interior actuator, non-contact interior sensor. |
| Chart | Qualitative selected-frequency marker and equipped/reference curves use the authored output envelope. No dB, power, energy percentage, or band-edge numbers. |
| Responsive state | Phone stacks the scene and narrative, retains chart, controls, and evidence label without horizontal overflow. |

## Remaining limits

- The schematic response is authored, not a beam equation solution or measured attenuation. Visual inspection does not validate physical performance.
- The score and effects were triggered through browser controls without uncaught errors; sound quality, loudness, and device audio hardware were not independently measured.
- Fullscreen is implemented through the Fullscreen API but was not independently exercised across browsers.
- The public Pages URL and basic interaction were checked in a desktop browser. Production Core Web Vitals, physical-device audio, and cross-browser behavior were not measured.
- The 558.72 kB JavaScript bundle is a deliberate single-bundle Three.js trade-off. The 500 kB build advisory remains.
- GitHub Actions reported Node.js 20 deprecation warnings for the referenced action versions and an `ubuntu-latest` image migration notice. The successful run used the current hosted runner behavior; these warnings warrant maintenance before the runner policy changes.

## Release and rollback

The static output is `dist/`. [The public repository](https://github.com/mizcausevic-dev/local-resonance-explainer) deploys `main` through `.github/workflows/pages.yml` to [GitHub Pages](https://mizcausevic-dev.github.io/local-resonance-explainer/). Run #1 built but could not deploy while Pages was disabled; Pages was enabled, then run #2 built, tested, and deployed successfully. To roll back, redeploy the last known good Actions artifact or revert the deployment commit; inspect the current run and URL after either action.
