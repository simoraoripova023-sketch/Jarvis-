class SpatialAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private coreHumOsc: OscillatorNode | null = null;
  private coreHumGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.25;
      this.masterGain.connect(this.ctx.destination);
      this.startAmbientCoreHum();
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.25;
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private startAmbientCoreHum() {
    if (!this.ctx || !this.masterGain) return;
    try {
      // Deep sub-bass breathing core hum (55 Hz - A1 note)
      this.coreHumOsc = this.ctx.createOscillator();
      this.coreHumGain = this.ctx.createGain();

      this.coreHumOsc.type = 'sine';
      this.coreHumOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      // Low pass filter for warm organic sub hum
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime);

      this.coreHumGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.coreHumOsc.connect(filter);
      filter.connect(this.coreHumGain);
      this.coreHumGain.connect(this.masterGain);

      this.coreHumOsc.start();
    } catch {
      // Audio autoplay restrictions safeguard
    }
  }

  // 01. Boot Sequence Sound Effect
  public playBootSequenceSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Sub charge riser
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 2.5);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, t);
    filter.frequency.exponentialRampToValueAtTime(1800, t + 2.5);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 2.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 3.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 3.3);

    // High tech glass chime on system online
    setTimeout(() => {
      if (!this.ctx || !this.masterGain) return;
      const chimeT = this.ctx.currentTime;
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(1046.5, chimeT); // C6
      chimeOsc.frequency.exponentialRampToValueAtTime(2093, chimeT + 0.4);

      chimeGain.gain.setValueAtTime(0.2, chimeT);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, chimeT + 0.8);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.masterGain);
      chimeOsc.start(chimeT);
      chimeOsc.stop(chimeT + 0.8);
    }, 2500);
  }

  // 02. Neural Node Trigger / Point Sound
  public playNodePulseSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // 03. Data Expansion Sound (Open Palm)
  public playExpansionSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.4);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + 0.4);
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.52);
  }

  // 04. Rotation Sound (Fist / Drag)
  public playRotationSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // 05. Zoom Sound (Pinch / Scroll)
  public playZoomSound(isZoomIn: boolean) {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = isZoomIn ? 400 : 1200;
    const endFreq = isZoomIn ? 1200 : 400;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.25);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.29);
  }

  // 06. Amber Alert / System Surge Sound
  public playAmberAlertSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.setValueAtTime(330, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.42);
  }

  // 07. AI Prompt Query Sent Sound
  public playQuerySentSound() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5]; // C E G C arpeggio

    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const noteT = t + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteT);

      gain.gain.setValueAtTime(0.15, noteT);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteT);
      osc.stop(noteT + 0.13);
    });
  }
}

export const soundManager = new SpatialAudioSynthesizer();
