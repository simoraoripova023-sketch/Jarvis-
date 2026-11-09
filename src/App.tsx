import React, { useState, useCallback, useEffect } from 'react';
import { NeuralCoreCanvas } from './components/neural-core/NeuralCoreCanvas';
import { BootSequenceOverlay } from './components/hud/BootSequenceOverlay';
import { HUDContainer } from './components/hud/HUDContainer';
import { GestureBar } from './components/hud/GestureBar';
import { NeuralNodeDecoderModal } from './components/hud/NeuralNodeDecoderModal';
import { QualitySettingsModal } from './components/hud/QualitySettingsModal';
import { JarvisVoiceAssistant } from './components/hud/JarvisVoiceAssistant';
import { JarvisNotesPlannerModal } from './components/hud/JarvisNotesPlannerModal';
import { JarvisFaceEnrollmentModal } from './components/hud/JarvisFaceEnrollmentModal';
import { useHandTracking } from './hooks/useHandTracking';
import { GestureType, QualityTier, SystemStatus, ActiveCallout, SystemThemeMode } from './types/neural';
import { soundManager } from './services/AudioSynthesizer';
import { jarvisVoice } from './services/JarvisVoiceService';
import { voiceBiometrics } from './services/VoiceBiometricsService';
import { notesPlannerService } from './services/NotesPlannerService';
import { userProfileService } from './services/UserProfileService';

export function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('NONE');
  const [qualityTier, setQualityTier] = useState<QualityTier>('HIGH');
  const [themeMode, setThemeMode] = useState<SystemThemeMode>('CYAN');
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [amberSurge, setAmberSurge] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [fps, setFps] = useState(60);
  const [activeCallout, setActiveCallout] = useState<ActiveCallout | null>(null);

  // Fullscreen & Cinematic HUD View States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);

  const [handPos, setHandPos] = useState<{ x?: number; y?: number }>({});
  const [handZoom, setHandZoom] = useState<number | undefined>(undefined);

  const triggerGesture = useCallback((gesture: GestureType) => {
    setCurrentGesture(gesture);

    if (gesture === 'POINT') {
      if (!notesPlannerService.getIsModalOpen()) {
        soundManager.playNodePulseSound();
        notesPlannerService.openModal();
        jarvisVoice.announceDailyTasks();
      }
    }

    setTimeout(() => {
      setCurrentGesture('NONE');
    }, 1500);
  }, []);

  const handleHandMove = useCallback((_x: number, _y: number) => {
    // Hand motion dispatched directly to NeuralCoreCanvas via high-performance custom event
  }, []);

  const handleHandZoom = useCallback((_zoom: number) => {
    // Hand zoom dispatched directly to NeuralCoreCanvas
  }, []);

  const {
    isWebcamActive,
    webcamError,
    videoRef,
    canvasRef,
    toggleWebcam,
    isHandVisible,
    trackingTelemetry
  } = useHandTracking(
    (gesture) => {
      triggerGesture(gesture);
    },
    handleHandMove,
    handleHandZoom
  );

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    online: true,
    synapticLoad: 98.4,
    bandwidthTbps: 100,
    activeSynapses: 4500,
    temperatureCelsius: 34.2,
    processingState: 'OPTIMAL',
    fps: 60
  });

  const handleToggleAmberSurge = useCallback(() => {
    setAmberSurge((prev) => {
      const nextState = !prev;
      if (nextState) {
        soundManager.playAmberAlertSound();
        setSystemStatus((s) => ({ ...s, processingState: 'AMBER_SURGE', synapticLoad: 99.8 }));
      } else {
        setSystemStatus((s) => ({ ...s, processingState: 'OPTIMAL', synapticLoad: 98.4 }));
      }
      return nextState;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleFpsUpdate = useCallback((newFps: number) => {
    setFps(newFps);
    setSystemStatus((s) => ({ ...s, fps: newFps }));
  }, []);

  // Fullscreen Handler
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
      setIsFullscreen(false);
    }
  }, []);

  const handleToggleHudVisibility = useCallback(() => {
    setIsHudVisible((prev) => !prev);
  }, []);

  // Keyboard Shortcuts (F: Fullscreen, H: Hide HUD, M: Mute, 1-4: Gestures, Esc: Close modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === 'f') {
        handleToggleFullscreen();
      } else if (key === 'h') {
        handleToggleHudVisibility();
      } else if (key === 'm') {
        handleToggleMute();
      } else if (key === '1') {
        triggerGesture('FIST');
      } else if (key === '2') {
        triggerGesture('OPEN_PALM');
      } else if (key === '3') {
        triggerGesture('POINT');
      } else if (key === '4') {
        triggerGesture('PINCH');
      } else if (e.key === 'Escape') {
        setActiveCallout(null);
        setIsQualityModalOpen(false);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleToggleFullscreen, handleToggleHudVisibility, handleToggleMute, triggerGesture]);

  useEffect(() => {
    const unsubModal = notesPlannerService.subscribeModal(setIsNotesModalOpen);
    const unsubFace = userProfileService.subscribeModal(setIsFaceModalOpen);
    return () => {
      unsubModal();
      unsubFace();
    };
  }, []);

  // Register voice actions
  useEffect(() => {
    jarvisVoice.registerActions({
      onToggleSurge: (enable) => {
        if (enable !== undefined) {
          setAmberSurge(enable);
          if (enable) {
            soundManager.playAmberAlertSound();
            setSystemStatus((s) => ({ ...s, processingState: 'AMBER_SURGE', synapticLoad: 99.8 }));
          } else {
            setSystemStatus((s) => ({ ...s, processingState: 'OPTIMAL', synapticLoad: 98.4 }));
          }
        } else {
          handleToggleAmberSurge();
        }
      },
      onSetThemeMode: (theme) => {
        setThemeMode(theme);
        if (theme === 'COMBAT') {
          setSystemStatus((s) => ({ ...s, processingState: 'COMBAT_ACTIVE', synapticLoad: 99.9 }));
        } else if (theme === 'STEALTH') {
          setSystemStatus((s) => ({ ...s, processingState: 'STEALTH_MODE', synapticLoad: 50.0 }));
        } else {
          setSystemStatus((s) => ({ ...s, processingState: 'OPTIMAL', synapticLoad: 98.4 }));
        }
      },
      onTriggerGesture: (g) => triggerGesture(g),
      onToggleFullscreen: handleToggleFullscreen,
      onToggleMute: handleToggleMute,
      onToggleWebcam: toggleWebcam,
      onOpenNotesModal: () => notesPlannerService.openModal(),
      onOpenEnrollmentModal: () => userProfileService.openEnrollmentModal()
    });
  }, [handleToggleAmberSurge, triggerGesture, handleToggleFullscreen, handleToggleMute, toggleWebcam]);

  const handleBootComplete = useCallback(() => {
    setIsBooting(false);
    setTimeout(() => {
      const isUz = jarvisVoice.getLanguage() === 'uz';
      const baseHonorific = voiceBiometrics.getHonorific(isUz ? 'uz' : 'en');
      const userName = userProfileService.getName();
      const honorific = userName ? `${userName} ${baseHonorific}` : baseHonorific;

      const greeting = isUz
        ? `J.A.R.V.I.S. neyron yadrosi faollashdi. Barcha tizimlar tayyor, ${honorific}.`
        : `JARVIS neural core online. All systems optimal. Ready for your command, ${honorific}.`;
      jarvisVoice.speak(greeting);
    }, 400);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#03070D] overflow-hidden select-none">
      {/* 10-Step Cinematic Boot Sequence */}
      {isBooting && (
        <BootSequenceOverlay onBootComplete={handleBootComplete} />
      )}

      {/* Main WebGL Neural Core 3D Brain Experience */}
      {!isBooting && (
        <>
          <NeuralCoreCanvas
            gesture={currentGesture}
            qualityTier={qualityTier}
            onNodeSelect={setActiveCallout}
            amberSurge={amberSurge}
            themeMode={themeMode}
            onFpsUpdate={handleFpsUpdate}
            handX={handPos.x}
            handY={handPos.y}
            handZoom={handZoom}
          />

          {/* Master Holographic HUD Layer */}
          <HUDContainer
            systemStatus={systemStatus}
            activeCallout={activeCallout}
            qualityTier={qualityTier}
            themeMode={themeMode}
            onSetThemeMode={setThemeMode}
            onToggleAmberSurge={handleToggleAmberSurge}
            amberSurge={amberSurge}
            onOpenQualityModal={() => setIsQualityModalOpen(true)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            isHudVisible={isHudVisible}
            onToggleHudVisibility={handleToggleHudVisibility}
          />

          {/* Holographic Quantum Code & Memory Matrix Decoder Modal */}
          {activeCallout && isHudVisible && (
            <NeuralNodeDecoderModal
              node={activeCallout}
              onClose={() => setActiveCallout(null)}
              onTriggerSurge={handleToggleAmberSurge}
            />
          )}

          {/* Holographic Voice Notes & Task Planner Modal */}
          <JarvisNotesPlannerModal
            isOpen={isNotesModalOpen}
            onClose={() => notesPlannerService.closeModal()}
          />

          {/* Biometric Face Enrollment & Identity Memory Modal */}
          <JarvisFaceEnrollmentModal
            isOpen={isFaceModalOpen}
            onClose={() => userProfileService.closeEnrollmentModal()}
          />

          {/* Interactive JARVIS Voice Assistant & Command Terminal */}
          <JarvisVoiceAssistant
            onTriggerSurge={handleToggleAmberSurge}
            isHudVisible={isHudVisible}
          />

          {/* Clean & Sleek Floating Gesture Bar */}
          <GestureBar
            currentGesture={currentGesture}
            onTriggerGesture={triggerGesture}
            isWebcamActive={isWebcamActive}
            onToggleWebcam={toggleWebcam}
            webcamError={webcamError}
            canvasRef={canvasRef}
            videoRef={videoRef}
            isHandVisible={isHandVisible}
            trackingTelemetry={trackingTelemetry}
            isHudVisible={isHudVisible}
          />

          {/* Quality Tier Settings Modal */}
          {isQualityModalOpen && (
            <QualitySettingsModal
              currentTier={qualityTier}
              onSelectTier={setQualityTier}
              onClose={() => setIsQualityModalOpen(false)}
              fps={fps}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
