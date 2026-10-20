export const DURATION = 34
export const REFERENCE_FPS = 30
export const REFERENCE_FRAMES = 1020
export const SHOT_STARTS = [0, 5, 10, 17, 25] as const
export const SHOT_ENDS = [5, 10, 17, 25, 34] as const

export type Shot = 0 | 1 | 2 | 3 | 4
export type TimelineState = {
  t: number
  shot: Shot
  frequency: number
  phase: number
  freeze: number
  explode: number
  comparison: number
  compareSweep: number
  cameraX: number
  cameraY: number
  cameraZoom: number
}

export const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value))
export const smooth = (value: number) => {
  const x = clamp(value, 0, 1)
  return x * x * (3 - 2 * x)
}

export function shotAt(t: number): Shot {
  const time = clamp(t, 0, DURATION)
  if (time < 5) return 0
  if (time < 10) return 1
  if (time < 17) return 2
  if (time < 25) return 3
  return 4
}

// Continuous visible phase. Frequency is piecewise linear, so its integral is analytic.
// This is a presentation speed, not the modeled excitation frequency.
const TWO_PI = Math.PI * 2
function phaseCycles(t: number): number {
  const x = clamp(t, 0, DURATION)
  if (x <= 5) return 0.88 * x
  const at5 = 0.88 * 5
  if (x <= 10) {
    // Motion is held during the disassembly, with short fade-in/out windows.
    if (x <= 5.8) {
      const d = x - 5
      return at5 + 0.88 * (d - d * d / 1.6)
    }
    if (x <= 9.2) return at5 + 0.88 * 0.4
    const d = x - 9.2
    return at5 + 0.88 * (0.4 + d * d / 1.6)
  }
  const at10 = at5 + 0.88 * 0.8
  if (x <= 17) {
    const d = x - 10
    return at10 + 0.82 * d + (0.33 / 14) * d * d
  }
  const at17 = at10 + 0.82 * 7 + (0.33 / 14) * 49
  if (x <= 25) return at17 + 1.15 * (x - 17)
  const at25 = at17 + 1.15 * 8
  if (x <= 32) {
    const d = x - 25
    return at25 + 1.15 * d - (0.26 / 14) * d * d
  }
  return at25 + 1.15 * 7 - (0.26 / 14) * 49 + 0.89 * (x - 32)
}

function frequencyAt(t: number) {
  if (t < 10) return 0.66
  if (t < 17) return 0.66 + 0.39 * smooth((t - 10) / 7)
  if (t < 29) return 1.05
  return 1.05 + 0.45 * smooth((t - 29) / 3)
}

export function stateAt(rawTime: number): TimelineState {
  const t = clamp(rawTime, 0, DURATION)
  const shot = shotAt(t)
  // A single continuous camera path. Every chapter boundary shares its
  // predecessor's endpoint, so seeking never reveals a jump cut.
  const keys = [
    [0, 0, 0.55, 1], [5, 0, 0.55, 1],
    [6.4, -0.6, 1.22, 2.23], [8.4, -0.6, 1.22, 2.23],
    [10, -0.7, 0.68, 1.24], [17, 0.1, 0.68, 1.24],
    [20, 0.5, 0.57, 1.3], [25, 1.25, 0.57, 1.36],
    [27, 0, 0.28, 0.97], [34, 0, 0.28, 0.97]
  ] as const
  let left: readonly [number, number, number, number] = keys[0]
  let right: readonly [number, number, number, number] = keys.at(-1)!
  for (let i = 0; i < keys.length - 1; i++) {
    if (t >= keys[i][0] && t <= keys[i + 1][0]) {
      left = keys[i]
      right = keys[i + 1]
      break
    }
  }
  const blend = left === right ? 0 : smooth((t - left[0]) / (right[0] - left[0]))
  const cameraX = left[1] + (right[1] - left[1]) * blend
  const cameraY = left[2] + (right[2] - left[2]) * blend
  const cameraZoom = left[3] + (right[3] - left[3]) * blend
  const freeze = shot === 1 ? smooth((t - 5) / 0.8) * (1 - smooth((t - 9.2) / 0.8)) : 0
  const explode = shot === 1 ? smooth((t - 5.9) / 0.8) * (1 - smooth((t - 8.4) / 0.8)) : 0
  return {
    t, shot, frequency: frequencyAt(t), phase: TWO_PI * phaseCycles(t),
    freeze, explode,
    comparison: smooth((t - 25) / 1.8),
    compareSweep: smooth((t - 29) / 3),
    cameraX, cameraY, cameraZoom
  }
}

export function formatTime(t: number): string {
  const s = Math.floor(clamp(t, 0, DURATION))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
