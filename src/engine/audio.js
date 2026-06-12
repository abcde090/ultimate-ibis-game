// WebAudio-synthesised sound effects. Degrades to silence when
// WebAudio is unavailable or blocked; resume() must be called from a
// user gesture to satisfy autoplay policies.

export function createAudio() {
  let ctx = null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  } catch (err) {
    console.warn('WebAudio unavailable, playing silently:', err);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch((err) => console.warn('Audio resume failed:', err));
    }
  }

  function env(gainNode, t0, peak, attack, decay) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(peak, t0 + attack);
    g.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  }

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // The ibis squawk: a harsh descending croak.
  function honk() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620, t0);
    osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.22);

    const grit = ctx.createOscillator();
    grit.type = 'square';
    grit.frequency.setValueAtTime(311, t0);
    grit.frequency.exponentialRampToValueAtTime(95, t0 + 0.22);

    const gain = ctx.createGain();
    env(gain, t0, 0.22, 0.015, 0.24);
    osc.connect(gain);
    grit.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    grit.start(t0);
    osc.stop(t0 + 0.3);
    grit.stop(t0 + 0.3);
  }

  function splash() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(0.4);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t0);
    filter.frequency.exponentialRampToValueAtTime(220, t0 + 0.35);
    const gain = ctx.createGain();
    env(gain, t0, 0.3, 0.01, 0.38);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  function clang() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [523, 711, 1190].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f * (1 - i * 0.02);
      const gain = ctx.createGain();
      env(gain, t0, 0.16 / (i + 1), 0.005, 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    });
  }

  function ding() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [880, 1318].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      const gain = ctx.createGain();
      env(gain, t0 + i * 0.09, 0.14, 0.01, 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + i * 0.09);
      osc.stop(t0 + i * 0.09 + 0.45);
    });
  }

  function fanfare() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const gain = ctx.createGain();
      env(gain, t0 + i * 0.13, 0.16, 0.02, 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0 + i * 0.13);
      osc.stop(t0 + i * 0.13 + 0.55);
    });
  }

  return { resume, honk, splash, clang, ding, fanfare };
}
