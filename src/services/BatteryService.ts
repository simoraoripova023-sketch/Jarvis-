import { BatteryStatus } from '../types/neural';

class LaptopBatteryService {
  private status: BatteryStatus = {
    level: 100,
    charging: true,
    supported: false
  };

  private listeners: ((status: BatteryStatus) => void)[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined') return;

    try {
      if ('getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        this.status = {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
          supported: true
        };
        this.notify();

        battery.addEventListener('levelchange', () => {
          this.status.level = Math.round(battery.level * 100);
          this.notify();
        });

        battery.addEventListener('chargingchange', () => {
          this.status.charging = battery.charging;
          this.notify();
        });
      } else {
        // Fallback for browsers without Battery API
        this.status = {
          level: 92,
          charging: true,
          supported: false
        };
      }
    } catch {
      this.status = {
        level: 95,
        charging: true,
        supported: false
      };
    }
  }

  public subscribe(callback: (status: BatteryStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.status);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.status));
  }

  public getStatus(): BatteryStatus {
    return this.status;
  }
}

export const batteryService = new LaptopBatteryService();
