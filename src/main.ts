import './style.css'
import { Score } from './audio'
import { schematicOutput } from './model'
import { BeamScene } from './scene'
import { DURATION, SHOT_STARTS, clamp, formatTime, stateAt } from './timeline'

type Chapter = { title: string, body: string, detail: string }
const chapters: Chapter[] = [
  {
    title: 'A beam begins to bend.',
    body: 'A prescribed transverse motion enters near the left support. The beam bends in Y while eight local resonators respond along its length.',
    detail: 'Host-beam flexural vibration · Local resonator array · Output displacement'
  },
  {
    title: 'Inside one resonator.',
    body: 'A compact mass is carried by continuous compliant flexures. Its motion is measured relative to the beam directly beneath it.',
    detail: 'Illustrative freeze-frame · Mass · Flexures · Beam attachment'
  },
  {
    title: 'The phase relationship changes.',
    body: 'As excitation approaches the local resonance region, relative motion grows. Each cell follows its own beam attachment, with a slightly different response.',
    detail: 'Quasi-steady frequency sweep · Flexure deformation is illustrative'
  },
  {
    title: 'Less motion reaches the sensor.',
    body: 'Near the selected region, the schematic output envelope is smaller. Motion near the input includes interference; flexures and masses exchange stored motion with the beam. No heat loss is modeled.',
    detail: 'Reduced transmission in the selected frequency region'
  },
  {
    title: 'The effect has a range.',
    body: 'With the same host beam, supports, input motion and display scale, the resonator-equipped illustration has lower output here. Beyond this region, its advantage diminishes.',
    detail: 'Same host beam and input displacement; resonators removed in reference'
  }
]

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <main class="experience">
    <header class="masthead">
      <div class="masthead-title"><span class="wordmark">Local resonance</span><span class="masthead-divider" aria-hidden="true"></span><span class="classification">Interactive beam anatomy</span></div>
      <span class="evidence">Schematic response—not a calculated wave solution.</span>
    </header>
    <div class="content">
      <section class="stage" aria-label="Three-dimensional beam animation">
        <div id="webgl" class="webgl"></div>
        <div id="fallback" class="fallback" role="img" aria-label="Static diagram: a simply supported beam with eight mass and flexure resonators, input actuator on the left and non-contact sensor on the right." hidden>
          <svg viewBox="0 0 800 440" aria-hidden="true"><defs><linearGradient id="beam-grad" x2="0" y2="1"><stop stop-color="#8898a8"/><stop offset="1" stop-color="#4d5968"/></linearGradient></defs><path d="M44 271 Q210 230 400 268 T756 264" fill="none" stroke="#00e5ff" stroke-width="5" opacity=".65"/><path d="M44 248 H756 V274 H44 Z" fill="url(#beam-grad)"/><path d="M44 284l-29 51h58zM756 284l-29 51h58z" fill="#5c6875"/><path d="M14 337h63M724 337h64" stroke="#758392" stroke-width="8"/><g id="fallback-cells"></g><path d="M106 200v42M700 161v84" stroke="#00e5ff" stroke-width="3" stroke-dasharray="5 5"/><rect x="85" y="175" width="42" height="25" rx="3" fill="#4b6172"/><rect x="681" y="138" width="38" height="25" rx="3" fill="#4b6172"/></svg>
          <p>Static inspection view. The interactive 3D scene needs WebGL.</p>
        </div>
        <div class="stage-label input-label">Prescribed input</div>
        <div class="stage-label output-label">Non-contact sensor</div>
        <div id="freeze-label" class="freeze-label" hidden>Illustrative freeze-frame</div>
        <div id="anatomy-callouts" class="anatomy-callouts" hidden><span>Resonator mass</span><span>Compliant flexures</span><span>Beam attachment</span></div>
        <div id="split-labels" class="split-labels" hidden><span>RESONATOR ARRAY</span><span>PLAIN HOST BEAM</span></div>
        <div class="stage-legend" aria-label="Color key"><span><i class="key cyan"></i>Beam displacement</span><span><i class="key gold"></i>Mass motion</span><span><i class="key violet"></i>Relative flexure motion</span></div>
      </section>
      <aside class="narrative" aria-live="polite">
        <div class="chapter-meta"><span id="chapter-number">CHAPTER 1 OF 5</span><span id="chapter-time">00:00 / 00:34</span></div>
        <h1 id="chapter-title"></h1>
        <p id="chapter-body" class="chapter-body"></p>
        <p id="chapter-detail" class="chapter-detail"></p>
        <div class="response-panel">
          <div class="response-heading"><span>OUTPUT RESPONSE</span><span>QUALITATIVE</span></div>
          <svg id="chart" viewBox="0 0 320 150" role="img" aria-label="Qualitative output displacement comparison for the resonator-equipped and plain reference beam">
            <path class="chart-grid" d="M26 20H304M26 70H304M26 120H304M26 20V120M304 20V120"/>
            <path id="curve-reference" class="curve-reference"></path>
            <path id="curve-equipped" class="curve-equipped"></path>
            <line id="chart-marker" class="chart-marker" x1="0" x2="0" y1="20" y2="120"></line>
            <circle id="chart-dot" class="chart-dot" r="4"></circle>
            <text x="26" y="143">BELOW</text><text x="143" y="143">NEAR RESONANCE</text><text x="269" y="143">BEYOND</text>
          </svg>
          <div class="axis-description">Excitation frequency / isolated resonator reference frequency</div>
          <div class="chart-legend"><span><i class="key cyan"></i>With resonators</span><span><i class="key gray"></i>Plain reference</span></div>
        </div>
      </aside>
    </div>
    <div class="science-note"><span>Y = transverse bending · X = beam length · Z = width</span><span>Oscillation slowed and displacement amplified for illustration.</span></div>
    <footer class="transport">
      <div class="transport-top">
        <button id="play" class="icon-button primary" aria-label="Play animation" title="Play or pause (Space)"><svg viewBox="0 0 24 24" aria-hidden="true"><path id="play-icon" d="M8 5v14l11-7z"/></svg></button>
        <button id="replay" class="icon-button" aria-label="Replay from start" title="Replay (R)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8V4M5 4h4M5 4a9 9 0 1 1-2 8"/></svg></button>
        <output id="time-output" class="time-output">00:00 / 00:34</output>
        <div class="scrub"><input id="timeline" type="range" min="0" max="34" value="0" step="0.001" aria-label="Animation timeline, 0 to 34 seconds" /><div id="chapter-ticks" class="chapter-ticks"></div></div>
        <button id="mute" class="icon-button" aria-label="Mute audio" title="Mute or unmute (M)"><svg viewBox="0 0 24 24" aria-hidden="true"><path id="speaker-icon" d="M4 9v6h4l5 4V5L8 9zM17 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg></button>
        <button id="audio-settings" class="icon-button settings-button" aria-label="Audio levels" aria-expanded="false" title="Music and effects levels"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16M9 4v6M16 9v6M7 14v6"/></svg></button>
        <button id="fullscreen" class="icon-button" aria-label="Enter fullscreen" title="Fullscreen (F)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg></button>
      </div>
      <nav id="chapter-nav" class="chapter-nav" aria-label="Jump to chapter"></nav>
      <div id="audio-panel" class="audio-panel" hidden><label>Music <input id="music-level" type="range" min="0" max="1" step="0.01" value="0.38" /></label><label>Effects <input id="effects-level" type="range" min="0" max="1" step="0.01" value="0.35" /></label></div>
    </footer>
    <div class="accessibility-row"><label class="motion-control"><input id="reduced-motion" type="checkbox" /> Reduced-motion inspection</label><span id="status" role="status">Ready. Press play to enable the original score.</span></div>
  </main>
`

const cellContainer = document.querySelector<SVGGElement>('#fallback-cells')!
cellContainer.innerHTML = Array.from({ length: 8 }, (_, i) => {
  const x = 194 + i * 60
  return `<path d="M${x-8} 248v-22q-9-8 0-16t0-16M${x+8} 248v-22q9-8 0-16t0-16" fill="none" stroke="#9d4edd" stroke-width="3"/><rect x="${x-20}" y="165" width="40" height="29" rx="3" fill="#394352" stroke="#778797"/>`
}).join('')

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!
const playButton = $<HTMLButtonElement>('#play')
const playIcon = $<SVGPathElement>('#play-icon')
const replayButton = $<HTMLButtonElement>('#replay')
const timeline = $<HTMLInputElement>('#timeline')
const timeOutput = $<HTMLOutputElement>('#time-output')
const status = $<HTMLElement>('#status')
const score = new Score()
let beamScene: BeamScene | null = null
let time = 0
let playing = false
let lastFrame = performance.now()
let firstFramePending = true
let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
$<HTMLInputElement>('#reduced-motion').checked = reduced
try {
  beamScene = new BeamScene($<HTMLElement>('#webgl'))
} catch (error) {
  console.error('WebGL initialization failed', error)
  $<HTMLElement>('#webgl').hidden = true
  $<HTMLElement>('#fallback').hidden = false
  status.textContent = 'WebGL unavailable. Static diagram and chapter narrative are available.'
}

const chartFmin = 0.62
const chartFmax = 1.55
const chartX = (f: number) => 26 + ((f - chartFmin) / (chartFmax - chartFmin)) * 278
const chartY = (amplitude: number) => 120 - Math.min(amplitude / 1.3, 1) * 95
function chartPath(equipped: boolean) {
  return Array.from({ length: 90 }, (_, i) => {
    const f = chartFmin + i / 89 * (chartFmax - chartFmin)
    return `${i ? 'L' : 'M'}${chartX(f).toFixed(2)} ${chartY(schematicOutput(f, equipped)).toFixed(2)}`
  }).join(' ')
}
$('#curve-reference').setAttribute('d', chartPath(false))
$('#curve-equipped').setAttribute('d', chartPath(true))

const nav = $<HTMLElement>('#chapter-nav')
nav.innerHTML = SHOT_STARTS.map((start, i) =>
  `<button type="button" data-time="${start}" aria-label="Jump to chapter ${i + 1}: ${['Excitation', 'Anatomy', 'Approaching resonance', 'Reduced transmission', 'Comparison'][i]}"><span class="tick-dot"></span><span class="tick-number">0${i + 1}</span><span class="tick-name">${['Excitation', 'Anatomy', 'Approach', 'Transmission', 'Comparison'][i]}</span></button>`
).join('')
nav.querySelectorAll<HTMLButtonElement>('button').forEach(button =>
  button.addEventListener('click', () => seek(Number(button.dataset.time))))

function paint() {
  const state = stateAt(time)
  beamScene?.render(state, reduced)
  const chapter = chapters[state.shot]
  $<HTMLElement>('#chapter-number').textContent = `CHAPTER ${state.shot + 1} OF 5`
  $<HTMLElement>('#chapter-time').textContent = `${formatTime(time)} / 00:34`
  $<HTMLElement>('#chapter-title').textContent = state.shot === 4 && state.compareSweep > 0.7 ? 'Not broadband isolation.' : chapter.title
  $<HTMLElement>('#chapter-body').textContent = chapter.body
  $<HTMLElement>('#chapter-detail').textContent = chapter.detail
  $<HTMLElement>('#freeze-label').hidden = state.shot !== 1 || state.freeze < 0.8
  $<HTMLElement>('#anatomy-callouts').hidden = state.shot !== 1 || state.explode < 0.5
  $<HTMLElement>('#split-labels').hidden = state.shot !== 4
  $<HTMLElement>('.stage').classList.toggle('comparison', state.shot === 4)
  $<HTMLElement>('.stage').classList.toggle('anatomy', state.shot === 1)
  $<HTMLElement>('.stage').classList.toggle('transmission', state.shot === 3)
  timeline.value = String(time)
  timeline.style.setProperty('--progress', `${time / DURATION * 100}%`)
  timeOutput.value = `${formatTime(time)} / 00:34`
  const markerX = chartX(state.frequency)
  $<SVGLineElement>('#chart-marker').setAttribute('x1', String(markerX))
  $<SVGLineElement>('#chart-marker').setAttribute('x2', String(markerX))
  $<SVGCircleElement>('#chart-dot').setAttribute('cx', String(markerX))
  $<SVGCircleElement>('#chart-dot').setAttribute('cy', String(chartY(schematicOutput(state.frequency, true))))
  nav.querySelectorAll('button').forEach((button, i) => {
    button.classList.toggle('active', i === state.shot)
    if (i === state.shot) button.setAttribute('aria-current', 'step')
    else button.removeAttribute('aria-current')
  })
  playButton.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation')
  playIcon.setAttribute('d', playing ? 'M7 5v14M17 5v14' : 'M8 5v14l11-7z')
}

async function play() {
  if (time >= DURATION) time = 0
  try {
    await score.play(time)
  } catch {
    status.textContent = 'Audio could not start; animation remains available.'
  }
  playing = true
  lastFrame = performance.now()
  if (time === 0) score.cue('activate')
  status.textContent = 'Playing. Audio is stylized and does not measure mechanical power.'
  paint()
}

async function pause() {
  playing = false
  await score.pause()
  status.textContent = `Paused at ${formatTime(time)}.`
  paint()
}

function seek(target: number) {
  score.cancelEffects()
  time = clamp(target, 0, DURATION)
  lastFrame = performance.now()
  score.update(time)
  if (time >= DURATION && playing) void pause()
  status.textContent = `At ${formatTime(time)}. ${chapters[stateAt(time).shot].title}`
  paint()
}

function replay() {
  score.cancelEffects()
  time = 0
  lastFrame = performance.now()
  score.update(time)
  status.textContent = 'Replayed from the beginning.'
  paint()
  if (!playing) void play()
}

playButton.addEventListener('click', () => playing ? void pause() : void play())
replayButton.addEventListener('click', replay)
timeline.addEventListener('input', () => seek(Number(timeline.value)))
const muteButton = $<HTMLButtonElement>('#mute')
muteButton.addEventListener('click', () => {
  score.setMuted(!score.isMuted())
  muteButton.setAttribute('aria-label', score.isMuted() ? 'Unmute audio' : 'Mute audio')
  muteButton.classList.toggle('muted', score.isMuted())
  status.textContent = score.isMuted() ? 'Audio muted.' : 'Audio unmuted.'
})
const audioSettings = $<HTMLButtonElement>('#audio-settings')
audioSettings.addEventListener('click', () => {
  const panel = $<HTMLElement>('#audio-panel')
  panel.hidden = !panel.hidden
  audioSettings.setAttribute('aria-expanded', String(!panel.hidden))
})
$<HTMLInputElement>('#music-level').addEventListener('input', event => score.setMusicLevel(Number((event.target as HTMLInputElement).value)))
$<HTMLInputElement>('#effects-level').addEventListener('input', event => score.setEffectsLevel(Number((event.target as HTMLInputElement).value)))
$<HTMLInputElement>('#reduced-motion').addEventListener('change', event => {
  reduced = (event.target as HTMLInputElement).checked
  status.textContent = reduced ? 'Reduced-motion inspection enabled.' : 'Full motion enabled.'
  paint()
})
const fullscreenButton = $<HTMLButtonElement>('#fullscreen')
fullscreenButton.addEventListener('click', async () => {
  if (document.fullscreenElement) await document.exitFullscreen()
  else if (app.requestFullscreen) await app.requestFullscreen()
  else status.textContent = 'Fullscreen is unavailable in this browser.'
})
document.addEventListener('fullscreenchange', () =>
  fullscreenButton.setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'))
document.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return
  if (event.code === 'Space') { event.preventDefault(); playing ? void pause() : void play() }
  if (event.key.toLowerCase() === 'r') replay()
  if (event.key.toLowerCase() === 'm') muteButton.click()
  if (event.key.toLowerCase() === 'f') fullscreenButton.click()
  if (event.key === 'ArrowRight') seek(time + 1)
  if (event.key === 'ArrowLeft') seek(time - 1)
  if (event.key === 'Home') seek(0)
  if (event.key === 'End') seek(DURATION)
})
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) paint()
})

function frame(now: number) {
  if (firstFramePending) {
    firstFramePending = false
    paint()
  }
  if (playing) {
    const previous = time
    time = Math.min(DURATION, time + Math.max(0, (now - lastFrame) / 1000))
    if (time - previous < 0.25) {
      for (const [at, kind] of [[5, 'reveal'], [10, 'sweep'], [17, 'compare'], [25, 'compare'], [32.8, 'resolve']] as const)
        if (previous < at && time >= at) score.cue(kind)
    }
    score.update(time)
    if (time >= DURATION) {
      playing = false
      void score.pause()
      status.textContent = 'Finished at 00:34. Replay or seek to inspect.'
    }
    paint()
  }
  lastFrame = now
  requestAnimationFrame(frame)
}
paint()
requestAnimationFrame(frame)
