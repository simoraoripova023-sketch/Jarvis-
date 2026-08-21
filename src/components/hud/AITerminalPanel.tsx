import React, { useState, useRef, useEffect } from 'react';
import { TerminalMessage } from '../../types/neural';
import { Terminal, Send, Sparkles, ChevronRight } from 'lucide-react';
import { soundManager } from '../../services/AudioSynthesizer';

interface AITerminalPanelProps {
  onTriggerSurge: () => void;
}

export const AITerminalPanel: React.FC<AITerminalPanelProps> = ({ onTriggerSurge }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<TerminalMessage[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      sender: 'SYSTEM',
      text: 'NEURAL CORE KERNEL V4.0 READY. ENTER VECTOR QUERY OR SYSTEM COMMAND.',
      type: 'highlight'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    soundManager.playQuerySentSound();

    const userMsg: TerminalMessage = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      sender: 'USER',
      text: inputText
    };

    setMessages((prev) => [...prev, userMsg]);
    const query = inputText.toLowerCase();
    setInputText('');

    // Trigger visual energy surge in 3D scene
    onTriggerSurge();

    // Generate AI Neural Core Response
    setTimeout(() => {
      let replyText = 'SYNAPTIC VECTOR ANALYZED. CORE RUNNING AT OPTIMAL EFFICIENCY.';
      let msgType: 'normal' | 'highlight' | 'warning' | 'amber' = 'normal';

      if (query.includes('analyze') || query.includes('scan')) {
        replyText = 'SCANNING 4,500 NEURAL NODES... NO ANOMALIES DETECTED. VECTOR INTEGRITY 99.8%.';
        msgType = 'highlight';
      } else if (query.includes('surge') || query.includes('overload') || query.includes('amber')) {
        replyText = 'WARNING: HIGH ENERGY PULSE DISCHARGED INTO FRONT-TEMPORAL SYNAPSES!';
        msgType = 'amber';
      } else if (query.includes('status') || query.includes('system')) {
        replyText = 'NEURAL CORE ONLINE. BANDWIDTH: 100 TB/s. SYNAPTIC LOAD: 98.4%.';
      }

      const coreMsg: TerminalMessage = {
        id: (Date.now() + 1).toString(),
        timestamp: new Date().toLocaleTimeString(),
        sender: 'NEURAL_CORE',
        text: replyText,
        type: msgType
      };

      setMessages((prev) => [...prev, coreMsg]);
    }, 450);
  };

  return (
    <div className="absolute bottom-6 left-6 z-30 pointer-events-auto">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="cyber-panel px-4 py-2.5 rounded-sm flex items-center space-x-2.5 hover:bg-[#00D9FF]/20 transition-all text-[#00D9FF] font-mono text-xs font-bold"
        >
          <Terminal className="w-4 h-4 text-[#00D9FF]" />
          <span>OPEN AI TERMINAL</span>
          <Sparkles className="w-3.5 h-3.5 text-[#73EEFF] animate-pulse" />
        </button>
      ) : (
        <div className="cyber-panel w-[320px] sm:w-[380px] h-[260px] rounded-sm flex flex-col justify-between p-3 bg-[#071525]/95 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#00D9FF]/20 pb-2">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-[#00D9FF]" />
              <span className="text-xs font-mono font-bold text-[#EAFBFF] tracking-wider">
                AI VECTOR TERMINAL
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs font-mono text-[#73EEFF]/70 hover:text-white px-2 py-0.5"
            >
              [X]
            </button>
          </div>

          {/* Log Window */}
          <div className="flex-1 my-2 overflow-y-auto space-y-2 text-[11px] font-mono pr-1">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-0.5">
                <div className="text-[9px] text-[#73EEFF]/50 flex justify-between">
                  <span>[{msg.sender}]</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`p-1.5 rounded ${
                    msg.type === 'amber'
                      ? 'bg-[#FFB84D]/20 text-[#FFB84D] border border-[#FFB84D]/40'
                      : msg.type === 'highlight'
                      ? 'bg-[#00D9FF]/15 text-[#73EEFF] border border-[#00D9FF]/30'
                      : 'text-[#EAFBFF]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="flex items-center space-x-2 pt-2 border-t border-[#00D9FF]/20">
            <ChevronRight className="w-4 h-4 text-[#00D9FF]" />
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter neural prompt..."
              className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-[#EAFBFF] placeholder-[#73EEFF]/40"
            />
            <button
              type="submit"
              className="p-1.5 rounded bg-[#00D9FF]/20 hover:bg-[#00D9FF]/40 text-[#00D9FF] transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
