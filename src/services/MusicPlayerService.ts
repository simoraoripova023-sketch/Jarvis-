import { MusicTrack } from '../types/neural';

class MusicPlayerService {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentTrackIndex: number = 0;
  private masterGain: GainNode | null = null;
  private sequenceInterval: number | null = null;

  private tracks: MusicTrack[] = [
    { id: '1', title: 'Iron Core Synthesizer', artist: 'JARVIS Audio Engine', category: 'Sci-Fi Synth', isPlaying: false },
    { id: '2', title: 'Deep Space Quantum Pulsar', artist: 'JARVIS Audio Engine', category: 'Ambient Cyber', isPlaying: false },
    { id: '3', title: 'Cyberpunk Neon Horizon', artist: 'JARVIS Audio Engine', category: 'Synthwave', isPlaying: false }
  ];

  private listeners: ((tracks: MusicTrack[], isPlaying: boolean) => void)[] = [];

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.22;
      this.masterGain.connect(this.ctx.destination);
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
      return false;
    } else {
      this.play();
      return true;
    }
  }

  public play(trackIndex?: number) {
    this.initCtx();
    if (trackIndex !== undefined && trackIndex >= 0 && trackIndex < this.tracks.length) {
      this.currentTrackIndex = trackIndex;
    }

    this.isPlaying = true;
    this.updateTrackStates();
    this.startGenerativeTrack();
    this.notify();
  }

  public pause() {
    this.isPlaying = false;
    if (this.sequenceInterval) {
      clearInterval(this.sequenceInterval);
      this.sequenceInterval = null;
    }
    this.updateTrackStates();
    this.notify();
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    if (this.isPlaying) {
      this.pause();
      this.play();
    } else {
      this.updateTrackStates();
      this.notify();
    }
  }

  private updateTrackStates() {
    this.tracks.forEach((t, i) => {
      t.isPlaying = this.isPlaying && i === this.currentTrackIndex;
    });
  }

  private startGenerativeTrack() {
    if (!this.ctx || !this.masterGain) return;
    if (this.sequenceInterval) clearInterval(this.sequenceInterval);

    // Dynamic arpeggios & bass lines for the selected track
    const scale1 = [130.81, 155.56, 174.61, 196.0, 233.08, 261.63, 311.13, 392.0]; // C minor sci-fi
    const scale2 = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 440.0]; // D minor ambient
    const scale3 = [110.0, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 329.63]; // A minor synthwave

    const currentScale = this.currentTrackIndex === 0 ? scale1 : this.currentTrackIndex === 1 ? scale2 : scale3;
    let step = 0;

    this.sequenceInterval = window.setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.isPlaying) return;

      const t = this.ctx.currentTime;
      const freq = currentScale[step % currentScale.length];
      step++;

      // Synth voice
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = this.currentTrackIndex === 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 + Math.sin(t * 0.5) * 250, t);
      filter.Q.value = 3.5;

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.6);
    }, 280);
  }

  public subscribe(callback: (tracks: MusicTrack[], isPlaying: boolean) => void): () => void {
    this.listeners.push(callback);
    callback(this.tracks, this.isPlaying);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.tracks], this.isPlaying));
  }

  public getTracks() {
    return this.tracks;
  }

  public getIsPlaying() {
    return this.isPlaying;
  }
}

export const musicPlayer = new MusicPlayerService();
