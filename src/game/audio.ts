/**
 * Procedural Web Audio Sound Synthesizer
 * 100% code-generated audio - Zero external assets or 404 dependencies.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.7;
  private isMusicPlaying: boolean = false;
  private musicIntervalId: number | null = null;
  private musicStep: number = 0;

  constructor() {
    // AudioContext will be initialized on user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public unlock() {
    this.initCtx();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.05
      );
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  // --- Sound Effects ---

  public playLaser(frequency: number = 840, detune: number = 0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.12);
    if (detune !== 0) osc.detune.setValueAtTime(detune, t);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playEnemyLaser() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.16);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  public playDash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.22;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(2800, t + 0.08);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.22);
    filter.Q.setValueAtTime(3.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.22);
  }

  public playHit() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.06);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  public playExplosion(isLarge: boolean = false) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const duration = isLarge ? 0.65 : 0.35;
    const t = this.ctx.currentTime;

    // Sub rumble
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isLarge ? 90 : 130, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + duration);
    oscGain.gain.setValueAtTime(isLarge ? 0.7 : 0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration);

    // Noise crack
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 1200 : 800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isLarge ? 0.6 : 0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  public playEMP() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const duration = 0.8;

    // Resonant sweep
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4500, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + duration);
    filter.Q.setValueAtTime(12, t);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  public playTelegraphAlert() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.setValueAtTime(1600, t + 0.05);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playLevelUp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73]; // A major arpeggio
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.28, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.25);
    });
  }

  public playComboStreak(combo: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const baseFreq = Math.min(1200, 440 + combo * 25);
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];

    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.045;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, noteTime + 0.14);

      gain.gain.setValueAtTime(0.22, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteTime);
      osc.stop(noteTime + 0.14);
    });
  }

  public playPickup() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(950, t + 0.09);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  public playPlayerHurt() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.18);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // --- Ambient Background Synth Engine ---

  public startMusic() {
    if (this.isMusicPlaying) return;
    this.initCtx();
    this.isMusicPlaying = true;
    this.musicStep = 0;

    // 128 BPM = ~117ms per 16th note
    const stepDuration = 117;
    const bassNotes = [55, 55, 55, 65.4, 55, 55, 73.4, 65.4]; // A1, C2, D2
    const leadNotes = [220, 261.63, 329.63, 392, 440, 523.25, 659.25, 440];

    this.musicIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.isMuted) return;
      const t = this.ctx.currentTime;
      const s = this.musicStep % 16;

      // Bassline on 8th notes
      if (s % 2 === 0) {
        const bassFreq = bassNotes[(s / 2) % bassNotes.length];
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.exponentialRampToValueAtTime(120, t + 0.2);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(t);
        osc.stop(t + 0.2);
      }

      // Synth Arpeggio on 16th notes
      if (s % 4 === 1 || s % 4 === 3) {
        const leadFreq = leadNotes[(this.musicStep / 2) % leadNotes.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(leadFreq, t);

        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.start(t);
        osc.stop(t + 0.14);
      }

      // Hi-hat tick
      if (s % 2 === 1) {
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        noise.start(t);
        noise.stop(t + 0.03);
      }

      this.musicStep++;
    }, stepDuration);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }
}

export const sound = new SoundEngine();
