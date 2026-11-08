import React, { useState, useEffect } from 'react';
import { SystemStatus, ActiveCallout, QualityTier, SystemThemeMode, BatteryStatus, WeatherStatus, ActiveTimer, MusicTrack } from '../../types/neural';
import {
  Cpu,
  Radio,
  AlertTriangle,
  Sparkles,
  Volume2,
  VolumeX,
  Sliders,
  Maximize,
  Minimize,
  Eye,
  EyeOff,
  Battery,
  BatteryCharging,
  CloudSun,
  Clock,
  Music,
  Play,
  Pause,
  SkipForward,
  ShieldAlert,
  Moon,
  Zap,
  ClipboardList
} from 'lucide-react';
import { batteryService } from '../../services/BatteryService';
import { weatherService } from '../../services/WeatherService';
import { timerService } from '../../services/TimerService';
import { musicPlayer } from '../../services/MusicPlayerService';
import { voiceBiometrics, VoiceBiometricData } from '../../services/VoiceBiometricsService';
import { notesPlannerService } from '../../services/NotesPlannerService';

interface HUDContainerProps {
  systemStatus: SystemStatus;
  activeCallout: ActiveCallout | null;
  qualityTier: QualityTier;
  themeMode: SystemThemeMode;
  onSetThemeMode: (mode: SystemThemeMode) => void;
  onToggleAmberSurge: () => void;
  amberSurge: boolean;
  onOpenQualityModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isHudVisible: boolean;
  onToggleHudVisibility: () => void;
}

export const HUDContainer: React.FC<HUDContainerProps> = ({
  systemStatus,
  activeCallout,
  qualityTier,
  themeMode,
  onSetThemeMode,
  onToggleAmberSurge,
  amberSurge,
  onOpenQualityModal,
  isMuted,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
  isHudVisible,
  onToggleHudVisibility
}) => {
  const [battery, setBattery] = useState<BatteryStatus>(batteryService.getStatus());
  const [weather, setWeather] = useState<WeatherStatus>(weatherService.getWeather());
  const [timers, setTimers] = useState<ActiveTimer[]>(timerService.getTimers());
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(musicPlayer.getIsPlaying());
  const [tracks, setTracks] = useState<MusicTrack[]>(musicPlayer.getTracks());
  const [voiceBio, setVoiceBio] = useState<VoiceBiometricData>(voiceBiometrics.getData());
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  useEffect(() => {
    const unsubBatt = batteryService.subscribe(setBattery);
    const unsubWeather = weatherService.subscribe(setWeather);
    const unsubTimers = timerService.subscribe(setTimers);
    const unsubMusic = musicPlayer.subscribe((t, p) => {
      setTracks(t);
      setIsMusicPlaying(p);
    });
    const unsubBio = voiceBiometrics.subscribe(setVoiceBio);

    return () => {
      unsubBatt();
      unsubWeather();
      unsubTimers();
      unsubMusic();
      unsubBio();
    };
  }, []);

  const formatTimerTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getThemeColorClass = () => {
    if (themeMode === 'COMBAT') return 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]';
    if (themeMode === 'STEALTH') return 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]';
    return amberSurge ? 'cyber-panel-amber' : '';
  };

  const currentPlayingTrack = tracks.find((t) => t.isPlaying) || tracks[0];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-4 md:p-6 overflow-hidden">
      {/* 1. TOP BAR — HEADER STATUS & TELEMETRY */}
      <div className="w-full flex items-start justify-between gap-2 sm:gap-4">
        {/* TOP LEFT: SYSTEM & TELEMETRY PANELS */}
        <div className="flex flex-col space-y-2 max-w-[280px]">
          {/* Mobile Collapse Toggle Button */}
          <button
            onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
            className="md:hidden cyber-panel px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center space-x-1.5 pointer-events-auto text-[#00D9FF] bg-[#071525]/90 border border-[#00D9FF]/40 shadow-sm"
          >
            <Cpu className="w-3.5 h-3.5 animate-pulse text-[#00D9FF]" />
            <span>JARVIS STATUS {isMobilePanelOpen ? '▲' : '▼'}</span>
          </button>

          {/* Main Core Telemetry Panel */}
          <div
            className={`cyber-panel p-3 rounded-sm min-w-[230px] sm:min-w-[250px] pointer-events-auto transition-all duration-300 ${getThemeColorClass()} ${
              isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
            } ${!isMobilePanelOpen ? 'hidden md:block' : 'block'}`}
          >
            <div className="flex items-center justify-between border-b border-[#00D9FF]/20 pb-2 mb-2.5">
              <div className="flex items-center space-x-2">
                <Cpu
                  className={`w-4 h-4 ${
                    themeMode === 'COMBAT'
                      ? 'text-red-500'
                      : themeMode === 'STEALTH'
                      ? 'text-purple-400'
                      : amberSurge
                      ? 'text-[#FFB84D]'
                      : 'text-[#00D9FF]'
                  } animate-pulse`}
                />
                <span className="text-xs font-mono font-bold tracking-widest text-[#EAFBFF]">
                  JARVIS CORE STATUS
                </span>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                  themeMode === 'COMBAT'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                    : themeMode === 'STEALTH'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : amberSurge
                    ? 'bg-[#FFB84D]/20 text-[#FFB84D] border border-[#FFB84D]/40'
                    : 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40'
                }`}
              >
                {themeMode === 'COMBAT'
                  ? 'COMBAT READY'
                  : themeMode === 'STEALTH'
                  ? 'STEALTH'
                  : amberSurge
                  ? 'SURGE STATE'
                  : 'OPTIMAL'}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-[#73EEFF]/80">
                <span>SYNAPTIC LOAD</span>
                <span
                  className={`font-bold ${
                    themeMode === 'COMBAT'
                      ? 'text-red-400'
                      : themeMode === 'STEALTH'
                      ? 'text-purple-300'
                      : amberSurge
                      ? 'text-[#FFB84D]'
                      : 'text-[#00D9FF]'
                  }`}
                >
                  {systemStatus.synapticLoad.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-[#03070D] h-1 rounded-full overflow-hidden border border-[#00D9FF]/20">
                <div
                  className={`h-full transition-all duration-300 ${
                    themeMode === 'COMBAT'
                      ? 'bg-gradient-to-r from-red-600 to-amber-500'
                      : themeMode === 'STEALTH'
                      ? 'bg-purple-500'
                      : amberSurge
                      ? 'bg-[#FFB84D]'
                      : 'bg-[#00D9FF]'
                  }`}
                  style={{ width: `${systemStatus.synapticLoad}%` }}
                />
              </div>

              {/* Laptop Battery & Power Status */}
              <div className="flex justify-between items-center text-[#73EEFF]/90 pt-1 border-t border-[#00D9FF]/10">
                <div className="flex items-center space-x-1.5">
                  {battery.charging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-[#00D9FF]" />
                  )}
                  <span className="text-[11px]">POWER CELL</span>
                </div>
                <span className="font-bold text-[#EAFBFF]">{battery.level}% {battery.charging && '⚡'}</span>
              </div>

              {/* Weather & Atmospheric Telemetry */}
              <div className="flex justify-between items-center text-[#73EEFF]/80 text-[11px]">
                <div className="flex items-center space-x-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-[#73EEFF]" />
                  <span>{weather.city.toUpperCase()}</span>
                </div>
                <span className="text-[#EAFBFF] font-medium">{weather.temperature}°C • {weather.condition}</span>
              </div>

              {/* Bio-Acoustic Voice Frequency & Gender Spectrogram */}
              <div className="flex flex-col space-y-1 pt-1.5 border-t border-[#00D9FF]/10 text-[10px]">
                <div className="flex justify-between items-center">
                  <span className="text-[#73EEFF]/70">OVOZ CHASTOTASI:</span>
                  <span className="font-mono font-bold text-[#00D9FF]">
                    {voiceBio.pitchHz} Hz • {voiceBio.honorificUz.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between space-x-1">
                  <button
                    onClick={() => voiceBiometrics.setManualOverride('AUTO')}
                    className={`flex-1 py-0.5 rounded text-[9px] font-mono font-bold transition-colors ${
                      voiceBio.manualOverride === 'AUTO'
                        ? 'bg-[#00D9FF] text-[#03070D]'
                        : 'bg-[#00D9FF]/10 text-[#73EEFF] hover:bg-[#00D9FF]/20'
                    }`}
                  >
                    AVTO
                  </button>
                  <button
                    onClick={() => voiceBiometrics.setManualOverride('MALE')}
                    className={`flex-1 py-0.5 rounded text-[9px] font-mono font-bold transition-colors ${
                      voiceBio.manualOverride === 'MALE'
                        ? 'bg-[#00D9FF] text-[#03070D]'
                        : 'bg-[#00D9FF]/10 text-[#73EEFF] hover:bg-[#00D9FF]/20'
                    }`}
                  >
                    JANOB
                  </button>
                  <button
                    onClick={() => voiceBiometrics.setManualOverride('FEMALE')}
                    className={`flex-1 py-0.5 rounded text-[9px] font-mono font-bold transition-colors ${
                      voiceBio.manualOverride === 'FEMALE'
                        ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                        : 'bg-[#00D9FF]/10 text-[#73EEFF] hover:bg-[#00D9FF]/20'
                    }`}
                  >
                    XONIM
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Active Voice Timers Stream */}
          {timers.length > 0 && isHudVisible && (
            <div className="space-y-1.5 pointer-events-auto">
              {timers.map((t) => (
                <div
                  key={t.id}
                  className="cyber-panel px-3 py-1.5 rounded flex items-center justify-between bg-[#071525]/90 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse"
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-amber-300">{t.label}:</span>
                    <span className="text-xs font-mono font-bold text-white tracking-widest">
                      {formatTimerTime(t.remainingSec)}
                    </span>
                  </div>
                  <button
                    onClick={() => timerService.cancelTimer(t.id)}
                    className="text-[10px] font-mono text-red-400 hover:text-white px-1"
                    title="Cancel Timer"
                  >
                    [X]
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TOP RIGHT: CONTROLS, THEMES & NETWORK PANEL */}
        <div className="flex items-start space-x-2 sm:space-x-3 pointer-events-auto">
          {/* Action & Theme Controls (Always accessible) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-col gap-1 sm:gap-2">
            {/* Fullscreen Toggle */}
            <button
              onClick={onToggleFullscreen}
              className="p-2 cyber-panel hover:bg-[#00D9FF]/20 transition-all text-[#00D9FF] rounded-sm"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-[#73EEFF]" /> : <Maximize className="w-4 h-4 text-[#00D9FF]" />}
            </button>

            {/* Cinematic HUD Hide/Show Toggle */}
            <button
              onClick={onToggleHudVisibility}
              className={`p-2 cyber-panel transition-all rounded-sm ${
                !isHudVisible ? 'bg-[#00D9FF]/30 border-[#00D9FF] text-[#EAFBFF]' : 'hover:bg-[#00D9FF]/20 text-[#00D9FF]'
              }`}
              title={isHudVisible ? 'Cinematic Mode (Hide UI) [H]' : 'Show UI [H]'}
            >
              {!isHudVisible ? <EyeOff className="w-4 h-4 text-[#00D9FF]" /> : <Eye className="w-4 h-4 text-[#00D9FF]" />}
            </button>

            {/* Iron Man Combat Mode Selector */}
            <button
              onClick={() => onSetThemeMode(themeMode === 'COMBAT' ? 'CYAN' : 'COMBAT')}
              className={`p-2 cyber-panel transition-all rounded-sm ${
                themeMode === 'COMBAT'
                  ? 'bg-red-600/40 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse'
                  : 'hover:bg-red-500/20 text-red-400'
              }`}
              title="Iron Man Combat Mode (Red Alert)"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>

            {/* Stealth Mode Selector */}
            <button
              onClick={() => onSetThemeMode(themeMode === 'STEALTH' ? 'CYAN' : 'STEALTH')}
              className={`p-2 cyber-panel transition-all rounded-sm ${
                themeMode === 'STEALTH'
                  ? 'bg-purple-600/40 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.8)]'
                  : 'hover:bg-purple-500/20 text-purple-400'
              }`}
              title="Stealth Mode"
            >
              <Moon className="w-4 h-4" />
            </button>

            {/* Holographic Voice Notes & Task Planner Modal Trigger */}
            <button
              onClick={() => notesPlannerService.openModal()}
              className="p-2 cyber-panel hover:bg-[#00D9FF]/20 transition-all text-[#00D9FF] rounded-sm relative"
              title="Ovozli Qaydlar va Rejalar (Voice Notes & Planner)"
            >
              <ClipboardList className="w-4 h-4 text-[#00D9FF]" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
            </button>

            {/* Ambient Music Player Toggle */}
            <button
              onClick={() => musicPlayer.togglePlay()}
              className={`p-2 cyber-panel transition-all rounded-sm ${
                isMusicPlaying
                  ? 'bg-[#00D9FF]/30 border-[#00D9FF] text-[#EAFBFF] shadow-[0_0_15px_rgba(0,217,255,0.6)]'
                  : 'hover:bg-[#00D9FF]/20 text-[#00D9FF]'
              }`}
              title={isMusicPlaying ? 'Pause Ambient Soundtrack' : 'Play Ambient Synthwave'}
            >
              <Music className={`w-4 h-4 ${isMusicPlaying ? 'animate-bounce' : ''}`} />
            </button>

            {/* Audio Mute Toggle */}
            <button
              onClick={onToggleMute}
              className="p-2 cyber-panel hover:bg-[#00D9FF]/20 transition-all text-[#00D9FF] rounded-sm"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#00D9FF]" />}
            </button>

            {/* Graphics Quality Settings */}
            <button
              onClick={onOpenQualityModal}
              className="p-2 cyber-panel hover:bg-[#00D9FF]/20 transition-all text-[#00D9FF] rounded-sm"
              title="Graphics Quality Settings"
            >
              <Sliders className="w-4 h-4 text-[#00D9FF]" />
            </button>

            {/* Amber Surge Toggle */}
            <button
              onClick={onToggleAmberSurge}
              className={`p-2 cyber-panel transition-all rounded-sm ${
                amberSurge ? 'bg-[#FFB84D]/30 border-[#FFB84D] text-[#FFB84D]' : 'hover:bg-[#00D9FF]/20 text-[#00D9FF]'
              }`}
              title="Trigger Energy Surge"
            >
              <AlertTriangle className={`w-4 h-4 ${amberSurge ? 'text-[#FFB84D]' : 'text-[#00D9FF]'}`} />
            </button>
          </div>

          {/* Network Telemetry Card & Mini Music Player */}
          <div className="hidden sm:flex flex-col space-y-2">
            <div
              className={`cyber-panel p-3.5 rounded-sm min-w-[220px] transition-all duration-300 ${getThemeColorClass()} ${
                isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#00D9FF]/20 pb-2 mb-2.5">
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-xs font-mono font-bold tracking-widest text-[#EAFBFF]">
                    DATA NETWORK
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#73EEFF]/70">FPS: {systemStatus.fps}</span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center text-[#73EEFF]/80">
                  <span>BANDWIDTH</span>
                  <span className="text-[#00D9FF] font-bold">{systemStatus.bandwidthTbps} TB/s</span>
                </div>

                <div className="flex justify-between items-center text-[#73EEFF]/80">
                  <span>ACTIVE SYNAPSES</span>
                  <span className="text-[#EAFBFF]">{systemStatus.activeSynapses.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Active Ambient Music Indicator */}
            {isMusicPlaying && isHudVisible && (
              <div className="cyber-panel px-3 py-2 rounded-sm bg-[#071525]/95 border border-[#00D9FF]/40 shadow-[0_0_20px_rgba(0,217,255,0.2)] flex items-center justify-between animate-fade-in">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-ping" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold text-[#EAFBFF] truncate max-w-[130px]">
                      {currentPlayingTrack.title}
                    </span>
                    <span className="text-[8px] font-mono text-[#73EEFF]/60">{currentPlayingTrack.category}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => musicPlayer.togglePlay()}
                    className="p-1 hover:bg-[#00D9FF]/20 rounded text-[#00D9FF]"
                    title="Pause Music"
                  >
                    <Pause className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => musicPlayer.nextTrack()}
                    className="p-1 hover:bg-[#00D9FF]/20 rounded text-[#00D9FF]"
                    title="Next Track"
                  >
                    <SkipForward className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. CENTER NODE INSPECTOR CALLOUT */}
      {activeCallout && isHudVisible && (
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150"
          style={{ left: `${activeCallout.screenPos.x}px`, top: `${activeCallout.screenPos.y}px` }}
        >
          <div className="relative cyber-panel p-2.5 rounded bg-[#071525]/90 border border-[#00D9FF] shadow-[0_0_20px_rgba(0,217,255,0.4)] min-w-[160px]">
            <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-[#00D9FF] border-b border-[#00D9FF]/30 pb-1 mb-1">
              <Sparkles className="w-3 h-3 text-[#73EEFF]" />
              <span>{activeCallout.layer}</span>
            </div>
            <div className="text-xs font-mono font-bold text-[#EAFBFF] mb-1">
              {activeCallout.label}
            </div>
            <div className="text-[10px] font-mono text-[#73EEFF]/80 space-y-0.5">
              <div className="flex justify-between">
                <span>ID:</span>
                <span className="text-[#00D9FF]">{activeCallout.nodeId}</span>
              </div>
              <div className="flex justify-between">
                <span>ACTIVITY:</span>
                <span className="text-[#00D9FF]">{activeCallout.loadRate}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Area */}
      <div />
    </div>
  );
};
