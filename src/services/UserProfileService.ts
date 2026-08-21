// JARVIS User Biometric Face Profile & Memory Service

export interface UserProfile {
  name: string;
  isRegistered: boolean;
  registeredAt: string;
  faceSignature?: {
    avgSkinHue: number;
    aspectRatio: number;
    luminance: number;
  };
  totalLogins: number;
}

const STORAGE_KEY = 'jarvis_user_profile_memory_v1';

class UserProfileService {
  private profile: UserProfile = {
    name: '',
    isRegistered: false,
    registeredAt: '',
    totalLogins: 0
  };

  private isEnrollmentModalOpen: boolean = false;
  private listeners: ((profile: UserProfile) => void)[] = [];
  private modalListeners: ((isOpen: boolean) => void)[] = [];

  constructor() {
    this.loadProfile();
  }

  private loadProfile() {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.profile = JSON.parse(data);
      }
    } catch {
      this.profile = { name: '', isRegistered: false, registeredAt: '', totalLogins: 0 };
    }
  }

  private saveProfile() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch {}
  }

  public getProfile(): UserProfile {
    return this.profile;
  }

  public getName(): string {
    return this.profile.name || '';
  }

  public isUserEnrolled(): boolean {
    return this.profile.isRegistered && !!this.profile.name;
  }

  public registerUser(name: string, faceSignature?: UserProfile['faceSignature']): UserProfile {
    const trimmedName = name.trim();
    this.profile = {
      name: trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1),
      isRegistered: true,
      registeredAt: new Date().toISOString(),
      faceSignature,
      totalLogins: (this.profile.totalLogins || 0) + 1
    };

    this.saveProfile();
    this.closeEnrollmentModal();
    this.notify();
    return this.profile;
  }

  public updateName(name: string) {
    this.registerUser(name, this.profile.faceSignature);
  }

  public resetProfile() {
    this.profile = { name: '', isRegistered: false, registeredAt: '', totalLogins: 0 };
    this.saveProfile();
    this.notify();
  }

  public openEnrollmentModal() {
    this.isEnrollmentModalOpen = true;
    this.notifyModal();
  }

  public closeEnrollmentModal() {
    this.isEnrollmentModalOpen = false;
    this.notifyModal();
  }

  public getIsEnrollmentModalOpen(): boolean {
    return this.isEnrollmentModalOpen;
  }

  public subscribe(callback: (profile: UserProfile) => void): () => void {
    this.listeners.push(callback);
    callback({ ...this.profile });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public subscribeModal(callback: (isOpen: boolean) => void): () => void {
    this.modalListeners.push(callback);
    callback(this.isEnrollmentModalOpen);
    return () => {
      this.modalListeners = this.modalListeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.profile }));
  }

  private notifyModal() {
    this.modalListeners.forEach((l) => l(this.isEnrollmentModalOpen));
  }
}

export const userProfileService = new UserProfileService();
