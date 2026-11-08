// Bio-Acoustic Voice Frequency & Pitch Detection Engine for JARVIS

export type UserGenderHonorific = 'MALE' | 'FEMALE' | 'AUTO';

export interface VoiceBiometricData {
  pitchHz: number;
  detectedGender: 'MALE' | 'FEMALE';
  honorificUz: 'janob' | 'xonim';
  honorificEn: 'sir' | "ma'am";
  confidence: number;
  isVoiceActive: boolean;
  manualOverride: UserGenderHonorific;
}

class VoiceBiometricsService {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animationFrameId: number | null = null;

  private currentData: VoiceBiometricData = {
    pitchHz: 130,
    detectedGender: 'MALE',
    honorificUz: 'janob',
    honorificEn: 'sir',
    confidence: 0.85,
    isVoiceActive: false,
    manualOverride: 'AUTO'
  };

  private pitchHistory: number[] = [];
  private listeners: ((data: VoiceBiometricData) => void)[] = [];

  private isInitializing: boolean = false;

  constructor() {
    // Lazily initialized on user interaction to comply with browser autoplay & permission policies
  }

  public async initMicrophoneAnalyser() {
    if (this.audioCtx || this.isInitializing) return;
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

    this.isInitializing = true;
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      
      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      source.connect(this.analyser);
      this.startPitchDetectionLoop();
    } catch {
      // Graceful fallback if mic permission not yet granted or denied
    } finally {
      this.isInitializing = false;
    }
  }

  public setManualOverride(override: UserGenderHonorific) {
    this.currentData.manualOverride = override;
    this.updateHonorifics();
    this.notify();
  }

  private startPitchDetectionLoop() {
    if (!this.analyser) return;

    const buffer = new Float32Array(this.analyser.fftSize);

    const checkPitch = () => {
      if (!this.analyser) return;

      this.analyser.getFloatTimeDomainData(buffer);
      const pitch = this.autoCorrelate(buffer, this.audioCtx?.sampleRate || 44100);

      if (pitch !== -1 && pitch >= 65 && pitch <= 450) {
        this.pitchHistory.push(pitch);
        if (this.pitchHistory.length > 15) this.pitchHistory.shift();

        const avgPitch = this.pitchHistory.reduce((a, b) => a + b, 0) / this.pitchHistory.length;
        this.currentData.pitchHz = Math.round(avgPitch);
        this.currentData.isVoiceActive = true;

        // Female fundamental frequency threshold is typically > 165Hz
        const isFemale = avgPitch > 168;
        this.currentData.detectedGender = isFemale ? 'FEMALE' : 'MALE';
        this.currentData.confidence = Math.min(0.98, 0.7 + (this.pitchHistory.length / 30));

        this.updateHonorifics();
        this.notify();
      } else {
        this.currentData.isVoiceActive = false;
      }

      this.animationFrameId = requestAnimationFrame(checkPitch);
    };

    checkPitch();
  }

  private updateHonorifics() {
    let effectiveGender = this.currentData.detectedGender;

    if (this.currentData.manualOverride === 'MALE') effectiveGender = 'MALE';
    if (this.currentData.manualOverride === 'FEMALE') effectiveGender = 'FEMALE';

    if (effectiveGender === 'FEMALE') {
      this.currentData.honorificUz = 'xonim';
      this.currentData.honorificEn = "ma'am";
    } else {
      this.currentData.honorificUz = 'janob';
      this.currentData.honorificEn = 'sir';
    }
  }

  // Autocorrelation pitch detection algorithm
  private autoCorrelate(buffer: Float32Array, sampleRate: number): number {
    let sumOfSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumOfSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumOfSquares / buffer.length);
    if (rms < 0.015) return -1; // Not enough audio energy (silence)

    let r1 = 0;
    let r2 = buffer.length - 1;
    const threshold = 0.2;

    for (let i = 0; i < buffer.length / 2; i++) {
      if (Math.abs(buffer[i]) < threshold) {
        r1 = i;
        break;
      }
    }

    for (let i = 1; i < buffer.length / 2; i++) {
      if (Math.abs(buffer[buffer.length - i]) < threshold) {
        r2 = buffer.length - i;
        break;
      }
    }

    const trimmed = buffer.slice(r1, r2);
    const c = new Array(trimmed.length).fill(0);

    for (let i = 0; i < trimmed.length; i++) {
      for (let j = 0; j < trimmed.length - i; j++) {
        c[i] = c[i] + trimmed[j] * trimmed[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxVal = -1;
    let maxPos = -1;

    for (let i = d; i < trimmed.length; i++) {
      if (c[i] > maxVal) {
        maxVal = c[i];
        maxPos = i;
      }
    }

    let T0 = maxPos;
    if (maxPos > 0 && maxPos < trimmed.length - 1) {
      const x1 = c[maxPos - 1];
      const x2 = c[maxPos];
      const x3 = c[maxPos + 1];
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      if (a) T0 = T0 - b / (2 * a);
    }

    return sampleRate / T0;
  }

  public getHonorific(lang: 'uz' | 'en' = 'uz'): string {
    return lang === 'uz' ? this.currentData.honorificUz : this.currentData.honorificEn;
  }

  public getData(): VoiceBiometricData {
    return this.currentData;
  }

  public subscribe(callback: (data: VoiceBiometricData) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentData);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.currentData }));
  }
}

export const voiceBiometrics = new VoiceBiometricsService();
