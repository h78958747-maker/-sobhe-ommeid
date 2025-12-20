
/**
 * Professional Synthesized Sound Effects for Cinematic AI Studio.
 * Uses Web Audio API to create subtle, high-end studio feedback.
 */

let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const createGain = (ctx: AudioContext, duration: number, startVolume: number = 0.1) => {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(startVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  return gain;
};

/**
 * Subtle "tup" sound for button clicks.
 */
export const playClick = () => {
  try {
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.1, 0.05);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.warn("Audio feedback failed", e);
  }
};

/**
 * Ascending "whoosh-pop" for image uploads.
 */
export const playUpload = () => {
  try {
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.3, 0.08);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.warn("Audio feedback failed", e);
  }
};

/**
 * Cinematic "chime" for successful rendering.
 */
export const playSuccess = () => {
  try {
    const ctx = initAudio();
    const now = ctx.currentTime;
    
    // Create a minor chord for a "tech-premium" feel
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.03, now + i * 0.05 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.05);
      osc.stop(now + 2);
    });
  } catch (e) {
    console.warn("Audio feedback failed", e);
  }
};

/**
 * Low frequency "hum" or "thud" for errors.
 */
export const playError = () => {
  try {
    const ctx = initAudio();
    const osc = ctx.createOscillator();
    const gain = createGain(ctx, 0.4, 0.1);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn("Audio feedback failed", e);
  }
};
