import React, { useState, useEffect } from 'react';
import { ActiveCallout } from '../../types/neural';
import { Sparkles, Terminal, Cpu, Zap, X, Shield, RefreshCw, Layers } from 'lucide-react';
import { soundManager } from '../../services/AudioSynthesizer';

interface NeuralNodeDecoderModalProps {
  node: ActiveCallout | null;
  onClose: () => void;
  onTriggerSurge: () => void;
}

export const NeuralNodeDecoderModal: React.FC<NeuralNodeDecoderModalProps> = ({
  node,
  onClose,
  onTriggerSurge
}) => {
  const [codeLines, setCodeLines] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'CODE' | 'HEX' | 'TENSOR'>('CODE');
  const [isDischarging, setIsDischarging] = useState(false);

  // Generate dynamic quantum assembly / matrix code lines for the selected neuron
  useEffect(() => {
    if (!node) return;

    soundManager.playQuerySentSound();

    const sampleCodes = [
      `// ATTACHED TO QUANTUM SYNAPSE: ${node.nodeId}`,
      `0x7F_C0RTEX_VECTOR::TENSOR_OP [4096x4096]`,
      `LOAD_SYNAPSE_WEIGHTS(0x8A2F, ALPHA=${node.loadRate})`,
      `QUANTUM_GATE_INIT --entangle=ENABLED --phase=0.884`,
      `MOV QWORD PTR [SYNAPSE_${node.nodeId}], 0x9B44F12A`,
      `CALL_CORE_ROUTINE(VEC_LOBE_${node.layer}, LOAD=0.98)`,
      `TENSOR_DOT_PRODUCT(VEC_ALPHA, VEC_BETA) -> 0.9984`,
      `MEM_DECODE: "FIRING_RATE: 2.84 GHz | FLUX: OPTIMAL"`,
      `0x00F4A1 8B 45 08 89 45 FC E8 33 00 00 00`,
      `SYNAPSE_LINK_HEALTH: 100% [ZERO LATENCY DETECTED]`,
      `DISPATCH_SYNAPTIC_STREAM -> OCCIPITAL_BUS`
    ];

    setCodeLines(sampleCodes);

    // Fast streaming interval simulation
    const interval = setInterval(() => {
      const hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
      const randomWeight = (Math.random()).toFixed(4);
      const newLine = `0x${hex} TENSOR_WEIGHT_UPDATE(LOBE_${node.layer}) => ${randomWeight}`;

      setCodeLines((prev) => [...prev.slice(-12), newLine]);
    }, 280);

    return () => clearInterval(interval);
  }, [node]);

  if (!node) return null;

  const handleDischarge = () => {
    setIsDischarging(true);
    soundManager.playAmberAlertSound();
    onTriggerSurge();
    setTimeout(() => setIsDischarging(false), 1200);
  };

  const handleRecalibrate = () => {
    soundManager.playNodePulseSound();
    setCodeLines((prev) => [
      ...prev,
      `>>> SYNAPSE RECALIBRATED: VOLTAGE SET TO 1.42V`,
      `>>> RESYNCHRONIZING WITH CENTRAL NEURAL REACTOR... DONE.`
    ]);
  };

  return (
    <div className="absolute top-16 left-6 z-40 w-80 sm:w-96 cyber-panel p-4 rounded bg-[#071525]/95 border border-[#00D9FF] shadow-[0_0_35px_rgba(0,217,255,0.5)] pointer-events-auto transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#00D9FF]/30 pb-2 mb-3">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-[#00D9FF] animate-pulse" />
          <div>
            <h3 className="text-xs font-mono font-bold text-[#EAFBFF] tracking-wider">
              {node.label}
            </h3>
            <div className="text-[9px] font-mono text-[#73EEFF]/60 flex items-center space-x-1.5">
              <span>LAYER: {node.layer}</span>
              <span>•</span>
              <span className="text-[#00D9FF]">ID: {node.nodeId}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#00D9FF]/20 text-[#73EEFF]/70 hover:text-white transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1.5 mb-2.5 border-b border-[#00D9FF]/20 pb-1.5 text-[10px] font-mono">
        <button
          onClick={() => setActiveTab('CODE')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'CODE'
              ? 'bg-[#00D9FF]/30 text-[#00D9FF] font-bold border border-[#00D9FF]/50'
              : 'text-[#73EEFF]/60 hover:text-white'
          }`}
        >
          DISASSEMBLY
        </button>
        <button
          onClick={() => setActiveTab('HEX')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'HEX'
              ? 'bg-[#00D9FF]/30 text-[#00D9FF] font-bold border border-[#00D9FF]/50'
              : 'text-[#73EEFF]/60 hover:text-white'
          }`}
        >
          HEX DUMP
        </button>
        <button
          onClick={() => setActiveTab('TENSOR')}
          className={`px-2.5 py-1 rounded transition-colors ${
            activeTab === 'TENSOR'
              ? 'bg-[#00D9FF]/30 text-[#00D9FF] font-bold border border-[#00D9FF]/50'
              : 'text-[#73EEFF]/60 hover:text-white'
          }`}
        >
          TENSOR WEIGHTS
        </button>
      </div>

      {/* Code Stream Output Window */}
      <div className="h-44 bg-[#03070D]/90 rounded p-2.5 overflow-y-auto border border-[#00D9FF]/20 text-[10px] font-mono space-y-1 mb-3">
        {activeTab === 'CODE' && (
          <div className="space-y-0.5 text-[#73EEFF]/90">
            {codeLines.map((line, i) => (
              <div key={i} className="flex items-start space-x-1.5 leading-relaxed">
                <span className="text-[#00D9FF]/40 select-none">{String(i + 1).padStart(2, '0')}</span>
                <span className={line.includes('>>>') ? 'text-[#FFB84D] font-bold' : ''}>{line}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'HEX' && (
          <div className="space-y-0.5 text-[#00D9FF]/80 text-[9px] font-mono">
            <div>{"0000: 7F 45 4C 46 02 01 01 00 00 00 00 00 00 00 00 00  .ELF............"}</div>
            <div>{"0010: 03 00 3E 00 01 00 00 00 70 10 00 00 00 00 00 00  ..>.....p......."}</div>
            <div>{"0020: 40 00 00 00 00 00 00 00 68 2F 00 00 00 00 00 00  @.......h/......"}</div>
            <div>{"0030: 00 00 00 00 40 00 38 00 09 00 40 00 1E 00 1D 00  ....@.8...@....."}</div>
            <div>{"0040: 06 00 00 00 04 00 00 00 40 00 00 00 00 00 00 00  ........@......."}</div>
            <div>{"0050: 40 00 00 00 00 00 00 00 40 00 00 00 00 00 00 00  @.......@......."}</div>
          </div>
        )}

        {activeTab === 'TENSOR' && (
          <div className="space-y-2 text-[10px] font-mono">
            <div className="flex justify-between text-[#73EEFF]">
              <span>SYNAPTIC ACTIVITY RATE:</span>
              <span className="text-[#00D9FF] font-bold">{node.loadRate}</span>
            </div>
            <div className="w-full bg-[#071525] h-1.5 rounded-full overflow-hidden border border-[#00D9FF]/30">
              <div className="h-full bg-[#00D9FF] rounded-full" style={{ width: node.loadRate }} />
            </div>

            <div className="flex justify-between text-[#73EEFF] pt-1">
              <span>CONNECTED NEURONS:</span>
              <span className="text-[#EAFBFF]">{node.synapseCount} Links</span>
            </div>

            <div className="flex justify-between text-[#73EEFF]">
              <span>QUANTUM MEMORY REGISTER:</span>
              <span className="text-[#FFB84D]">0x8A_MEM_V4</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 pt-1 border-t border-[#00D9FF]/20">
        <button
          onClick={handleDischarge}
          className={`flex-1 py-1.5 rounded text-[10px] font-mono font-bold flex items-center justify-center space-x-1.5 transition-all ${
            isDischarging
              ? 'bg-[#FFB84D] text-[#03070D] shadow-[0_0_15px_#FFB84D]'
              : 'bg-[#FFB84D]/20 hover:bg-[#FFB84D]/35 text-[#FFB84D] border border-[#FFB84D]/40'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isDischarging ? 'PULSE DISCHARGED!' : 'DISCHARGE PULSE'}</span>
        </button>

        <button
          onClick={handleRecalibrate}
          className="flex-1 py-1.5 rounded text-[10px] font-mono font-bold bg-[#00D9FF]/20 hover:bg-[#00D9FF]/35 text-[#00D9FF] border border-[#00D9FF]/40 flex items-center justify-center space-x-1.5 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>RECALIBRATE</span>
        </button>
      </div>
    </div>
  );
};
