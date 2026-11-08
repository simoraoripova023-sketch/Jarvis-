import { soundManager } from './AudioSynthesizer';
import { batteryService } from './BatteryService';
import { weatherService } from './WeatherService';
import { timerService } from './TimerService';
import { musicPlayer } from './MusicPlayerService';
import { JarvisAIService } from './JarvisAIService';
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

  constructor() {
    this.initSpeechRecognition();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.getVoices();
    }
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

  public speak(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const phoneticText = NeuralVoiceCloneService.cleanUzbekPhonetics(text);
      const utterance = new SpeechSynthesisUtterance(phoneticText);

      // Calibrated to "Aqlli Yusuf" Acoustic Profile (96.4 Hz Warm Storyteller Baritone)
      utterance.rate = 0.94; // Calm, respectful storytelling cadence
      utterance.pitch = 0.82; // Deep, rich baritone fundamental frequency (~96 Hz)

      const voices = window.speechSynthesis.getVoices();
      const isUz = this.currentLanguage === 'uz' || JarvisAIService.isUzbekText(text);

      let selectedVoice = null;

      if (isUz) {
        selectedVoice = voices.find(
          (v) =>
            (v.lang.startsWith('uz') || v.lang.startsWith('tr') || v.lang.startsWith('ru')) &&
            (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Google') || v.name.includes('Sardor'))
        ) || voices.find(
          (v) => v.name.includes('UK English Male') || v.name.includes('David') || v.name.includes('George') || v.name.includes('Male')
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
        // Temporarily pause speech recognition while JARVIS speaks through speakers
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

        // Allow 600ms for room acoustic echo to dissipate before resuming microphone listening
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
    } catch {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    }
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

  // Universal Command & Natural Language Engine
  public async processVoiceCommand(rawInput: string): Promise<{ reply: string; actionTaken?: string; launchUrl?: { url: string; title: string } }> {
    const input = rawInput.toLowerCase().trim();
    const isUz = this.currentLanguage === 'uz' || JarvisAIService.isUzbekText(input);
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
      input.includes('telefram') ||
      input === 'tg'
    ) {
      actionTaken = 'OPEN_TELEGRAM';
      desktopBridge.openApp('telegram');
      reply = isUz
        ? `Telegram ishga tushirildi, ${honorific}.`
        : `Launching Telegram on your desktop now, ${honorific}.`;
    } else if (
      input.includes('kalkulyator') ||
      input.includes('calculator') ||
      input.includes('hisoblagich')
    ) {
      actionTaken = 'OPEN_CALCULATOR';
      desktopBridge.openApp('calc');
      reply = isUz ? `Kalkulyator ochildi, ${honorific}.` : `Calculator launched, ${honorific}.`;
    } else if (
      input.includes('bloknot') ||
      input.includes('notepad')
    ) {
      actionTaken = 'OPEN_NOTEPAD';
      desktopBridge.openApp('notepad');
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
      input.includes('lock pc')
    ) {
      actionTaken = 'LOCK_PC';
      desktopBridge.lockPC();
      reply = isUz ? `Tizim qulflanmoqda, ${honorific}.` : `Locking workstation, ${honorific}.`;
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
      const notes = notesPlannerService.getNotes();
      const activeCount = notes.filter((n) => !n.completed).length;
      reply = isUz
        ? `Golografik qaydlar va rejalar oynasi ochildi, ${honorific}. Sizda ${activeCount} ta bajarilishi kerak bo'lgan vazifa mavjud.`
        : `Opening your holographic notes and task planner, ${honorific}. You have ${activeCount} active tasks remaining.`;
      actionTaken = 'OPEN_NOTES';
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
          `Salom, ${honorific}! Barcha neyron tizimlar 100% quvvatda ishlamoqda. Sizga qanday yordam bera olaman?`,
          `Assalomu alaykum, ${honorific}! J.A.R.V.I.S. tizimi buyrug'ingizga tayyor.`,
          `${timeOfDay()}, ${honorific}! Tizim diagnostikasi optimal holatda.`
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
        ? `Men J.A.R.V.I.S. — Just A Rather Very Intelligent System. Sizning shaxsiy golografik sun'iy intellekt yordamchingizman, ${honorific}.`
        : `I am J.A.R.V.I.S. — Just A Rather Very Intelligent System. Your holographic neural assistant, ${honorific}.`;
    } else if (input.includes('how are you') || input.includes('ahvol') || input.includes('qandaysan')) {
      reply = isUz
        ? `Barcha ko'rsatkichlar a'lo darajada, ${honorific}! Neyron yuklanish 98.4%, harorat 34°C, kvant shina tezligi 100 TB/s.`
        : `All systems are green, ${honorific}! Synaptic load is nominal at 98.4%, core temperature 34 degrees Celsius, and quantum bus bandwidth is 100 terabits per second.`;
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
