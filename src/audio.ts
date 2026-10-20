import { DURATION, clamp } from './timeline'

type Voice = { oscillator: OscillatorNode, gain: GainNode }

// The original score is synthesized in-browser. Frequencies are musical choices
// and do not represent the mechanical excitation or measured power.
export class Score {
  private context: AudioContext | null = null
  private music: GainNode | null = null
  private effects: GainNode | null = null
  private voices: Voice[] = []
  private activeEffects = new Set<{ oscillator: OscillatorNode, gain: GainNode }>()
  private muted = false
  private musicLevel = 0.38
  private effectsLevel = 0.35

  private ensure() {
    if (this.context) return
    const context = new AudioContext()
    const master = context.createGain()
    const music = context.createGain()
    const effects = context.createGain()
    master.gain.value = 0.55
    music.connect(master)
    effects.connect(master)
    master.connect(context.destination)
    this.context = context
    this.music = music
    this.effects = effects
    for (const [frequency, waveform] of [[65.41, 'sine'], [130.81, 'triangle'], [196, 'sine'], [261.63, 'sine']] as const) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = waveform
      oscillator.frequency.value = frequency
      gain.gain.value = 0
      oscillator.connect(gain)
      gain.connect(music)
      oscillator.start()
      this.voices.push({ oscillator, gain })
    }
    this.applyLevels()
  }

  async play(t: number) {
    this.ensure()
    await this.context!.resume()
    this.update(t)
  }

  async pause() {
    this.cancelEffects()
    if (this.context?.state === 'running') await this.context.suspend()
  }

  update(t: number) {
    if (!this.context || this.context.state !== 'running') return
    const now = this.context.currentTime
    const closing = clamp((DURATION - t) / 1.6, 0, 1)
    const opening = clamp(t / 1.5, 0, 1)
    const pulse = 0.55 + 0.45 * Math.sin(Math.PI * 2 * t / 3.8) ** 2
    const near = Math.exp(-Math.pow((t - 20) / 8, 2))
    const gains = [0.075, 0.033 * pulse, 0.014 + 0.013 * near, 0.009 + 0.007 * pulse]
    this.voices.forEach((voice, i) => {
      voice.gain.gain.setTargetAtTime(gains[i] * opening * closing, now, 0.08)
      if (i === 1) voice.oscillator.detune.setTargetAtTime(3 * Math.sin(t * 0.36), now, 0.12)
    })
  }

  cue(kind: 'activate' | 'reveal' | 'sweep' | 'compare' | 'resolve') {
    if (!this.context || this.context.state !== 'running' || this.muted) return
    const context = this.context
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = kind === 'sweep' ? 1000 : 1600
    oscillator.type = kind === 'activate' ? 'sine' : 'triangle'
    const starts: Record<typeof kind, number> = {
      activate: 196, reveal: 392, sweep: 294, compare: 220, resolve: 261.63
    }
    const start = starts[kind]
    oscillator.frequency.setValueAtTime(start, now)
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'resolve' ? start / 2 : start * 0.76, now + 0.45)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48)
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(this.effects!)
    oscillator.start(now)
    oscillator.stop(now + 0.5)
    const active = { oscillator, gain }
    this.activeEffects.add(active)
    oscillator.onended = () => {
      this.activeEffects.delete(active)
      oscillator.disconnect()
      filter.disconnect()
      gain.disconnect()
    }
  }

  cancelEffects() {
    if (!this.context) return
    for (const effect of this.activeEffects) {
      effect.gain.gain.cancelScheduledValues(this.context.currentTime)
      effect.gain.gain.setValueAtTime(0, this.context.currentTime)
      try { effect.oscillator.stop(this.context.currentTime) } catch { /* already stopped */ }
    }
    this.activeEffects.clear()
  }

  setMuted(value: boolean) { this.muted = value; this.applyLevels() }
  isMuted() { return this.muted }
  setMusicLevel(value: number) { this.musicLevel = clamp(value, 0, 1); this.applyLevels() }
  setEffectsLevel(value: number) { this.effectsLevel = clamp(value, 0, 1); this.applyLevels() }

  private applyLevels() {
    if (!this.context) return
    const time = this.context.currentTime
    this.music!.gain.setTargetAtTime(this.muted ? 0 : this.musicLevel, time, 0.025)
    this.effects!.gain.setTargetAtTime(this.muted ? 0 : this.effectsLevel, time, 0.025)
  }
}
