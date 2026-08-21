import React, { useEffect, useState } from 'react';
import { soundManager } from '../../services/AudioSynthesizer';
import { Activity, Shield, Cpu, Zap, Radio } from 'lucide-react';

interface BootSequenceProps {
  onBootComplete: () => void;
}

const BOOT_STEPS = [
  { step: '01', title: 'INITIALIZING COLD CORE', desc: 'Powering primary quantum bus...' },
  { step: '02', title: 'ELECTRICAL PULSE INJECTED', desc: 'Calibrating voltage thresholds...' },
  { step: '03', title: 'NEURAL NODES ALIGNED', desc: 'Mapping 4,500 point cloud clusters...' },
  { step: '04', title: 'FIBER-OPTIC SYNAPSES FORMING', desc: 'Connecting Catmull-Rom splines...' },
  { step: '05', title: 'BRAIN MESH SYNCHRONIZED', desc: 'Restoring anatomical cortex topology...' },
  { step: '06', title: 'INTERNAL CORE ENERGY ACTIVATED', desc: 'Volumetric core reactor at 100%...' },
  { step: '07', title: 'HOLOGRAPHIC DIAGNOSTICS ONLINE', desc: 'Engaging concentric diagnostic rings...' },
  { step: '08', title: 'HUD TELEMETRY LAYER FADING IN', desc: 'Loading real-time system monitors...' },
  { step: '09', title: 'SYSTEM STATUS: ONLINE', desc: 'Neural load 98.4% — optimal processing...' },
  { step: '10', title: 'NEURAL CORE ACTIVE', desc: 'System responsive to gesture vectors.' }
];

export const BootSequenceOverlay: React.FC<BootSequenceProps> = ({ onBootComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    soundManager.playBootSequenceSound();

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < BOOT_STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
              onBootComplete();
            }, 800);
          }, 600);
          return prev;
        }
      });
    }, 380);

    return () => clearInterval(interval);
  }, [onBootComplete]);

  const currentStep = BOOT_STEPS[currentStepIndex];
  const progressPercent = Math.round(((currentStepIndex + 1) / BOOT_STEPS.length) * 100);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-[#03070D] transition-opacity duration-750 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />

      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-[#00D9FF]/20 pb-4">
        <div className="flex items-center space-x-3">
          <Cpu className="w-6 h-6 text-[#00D9FF] animate-pulse" />
          <span className="text-[#00D9FF] font-mono tracking-widest text-sm font-bold">
            J.A.R.V.I.S. // NEURAL CORE OS MARK VII
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-[#73EEFF]/70">
          <Radio className="w-4 h-4 text-[#00D9FF] animate-ping" />
          <span>JARVIS PROTOCOL V4.0</span>
        </div>
      </div>

      {/* Center Hero Loading Module */}
      <div className="w-full max-w-xl flex flex-col items-center justify-center my-auto space-y-8 text-center">
        {/* Animated Cyber Reactor Spinner */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#00D9FF]/20 border-t-[#00D9FF] animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-[#73EEFF]/10 border-b-[#73EEFF] animate-spin-reverse-slow" />
          <div className="w-16 h-16 rounded-full bg-[#00D9FF]/10 flex items-center justify-center border border-[#00D9FF]/50 shadow-[0_0_25px_rgba(0,217,255,0.5)]">
            <Zap className="w-8 h-8 text-[#00D9FF] animate-pulse" />
          </div>
        </div>

        {/* Step Counter & Diagnostics */}
        <div className="space-y-2">
          <div className="text-xs font-mono tracking-widest text-[#00D9FF]">
            STAGE {currentStep.step} / 10
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-mono tracking-wider text-[#EAFBFF] text-cyan-glow">
            {currentStep.title}
          </h1>
          <p className="text-xs font-mono text-[#73EEFF]/70">{currentStep.desc}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="flex justify-between text-xs font-mono text-[#00D9FF]">
            <span>SYNAPTIC SYNCHRONIZATION</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#071525] rounded-full overflow-hidden border border-[#00D9FF]/30 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#00D9FF] to-[#73EEFF] rounded-full transition-all duration-300 shadow-[0_0_10px_#00D9FF]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Footer Diagnostics */}
      <div className="w-full max-w-4xl flex items-center justify-between text-[11px] font-mono text-[#73EEFF]/50 border-t border-[#00D9FF]/10 pt-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-[#00D9FF]" />
          <span>SECURITY CORE ENCRYPTED</span>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-[#00D9FF]" />
          <span>STANDBY FOR VECTOR INPUT</span>
        </div>
      </div>
    </div>
  );
};
