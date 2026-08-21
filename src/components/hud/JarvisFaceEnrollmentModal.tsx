import React, { useState } from 'react';
import { userProfileService } from '../../services/UserProfileService';
import { jarvisVoice } from '../../services/JarvisVoiceService';
import { voiceBiometrics } from '../../services/VoiceBiometricsService';
import { Scan, UserCheck, Shield, Sparkles, X, Check, Fingerprint } from 'lucide-react';

interface JarvisFaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JarvisFaceEnrollmentModal: React.FC<JarvisFaceEnrollmentModalProps> = ({
  isOpen,
  onClose
}) => {
  const [nameInput, setNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const honorific = voiceBiometrics.getHonorific(jarvisVoice.getLanguage());

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    setIsSaving(true);
    const savedName = nameInput.trim();
    userProfileService.registerUser(savedName);

    const isUz = jarvisVoice.getLanguage() === 'uz';
    const confirmText = isUz
      ? `Biometrik yuz ma'lumotlaringiz xotiraga saqlandi. Xush kelibsiz, ${savedName} ${honorific}!`
      : `Biometric facial profile registered successfully. Welcome, ${savedName} ${honorific}!`;

    jarvisVoice.speak(confirmText);

    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md cyber-panel rounded-lg p-6 bg-[#071525]/95 border-2 border-[#00D9FF] shadow-[0_0_40px_rgba(0,217,255,0.6)] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#00D9FF]/30 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 animate-pulse">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold tracking-widest text-[#EAFBFF] flex items-center space-x-2">
                <span>BIOMETRIK YUZNI RO'YXATDAN O'TKAZISH</span>
              </h2>
              <span className="text-[10px] font-mono text-[#00D9FF]">
                OPTICAL ENROLLMENT PROTOCOL
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#73EEFF]/70 hover:text-white hover:bg-[#00D9FF]/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Biometric Scanning Reticle Animation */}
        <div className="relative w-full h-32 rounded bg-[#03070D] border border-[#00D9FF]/40 flex flex-col items-center justify-center overflow-hidden">
          {/* Animated Laser Scanning Line */}
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent shadow-[0_0_15px_#00D9FF] animate-scan-down" />

          <div className="relative z-10 flex flex-col items-center space-y-1.5">
            <Fingerprint className="w-10 h-10 text-[#00D9FF] animate-pulse" />
            <span className="text-xs font-mono font-bold text-[#EAFBFF] tracking-wider">
              YUZ KONTURLARI SKANERLANMOQDA
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              ● YUZ ANIQLANDI • ANIKLIK 99.8%
            </span>
          </div>

          {/* Corner Sci-Fi brackets */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#00D9FF]" />
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#00D9FF]" />
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#00D9FF]" />
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#00D9FF]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSaveName} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-mono font-semibold text-[#73EEFF] block">
              Sizni qanday ism bilan chaqiray, {honorific}?
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Masalan: Shohruh, Tony, Madina..."
              autoFocus
              className="w-full bg-[#03070D] border-2 border-[#00D9FF]/50 focus:border-[#00D9FF] rounded px-3 py-2.5 text-sm font-mono text-[#EAFBFF] placeholder-[#73EEFF]/40 outline-none shadow-inner"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              type="submit"
              disabled={!nameInput.trim() || isSaving}
              className={`flex-1 py-2.5 rounded font-mono font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                nameInput.trim() && !isSaving
                  ? 'bg-[#00D9FF] text-[#03070D] shadow-[0_0_20px_#00D9FF] hover:bg-white cursor-pointer'
                  : 'bg-[#00D9FF]/20 text-[#73EEFF]/40 cursor-not-allowed border border-[#00D9FF]/20'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSaving ? 'XOTIRAGA SAQLANMOQDA...' : "ISM VA YUZNI SAQLASH"}</span>
            </button>
          </div>

          <p className="text-[10px] font-mono text-[#73EEFF]/60 text-center">
            💡 Shuningdek ovozda: <i>"Mening ismim [Ismingiz]"</i> deb ham ayta olasiz.
          </p>
        </form>
      </div>
    </div>
  );
};
