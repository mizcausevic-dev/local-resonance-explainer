import { describe, expect, it } from 'vitest'
import { BEAM_LENGTH, CELL_S, INPUT_S, OUTPUT_S, beamDisplacement, massDisplacement, relativeDisplacement, schematicEnvelope, schematicOutput } from './model'
import { DURATION, REFERENCE_FRAMES, SHOT_ENDS, SHOT_STARTS, shotAt, stateAt } from './timeline'

describe('timeline and fixture', () => {
  it('has exact five-shot, 34-second, 1020-frame reference timing', () => {
    expect(DURATION).toBe(34)
    expect(REFERENCE_FRAMES).toBe(1020)
    expect(SHOT_STARTS).toEqual([0, 5, 10, 17, 25])
    expect(SHOT_ENDS).toEqual([5, 10, 17, 25, 34])
    expect([0, 5, 10, 17, 25, 34].map(shotAt)).toEqual([0, 1, 2, 3, 4, 4])
  })
  it('reproduces every requested visual state when seeking', () => {
    for (const t of [0, 4.9, 5, 7.2, 10, 15.5, 17, 24.99, 25, 31, 34])
      expect(stateAt(t)).toEqual(stateAt(t))
    expect(stateAt(34)).toEqual(stateAt(42))
  })
  it('keeps excitation phase continuous at segment boundaries', () => {
    for (const t of [5, 10, 17, 25, 32])
      expect(Math.abs(stateAt(t + 0.000001).phase - stateAt(t - 0.000001).phase)).toBeLessThan(0.0001)
  })
  it('keeps the camera continuous across chapter boundaries', () => {
    for (const t of [5, 10, 17, 25]) {
      const before = stateAt(t - 0.000001)
      const after = stateAt(t + 0.000001)
      expect(Math.abs(after.cameraX - before.cameraX)).toBeLessThan(0.0001)
      expect(Math.abs(after.cameraY - before.cameraY)).toBeLessThan(0.0001)
      expect(Math.abs(after.cameraZoom - before.cameraZoom)).toBeLessThan(0.0001)
    }
  })
  it('uses interior input, cells, and output with simple-support nodes', () => {
    expect(BEAM_LENGTH).toBeGreaterThan(0)
    expect(INPUT_S).toBeGreaterThan(0)
    expect(OUTPUT_S).toBeLessThan(1)
    expect(CELL_S[0]).toBeGreaterThan(INPUT_S)
    expect(CELL_S.at(-1)!).toBeLessThan(OUTPUT_S)
    for (const f of [0.66, 1.05, 1.5]) {
      expect(schematicEnvelope(0, f, true)).toBeCloseTo(0)
      expect(schematicEnvelope(1, f, true)).toBeCloseTo(0)
      expect(schematicEnvelope(INPUT_S, f, true)).toBeCloseTo(1)
      expect(schematicEnvelope(INPUT_S, f, false)).toBeCloseTo(1)
    }
  })
  it('shares the response family across chart, beam, and mass positions', () => {
    expect(schematicOutput(1.05, true)).toBeLessThan(schematicOutput(1.05, false))
    expect(schematicOutput(1.5, true)).toBeGreaterThan(schematicOutput(1.05, true))
    for (const f of [0.66, 1.05, 1.5])
      for (const phase of [0, 0.8, 2.4])
        for (const j of [0, 3, 7])
          expect(massDisplacement(j, f, phase) - beamDisplacement(CELL_S[j], f, phase, true))
            .toBeCloseTo(relativeDisplacement(j, f, phase))
  })
})
