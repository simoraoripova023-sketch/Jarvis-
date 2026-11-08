// JARVIS Desktop Bridge Client Service
// Communicates with native Windows OS bridge running at http://127.0.0.1:4321

export interface DesktopTelemetry {
  status: 'ONLINE' | 'OFFLINE';
  platform: string;
  hostname: string;
  cpuModel: string;
  cpuCores: number;
  cpuUsage: number;
  totalRamGb: number;
  usedRamGb: number;
  ramUsagePercent: number;
  uptimeSeconds: number;
}

class DesktopBridgeService {
  private bridgeUrl = 'http://127.0.0.1:4321';
  private isConnected: boolean = false;
  private currentTelemetry: DesktopTelemetry | null = null;
  private listeners: ((telemetry: DesktopTelemetry | null, isConnected: boolean) => void)[] = [];
  private pollInterval: number | null = null;

  constructor() {
    this.startPolling();
  }

  public subscribe(callback: (telemetry: DesktopTelemetry | null, isConnected: boolean) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentTelemetry, this.isConnected);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getTelemetry(): DesktopTelemetry | null {
    return this.currentTelemetry;
  }

  private startPolling() {
    if (typeof window === 'undefined') return;

    this.checkConnection();
    // Poll telemetry every 2.5 seconds
    this.pollInterval = window.setInterval(() => {
      this.checkConnection();
    }, 2500);
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      const res = await fetch(`${this.bridgeUrl}/telemetry`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: DesktopTelemetry = await res.json();
        this.isConnected = true;
        this.currentTelemetry = data;
        this.notify();
        return true;
      }
    } catch {
      // Bridge server offline
    }

    if (this.isConnected) {
      this.isConnected = false;
      this.currentTelemetry = null;
      this.notify();
    }
    return false;
  }

  // Execute native Windows action
  public async execute(action: string, target?: string, value?: any): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${this.bridgeUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target, value })
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Buyruq bajarilmadi' };
      }
    } catch (e: any) {
      return { success: false, error: 'Desktop Bridge ulanmagan. Iltimos "npm run desktop" ni yoqing.' };
    }
  }

  // Helper actions
  public async openApp(appName: string) {
    // Protocol URI triggers for browser environments
    if (typeof window !== 'undefined') {
      if (appName === 'telegram' || appName === 'tg') {
        try {
          const link = document.createElement('a');
          link.href = 'tg://';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
          }, 100);
        } catch {}
      } else if (appName === 'spotify' || appName === 'musiqa') {
        try {
          const link = document.createElement('a');
          link.href = 'spotify:';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) document.body.removeChild(link);
          }, 100);
        } catch {}
      }
    }

    return this.execute('OPEN_APP', appName);
  }

  public async takeScreenshot() {
    return this.execute('SCREENSHOT');
  }

  public async lockPC() {
    return this.execute('LOCK_PC');
  }

  public async openFolder(folderPath?: string) {
    return this.execute('OPEN_FOLDER', folderPath);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentTelemetry, this.isConnected));
  }
}

export const desktopBridge = new DesktopBridgeService();

