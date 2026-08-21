import { ActiveTimer } from '../types/neural';
import { soundManager } from './AudioSynthesizer';
import { jarvisVoice } from './JarvisVoiceService';

class TimerService {
  private timers: ActiveTimer[] = [];
  private intervals: { [id: string]: number } = {};
  private listeners: ((timers: ActiveTimer[]) => void)[] = [];

  public createTimer(durationSec: number, label: string = 'Timer'): ActiveTimer {
    const id = `timer-${Date.now()}`;
    const newTimer: ActiveTimer = {
      id,
      durationSec,
      remainingSec: durationSec,
      label,
      isRunning: true
    };

    this.timers.push(newTimer);
    this.startCountdown(id);
    this.notify();
    return newTimer;
  }

  private startCountdown(id: string) {
    if (this.intervals[id]) clearInterval(this.intervals[id]);

    this.intervals[id] = window.setInterval(() => {
      const timer = this.timers.find((t) => t.id === id);
      if (!timer) {
        clearInterval(this.intervals[id]);
        return;
      }

      if (timer.remainingSec > 1) {
        timer.remainingSec -= 1;
        this.notify();
      } else {
        // Expired
        timer.remainingSec = 0;
        timer.isRunning = false;
        clearInterval(this.intervals[id]);
        delete this.intervals[id];
        this.notify();

        // Alert user with alarm sound & Jarvis voice
        soundManager.playAmberAlertSound();
        setTimeout(() => {
          jarvisVoice.speak(`Sir, your ${timer.label} for ${this.formatDuration(timer.durationSec)} has expired.`);
        }, 500);
      }
    }, 1000);
  }

  public cancelTimer(id: string) {
    if (this.intervals[id]) {
      clearInterval(this.intervals[id]);
      delete this.intervals[id];
    }
    this.timers = this.timers.filter((t) => t.id !== id);
    this.notify();
  }

  public clearAllTimers() {
    Object.values(this.intervals).forEach((iv) => clearInterval(iv));
    this.intervals = {};
    this.timers = [];
    this.notify();
  }

  public getTimers(): ActiveTimer[] {
    return this.timers;
  }

  public subscribe(callback: (timers: ActiveTimer[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.timers);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.timers]));
  }

  private formatDuration(sec: number): string {
    if (sec < 60) return `${sec} seconds`;
    const mins = Math.round(sec / 60);
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  }
}

export const timerService = new TimerService();
