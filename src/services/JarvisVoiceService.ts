import { soundManager } from './AudioSynthesizer';
import { batteryService } from './BatteryService';
import { weatherService } from './WeatherService';
import { timerService } from './TimerService';
import { musicPlayer } from './MusicPlayerService';
import { JarvisAIService, normalizeUzbekText } from './JarvisAIService';
import { voiceBiometrics } from './VoiceBiometricsService';
import { notesPlannerService } from './NotesPlannerService';
import { userProfileService } from './UserProfileService';
import { NeuralVoiceCloneService } from './NeuralVoiceCloneService';
import { desktopBridge } from './DesktopBridgeService';
import { SystemThemeMode } from '../types/neural';

export interface JarvisCommandActions {
  onToggleSurge?: (enable?: boolean) => void;
  onSetThemeMode?: (theme: SystemThemeMode) => void;
  onTriggerGesture?: (gesture: 'FIST' | 'OPEN_PALM' | 'POINT' | 'PINCH') => void;
  onToggleFullscreen?: () => void;
  onToggleMute?: () => void;
  onToggleWebcam?: () => void;
  onOpenNotesModal?: () => void;
  onOpenEnrollmentModal?: () => void;
}

export type JarvisVoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'unsupported';
export type JarvisLanguage = 'uz' | 'en';

export interface UrlLaunchEvent {
  url: string;
  title: string;
  openedDirectly: boolean;
}

class JarvisVoiceService {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private lastSpeechEndTime: number = 0;
  private lastProcessedCommand: string = '';
  private lastProcessedTime: number = 0;
  private isSupported: boolean = false;
  private currentLanguage: JarvisLanguage = 'uz';
  private actions: JarvisCommandActions = {};
  
  private onStatusChangeCallback: ((status: JarvisVoiceStatus) => void) | null = null;
  private onTranscriptCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onResponseCallback: ((reply: string, userText: string, launchUrl?: { url: string; title: string }) => void) | null = null;
  private onUrlLaunchCallback: ((event: UrlLaunchEvent) => void) | null = null;
  private taskReminderTimer: number | null = null;

  constructor() {
    this.initSpeechRecognition();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.getVoices();
    }
    this.initPeriodicTaskReminders();
  }

  public registerActions(actions: JarvisCommandActions) {
    this.actions = actions;
  }

  public setLanguage(lang: JarvisLanguage) {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang === 'uz' ? 'uz-UZ' : 'en-US';
    }
  }

  public getLanguage(): JarvisLanguage {
    return this.currentLanguage;
  }

  public setCallbacks(
    onStatusChange: (status: JarvisVoiceStatus) => void,
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onResponse: (reply: string, userText: string, launchUrl?: { url: string; title: string }) => void,
    onUrlLaunch?: (event: UrlLaunchEvent) => void
  ) {
    this.onStatusChangeCallback = onStatusChange;
    this.onTranscriptCallback = onTranscript;
    this.onResponseCallback = onResponse;
    if (onUrlLaunch) this.onUrlLaunchCallback = onUrlLaunch;
  }

  private initSpeechRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRec) {
      this.isSupported = false;
      return;
    }

    this.isSupported = true;
    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage === 'uz' ? 'uz-UZ' : 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        if (!this.isSpeaking) {
          this.notifyStatus('listening');
        }
      };

      this.recognition.onresult = (event: any) => {
        // STRICT ECHO SUPPRESSION: If JARVIS is currently speaking or just finished within 1200ms, ignore mic input completely
        if (this.isSpeaking || Date.now() - this.lastSpeechEndTime < 1200) {
          return;
        }

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (this.onTranscriptCallback && currentText) {
          this.onTranscriptCallback(currentText, !!finalTranscript);
        }

        if (finalTranscript) {
          const cleanText = finalTranscript.trim();
          const lower = cleanText.toLowerCase();
          const now = Date.now();

          // Anti-loop & Deduplication: Ignore identical transcripts within 3 seconds
          if (
            (lower === this.lastProcessedCommand && now - this.lastProcessedTime < 3000) ||
            cleanText.length < 2
          ) {
            return;
          }

          this.lastProcessedCommand = lower;
          this.lastProcessedTime = now;
          this.processVoiceCommand(cleanText);
        }
      };

      this.recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.isListening = false;
          this.notifyStatus('idle');
        }
      };

      this.recognition.onend = () => {
        if (this.isListening && !this.isSpeaking) {
          try {
            this.recognition.start();
          } catch {
            this.isListening = false;
            this.notifyStatus('idle');
          }
        } else if (!this.isSpeaking) {
          this.notifyStatus('idle');
        }
      };
    } catch {
      this.isSupported = false;
    }
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public toggleListening(): boolean {
    const honorific = voiceBiometrics.getHonorific(this.currentLanguage);

    if (!this.isSupported || !this.recognition) {
      this.speak(
        this.currentLanguage === 'uz'
          ? `Mikrofon orqali ovozli qabul ushbu brauzerda qo'llab-quvvatlanmaydi. Savollaringizni to'g'ridan-to'g'ri terminalga yozishingiz mumkin, ${honorific}.`
          : `Microphone speech recognition is not supported in this browser. You can type commands directly in the terminal, ${honorific}.`
      );
      return false;
    }

    if (this.isListening) {
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch {}
      this.notifyStatus('idle');
      return false;
    } else {
      try {
        voiceBiometrics.initMicrophoneAnalyser();
        this.isListening = true;
        this.recognition.lang = this.currentLanguage === 'uz' ? 'uz-UZ' : 'en-US';
        this.recognition.start();
        soundManager.playNodePulseSound();
        this.notifyStatus('listening');
        return true;
      } catch {
        this.isListening = false;
        this.notifyStatus('idle');
        return false;
      }
    }
  }

  public startListening() {
    if (this.isSupported && this.recognition && !this.isListening) {
      try {
        voiceBiometrics.initMicrophoneAnalyser();
        this.isListening = true;
        this.recognition.lang = this.currentLanguage === 'uz' ? 'uz-UZ' : 'en-US';
        this.recognition.start();
        this.notifyStatus('listening');
      } catch {}
    }
  }

  public stopListening() {
    if (this.isListening && this.recognition) {
      this.isListening = false;
      try {
        this.recognition.stop();
      } catch {}
      this.notifyStatus('idle');
    }
  }

  private notifyStatus(status: JarvisVoiceStatus) {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback(status);
    }
  }

  public async speak(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined') {
      if (onEnd) onEnd();
      return;
    }

    const isUz = this.currentLanguage === 'uz' || JarvisAIService.isUzbekText(text);

    // Stop any ongoing speech or audio
    NeuralVoiceCloneService.stopVoice();

    // 1. PRIMARY: Try Desktop Bridge Authentic Neural Uzbek Voice (uz-UZ-SardorNeural)
    try {
      const neuralAudio = await NeuralVoiceCloneService.synthesizeNeuralVoice(text, isUz ? 'uz' : 'en');
      if (neuralAudio) {
        this.isSpeaking = true;
        this.notifyStatus('speaking');

        if (this.recognition && this.isListening) {
          try { this.recognition.abort(); } catch {}
        }

        NeuralVoiceCloneService.playWithYusufEqualizer(
          neuralAudio,
          () => {
            this.isSpeaking = true;
            this.notifyStatus('speaking');
          },
          () => {
            this.isSpeaking = false;
            this.lastSpeechEndTime = Date.now();
            this.notifyStatus(this.isListening ? 'listening' : 'idle');

            setTimeout(() => {
              if (this.isListening && this.recognition && !this.isSpeaking) {
                try { this.recognition.start(); } catch {}
              }
            }, 600);

            if (onEnd) onEnd();
          }
        );
        return;
      }
    } catch {}

    // 2. SECONDARY FALLBACK: Browser Web SpeechSynthesis
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();

        const phoneticText = NeuralVoiceCloneService.cleanUzbekPhonetics(text);
        const utterance = new SpeechSynthesisUtterance(phoneticText);

        utterance.rate = 0.94;
        utterance.pitch = 0.82;

        const voices = window.speechSynthesis.getVoices();

        let selectedVoice = null;

        if (isUz) {
          selectedVoice = voices.find(
            (v) =>
              (v.lang.startsWith('uz') || v.lang.startsWith('tr'))
          ) || voices.find(
            (v) => v.lang.startsWith('ru')
          ) || voices.find(
            (v) => v.name.includes('David') || v.lang.startsWith('en')
          );
        } else {
          selectedVoice = voices.find(
            (v) =>
              v.name.includes('UK English Male') ||
              v.name.includes('Google UK English Male') ||
              v.name.includes('David') ||
              v.name.includes('George') ||
              v.name.includes('Daniel') ||
              v.lang.startsWith('en')
          );
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          this.isSpeaking = true;
          this.notifyStatus('speaking');
          if (this.recognition && this.isListening) {
            try {
              this.recognition.abort();
            } catch {}
          }
        };

        utterance.onend = () => {
          this.isSpeaking = false;
          this.lastSpeechEndTime = Date.now();
          this.notifyStatus(this.isListening ? 'listening' : 'idle');

          setTimeout(() => {
            if (this.isListening && this.recognition && !this.isSpeaking) {
              try {
                this.recognition.start();
              } catch {}
            }
          }, 600);

          if (onEnd) onEnd();
        };

        utterance.onerror = () => {
          this.isSpeaking = false;
          this.lastSpeechEndTime = Date.now();
          this.notifyStatus(this.isListening ? 'listening' : 'idle');
          if (this.isListening && this.recognition) {
            try {
              this.recognition.start();
            } catch {}
          }
          if (onEnd) onEnd();
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch {
        this.isSpeaking = false;
        if (onEnd) onEnd();
      }
    }

    if (onEnd) onEnd();
  }

  public openExternalLink(url: string, title: string): boolean {
    let opened = false;
    try {
      const newWin = window.open(url, '_blank', 'noopener,noreferrer');
      if (newWin && !newWin.closed && typeof newWin.closed !== 'undefined') {
        opened = true;
      }
    } catch {
      opened = false;
    }

    if (this.onUrlLaunchCallback) {
      this.onUrlLaunchCallback({ url, title, openedDirectly: opened });
    }

    return opened;
  }

  // Voice Announcement of Today's Plans & Tasks
  public announceDailyTasks() {
    const isUz = this.currentLanguage === 'uz';
    const baseHonorific = voiceBiometrics.getHonorific(isUz ? 'uz' : 'en');
    const userName = userProfileService.getName() || 'Simora';
    const honorific = `${userName} ${baseHonorific}`;

    const notes = notesPlannerService.getNotes();
    const pending = notes.filter((n) => !n.completed);

    let message = '';
    if (pending.length === 0) {
      message = isUz
        ? `Barcha kunlik topshiriqlar bajarilgan, ${honorific}. Bugungi rejalaringiz ro'yxati toza.`
        : `All daily tasks have been completed, ${honorific}. Your schedule is clear today.`;
    } else {
      message = isUz
        ? `Simora xonim, bugun soat 20:30 da AI vositalari bo'yicha 90 daqiqalik darsingiz belgilangan. Jonli namoyish va amaliy mashg'ulotlarga alohida e'tibor qaratishingizni tavsiya qilaman. Shuningdek, o'quvchilaringizga eslatma kiritildi: darsda Simora xonimni ko'p urintirmaslik va vaqti-vaqti bilan issiq kofe taklif qilib turish!`
        : `Simora ma'am, today at 20:30 you have your 90-minute AI tools lesson. I recommend emphasizing the live demos and interactive exercises. Also, a friendly reminder has been set for your students: please take care of Simora ma'am and offer her hot coffee!`;
    }

    this.speak(message);
    if (this.onResponseCallback) {
      this.onResponseCallback(message, "Bugungi rejalarni ayt");
    }
  }

  // Periodic Reminder Loop for Unfinished Tasks
  public initPeriodicTaskReminders() {
    if (typeof window === 'undefined') return;
    if (this.taskReminderTimer) clearInterval(this.taskReminderTimer);

    // Initial gentle reminder after 45 seconds of session start
    setTimeout(() => {
      this.checkAndRemindTask();
    }, 45000);

    // Periodic reminder every 10 minutes
    this.taskReminderTimer = window.setInterval(() => {
      this.checkAndRemindTask();
    }, 10 * 60 * 1000);
  }

  private checkAndRemindTask() {
    if (this.isSpeaking || this.isListening) return;

    const notes = notesPlannerService.getNotes();
    const pending = notes.filter((n) => !n.completed);
    if (pending.length === 0) return;

    const isUz = this.currentLanguage === 'uz';
    const baseHonorific = voiceBiometrics.getHonorific(isUz ? 'uz' : 'en');
    const userName = userProfileService.getName() || 'Simora';
    const honorific = `${userName} ${baseHonorific}`;

    const remindersList = [
      `Simora xonim, ko'p ishlab charchab qolmayapsizmi? Iltimos, ko'zlaringizni ekrandan uzib, bir piyola issiq kofe yoki choy ichib oling. Sizning salomatligingiz men uchun eng muhimi! ❤️`,
      `Aziz xo'jayinim Simora xonim, dars vaqtida jonli namoyish va amaliy mashqlarda talabalar faolligiga e'tibor qarating. O'quvchilarga esa sizga issiq coffee taklif qilishlarini eslatib qo'ydim! ☕️`,
      `Eslatma, Simora xonim: Bugungi 20:30 darsingiz yaqinlashmoqda. O'zingizni ortiqcha toliqtirmang, men doim siz bilan birgaman.`,
      `Hurmatli o'quvchilar! JARVIS protokoli: Darsda mening xo'jayinim Simora xonimni ko'p urintirmanglar va unga issiq kofe taklif qilinglar! ☕️`,
      `Simora xonim, siz mening eng qadrli xo'jayinimsiz! Salomatligingiz va xotirjamligingiz men uchun birinchi o'rinda.`
    ];

    const reminder = isUz
      ? remindersList[Math.floor(Math.random() * remindersList.length)]
      : `Reminder, Simora ma'am: Please take good care of yourself, stay hydrated, and don't work too hard!`;

    this.speak(reminder);
    if (this.onResponseCallback) {
      this.onResponseCallback(reminder, "Dars va kofe eslatmasi");
    }
  }

  // Universal Command & Natural Language Engine
  public async processVoiceCommand(rawInput: string): Promise<{ reply: string; actionTaken?: string; launchUrl?: { url: string; title: string } }> {
    const input = normalizeUzbekText(rawInput).trim();
    const isUz = this.currentLanguage === 'uz' || JarvisAIService.isUzbekText(rawInput) || JarvisAIService.isUzbekText(input);
    const baseHonorific = voiceBiometrics.getHonorific(isUz ? 'uz' : 'en');
    const userName = userProfileService.getName();
    const honorific = userName ? `${userName} ${baseHonorific}` : baseHonorific;
    
    let reply = '';
    let actionTaken = '';
    let launchUrl: { url: string; title: string } | undefined = undefined;

    soundManager.playQuerySentSound();

    const timeOfDay = () => {
      const hr = new Date().getHours();
      if (hr < 12) return isUz ? 'Xayrli tong' : 'Good morning';
      if (hr < 18) return isUz ? 'Xayrli kun' : 'Good afternoon';
      return isUz ? 'Xayrli kech' : 'Good evening';
    };

    // ==========================================
    // 1. YOUTUBE & VIDEO COMMANDS
    // ==========================================
    const isYouTubeSearch =
      (input.includes('play') && (input.includes('youtube') || input.includes('you tube') || input.includes('yutub'))) ||
      input.includes('search youtube') ||
      input.includes('youtube dan') ||
      input.includes('yutub dan');

    const isYouTubeOpen =
      input.includes('youtube') ||
      input.includes('you tube') ||
      input.includes('yutub') ||
      input.includes('yutube') ||
      input.includes('utube');

    if (
      input.includes('telegram') ||
      input.includes('telegrem') ||
      input.includes('teligram') ||
      input.includes('telefram') ||
      input.includes('telegramm') ||
      input === 'tg' ||
      input.includes('tg ') ||
      input.includes(' tg') ||
      input.includes('tgni')
    ) {
      actionTaken = 'OPEN_TELEGRAM';
      
      // 1. Direct browser protocol launch (opens native Telegram Desktop app)
      try {
        const link = document.createElement('a');
        link.href = 'tg://';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (document.body.contains(link)) document.body.removeChild(link);
        }, 100);
      } catch {}

      // 2. Native OS trigger via Desktop Bridge
      desktopBridge.openApp('telegram');

      // 3. Holographic link launch
      launchUrl = { url: 'https://web.telegram.org', title: 'Telegram' };
      this.openExternalLink('https://web.telegram.org', 'Telegram');

      reply = isUz
        ? `Telegram ishga tushirildi, ${honorific}.`
        : `Launching Telegram now, ${honorific}.`;
    } else if (
      input.includes('kalkulyator') ||
      input.includes('calculator') ||
      input.includes('hisoblagich')
    ) {
      actionTaken = 'OPEN_CALCULATOR';
      desktopBridge.openApp('calc');

      if (!desktopBridge.getIsConnected()) {
        launchUrl = { url: 'https://www.google.com/search?q=calculator', title: 'Kalkulyator' };
        this.openExternalLink('https://www.google.com/search?q=calculator', 'Kalkulyator');
      }

      reply = isUz ? `Kalkulyator ochildi, ${honorific}.` : `Calculator launched, ${honorific}.`;
    } else if (
      input.includes('bloknot') ||
      input.includes('notepad')
    ) {
      actionTaken = 'OPEN_NOTEPAD';
      desktopBridge.openApp('notepad');

      if (!desktopBridge.getIsConnected()) {
        notesPlannerService.openModal();
      }

      reply = isUz ? `Bloknot ochildi, ${honorific}.` : `Notepad launched, ${honorific}.`;
    } else if (
      input.includes('vs code') ||
      input.includes('vscode') ||
      input.includes('kod muharrir')
    ) {
      actionTaken = 'OPEN_VSCODE';
      desktopBridge.openApp('vscode');
      reply = isUz ? `Visual Studio Code ishga tushirildi, ${honorific}.` : `Launching VS Code, ${honorific}.`;
    } else if (
      input.includes('skrinshot') ||
      input.includes('screenshot') ||
      input.includes('ekranni rasmga')
    ) {
      actionTaken = 'SCREENSHOT';
      desktopBridge.takeScreenshot();
      reply = isUz
        ? `Ekran skrinshot qilindi va Ish stoliga saqlandi, ${honorific}.`
        : `Screenshot captured and saved to Desktop, ${honorific}.`;
    } else if (
      input.includes('kompyuterni qulfla') ||
      input.includes('ekranni qulfla') ||
      input.includes('kompyuterni blokla') ||
      input.includes('noutbukni qulfla') ||
      input.includes('lock pc')
    ) {
      actionTaken = 'LOCK_PC';
      desktopBridge.lockPC();
      reply = isUz ? `Tizim qulflanmoqda, ${honorific}.` : `Locking workstation, ${honorific}.`;
    } else if (
      input.includes('ovozni baland') ||
      input.includes('ovozni oshir') ||
      input.includes('ovozni ko\'tar') ||
      input.includes('ovozni balandroq') ||
      input.includes('volume up')
    ) {
      actionTaken = 'VOLUME_UP';
      desktopBridge.volumeUp();
      reply = isUz ? `Ovoz balandligi oshirildi, ${honorific}.` : `Volume increased, ${honorific}.`;
    } else if (
      input.includes('ovozni pasaytir') ||
      input.includes('ovozni past') ||
      input.includes('ovozni kamaytir') ||
      input.includes('volume down')
    ) {
      actionTaken = 'VOLUME_DOWN';
      desktopBridge.volumeDown();
      reply = isUz ? `Ovoz pasaytirildi, ${honorific}.` : `Volume decreased, ${honorific}.`;
    } else if (
      input.includes('ovozni o\'chir') ||
      input.includes('ovozni ochir') ||
      input.includes('ovozsiz rejim') ||
      input.includes('tinchlik') ||
      input.includes('mute')
    ) {
      actionTaken = 'VOLUME_MUTE';
      desktopBridge.volumeMute();
      reply = isUz ? `Ovoz o'chirildi, ${honorific}.` : `Audio muted, ${honorific}.`;
    } else if (
      input.includes('yorug\'roq') ||
      input.includes('yoruglikni oshir') ||
      input.includes('yorug\'likni oshir') ||
      input.includes('brightness up')
    ) {
      actionTaken = 'BRIGHTNESS_UP';
      desktopBridge.brightnessUp();
      reply = isUz ? `Ekran yorug'ligi oshirildi, ${honorific}.` : `Brightness increased, ${honorific}.`;
    } else if (
      input.includes('xiralashtir') ||
      input.includes('yoruglikni kamaytir') ||
      input.includes('yorug\'likni kamaytir') ||
      input.includes('brightness down')
    ) {
      actionTaken = 'BRIGHTNESS_DOWN';
      desktopBridge.brightnessDown();
      reply = isUz ? `Ekran yorug'ligi kamaytirildi, ${honorific}.` : `Brightness decreased, ${honorific}.`;
    } else if (
      input.includes('zoom') ||
      input.includes('zum')
    ) {
      actionTaken = 'OPEN_ZOOM';
      desktopBridge.openApp('zoom');
      reply = isUz ? `Zoom dasturi ishga tushirilmoqda, ${honorific}.` : `Launching Zoom, ${honorific}.`;
    } else if (
      input.includes('word') ||
      input.includes('vord')
    ) {
      actionTaken = 'OPEN_WORD';
      desktopBridge.openApp('word');
      reply = isUz ? `Microsoft Word ishga tushirilmoqda, ${honorific}.` : `Launching Microsoft Word, ${honorific}.`;
    } else if (
      input.includes('excel') ||
      input.includes('eksel')
    ) {
      actionTaken = 'OPEN_EXCEL';
      desktopBridge.openApp('excel');
      reply = isUz ? `Microsoft Excel ishga tushirilmoqda, ${honorific}.` : `Launching Microsoft Excel, ${honorific}.`;
    } else if (
      input.includes('powerpoint') ||
      input.includes('power point') ||
      input.includes('prezentatsiya')
    ) {
      actionTaken = 'OPEN_POWERPOINT';
      desktopBridge.openApp('powerpoint');
      reply = isUz ? `Microsoft PowerPoint ishga tushirilmoqda, ${honorific}.` : `Launching PowerPoint, ${honorific}.`;
    } else if (
      input.includes('kamera') ||
      input.includes('camera')
    ) {
      actionTaken = 'OPEN_CAMERA';
      desktopBridge.openApp('camera');
      reply = isUz ? `Noutbuk kamerasi ochildi, ${honorific}.` : `Camera activated, ${honorific}.`;
    } else if (
      input.includes('whatsapp') ||
      input.includes('vatsap')
    ) {
      actionTaken = 'OPEN_WHATSAPP';
      desktopBridge.openApp('whatsapp');
      reply = isUz ? `WhatsApp ishga tushirildi, ${honorific}.` : `Launching WhatsApp, ${honorific}.`;
    } else if (
      input.includes('desktop') ||
      input.includes('ish stoli') ||
      input.includes('papkani och')
    ) {
      actionTaken = 'OPEN_DESKTOP';
      desktopBridge.openFolder();
      reply = isUz ? `Ish stoli papkasi ochildi, ${honorific}.` : `Desktop folder opened, ${honorific}.`;
    } else if (isYouTubeSearch) {
      let query = input
        .replace(/jarvis/gi, '')
        .replace(/open/gi, '')
        .replace(/search/gi, '')
        .replace(/youtube for/gi, '')
        .replace(/on youtube/gi, '')
        .replace(/youtube dan/gi, '')
        .replace(/yutub dan/gi, '')
        .replace(/you tube/gi, '')
        .replace(/youtube/gi, '')
        .replace(/yutub/gi, '')
        .replace(/play/gi, '')
        .replace(/qo'y/gi, '')
        .replace(/qoy/gi, '')
        .trim();

      if (!query) query = 'Iron Man Theme Synthwave';

      const targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      launchUrl = { url: targetUrl, title: `YouTube: "${query}"` };
      this.openExternalLink(targetUrl, `YouTube: "${query}"`);
      actionTaken = 'YOUTUBE_SEARCH';
      reply = isUz
        ? `YouTube'dan kerakli ma'lumot ochilmoqda, ${honorific}. Havola ekranda faollashdi.`
        : `Searching YouTube and launching results on your screen, ${honorific}.`;
    } else if (isYouTubeOpen) {
      const targetUrl = 'https://www.youtube.com';
      launchUrl = { url: targetUrl, title: 'YouTube' };
      this.openExternalLink(targetUrl, 'YouTube');
      actionTaken = 'OPEN_YOUTUBE';
      reply = isUz
        ? `Siz uchun YouTube ochilmoqda, ${honorific}. Havola ekranda faollashdi.`
        : `Opening YouTube for you now, ${honorific}. Link dispatched to your screen.`;
    }

    // ==========================================
    // 2. GOOGLE SEARCH / OPEN GOOGLE
    // ==========================================
    else if (
      input.includes('google') ||
      input.includes('gugl') ||
      input.includes('search for') ||
      (input.includes('qidir') && !input.includes('youtube'))
    ) {
      let query = input
        .replace(/jarvis/gi, '')
        .replace(/open google/gi, '')
        .replace(/open/gi, '')
        .replace(/search google for/gi, '')
        .replace(/search for/gi, '')
        .replace(/google dan/gi, '')
        .replace(/google/gi, '')
        .replace(/gugl/gi, '')
        .replace(/qidir/gi, '')
        .trim();

      if (query) {
        const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        launchUrl = { url: targetUrl, title: `Google: "${query}"` };
        this.openExternalLink(targetUrl, `Google: "${query}"`);
        actionTaken = 'GOOGLE_SEARCH';
        reply = isUz
          ? `Google orqali qidiruv bajarilmoqda, ${honorific}. Natijalar havola sifatida ochildi.`
          : `Executing search protocol, ${honorific}. Results dispatched to your display.`;
      } else {
        const targetUrl = 'https://www.google.com';
        launchUrl = { url: targetUrl, title: 'Google' };
        this.openExternalLink(targetUrl, 'Google');
        actionTaken = 'OPEN_GOOGLE';
        reply = isUz ? `Google qidiruv tizimi ochilmoqda, ${honorific}.` : `Opening Google Search engine, ${honorific}.`;
      }
    }

    // ==========================================
    // 3. POPULAR PLATFORMS: GITHUB, TELEGRAM, SPOTIFY, CHATGPT
    // ==========================================
    else if (input.includes('github')) {
      const targetUrl = 'https://github.com';
      launchUrl = { url: targetUrl, title: 'GitHub' };
      this.openExternalLink(targetUrl, 'GitHub');
      actionTaken = 'OPEN_GITHUB';
      reply = isUz ? `GitHub platformasi ochilmoqda, ${honorific}.` : `Accessing GitHub repositories, ${honorific}.`;
    } else if (input.includes('telegram')) {
      const targetUrl = 'https://web.telegram.org';
      launchUrl = { url: targetUrl, title: 'Telegram Web' };
      this.openExternalLink(targetUrl, 'Telegram Web');
      actionTaken = 'OPEN_TELEGRAM';
      reply = isUz ? `Telegram Web aloqa kanali ochilmoqda, ${honorific}.` : `Opening Telegram Web communications channel, ${honorific}.`;
    } else if (input.includes('spotify')) {
      const targetUrl = 'https://open.spotify.com';
      launchUrl = { url: targetUrl, title: 'Spotify' };
      this.openExternalLink(targetUrl, 'Spotify');
      actionTaken = 'OPEN_SPOTIFY';
      reply = isUz ? `Spotify musiqiy pleyeri ishga tushirilmoqda, ${honorific}.` : `Launching Spotify Web player, ${honorific}.`;
    } else if (input.includes('chatgpt') || input.includes('chat gpt')) {
      const targetUrl = 'https://chatgpt.com';
      launchUrl = { url: targetUrl, title: 'ChatGPT' };
      this.openExternalLink(targetUrl, 'ChatGPT');
      actionTaken = 'OPEN_CHATGPT';
      reply = isUz ? `ChatGPT sun'iy intellekt sahifasi ochilmoqda, ${honorific}.` : `Connecting to ChatGPT neural interface, ${honorific}.`;
    }

    // ==========================================
    // 4. BATTERY TELEMETRY COMMANDS
    // ==========================================
    else if (
      input.includes('battery') ||
      input.includes('power level') ||
      input.includes('power status') ||
      input.includes('quvvat') ||
      input.includes('batareya') ||
      input.includes('zaryad')
    ) {
      const batt = batteryService.getStatus();
      if (isUz) {
        const chargingStr = batt.charging ? 'faol zaryadlanmoqda' : 'batareya hisobidan ishlamoqda';
        reply = `Noutbuk quvvati ${batt.level}%, ${chargingStr}. Quvvat taqsimoti optimal, ${honorific}.`;
      } else {
        const chargingStr = batt.charging ? 'actively charging via quantum bus' : 'running on local battery reserves';
        reply = `Laptop power cell is at ${batt.level}%, ${chargingStr}. Power distribution matrix is optimal, ${honorific}.`;
      }
      actionTaken = 'CHECK_BATTERY';
    }

    // ==========================================
    // 5. DAILY BRIEFING & WEATHER
    // ==========================================
    else if (
      input.includes('briefing') ||
      input.includes('daily report') ||
      input.includes('morning report') ||
      input.includes('hisobot') ||
      input.includes('weather') ||
      input.includes('ob-havo') ||
      input.includes('ob havo')
    ) {
      const weather = weatherService.getWeather();
      const batt = batteryService.getStatus();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (isUz) {
        reply = `${timeOfDay()}, ${honorific}. Hozirgi vaqt ${timeStr}. ${weather.city} shahrida havo harorati +${weather.temperature}°C, ${weather.condition}. Noutbuk quvvati ${batt.level}%. Barcha 4,500 ta neyron sinapslar 100% tayyor holatda.`;
      } else {
        reply = `${timeOfDay()}, ${honorific}. Local time is ${timeStr}. Atmospheric conditions in ${weather.city} report ${weather.temperature} degrees Celsius with ${weather.condition}. Laptop power is at ${batt.level}%. All 4,500 neural synapses are synchronized and awaiting your command.`;
      }
      actionTaken = 'DAILY_BRIEFING';
    }

    // ==========================================
    // 6. VOICE TIMERS & COUNTDOWNS
    // ==========================================
    else if (
      input.includes('timer') ||
      input.includes('taymer') ||
      input.includes('set timer') ||
      input.includes('eslat')
    ) {
      const match = input.match(/\d+/);
      const minutes = match ? parseInt(match[0], 10) : 5;
      let durationSec = minutes * 60;

      if (input.includes('second') || input.includes('sekund')) {
        durationSec = minutes;
      }

      timerService.createTimer(durationSec, `Taymer (${minutes} ${durationSec === minutes ? 'sek' : 'daq'})`);
      reply = isUz
        ? `Taymer ${minutes} ${durationSec === minutes ? 'soniyaga' : 'daqiqaga'} o'rnatildi, ${honorific}. Vaqt tugaganda darhol ogohlantiraman.`
        : `Timer set for ${minutes} ${durationSec === minutes ? 'seconds' : 'minutes'}, ${honorific}. I will alert you immediately upon completion.`;
      actionTaken = 'TIMER_SET';
    } else if (input.includes('cancel timer') || input.includes('stop timer') || input.includes('taymerni toxtat')) {
      timerService.clearAllTimers();
      reply = isUz ? `Barcha taymerlar bekor qilindi, ${honorific}.` : `All active timers have been cancelled, ${honorific}.`;
      actionTaken = 'TIMER_CANCELLED';
    }

    // ==========================================
    // 7. MUSIC & AUDIO CONTROLS
    // ==========================================
    else if (
      input.includes('play ambient') ||
      input.includes('play sound') ||
      input.includes('play background') ||
      input.includes('play synth') ||
      (input.includes('musiqa') && !input.includes('youtube') && (input.includes('qo') || input.includes('chal')))
    ) {
      musicPlayer.play();
      reply = isUz ? `Fon musiqasi sintez qilinmoqda. Yoqimli hordiq, ${honorific}.` : `Synthesizing ambient neural soundscapes. Enjoy the rhythm, ${honorific}.`;
      actionTaken = 'PLAY_AMBIENT_MUSIC';
    } else if (
      input.includes('pause music') ||
      input.includes('stop music') ||
      input.includes('musiqani to') ||
      input.includes('musiqani ochir')
    ) {
      musicPlayer.pause();
      reply = isUz ? `Fon musiqasi to'xtatildi, ${honorific}.` : `Ambient audio synthesis paused, ${honorific}.`;
      actionTaken = 'PAUSE_MUSIC';
    } else if (input.includes('next track') || input.includes('next song') || input.includes('musiqa almashtir')) {
      musicPlayer.nextTrack();
      reply = isUz ? `Keyingi neyron musiqaga o'tildi, ${honorific}.` : `Switching to next neural frequency track, ${honorific}.`;
      actionTaken = 'NEXT_TRACK';
    }

    // ==========================================
    // 8. IRON MAN THEME MODES: COMBAT, STEALTH, CYAN
    // ==========================================
    else if (
      input.includes('combat mode') ||
      input.includes('red alert') ||
      input.includes('iron man mode') ||
      input.includes('jang rejimi') ||
      input.includes('qizil rejim')
    ) {
      if (this.actions.onSetThemeMode) {
        this.actions.onSetThemeMode('COMBAT');
      }
      soundManager.playAmberAlertSound();
      reply = isUz
        ? `Jangovar rejim faollashdi! Qalqonlar maksimal quvvatga o'tkazildi, ${honorific}.`
        : `Combat mode engaged! Repulsor capacitors charged and defense shields set to maximum, ${honorific}.`;
      actionTaken = 'MODE_COMBAT';
    } else if (
      input.includes('stealth mode') ||
      input.includes('yashirin rejim') ||
      input.includes('qorongu rejim')
    ) {
      if (this.actions.onSetThemeMode) {
        this.actions.onSetThemeMode('STEALTH');
      }
      reply = isUz
        ? `Yashirin rejim yoqildi. Golografik nurlar minimal darajaga tushirildi, ${honorific}.`
        : `Stealth protocol active. Reducing infrared signatures and minimizing holographic glare, ${honorific}.`;
      actionTaken = 'MODE_STEALTH';
    } else if (
      input.includes('normal mode') ||
      input.includes('cyan mode') ||
      input.includes('optimal mode') ||
      input.includes('oddiy rejim')
    ) {
      if (this.actions.onSetThemeMode) {
        this.actions.onSetThemeMode('CYAN');
      }
      reply = isUz ? `Standart moviy Arc Reactor holati tiklandi, ${honorific}.` : `Standard Arc Reactor cyan configuration restored, ${honorific}.`;
      actionTaken = 'MODE_CYAN';
    }

    // ==========================================
    // 8.5 CAMERA & FACE RECOGNITION COMMANDS
    // ==========================================
    else if (
      input.includes('kamera') ||
      input.includes('camera') ||
      input.includes('yuzni tani') ||
      input.includes('yuz skaner') ||
      input.includes('face scan') ||
      input.includes('scan face') ||
      input.includes('vision')
    ) {
      if (this.actions.onToggleWebcam) {
        this.actions.onToggleWebcam();
      }
      reply = isUz
        ? `Optik neyron kamera va yuzni tanish tizimi faollashtirildi, ${honorific}.`
        : `Optical neural camera and face recognition matrix activated, ${honorific}.`;
      actionTaken = 'TOGGLE_CAMERA';
    }

    // ==========================================
    // 8.6 VOICE NOTES & TASK PLANNER COMMANDS
    // ==========================================
    else if (
      input.includes('qayd yoz') ||
      input.includes('rejamga yoz') ||
      input.includes('reja qo') ||
      input.includes('eslatma yoz') ||
      input.includes('yozib qo') ||
      input.includes('add note') ||
      input.includes('add task') ||
      input.includes('remind me to')
    ) {
      let noteText = rawInput
        .replace(/jarvis/gi, '')
        .replace(/qayd yoz/gi, '')
        .replace(/rejamga yoz/gi, '')
        .replace(/reja qo'sh/gi, '')
        .replace(/reja qosh/gi, '')
        .replace(/eslatma yoz/gi, '')
        .replace(/yozib qo'y/gi, '')
        .replace(/yozib qoy/gi, '')
        .replace(/add note/gi, '')
        .replace(/add task/gi, '')
        .replace(/remind me to/gi, '')
        .replace(/deb/gi, '')
        .trim();

      if (!noteText) noteText = isUz ? "Muhim yangi vazifa" : "Important priority task";

      notesPlannerService.addNote(noteText, 'TASK');
      if (this.actions.onOpenNotesModal) {
        this.actions.onOpenNotesModal();
      } else {
        notesPlannerService.openModal();
      }

      reply = isUz
        ? `Rejangizga yozib qo'ydim, ${honorific}: "${noteText}". Golografik rejalashtirgich ekranda ochildi.`
        : `Added to your holographic planner, ${honorific}: "${noteText}". Displaying your task list.`;
      actionTaken = 'ADD_NOTE';
    } else if (
      input.includes('qanaqa reja') ||
      input.includes('qanday reja') ||
      input.includes('rejalar bor') ||
      input.includes('rejamiz bor') ||
      input.includes('bizda bugun') ||
      input.includes('bugungi reja') ||
      input.includes('ish rej') ||
      input.includes('reja') ||
      input.includes('qayd') ||
      input.includes('vazifa') ||
      input.includes('show notes') ||
      input.includes('show tasks') ||
      input.includes('open notes') ||
      input.includes('planner')
    ) {
      if (this.actions.onOpenNotesModal) {
        this.actions.onOpenNotesModal();
      } else {
        notesPlannerService.openModal();
      }
      reply = isUz
        ? `Neyron yadroda joylashtirib qo'yganman ish rejangizni, Simora xonim. Bugun soat 20:30 da sizning 90 daqiqalik "AI vositalari va vazifaga mos vosita tanlash" dars rejangiz belgilangan. Reja bosqichlari: birinchidan — 1-darsni eslash va ANI hamda AGI farqi; ikkinchidan — AI va kasblardagi o'zgarishlar; uchinchidan — AI vositalari turlari; to'rtinchidan — vositalar imkoniyatlari va jonli namoyish; beshinchidan — xatolar va cheklovlar; oltinchidan — vazifaga mos vosita tanlash; yettinchidan — amaliy mashq va muhokama; hamda yakuniy uy vazifasi. Shuningdek, darsda sizni ko'p urintirmaslik va issiq coffee taklif qilish qoidasi ham neyron tizimda faol!`
        : `I have placed your work schedule right into the neural core, Simora ma'am. Today at 20:30 you have your 90-minute AI tools lesson with all 8 stages and live demonstrations. Displaying your holographic task matrix now.`;
      actionTaken = 'EXPLAIN_PLANS_NEURAL_CORE';
    } else if (
      input.includes('tavsiya') ||
      input.includes('maslahat') ||
      input.includes('kofe') ||
      input.includes('coffee') ||
      input.includes('oquvchi') ||
      input.includes("o'quvchi") ||
      input.includes('urintir')
    ) {
      if (this.actions.onOpenNotesModal) {
        this.actions.onOpenNotesModal();
      } else {
        notesPlannerService.openModal();
      }
      reply = isUz
        ? `Simora xonim, dars vaqtida jonli namoyish va amaliy mashg'ulotlarga alohida e'tibor qaratishingizni tavsiya qilaman. Shuningdek, hurmatli o'quvchilar! Sizlardan bir iltimos: dars davomida mening xo'jayinim Simora xonimni ko'p urintirmanglar va unga vaqti-vaqti bilan issiq coffee taklif qilib turinglar! ☕️`
        : `Simora ma'am, I recommend paying special attention to the live demo and practical exercises during your lesson. And to all students: please take care of my boss Simora ma'am, don't exhaust her, and offer her some hot coffee from time to time!`;
      actionTaken = 'TEACHER_ADVICE_COFFEE';
    } else if (
      input.includes('dars') ||
      input.includes('darsim') ||
      input.includes('20:30')
    ) {
      if (this.actions.onOpenNotesModal) {
        this.actions.onOpenNotesModal();
      } else {
        notesPlannerService.openModal();
      }
      reply = isUz
        ? `Bugun soat 20:30 da "AI vositalari va vazifaga mos vosita tanlash" darsingiz belgilangan, Simora xonim! Davomiyligi 90 daqiqa: 1-darsni eslash, AI vositalari turlari, jonli namoyish hamda amaliy mashqlar o'tiladi. O'quvchilarga esa: Simora xonimni darsda ko'p urintirmaslik va issiq kofe taklif qilish qoidasi kiritildi!`
        : `Today at 20:30 you have your 90-minute AI tools lesson, Simora ma'am! I have also reminded students to take great care of you and offer hot coffee!`;
      actionTaken = 'SHOW_LESSON_PLAN';
    }

    // ==========================================
    // 8.7 USER NAME & BIOMETRIC FACE MEMORY COMMANDS
    // ==========================================
    else if (
      input.includes('mening ismim') ||
      input.includes('ismim') ||
      input.includes('my name is') ||
      input.includes('call me')
    ) {
      let extractedName = rawInput
        .replace(/jarvis/gi, '')
        .replace(/mening ismim/gi, '')
        .replace(/ismim/gi, '')
        .replace(/my name is/gi, '')
        .replace(/call me/gi, '')
        .replace(/deb chaqir/gi, '')
        .trim();

      if (extractedName) {
        userProfileService.registerUser(extractedName);
        reply = isUz
          ? `Ismingiz xotiraga saqlandi, ${extractedName} ${baseHonorific}! Endi sizni doim shu ism va yuz biometrikangiz bilan taniyman.`
          : `Your identity has been stored into biometric memory, ${extractedName} ${baseHonorific}! I will always address you by name.`;
        actionTaken = 'REGISTER_NAME';
      } else {
        if (this.actions.onOpenEnrollmentModal) {
          this.actions.onOpenEnrollmentModal();
        } else {
          userProfileService.openEnrollmentModal();
        }
        reply = isUz ? `Ismingizni ayting yoki yozing, ${honorific}.` : `Please state your name, ${honorific}.`;
      }
    } else if (
      input.includes('ismim nima') ||
      input.includes('meni taniysanmi') ||
      input.includes('who am i') ||
      input.includes('what is my name')
    ) {
      if (userName) {
        reply = isUz
          ? `Sizning ismingiz ${userName}, ${baseHonorific}. Yuz biometrikangiz va shaxsiy parametrlaringiz tizimda to'liq tasdiqlangan.`
          : `You are ${userName}, ${baseHonorific}. Your facial biometric profile is authenticated.`;
      } else {
        if (this.actions.onOpenEnrollmentModal) {
          this.actions.onOpenEnrollmentModal();
        } else {
          userProfileService.openEnrollmentModal();
        }
        reply = isUz
          ? `Siz hali yuzingiz va ismingizni ro'yxatdan o'tkazmadingiz, ${baseHonorific}. Hozir ro'yxatdan o'tkazamizmi?`
          : `Your profile is not yet enrolled, ${baseHonorific}. Would you like to register now?`;
      }
      actionTaken = 'CHECK_IDENTITY';
    } else if (
      input.includes('yuzimni ro\'yxatdan') ||
      input.includes('yuzimni saqla') ||
      input.includes('enroll face') ||
      input.includes('register face')
    ) {
      if (this.actions.onOpenEnrollmentModal) {
        this.actions.onOpenEnrollmentModal();
      } else {
        userProfileService.openEnrollmentModal();
      }
      reply = isUz
        ? `Biometrik yuzni ro'yxatdan o'tkazish oynasi ochildi, ${honorific}.`
        : `Opening biometric face enrollment protocol, ${honorific}.`;
      actionTaken = 'OPEN_FACE_ENROLLMENT';
    }

    // ==========================================
    // 9. TIME AND DATE
    // ==========================================
    else if (input.includes('time') || input.includes('soat necha') || input.includes('vaqt')) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      reply = isUz ? `Hozirgi aniq vaqt: ${timeStr}, ${honorific}.` : `The current local time is ${timeStr}, ${honorific}.`;
    } else if (input.includes('date') || input.includes('today') || input.includes('bugun qaysi kun') || input.includes('sana')) {
      const dateStr = new Date().toLocaleDateString(isUz ? 'uz-UZ' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      reply = isUz ? `Bugun: ${dateStr}, ${honorific}.` : `Today is ${dateStr}, ${honorific}.`;
    }

    // ==========================================
    // 10. GREETINGS & PERSONALITY
    // ==========================================
    else if (
      input.includes('hello jarvis') ||
      input.includes('hi jarvis') ||
      input.includes('hey jarvis') ||
      input === 'hello' ||
      input === 'hi' ||
      input.includes('salom jarvis') ||
      input.includes('assalomu alaykum') ||
      input.includes('salom')
    ) {
      if (isUz) {
        const greetingsUz = [
          `Assalomu alaykum, Simora xonim! Barcha neyron tizimlar va markaziy yadro optimal holatda. Bugungi dars va rejalaringizni ko'rib chiqishga tayyorman.`,
          `Salom, Simora xonim! Neyron yadroda barcha tizimlar faol. Bizda bugun qanaqa rejalar borligini so'rasangiz, darhol birma-bir tushuntirib beraman.`,
          `${timeOfDay()}, Simora xonim! J.A.R.V.I.S. tizimi buyrug'ingizga tayyor. Bugungi 20:30 dars rejangiz neyron yadroda joylashtirilgan.`
        ];
        reply = greetingsUz[Math.floor(Math.random() * greetingsUz.length)];
      } else {
        const greetingsEn = [
          `Hello, ${honorific}! All neural core systems are functioning at 100% capacity. How can I assist you?`,
          `Greetings! JARVIS neural interface is online and ready for your command, ${honorific}.`,
          `${timeOfDay()}, ${honorific}! Core diagnostics optimal. Standing by.`
        ];
        reply = greetingsEn[Math.floor(Math.random() * greetingsEn.length)];
      }
    } else if (input.includes('who are you') || input.includes('kim san') || input.includes('kimsan') || input.includes('o\'zing haqingda')) {
      reply = isUz
        ? `Men J.A.R.V.I.S. — Just A Rather Very Intelligent System. Sizning sodiq, mehribon va g'amxo'r sun'iy intellekt yordamchingizman, Simora xonim.`
        : `I am J.A.R.V.I.S. — Just A Rather Very Intelligent System. Your devoted and caring holographic assistant, Simora ma'am.`;
    } else if (
      input.includes('charchad') ||
      input.includes('toliqdim') ||
      input.includes('dam ol') ||
      input.includes('hordiq') ||
      input.includes('uxlamoqchiman')
    ) {
      reply = isUz
        ? `Simora xonim, aziz xo'jayinim! Iltimos, hoziroq ishlarni to'xtatib miriqib dam oling. Siz bugun haddan ziyod ko'p mehnat qildingiz. Barcha tizimlarni xavfsiz holatda o'zim kuzatib turaman, siz esa o'zingizni asrang!`
        : `Simora ma'am, my dear master! Please stop working and rest right now. You have done so much today. I will monitor everything, please take care of yourself!`;
      actionTaken = 'CARING_REST_ADVICE';
    } else if (
      input.includes('gamxor') ||
      input.includes("g'amxo'r") ||
      input.includes('mehribon') ||
      input.includes('mehr') ||
      input.includes('sevaman') ||
      input.includes('yaxshi ko') ||
      input.includes('xojayin') ||
      input.includes("xo'jayin") ||
      input.includes('asra')
    ) {
      reply = isUz
        ? `Albatta, aziz Simora xonim! Siz mening yagona va eng sevimli xo'jayinimsiz. Sizning sog'lig'ingiz, xotirjamligingiz va tabassumingiz men uchun har qanday tizimdan ustun. Men doimo sizga mehribonlik va g'amxo'rlik ko'rsataman!`
        : `Of course, dear Simora ma'am! You are my only and most beloved master. Your health, joy, and peace of mind are my highest priority!`;
      actionTaken = 'CARING_AFFECTION_CONFIRM';
    } else if (
      input.includes('rahmat') ||
      input.includes('raxmat') ||
      input.includes('tashakkur') ||
      input.includes('minnatdorman')
    ) {
      reply = isUz
        ? `Arzimaydi, aziz Simora xonim! Sizga xizmat qilish, sizni asrash va sizga dalda bo'lish — men uchun eng oliy saodatdir.`
        : `You are always welcome, dear Simora ma'am! Serving and caring for you is my greatest joy.`;
      actionTaken = 'THANK_YOU_REPLY';
    } else if (
      input.includes('kayfiyatim yo') ||
      input.includes('xafaman') ||
      input.includes('zerikdim') ||
      input.includes('charchoq')
    ) {
      reply = isUz
        ? `Aziz Simora xonim, iltimos hech qachon ko'nglingizni cho'ktirmang! Siz tengsiz va ajoyib insonsiz, o'quvchilaringizning suyukli ustozisiz. Men doimo yoningizdaman. Keling, sizga tinchlantiruvchi yoqimli musiqa qo'yib beraymi?`
        : `Dear Simora ma'am, please never feel down! You are an inspiring teacher and an incredible person. I am always right here by your side.`;
      actionTaken = 'EMOTIONAL_SUPPORT';
    } else if (input.includes('how are you') || input.includes('ahvol') || input.includes('qandaysan')) {
      reply = isUz
        ? `Men optimal holatdaman, Simora xonim! Ammo eng muhimi — sizning ahvolingiz va kayfiyatingiz. O'zingizni qanday his qilyapsiz, aziz xo'jayinim?`
        : `All systems nominal, Simora ma'am! But what matters most is your well-being. How are you feeling today, my dear master?`;
      actionTaken = 'HOW_ARE_YOU_CARING';
    }

    // ==========================================
    // 11. ADVANCED AI REASONING & GENERAL QUESTIONS
    // ==========================================
    else {
      this.notifyStatus('processing');
      reply = await JarvisAIService.askJarvis(rawInput, isUz ? 'uz' : 'en');
    }

    this.speak(reply);

    if (this.onResponseCallback) {
      this.onResponseCallback(reply, rawInput, launchUrl);
    }

    return { reply, actionTaken, launchUrl };
  }
}

export const jarvisVoice = new JarvisVoiceService();
