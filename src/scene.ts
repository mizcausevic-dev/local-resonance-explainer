import * as THREE from 'three'
import { BEAM_LENGTH, CELL_S, INPUT_S, OUTPUT_S, SELECTED_CELL, beamDisplacement, massDisplacement, relativeDisplacement, schematicEnvelope } from './model'
import type { TimelineState } from './timeline'

const COLORS = {
  bg: 0x0d1118, beam: 0x687584, mass: 0x394352,
  cyan: 0x00e5ff, gold: 0xffd166, violet: 0x9d4edd,
  support: 0x4c5968, faint: 0x657182
}
const STATIONS = 72
const xAt = (s: number) => BEAM_LENGTH * (s - 0.5)
const clampDpr = () => Math.min(window.devicePixelRatio || 1, 1.8)

function beamGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array((STATIONS + 1) * 4 * 3)
  const indices: number[] = []
  for (let i = 0; i < STATIONS; i++) {
    const a = i * 4
    for (const [u, v, w, z] of [[0, 1, 4, 5], [2, 6, 3, 7], [0, 4, 2, 6], [1, 3, 5, 7]] as const)
      indices.push(a + u, a + v, a + w, a + v, a + z, a + w)
  }
  indices.push(0, 2, 1, 1, 2, 3)
  const e = STATIONS * 4
  indices.push(e, e + 1, e + 2, e + 1, e + 3, e + 2)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  g.setIndex(indices)
  return g
}

function setBeamGeometry(g: THREE.BufferGeometry, f: number, phase: number, equipped: boolean) {
  const p = g.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i <= STATIONS; i++) {
    const s = i / STATIONS
    const x = xAt(s)
    const y = beamDisplacement(s, f, phase, equipped)
    p.setXYZ(i * 4, x, y + 0.11, 0.28)
    p.setXYZ(i * 4 + 1, x, y - 0.11, 0.28)
    p.setXYZ(i * 4 + 2, x, y + 0.11, -0.28)
    p.setXYZ(i * 4 + 3, x, y - 0.11, -0.28)
  }
  p.needsUpdate = true
  g.computeVertexNormals()
}

function line(material: THREE.Material, points: number): THREE.Line {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points * 3), 3))
  return new THREE.Line(g, material)
}

function updateLine(l: THREE.Line, coordinates: (i: number, n: number) => [number, number, number]) {
  const p = l.geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) p.setXYZ(i, ...coordinates(i, p.count))
  p.needsUpdate = true
  l.geometry.computeBoundingSphere()
}

type Flexure = { physical: THREE.Line, glow: THREE.Line, side: number }
type Cell = { mass: THREE.Group, flexures: Flexure[], foot: THREE.Mesh, goldLine: THREE.Line, ghostGuide: THREE.Line }
type BeamSet = {
  group: THREE.Group
  beam: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  overlay: THREE.Line
  envelopeTop: THREE.Line
  envelopeBottom: THREE.Line
  cells: Cell[]
  sensorLine: THREE.Line
  sensor: THREE.Group
  actuator: THREE.Group
  outputDot: THREE.Mesh
}

function makeBeamSet(equipped: boolean): BeamSet {
  const group = new THREE.Group()
  const beam = new THREE.Mesh(beamGeometry(), new THREE.MeshStandardMaterial({
    color: COLORS.beam, metalness: 0.72, roughness: 0.34, side: THREE.DoubleSide
  }))
  group.add(beam)

  const supportMaterial = new THREE.MeshStandardMaterial({ color: COLORS.support, metalness: 0.65, roughness: 0.4 })
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x26303d, metalness: 0.45, roughness: 0.6 })
  for (const s of [0, 1]) {
    const x = xAt(s)
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 3), supportMaterial)
    pin.position.set(x, -0.36, 0)
    pin.rotation.y = Math.PI / 6
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.09, 0.75), baseMaterial)
    foot.position.set(x, -0.66, 0)
    group.add(pin, foot)
  }

  const overlay = line(new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.95, toneMapped: false }), STATIONS + 1)
  group.add(overlay)
  const envelopeMaterial = new THREE.LineDashedMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.47, dashSize: 0.14, gapSize: 0.1, toneMapped: false })
  const envelopeTop = line(envelopeMaterial, STATIONS + 1)
  const envelopeBottom = line(envelopeMaterial, STATIONS + 1)
  group.add(envelopeTop, envelopeBottom)

  const actuator = new THREE.Group()
  const actuatorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.37, 20),
    new THREE.MeshStandardMaterial({ color: 0x546373, metalness: 0.78, roughness: 0.29 }))
  actuatorBody.rotation.z = Math.PI / 2
  actuatorBody.position.set(-0.27, 0.33, 0)
  const actuatorTip = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 16),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, toneMapped: false }))
  actuatorTip.position.set(0, 0.12, 0)
  actuator.add(actuatorBody, actuatorTip)
  actuator.position.x = xAt(INPUT_S)
  group.add(actuator)

  const sensor = new THREE.Group()
  const sensorBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x344659, metalness: 0.72, roughness: 0.32 }))
  const sensorEye = new THREE.Mesh(new THREE.SphereGeometry(0.047, 12, 12),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, toneMapped: false }))
  sensorEye.position.y = -0.15
  sensor.add(sensorBody, sensorEye)
  sensor.position.set(xAt(OUTPUT_S), 1.19, 0)
  const sensorLine = line(new THREE.LineDashedMaterial({ color: COLORS.cyan, dashSize: 0.045, gapSize: 0.045, transparent: true, opacity: 0.65 }), 2)
  const outputDot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), new THREE.MeshBasicMaterial({ color: COLORS.cyan, toneMapped: false }))
  group.add(sensor, sensorLine, outputDot)

  const cells: Cell[] = []
  if (equipped) {
    const massMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.mass, metalness: 0.36, roughness: 0.48,
      emissive: 0x283442, emissiveIntensity: 0.88
    })
    const footMaterial = new THREE.MeshStandardMaterial({ color: 0x596777, metalness: 0.71, roughness: 0.33 })
    for (let j = 0; j < CELL_S.length; j++) {
      const x = xAt(CELL_S[j])
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.53), footMaterial)
      foot.position.set(x, 0.17, 0)
      group.add(foot)
      const mass = new THREE.Group()
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.56), massMaterial)
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.035, 0.59),
        new THREE.MeshStandardMaterial({ color: 0x556171, metalness: 0.86, roughness: 0.26 }))
      top.position.y = 0.13
      mass.add(body, top)
      mass.position.set(x, 0.88, 0)
      group.add(mass)
      const flexures: Flexure[] = []
      for (const side of [-1, 1]) {
        const physical = line(new THREE.LineBasicMaterial({ color: 0xa5b2bd }), 25)
        const glow = line(new THREE.LineBasicMaterial({ color: COLORS.violet, transparent: true, opacity: 0.7, toneMapped: false }), 25)
        group.add(physical, glow)
        flexures.push({ physical, glow, side })
      }
      const goldLine = line(new THREE.LineBasicMaterial({ color: COLORS.gold, transparent: true, opacity: 0.82, toneMapped: false }), 2)
      const ghostGuide = line(new THREE.LineDashedMaterial({ color: 0xb8a5cd, dashSize: 0.05, gapSize: 0.05, transparent: true, opacity: 0.7 }), 2)
      group.add(goldLine, ghostGuide)
      cells.push({ mass, flexures, foot, goldLine, ghostGuide })
    }
  }
  return { group, beam, overlay, envelopeTop, envelopeBottom, cells, sensorLine, sensor, actuator, outputDot }
}

function setFlexure(flexure: Flexure, x: number, beamY: number, massY: number, q: number, explode: number) {
  const side = flexure.side
  const shiftedX = x + (side * 0.22) + explode * 0.23
  const startY = beamY + 0.21 + explode * 0.2
  const endY = massY - 0.13 - explode * 0.19
  const coords = (i: number, n: number): [number, number, number] => {
    const v = i / (n - 1)
    const sBend = Math.sin(2 * Math.PI * v)
    const arch = Math.sin(Math.PI * v)
    return [
      shiftedX + side * (0.095 * sBend + 0.11 * q * arch),
      startY + (endY - startY) * v,
      side * 0.17
    ]
  }
  updateLine(flexure.physical, coords)
  updateLine(flexure.glow, (i, n) => {
    const [px, py, pz] = coords(i, n)
    return [px, py, pz + 0.008]
  })
}

function updateBeamSet(set: BeamSet, state: TimelineState, equipped: boolean, phase: number, reduced: boolean) {
  const f = state.frequency
  setBeamGeometry(set.beam.geometry, f, phase, equipped)
  updateLine(set.overlay, (i, n) => {
    const s = i / (n - 1)
    return [xAt(s), beamDisplacement(s, f, phase, equipped) + 0.116, 0.292]
  })
  set.overlay.visible = !reduced
  for (const [sign, envelope] of [[1, set.envelopeTop], [-1, set.envelopeBottom]] as const) {
    updateLine(envelope, (i, n) => {
      const s = i / (n - 1)
      return [xAt(s), sign * 0.17 * schematicEnvelope(s, f, equipped) + 0.11, 0.3]
    })
    envelope.computeLineDistances()
    envelope.visible = state.shot === 3 && !reduced
  }
  const inY = beamDisplacement(INPUT_S, f, phase, equipped)
  set.actuator.position.y = inY + 0.1
  const outY = beamDisplacement(OUTPUT_S, f, phase, equipped)
  set.outputDot.position.set(xAt(OUTPUT_S), outY + 0.13, 0.32)
  updateLine(set.sensorLine, (i) => [xAt(OUTPUT_S), i === 0 ? 1.02 : outY + 0.18, 0.18])
  set.sensorLine.computeLineDistances()
  for (let j = 0; j < set.cells.length; j++) {
    const cell = set.cells[j]
    const s = CELL_S[j]
    const x = xAt(s)
    const beamY = beamDisplacement(s, f, phase, true)
    const q = relativeDisplacement(j, f, phase)
    const exploded = j === SELECTED_CELL ? state.explode : 0
    const massY = 0.88 + massDisplacement(j, f, phase) + exploded * 0.62
    cell.foot.position.y = beamY + 0.17
    cell.mass.position.set(x + exploded * 0.53, massY, 0)
    cell.goldLine.visible = !reduced && state.shot !== 1
    updateLine(cell.goldLine, i => [x + exploded * 0.53, i === 0 ? massY + 0.22 : massY + 0.43, 0.34])
    cell.ghostGuide.visible = exploded > 0.01
    updateLine(cell.ghostGuide, i => [x, i === 0 ? beamY + 0.21 : 0.75, 0.35])
    cell.ghostGuide.computeLineDistances()
    for (const flexure of cell.flexures)
      setFlexure(flexure, x, beamY, massY, q, exploded)
  }
}

export class BeamScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-6, 6, 4, -4, 0.1, 100)
  private equipped = makeBeamSet(true)
  private reference = makeBeamSet(false)
  private resizeObserver: ResizeObserver
  private width = 1
  private height = 1
  private lastState: TimelineState | null = null
  private lastReduced = false

  constructor(private mount: HTMLElement) {
    // A paused single-frame explanation must remain visible after the browser
    // composites the canvas or moves the tab between foreground/background.
    this.renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: false, preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(clampDpr())
    this.renderer.setClearColor(COLORS.bg)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.35
    this.mount.appendChild(this.renderer.domElement)
    this.renderer.domElement.setAttribute('aria-hidden', 'true')
    this.scene.background = new THREE.Color(COLORS.bg)
    this.scene.add(new THREE.HemisphereLight(0xd4e6f5, 0x253245, 2.1))
    const key = new THREE.DirectionalLight(0xe8f2ff, 2.9)
    key.position.set(-4, 6, 6)
    this.scene.add(key)
    const rim = new THREE.DirectionalLight(0x00e5ff, 0.55)
    rim.position.set(5, 2, -4)
    this.scene.add(rim)
    const fill = new THREE.DirectionalLight(0xc7d7e8, 1.25)
    fill.position.set(1, 2, 8)
    this.scene.add(fill)
    this.scene.add(this.equipped.group, this.reference.group)
    this.camera.position.set(0.8, 4.65, 11.5)
    this.camera.lookAt(0, 0.55, 0)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.mount)
    this.resize()
  }

  private resize() {
    const rect = this.mount.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    if (Math.abs(width - this.width) < 0.5 && Math.abs(height - this.height) < 0.5) return
    this.width = width
    this.height = height
    const aspect = this.width / this.height
    const worldWidth = aspect < 1 ? 12.7 : 11.8
    const worldHeight = worldWidth / aspect
    this.camera.left = -worldWidth / 2
    this.camera.right = worldWidth / 2
    this.camera.top = worldHeight / 2
    this.camera.bottom = -worldHeight / 2
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.width, this.height, false)
    if (this.lastState) this.render(this.lastState, this.lastReduced)
  }

  render(state: TimelineState, reduced: boolean) {
    this.lastState = state
    this.lastReduced = reduced
    const phase = reduced ? 0 : state.phase
    updateBeamSet(this.equipped, state, true, phase, reduced)
    updateBeamSet(this.reference, state, false, phase, reduced)
    this.reference.group.visible = state.shot === 4
    this.equipped.group.position.y = state.comparison * 1.02
    this.reference.group.position.y = -1.63
    const snap = reduced
    const cameraX = snap ? [0, -0.6, 0, 0, 0][state.shot] : state.cameraX
    const cameraY = snap ? [0.55, 1.22, 0.68, 0.57, 0.28][state.shot] : state.cameraY
    const zoom = snap ? [1, 2.23, 1.24, 1.36, 0.97][state.shot] : state.cameraZoom
    this.camera.zoom = zoom
    this.camera.position.set(cameraX + 0.8, cameraY + 4.1, 11.5)
    this.camera.lookAt(cameraX, cameraY, 0)
    this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.resizeObserver.disconnect()
    this.renderer.dispose()
  }
}
