// WebAudio-synthesised sound: every effect is generated, nothing licensed.
// Degrades to silence when WebAudio is unavailable. Volumes follow settings.

import type { SettingsSystem } from './settings';
import type { DistrictId } from '../world/layoutData';

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private settings: SettingsSystem;
  private ambienceGain: GainNode | null = null;
  private wavesGain: GainNode | null = null;
  private ambienceStarted = false;

  constructor(settings: SettingsSystem) {
    this.settings = settings;
    try {
      const AC = window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch {
      this.ctx = null; // silent mode
    }
  }

  resume(): void {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => this.maybeStartAmbience()).catch(() => undefined);
    } else {
      this.maybeStartAmbience();
    }
  }

  private maybeStartAmbience(): void {
    if (!this.ambienceStarted && this.ctx && this.ctx.state === 'running') {
      this.ambienceStarted = true;
      this.startAmbience();
    }
  }

  private sfxVol(): number {
    return this.settings.current.masterVolume * this.settings.current.sfxVolume;
  }

  private env(gain: GainNode, t0: number, peak: number, attack: number, decay: number): void {
    const v = Math.max(0.0001, peak * this.sfxVol());
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(v, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  private noiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // The signature croak. Long squawks are deeper and angrier.
  honk(long = false): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const dur = long ? 0.45 : 0.22;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(long ? 520 : 620, t0);
    osc.frequency.exponentialRampToValueAtTime(long ? 120 : 180, t0 + dur);
    const grit = this.ctx.createOscillator();
    grit.type = 'square';
    grit.frequency.setValueAtTime(long ? 240 : 311, t0);
    grit.frequency.exponentialRampToValueAtTime(long ? 70 : 95, t0 + dur);
    const gain = this.ctx.createGain();
    this.env(gain, t0, long ? 0.3 : 0.22, 0.015, dur + 0.04);
    osc.connect(gain);
    grit.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0); grit.start(t0);
    osc.stop(t0 + dur + 0.1); grit.stop(t0 + dur + 0.1);
  }

  splash(): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.4);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t0);
    filter.frequency.exponentialRampToValueAtTime(220, t0 + 0.35);
    const gain = this.ctx.createGain();
    this.env(gain, t0, 0.3, 0.01, 0.38);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t0);
  }

  clang(): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    for (const [i, f] of [523, 711, 1190].entries()) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f * (1 - i * 0.02);
      const gain = this.ctx.createGain();
      this.env(gain, t0, 0.16 / (i + 1), 0.005, 0.5);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0); osc.stop(t0 + 0.6);
    }
  }

  ding(): void {
    this.chime([880, 1318], 0.09, 0.14);
  }

  unlock(): void {
    this.chime([659, 880, 1047], 0.11, 0.15);
  }

  fanfare(): void {
    this.chime([523, 659, 784, 1047, 1319], 0.13, 0.18);
  }

  private chime(freqs: number[], gap: number, peak: number): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    for (const [i, f] of freqs.entries()) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const gain = this.ctx.createGain();
      this.env(gain, t0 + i * gap, peak, 0.01, 0.45);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0 + i * gap); osc.stop(t0 + i * gap + 0.5);
    }
  }

  bark(): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    for (const offset of [0, 0.14]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t0 + offset);
      osc.frequency.exponentialRampToValueAtTime(90, t0 + offset + 0.09);
      const gain = this.ctx.createGain();
      this.env(gain, t0 + offset, 0.2, 0.008, 0.1);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0 + offset); osc.stop(t0 + offset + 0.15);
    }
  }

  warble(): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t0);
    osc.frequency.linearRampToValueAtTime(900, t0 + 0.1);
    osc.frequency.linearRampToValueAtTime(1600, t0 + 0.22);
    osc.frequency.linearRampToValueAtTime(1100, t0 + 0.34);
    const gain = this.ctx.createGain();
    this.env(gain, t0, 0.13, 0.02, 0.4);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0 + 0.5);
  }

  slipWhistle(): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t0);
    osc.frequency.exponentialRampToValueAtTime(280, t0 + 0.45);
    const gain = this.ctx.createGain();
    this.env(gain, t0, 0.14, 0.01, 0.5);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0 + 0.6);
    // The thud.
    const thud = this.ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(90, t0 + 0.45);
    thud.frequency.exponentialRampToValueAtTime(40, t0 + 0.6);
    const tg = this.ctx.createGain();
    this.env(tg, t0 + 0.45, 0.25, 0.005, 0.2);
    thud.connect(tg).connect(this.ctx.destination);
    thud.start(t0 + 0.45); thud.stop(t0 + 0.7);
  }

  pop(): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.08);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    const gain = this.ctx.createGain();
    this.env(gain, t0, 0.3, 0.003, 0.09);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t0);
  }

  // ---- ambience: gentle wind everywhere, waves layered in on the beach ----

  private startAmbience(): void {
    const ctx = this.ctx!;
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuffer(4);
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 420;
    this.ambienceGain = ctx.createGain();
    this.ambienceGain.gain.value = 0.045 * this.ambVol();
    wind.connect(windFilter).connect(this.ambienceGain).connect(ctx.destination);
    wind.start();

    const waves = ctx.createBufferSource();
    waves.buffer = this.noiseBuffer(6);
    waves.loop = true;
    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = 'lowpass';
    waveFilter.frequency.value = 600;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    const waveAmp = ctx.createGain();
    waveAmp.gain.value = 0.5;
    lfo.connect(lfoGain).connect(waveAmp.gain);
    this.wavesGain = ctx.createGain();
    this.wavesGain.gain.value = 0;
    waves.connect(waveFilter).connect(waveAmp).connect(this.wavesGain).connect(ctx.destination);
    waves.start();
    lfo.start();
  }

  private ambVol(): number {
    return this.settings.current.masterVolume * this.settings.current.ambienceVolume;
  }

  setDistrict(district: DistrictId): void {
    if (!this.ctx || !this.wavesGain || !this.ambienceGain) return;
    const t = this.ctx.currentTime;
    const beach = district === 'beach';
    this.wavesGain.gain.linearRampToValueAtTime(beach ? 0.12 * this.ambVol() : 0, t + 1.5);
    this.ambienceGain.gain.linearRampToValueAtTime((beach ? 0.02 : 0.045) * this.ambVol(), t + 1.5);
  }
}
