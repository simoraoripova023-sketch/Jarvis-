import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Terminal, Send, Zap, Activity, ExternalLink, Globe, Loader2, Radio } from 'lucide-react';
import { jarvisVoice, JarvisVoiceStatus, JarvisLanguage, UrlLaunchEvent } from '../../services/JarvisVoiceService';

interface JarvisVoiceAssistantProps {
  onTriggerSurge: (enable?: boolean) => void;
  isHudVisible?: boolean;
}

interface MessageItem {
  id: string;
  sender: 'USER' | 'JARVIS';
  text: string;
  time: string;
  linkUrl?: string;
  linkTitle?: string;
}

export const JarvisVoiceAssistant: React.FC<JarvisVoiceAssistantProps> = ({
  onTriggerSurge,
  isHudVisible = true
}) => {
  const [voiceStatus, setVoiceStatus] = useState<JarvisVoiceStatus>('idle');
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lang, setLang] = useState<JarvisLanguage>('uz');
  const [activeUrlLaunch, setActiveUrlLaunch] = useState<UrlLaunchEvent | null>(null);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-1',
      sender: 'JARVIS',
      text: 'J.A.R.V.I.S. AI Mark VII faollashdi. "Salom Jarvis", "YouTube ni och" deb ayting yoki mikrofonni yoqing.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    jarvisVoice.setCallbacks(
      (status) => {
        setVoiceStatus(status);
        setIsListening(status === 'listening');
      },
      (transcript, isFinal) => {
        setCurrentTranscript(transcript);
        if (isFinal) {
          setTimeout(() => setCurrentTranscript(''), 2500);
        }
      },
      (reply, userText, launchUrl) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [
          ...prev,
          { id: `user-${Date.now()}`, sender: 'USER', text: userText, time },
          {
            id: `jarvis-${Date.now() + 1}`,
            sender: 'JARVIS',
            text: reply,
            time,
            linkUrl: launchUrl?.url,
            linkTitle: launchUrl?.title
          }
        ]);
      },
      (launchEvent) => {
        setActiveUrlLaunch(launchEvent);
        setTimeout(() => setActiveUrlLaunch(null), 8000);
      }
    );
  }, []);

  useEffect(() => {
    if (isTerminalOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTerminalOpen]);

  const handleToggleMic = () => {
    const listening = jarvisVoice.toggleListening();
    setIsListening(listening);
  };

  const handleToggleLanguage = () => {
    const newLang = lang === 'uz' ? 'en' : 'uz';
    setLang(newLang);
    jarvisVoice.setLanguage(newLang);
    jarvisVoice.speak(newLang === 'uz' ? "O'zbek tili tanlandi, janob." : "English language selected, sir.");
  };

  const handleQuickPrompt = (prompt: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'USER', text: prompt, time }]);

    if (prompt.toLowerCase().includes('youtube') || prompt.toLowerCase().includes('yutub')) {
      window.open('https://www.youtube.com', '_blank', 'noopener,noreferrer');
    } else if (prompt.toLowerCase().includes('google')) {
      window.open('https://www.google.com', '_blank', 'noopener,noreferrer');
    }

    jarvisVoice.processVoiceCommand(prompt);
  };

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const prompt = inputText.trim();
    setInputText('');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'USER', text: prompt, time }]);
    jarvisVoice.processVoiceCommand(prompt);
  };

  const quickPromptsUz = [
    'Salom Jarvis',
    'Mening ismim Shohruh',
    'Ismim nima?',
    'Rejalarim',
    'Qayd yoz: Uchrashuv',
    'Yuzni tani',
    'YouTube ni och',
    'Bugungi hisobot',
    'Batareya qancha?',
    'Python nima?',
    'Jangovar rejim',
    'Musiqa qo\'y',
    'Soat necha?'
  ];

  const quickPromptsEn = [
    'Hello Jarvis',
    'My name is Tony',
    'What is my name?',
    'Show Tasks',
    'Add Note: Meeting',
    'Scan Face',
    'Open YouTube',
    'Daily Briefing',
    'Check Battery',
    'Combat Mode',
    'Play Ambient',
    'What time is it'
  ];

  const currentPrompts = lang === 'uz' ? quickPromptsUz : quickPromptsEn;

  return (
    <div
      className={`absolute bottom-6 left-6 z-40 pointer-events-auto transition-all duration-300 ${
        isHudVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
    >
      {/* 0. HOLOGRAPHIC URL LAUNCH BANNER */}
      {activeUrlLaunch && (
        <div className="mb-2 cyber-panel p-3 rounded bg-[#071525]/95 border-2 border-[#00D9FF] shadow-[0_0_30px_rgba(0,217,255,0.7)] animate-bounce flex items-center justify-between max-w-sm">
          <div className="flex items-center space-x-2 mr-3">
            <Radio className="w-4 h-4 text-[#00D9FF] animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-[#73EEFF]/80 uppercase">LINK TAYYOR</span>
              <span className="text-xs font-mono font-bold text-white truncate max-w-[170px]">
                {activeUrlLaunch.title}
              </span>
            </div>
          </div>
          <a
            href={activeUrlLaunch.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setActiveUrlLaunch(null)}
            className="px-3 py-1.5 rounded bg-[#00D9FF] text-[#03070D] font-mono font-bold text-xs flex items-center space-x-1.5 shadow-[0_0_15px_#00D9FF] hover:bg-white transition-colors"
          >
            <span>OCHISH</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* 1. Collapsed / Quick Voice Floating Widget */}
      {!isTerminalOpen && (
        <div className="flex flex-col space-y-2">
          {/* Live Transcript / Bubble Notification */}
          {(currentTranscript || voiceStatus === 'speaking' || voiceStatus === 'processing') && (
            <div className="cyber-panel px-3 py-2 rounded max-w-xs sm:max-w-sm bg-[#071525]/95 border border-[#00D9FF] shadow-[0_0_20px_rgba(0,217,255,0.4)] animate-fade-in">
              <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold text-[#00D9FF] mb-0.5">
                <Sparkles className="w-3 h-3 text-[#73EEFF]" />
                <span>
                  {voiceStatus === 'processing'
                    ? (lang === 'uz' ? 'AI TAHLIL QILMOQDA...' : 'AI PROCESSING...')
                    : voiceStatus === 'speaking'
                    ? (lang === 'uz' ? 'JARVIS GAPIRMOQDA' : 'JARVIS SPEAKING')
                    : (lang === 'uz' ? 'OVOZ QABULI' : 'VOICE INPUT')}
                </span>
              </div>
              <p className="text-xs font-mono text-[#EAFBFF] italic">
                {currentTranscript || (lang === 'uz' ? 'Javob shakllantirilmoqda...' : 'Synthesizing response...')}
              </p>
            </div>
          )}

          {/* Quick Voice Bar */}
          <div className="cyber-panel p-2 rounded flex items-center space-x-2 bg-[#071525]/90 border border-[#00D9FF]/40 shadow-[0_4px_25px_rgba(0,0,0,0.7)]">
            {/* Holographic Mic Button */}
            <button
              onClick={handleToggleMic}
              className={`p-2.5 rounded-full transition-all flex items-center justify-center relative ${
                isListening
                  ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse'
                  : voiceStatus === 'speaking'
                  ? 'bg-[#00D9FF] text-[#03070D] shadow-[0_0_20px_rgba(0,217,255,0.8)]'
                  : 'bg-[#00D9FF]/20 text-[#00D9FF] hover:bg-[#00D9FF]/30'
              }`}
              title={isListening ? 'Mikrofonni to\'xtatish' : 'JARVIS bilan gaplashish'}
            >
              {isListening ? (
                <Mic className="w-4 h-4 text-white" />
              ) : voiceStatus === 'speaking' ? (
                <Volume2 className="w-4 h-4 text-[#03070D] animate-bounce" />
              ) : (
                <Mic className="w-4 h-4 text-[#00D9FF]" />
              )}
            </button>

            {/* Language Switcher Badge (UZ / EN) */}
            <button
              onClick={handleToggleLanguage}
              className="px-2 py-1 rounded cyber-panel text-[10px] font-mono font-bold text-[#00D9FF] hover:bg-[#00D9FF]/20 border border-[#00D9FF]/40 flex items-center space-x-1"
              title="Tilni almashtirish (UZ / EN)"
            >
              <Globe className="w-3 h-3 text-[#73EEFF]" />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* Jarvis Name & Status */}
            <div className="flex flex-col pr-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-mono font-bold tracking-wider text-[#00D9FF]">
                  JARVIS AI
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isListening
                      ? 'bg-red-400 animate-ping'
                      : voiceStatus === 'speaking'
                      ? 'bg-[#73EEFF] animate-pulse'
                      : 'bg-emerald-400'
                  }`}
                />
              </div>
              <span className="text-[9px] font-mono text-[#73EEFF]/70 truncate max-w-[110px]">
                {isListening
                  ? (lang === 'uz' ? 'Tinglamoqda...' : 'Listening...')
                  : voiceStatus === 'processing'
                  ? (lang === 'uz' ? 'Fikrlamoqda...' : 'Thinking...')
                  : (lang === 'uz' ? '"Salom Jarvis"' : '"Hello Jarvis"')}
              </span>
            </div>

            <div className="w-[1px] h-6 bg-[#00D9FF]/20" />

            {/* Open Full AI Terminal Button */}
            <button
              onClick={() => setIsTerminalOpen(true)}
              className="p-2 cyber-panel hover:bg-[#00D9FF]/20 text-[#00D9FF] rounded transition-all text-xs font-mono flex items-center space-x-1.5"
              title="AI Terminalini ochish"
            >
              <Terminal className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span className="hidden sm:inline">TERMINAL</span>
            </button>
          </div>

          {/* Quick Voice Suggestion Pills */}
          <div className="hidden sm:flex flex-wrap gap-1 max-w-sm">
            {currentPrompts.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleQuickPrompt(prompt)}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00D9FF]/10 text-[#73EEFF] hover:bg-[#00D9FF]/25 border border-[#00D9FF]/20 transition-colors"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Expanded AI Terminal & Conversation Console */}
      {isTerminalOpen && (
        <div className="cyber-panel w-[320px] sm:w-[440px] h-[360px] rounded flex flex-col justify-between p-3.5 bg-[#071525]/95 shadow-[0_0_35px_rgba(0,0,0,0.9)] border border-[#00D9FF]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#00D9FF]/30 pb-2">
            <div className="flex items-center space-x-2">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00D9FF] animate-ping opacity-75" />
                <span className="relative w-2 h-2 rounded-full bg-[#00D9FF]" />
              </div>
              <span className="text-xs font-mono font-bold text-[#EAFBFF] tracking-widest">
                J.A.R.V.I.S. // AI KERNEL {lang.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleLanguage}
                className="px-2 py-0.5 rounded bg-[#00D9FF]/20 text-[#00D9FF] text-[10px] font-mono font-bold hover:bg-[#00D9FF]/30 border border-[#00D9FF]/40"
              >
                {lang.toUpperCase()}
              </button>
              <button
                onClick={handleToggleMic}
                className={`p-1.5 rounded transition-all ${
                  isListening
                    ? 'bg-red-500/30 border border-red-500 text-red-300 animate-pulse'
                    : 'bg-[#00D9FF]/20 text-[#00D9FF] hover:bg-[#00D9FF]/30'
                }`}
                title={isListening ? 'Stop Mic' : 'Start Mic'}
              >
                {isListening ? <Mic className="w-3.5 h-3.5 text-red-400" /> : <MicOff className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsTerminalOpen(false)}
                className="text-xs font-mono text-[#73EEFF]/70 hover:text-white px-2 py-0.5 rounded border border-transparent hover:border-[#00D9FF]/30"
              >
                [X]
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1.5 border-b border-[#00D9FF]/10 no-scrollbar">
            {currentPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleQuickPrompt(prompt)}
                className="whitespace-nowrap text-[9px] font-mono px-2 py-0.5 rounded bg-[#00D9FF]/10 text-[#73EEFF] hover:bg-[#00D9FF]/25 border border-[#00D9FF]/20 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 my-2 overflow-y-auto space-y-2.5 text-xs font-mono pr-1 custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col space-y-0.5 ${
                  msg.sender === 'USER' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="text-[9px] text-[#73EEFF]/50 flex items-center space-x-1">
                  <span>[{msg.sender}]</span>
                  <span>{msg.time}</span>
                </div>
                <div
                  className={`p-2 rounded max-w-[90%] text-[11px] leading-relaxed ${
                    msg.sender === 'USER'
                      ? 'bg-[#00D9FF]/20 text-[#EAFBFF] border border-[#00D9FF]/40'
                      : 'bg-[#03070D]/90 text-[#73EEFF] border border-[#00D9FF]/30 shadow-[0_0_10px_rgba(0,217,255,0.1)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.linkUrl && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#00D9FF]/20 flex">
                      <a
                        href={msg.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#00D9FF]/20 hover:bg-[#00D9FF]/40 text-[#00D9FF] text-[10px] font-bold border border-[#00D9FF]/40 transition-colors"
                      >
                        <span>{lang === 'uz' ? 'Havolani ochish:' : 'Open link:'} {msg.linkTitle || 'Link'}</span>
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {voiceStatus === 'processing' && (
              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-[#00D9FF] animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{lang === 'uz' ? 'JARVIS savolni tahlil qilmoqda...' : 'JARVIS is analyzing your question...'}</span>
              </div>
            )}
            {voiceStatus === 'speaking' && (
              <div className="flex items-center space-x-1.5 text-[10px] font-mono text-[#00D9FF] animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                <span>{lang === 'uz' ? 'JARVIS javob bermoqda...' : 'JARVIS is speaking...'}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmitText} className="flex items-center space-x-2 pt-2 border-t border-[#00D9FF]/20">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={lang === 'uz' ? 'JARVIS dan istalgan narsani so\'rang...' : 'Ask JARVIS anything (science, code, etc.)...'}
              className="flex-1 bg-[#03070D]/80 border border-[#00D9FF]/30 rounded px-2.5 py-1.5 text-xs font-mono text-[#EAFBFF] placeholder-[#73EEFF]/40 outline-none focus:border-[#00D9FF]"
            />
            <button
              type="submit"
              className="p-2 rounded bg-[#00D9FF]/20 hover:bg-[#00D9FF]/40 text-[#00D9FF] transition-colors border border-[#00D9FF]/40"
              title="Yuborish"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
