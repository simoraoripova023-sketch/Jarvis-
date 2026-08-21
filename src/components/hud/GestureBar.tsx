import React, { useEffect, useState } from 'react';
import { GestureType } from '../../types/neural';
import { RotateCw, Maximize, MousePointer, ZoomIn, Camera, AlertCircle, Sparkles, Scan, UserCheck, ShieldCheck } from 'lucide-react';
import { jarvisVision, VisionState } from '../../services/JarvisVisionService';

interface GestureBarProps {
  currentGesture: GestureType;
  onTriggerGesture: (gesture: GestureType) => void;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
  webcamError?: string | null;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  videoRef?: React.RefObject<HTMLVideoElement>;
  isHandVisible?: boolean;
  trackingTelemetry?: { x: number; y: number; gesture: string; confidence: number };
  isHudVisible?: boolean;
}

export const GestureBar: React.FC<GestureBarProps> = ({
  currentGesture,
  onTriggerGesture,
  isWebcamActive,
  onToggleWebcam,
  webcamError,
  canvasRef,
  videoRef,
  isHandVisible,
  trackingTelemetry,
  isHudVisible = true
}) => {
  const [visionState, setVisionState] = useState<VisionState>(jarvisVision.getState());

  useEffect(() => {
    const unsub = jarvisVision.subscribe(setVisionState);
    return () => unsub();
  }, []);

  const gestures: { id: GestureType; label: string; icon: React.ReactNode }[] = [
    { id: 'FIST', label: 'FIST', icon: <RotateCw className="w-3.5 h-3.5" /> },
    { id: 'OPEN_PALM', label: 'PALM', icon: <Maximize className="w-3.5 h-3.5" /> },
    { id: 'POINT', label: 'POINT', icon: <MousePointer className="w-3.5 h-3.5" /> },
    { id: 'PINCH', label: 'PINCH', icon: <ZoomIn className="w-3.5 h-3.5" /> }
  ];

  const faceEntity = visionState.detectedEntities.find((e) => e.type === 'FACE');
  const objectCount = visionState.detectedEntities.filter((e) => e.type !== 'FACE').length;

  return (
    <>
      {/* Floating Webcam Vision & Face Tracker Overlay */}
      <div
        className={`absolute top-20 right-6 z-40 cyber-panel p-2.5 rounded bg-[#071525]/95 border-2 border-[#00D9FF] shadow-[0_0_30px_rgba(0,217,255,0.5)] pointer-events-auto transition-all duration-300 ${
          isWebcamActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#00D9FF] pb-1.5 border-b border-[#00D9FF]/30 mb-2">
          <div className="flex items-center space-x-1.5">
            <Scan className="w-3.5 h-3.5 text-[#00D9FF] animate-spin" />
            <span>JARVIS OPTICAL SCANNER</span>
          </div>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-1 ${
              faceEntity
                ? 'bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 animate-pulse'
                : 'text-[#73EEFF]/50 bg-[#03070D]/60'
            }`}
          >
            {faceEntity ? (
              <>
                <UserCheck className="w-3 h-3 text-[#73EEFF]" />
                <span>YUZ TANILDI</span>
              </>
            ) : (
              <span>QIDIRILMOQDA...</span>
            )}
          </span>
        </div>

        {/* Video Canvas Container */}
        <div className="relative w-48 h-36 bg-black/90 rounded overflow-hidden flex items-center justify-center border border-[#00D9FF]/40">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 opacity-80"
            playsInline
            muted
            autoPlay
          />
          <canvas
            ref={canvasRef}
            width={192}
            height={144}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-10 pointer-events-none"
          />

          {/* Sci-Fi Corner Brackets Overlay */}
          <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-[#00D9FF] pointer-events-none" />
          <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-[#00D9FF] pointer-events-none" />
          <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-[#00D9FF] pointer-events-none" />
          <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-[#00D9FF] pointer-events-none" />

          {currentGesture !== 'NONE' && (
            <div className="absolute bottom-1.5 left-2 right-2 z-20 bg-[#00D9FF] text-[#03070D] font-mono text-[9px] font-bold py-0.5 px-2 rounded text-center shadow-[0_0_15px_#00D9FF] flex items-center justify-center space-x-1 animate-bounce">
              <Sparkles className="w-2.5 h-2.5 text-[#03070D]" />
              <span>IMO-ISHORA: {currentGesture}</span>
            </div>
          )}
        </div>

        {/* Live Biometric Telemetry Footer */}
        <div className="mt-2 space-y-1 text-[9px] font-mono text-[#73EEFF]/80 border-t border-[#00D9FF]/10 pt-1.5">
          <div className="flex justify-between items-center">
            <span>BIO-STATUS:</span>
            <span className="text-[#00D9FF] font-bold flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{faceEntity ? 'TASDIQLANDI' : 'KUZATILMOQDA'}</span>
            </span>
          </div>
          {faceEntity && (
            <div className="flex justify-between items-center text-[#EAFBFF]">
              <span>MASOFA:</span>
              <span className="text-[#73EEFF] font-bold">{faceEntity.distanceMeters} m</span>
            </div>
          )}
          {objectCount > 0 && (
            <div className="flex justify-between items-center text-amber-300">
              <span>OB'EKTLAR:</span>
              <span>{objectCount} ta aniqlandi</span>
            </div>
          )}
        </div>
      </div>

      {/* Minimal Bottom Control Bar */}
      <div
        className={`absolute bottom-5 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto flex flex-col items-center space-y-1.5 transition-all duration-300 ${
          isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        {webcamError && (
          <div className="px-3 py-1 rounded bg-red-950/90 border border-red-500 text-red-200 font-mono text-[10px] flex items-center space-x-1.5 shadow-xl animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>{webcamError}</span>
          </div>
        )}

        <div className="cyber-panel px-2 py-1.5 rounded-full flex items-center space-x-2 bg-[#071525]/85 border border-[#00D9FF]/30 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          {gestures.map((g) => {
            const isActive = currentGesture === g.id;
            return (
              <button
                key={g.id}
                onClick={() => onTriggerGesture(g.id)}
                className={`px-3 py-1 rounded-full font-mono text-[10px] transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-[#00D9FF] text-[#03070D] font-bold shadow-[0_0_12px_#00D9FF]'
                    : 'hover:bg-[#00D9FF]/20 text-[#73EEFF]'
                }`}
              >
                <span>{g.icon}</span>
                <span className="font-semibold">{g.label}</span>
              </button>
            );
          })}

          <div className="w-[1px] h-4 bg-[#00D9FF]/20 mx-1" />

          {/* AI Camera & Vision Toggle Button */}
          <button
            onClick={onToggleWebcam}
            className={`px-3 py-1 rounded-full font-mono text-[10px] transition-all flex items-center space-x-1.5 ${
              isWebcamActive
                ? 'bg-[#00D9FF] text-[#03070D] font-bold shadow-[0_0_15px_#00D9FF] animate-pulse'
                : 'hover:bg-[#00D9FF]/20 text-[#00D9FF]'
            }`}
            title="Kamera orqali yuz va ob'ektlarni tanishni yoqish"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isWebcamActive ? 'KAMERA: ON' : 'AI KAMERA'}</span>
          </button>
        </div>
      </div>
    </>
  );
};
