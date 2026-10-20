import { clamp } from './timeline'

// Schematic response family. These authored envelopes are explanatory, not a
// beam solver, a dispersion calculation, or measured transmissibility.
export const CELL_COUNT = 8
export const INPUT_S = 0.115
export const OUTPUT_S = 0.885
export const CELL_S = Array.from({ length: CELL_COUNT }, (_, j) => 0.225 + j * 0.078)
export const SELECTED_CELL = 3
export const BEAM_LENGTH = 10
export const DISPLAY_AMPLITUDE = 0.17

function resonanceWeight(frequency: number) {
  return Math.exp(-Math.pow((frequency - 1.05) / 0.18, 2))
}

export function schematicEnvelope(s: number, frequency: number, equipped: boolean): number {
  const x = clamp(s, 0, 1)
  const supportShape = Math.sin(Math.PI * x)
  const spatialTexture = 1 + 0.06 * Math.sin(3 * Math.PI * x)
  const attenuation = equipped
    ? Math.exp(-2.1 * resonanceWeight(frequency) * clamp((x - CELL_S[0]) / (OUTPUT_S - CELL_S[0]), 0, 1))
    : 1
  const inputBase = Math.sin(Math.PI * INPUT_S) * (1 + 0.06 * Math.sin(3 * Math.PI * INPUT_S))
  return supportShape * spatialTexture * attenuation / inputBase
}

export function schematicOutput(frequency: number, equipped: boolean): number {
  return schematicEnvelope(OUTPUT_S, frequency, equipped)
}

export function beamDisplacement(s: number, frequency: number, phase: number, equipped: boolean): number {
  const spatialPhase = 4.2 * (s - INPUT_S)
  // Standing and traveling contributions are both implied by the finite-fixture illustration.
  return DISPLAY_AMPLITUDE * schematicEnvelope(s, frequency, equipped) *
    (0.77 * Math.cos(phase - spatialPhase) + 0.23 * Math.cos(phase + spatialPhase))
}

export function relativeDisplacement(cell: number, frequency: number, phase: number): number {
  const s = CELL_S[cell]
  const weight = resonanceWeight(frequency)
  const localVariation = 0.8 + 0.26 * Math.sin((cell + 1) * 1.7)
  const amplitude = DISPLAY_AMPLITUDE * localVariation * (0.16 + 1.06 * weight)
  const phaseOffset = -0.15 - 1.6 * clamp((frequency - 0.65) / 0.85, 0, 1)
  return amplitude * Math.cos(phase - 4.2 * (s - INPUT_S) + phaseOffset)
}

export function massDisplacement(cell: number, frequency: number, phase: number): number {
  return beamDisplacement(CELL_S[cell], frequency, phase, true) +
    relativeDisplacement(cell, frequency, phase)
}
