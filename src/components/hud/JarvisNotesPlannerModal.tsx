import React, { useState, useEffect } from 'react';
import { notesPlannerService, JarvisNoteItem, NoteCategory } from '../../services/NotesPlannerService';
import { jarvisVoice } from '../../services/JarvisVoiceService';
import { voiceBiometrics } from '../../services/VoiceBiometricsService';
import {
  CheckSquare,
  Square,
  Trash2,
  Plus,
  X,
  Sparkles,
  ClipboardList,
  Lightbulb,
  Bell,
  CheckCircle2,
  Mic
} from 'lucide-react';

interface JarvisNotesPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JarvisNotesPlannerModal: React.FC<JarvisNotesPlannerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [notes, setNotes] = useState<JarvisNoteItem[]>(notesPlannerService.getNotes());
  const [activeTab, setActiveTab] = useState<'ALL' | NoteCategory>('ALL');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<NoteCategory>('TASK');

  useEffect(() => {
    const unsub = notesPlannerService.subscribe(setNotes);
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    notesPlannerService.addNote(newText.trim(), newCategory);
    setNewText('');
  };

  const filteredNotes = notes.filter((n) =>
    activeTab === 'ALL' ? true : n.category === activeTab
  );

  const completedCount = notes.filter((n) => n.completed).length;
  const pendingCount = notes.length - completedCount;
  const honorific = 'Simora xonim';

  const getCategoryBadge = (cat: NoteCategory) => {
    switch (cat) {
      case 'TASK':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40 font-mono">REJA</span>;
      case 'REMINDER':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">ESLATMA</span>;
      case 'IDEA':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">G'OYA</span>;
      case 'URGENT':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40 font-mono">MUHIM</span>;
      case 'ADVICE':
        return <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">TAVSIYA</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl cyber-panel rounded-lg p-5 bg-[#071525]/95 border-2 border-[#00D9FF] shadow-[0_0_40px_rgba(0,217,255,0.4)] flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#00D9FF]/30 pb-3 mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-[#00D9FF]/20 text-[#00D9FF] border border-[#00D9FF]/40">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold tracking-wider text-[#EAFBFF] flex items-center space-x-2">
                <span>J.A.R.V.I.S. // OVOZLI QAYDLAR VA REJALAR</span>
                <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-ping" />
              </h2>
              <p className="text-[10px] font-mono text-[#73EEFF]/70 flex items-center space-x-2">
                <span>{pendingCount} ta faol vazifa • {completedCount} ta bajarildi</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <span>☁️</span>
                  <span>SUPABASE CLOUD: ULANGAN</span>
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#73EEFF]/70 hover:text-white hover:bg-[#00D9FF]/20 transition-colors border border-transparent hover:border-[#00D9FF]/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Teacher Advice & Humorous Student Coffee Banner */}
        <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-[#00D9FF]/15 via-purple-500/15 to-amber-500/15 border border-[#00D9FF]/50 shadow-[0_0_20px_rgba(0,217,255,0.25)] flex items-start justify-between space-x-3">
          <div className="flex items-start space-x-2.5 flex-1">
            <div className="text-2xl pt-0.5 select-none animate-bounce">☕️</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-amber-300 tracking-wide">
                  O'QUVCHILAR UCHUN MAXSUS QOIDA & TAVSIYA
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-mono">
                  SIMORA XONIM
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#EAFBFF] mt-1 leading-snug">
                "Hurmatli o'quvchilar! Dars davomida mening xo'jayinim <b>Simora xonimni</b> ko'p urintirmanglar va unga vaqti-vaqti bilan issiq coffee taklif qilib turinglar! 😄☕️"
              </p>
              <p className="text-[10px] font-mono text-[#73EEFF]/90 mt-1">
                💡 <i>Simora xonim, 30–45 daqiqadagi jonli namoyish va 65–85 daqiqadagi amaliy topshiriqlarda o'quvchilar faolligiga alohida e'tibor qarating!</i>
              </p>
              <p className="text-[10px] font-mono text-pink-300/95 mt-1 flex items-center space-x-1">
                <span>❤️</span>
                <span><i>JARVIS g'amxo'rligi: Simora xonim, siz mening yagona va eng qadrli xo'jayinimsiz! Iltimos, o'zingizni asrang va charchab qolmang!</i></span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => jarvisVoice.speak("Hurmatli o'quvchilar! Sizlardan bir iltimos: dars davomida mening xo'jayinim Simora xonimni ko'p urintirmanglar va unga vaqti-vaqti bilan issiq kofe taklif qilib turinglar! Simora xonim, darsingiz ajoyib o'tishini tilayman!")}
            className="px-2.5 py-1.5 rounded bg-[#00D9FF]/20 hover:bg-[#00D9FF] text-[#00D9FF] hover:text-[#03070D] border border-[#00D9FF]/50 text-[10px] font-mono font-bold transition-all flex items-center space-x-1 flex-shrink-0 shadow-[0_0_12px_rgba(0,217,255,0.3)] mt-0.5"
            title="JARVIS ovozida o'quvchilarga eslatish"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>OVOZDA AYTISH</span>
          </button>
        </div>

        {/* Categories Tab Selector */}
        <div className="flex items-center space-x-1.5 mb-3 border-b border-[#00D9FF]/10 pb-2">
          {(['ALL', 'TASK', 'REMINDER', 'IDEA', 'ADVICE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                activeTab === tab
                  ? 'bg-[#00D9FF] text-[#03070D] shadow-[0_0_12px_#00D9FF]'
                  : 'text-[#73EEFF]/80 hover:bg-[#00D9FF]/15 border border-[#00D9FF]/20'
              }`}
            >
              {tab === 'ALL'
                ? 'BARCHASI'
                : tab === 'TASK'
                ? 'REJALAR'
                : tab === 'REMINDER'
                ? 'ESLATMALAR'
                : tab === 'IDEA'
                ? "G'OYALAR"
                : 'TAVSIYALAR'}
            </button>
          ))}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[180px] max-h-[340px] mb-3">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 text-[#73EEFF]/40 font-mono text-xs">
              <Lightbulb className="w-8 h-8 opacity-40 text-[#00D9FF]" />
              <p>Hozircha hech qanday qayd yo'q, {honorific}.</p>
              <p className="text-[10px] text-[#73EEFF]/30">
                Ovozda "Jarvis, bugungi rejamga ... deb yoz" deng!
              </p>
            </div>
          ) : (
            filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded border transition-all flex items-start justify-between space-x-3 ${
                  note.completed
                    ? 'bg-[#03070D]/70 border-[#00D9FF]/20 opacity-60'
                    : 'bg-[#071525]/90 border-[#00D9FF]/40 hover:border-[#00D9FF] shadow-[0_2px_12px_rgba(0,0,0,0.5)]'
                }`}
              >
                <div className="flex items-start space-x-3 flex-1">
                  <button
                    onClick={() => notesPlannerService.toggleComplete(note.id)}
                    className="mt-0.5 text-[#00D9FF] hover:scale-110 transition-transform"
                    title={note.completed ? 'Bajarilmagan deb belgilash' : 'Bajarildi deb belgilash'}
                  >
                    {note.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-[#00D9FF]/70" />
                    )}
                  </button>
                  <div className="flex flex-col space-y-1">
                    <span
                      className={`text-xs font-mono leading-relaxed ${
                        note.completed
                          ? 'line-through text-[#73EEFF]/40'
                          : 'text-[#EAFBFF] font-medium'
                      }`}
                    >
                      {note.text}
                    </span>
                    <div className="flex items-center space-x-2">
                      {getCategoryBadge(note.category)}
                      <span className="text-[9px] font-mono text-[#73EEFF]/50">{note.timeStr}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => notesPlannerService.deleteNote(note.id)}
                  className="text-red-400/60 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
                  title="O'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddNote} className="pt-3 border-t border-[#00D9FF]/20 flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Yangi reja yoki qayd yozing..."
              className="flex-1 bg-[#03070D]/90 border border-[#00D9FF]/40 rounded px-3 py-2 text-xs font-mono text-[#EAFBFF] placeholder-[#73EEFF]/40 outline-none focus:border-[#00D9FF]"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as NoteCategory)}
              className="bg-[#03070D]/90 border border-[#00D9FF]/40 rounded px-2.5 py-2 text-xs font-mono text-[#00D9FF] outline-none"
            >
              <option value="TASK">REJA</option>
              <option value="REMINDER">ESLATMA</option>
              <option value="IDEA">G'OYA</option>
              <option value="URGENT">MUHIM</option>
              <option value="ADVICE">TAVSIYA</option>
            </select>
            <button
              type="submit"
              className="px-3.5 py-2 rounded bg-[#00D9FF] hover:bg-white text-[#03070D] font-mono font-bold text-xs flex items-center space-x-1.5 shadow-[0_0_15px_#00D9FF] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>QO'SHISH</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#73EEFF]/60 pt-1">
            <span>💡 Maslahat: Mikrofon orqali "Qayd yoz: [rejangiz]" deb ayting</span>
            {notes.length > 0 && (
              <button
                type="button"
                onClick={() => notesPlannerService.clearAll()}
                className="text-red-400 hover:text-red-300 underline"
              >
                Barchasini tozalash
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
