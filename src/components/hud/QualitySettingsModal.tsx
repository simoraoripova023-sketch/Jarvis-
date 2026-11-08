import React, { useState } from 'react';
import { QualityTier } from '../../types/neural';
import { Sliders, Monitor, Zap, Shield, CheckCircle2, Key, Check } from 'lucide-react';
import { getStoredGeminiKey, setStoredGeminiKey } from '../../services/JarvisAIService';

interface QualitySettingsModalProps {
  currentTier: QualityTier;
  onSelectTier: (tier: QualityTier) => void;
  onClose: () => void;
  fps: number;
}

export const QualitySettingsModal: React.FC<QualitySettingsModalProps> = ({
  currentTier,
  onSelectTier,
  onClose,
  fps
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(getStoredGeminiKey());
  const [isSaved, setIsSaved] = useState(false);

  const tiers: { id: QualityTier; title: string; desc: string; nodeCount: string }[] = [
    { id: 'LOW', title: 'LOW QUALITY', desc: 'Optimized for mobile / integrated GPUs. Reduced node density.', nodeCount: '1,200 Nodes' },
    { id: 'MEDIUM', title: 'MEDIUM QUALITY', desc: 'Balanced performance & particle effects.', nodeCount: '2,800 Nodes' },
    { id: 'HIGH', title: 'HIGH QUALITY (RECOMMENDED)', desc: 'Full cybernetic brain detail & line pulse shaders.', nodeCount: '4,500 Nodes' },
    { id: 'ULTRA', title: 'ULTRA QUALITY', desc: 'Maximum point cloud density, 2x supersampling, bloom glow.', nodeCount: '7,200 Nodes' }
  ];

  const handleSaveKey = () => {
    setStoredGeminiKey(apiKeyInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="cyber-panel w-full max-w-md p-6 rounded-sm bg-[#071525]/95 shadow-[0_0_40px_rgba(0,217,255,0.3)] space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#00D9FF]/20 pb-3">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-5 h-5 text-[#00D9FF]" />
            <h2 className="text-sm font-mono font-bold text-[#EAFBFF] tracking-wider">
              TIZIM VA GRAFIKA SOZLAMALARI
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono text-[#73EEFF]/60 hover:text-white px-2 py-1"
          >
            [X]
          </button>
        </div>

        {/* Real-Time Telemetry */}
        <div className="flex items-center justify-between p-3 rounded bg-[#03070D]/80 border border-[#00D9FF]/20 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Monitor className="w-4 h-4 text-[#00D9FF]" />
            <span className="text-[#73EEFF]/80">GRAFIKA TEZLIGI (FPS):</span>
          </div>
          <span className="font-bold text-[#00D9FF] text-sm">{fps} FPS</span>
        </div>

        {/* Google Gemini API Key Input */}
        <div className="p-3.5 rounded bg-[#03070D]/80 border border-[#00D9FF]/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-mono text-[#EAFBFF] font-bold">
              <Key className="w-4 h-4 text-[#00D9FF]" />
              <span>GOOGLE GEMINI API KEY (Ixtiyoriy)</span>
            </div>
            {isSaved && (
              <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1 animate-pulse">
                <Check className="w-3 h-3" />
                <span>SAQLANDI</span>
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-[#73EEFF]/70">
            Cheksiz va aqlli javoblar uchun bepul Gemini API kalitingizni kiriting:
          </p>
          <div className="flex space-x-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 px-3 py-1.5 rounded bg-[#071525] border border-[#00D9FF]/30 text-white font-mono text-xs focus:outline-none focus:border-[#00D9FF]"
            />
            <button
              onClick={handleSaveKey}
              className="px-3 py-1.5 rounded bg-[#00D9FF] text-[#03070D] font-mono font-bold text-xs hover:bg-[#73EEFF] transition-colors"
            >
              SAQLASH
            </button>
          </div>
        </div>

        {/* Tiers List */}
        <div className="space-y-2.5">
          <span className="text-xs font-mono text-[#73EEFF]/80 font-bold">GRAFIKA SIFATI:</span>
          {tiers.map((tier) => {
            const isSelected = currentTier === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => {
                  onSelectTier(tier.id);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-sm border transition-all flex items-start justify-between ${
                  isSelected
                    ? 'bg-[#00D9FF]/20 border-[#00D9FF] shadow-[0_0_15px_rgba(0,217,255,0.4)]'
                    : 'bg-[#03070D]/40 border-[#00D9FF]/20 hover:bg-[#00D9FF]/10'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-[#EAFBFF]">{tier.title}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#00D9FF]" />}
                  </div>
                  <p className="text-[10px] font-mono text-[#73EEFF]/70">{tier.desc}</p>
                </div>
                <span className="text-[10px] font-mono text-[#00D9FF] whitespace-nowrap ml-2">
                  {tier.nodeCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[#73EEFF]/50 border-t border-[#00D9FF]/10 pt-2.5">
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>ADAPTIVE QUALITY ENGINE</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span>WEBGL 2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
