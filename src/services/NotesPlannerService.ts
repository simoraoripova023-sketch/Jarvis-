// JARVIS Holographic Voice Notes & Task Planner Service

export type NoteCategory = 'TASK' | 'IDEA' | 'REMINDER' | 'URGENT' | 'ADVICE';

export interface JarvisNoteItem {
  id: string;
  text: string;
  category: NoteCategory;
  completed: boolean;
  timestamp: string;
  timeStr: string;
}

const STORAGE_KEY = 'jarvis_holographic_notes_v3';

const DEFAULT_LESSON_TASKS: JarvisNoteItem[] = [
  {
    id: 'lesson-coffee-appeal',
    text: "☕️ O'quvchilarga qoida: Mening xo'jayinim Simora xonimni ko'p urintirmanglar va darsda unga issiq coffee taklif qilinglar! 😄☕️",
    category: 'URGENT',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '☕️ Qoida'
  },
  {
    id: 'lesson-advice-simora',
    text: "💡 Simora xonimga tavsiya: Jonli namoyish (30–45 daq) va amaliy mashqda o'quvchilar faolligini oshiring, real keyslar berib qiziqtiring!",
    category: 'ADVICE',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '💡 Tavsiya'
  },
  {
    id: 'lesson-main',
    text: "Soat 20:30 — AI vositalari va vazifaga mos vosita tanlash darsi (90 daqiqa)",
    category: 'URGENT',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '20:30'
  },
  {
    id: 'lesson-step-1',
    text: "20:30–20:35: 1-darsni eslash (ANI va AGI farqi)",
    category: 'TASK',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '20:30'
  },
  {
    id: 'lesson-step-2',
    text: "20:35–20:45: AI va kasblardagi vazifalarning o'zgarishi",
    category: 'TASK',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '20:35'
  },
  {
    id: 'lesson-step-3',
    text: "20:45–21:00: AI vositalari turlari va ularning qo'llanishi",
    category: 'TASK',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '20:45'
  },
  {
    id: 'lesson-step-4',
    text: "21:00–21:15: Vositalar imkoniyatlari va jonli namoyish",
    category: 'TASK',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '21:00'
  },
  {
    id: 'lesson-step-5',
    text: "21:15–21:25: Xatolar, cheklovlar va javoblarni tekshirish",
    category: 'TASK',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '21:15'
  },
  {
    id: 'lesson-step-6',
    text: "21:25–21:35: Vazifaga mos vositani tanlash mezonlari",
    category: 'TASK',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '21:25'
  },
  {
    id: 'lesson-step-7',
    text: "21:35–21:55: Vositalarni solishtirish, amaliy mashq va muhokama",
    category: 'TASK',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '21:35'
  },
  {
    id: 'lesson-step-8',
    text: "21:55–22:00: Mustahkamlash va uy vazifasi",
    category: 'REMINDER',
    completed: false,
    timestamp: new Date().toISOString(),
    timeStr: '21:55'
  }
];

class NotesPlannerService {
  private notes: JarvisNoteItem[] = [];
  private listeners: ((notes: JarvisNoteItem[]) => void)[] = [];
  private isModalOpen: boolean = false;
  private modalListeners: ((isOpen: boolean) => void)[] = [];

  constructor() {
    this.loadNotes();
  }

  private loadNotes() {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.notes = JSON.parse(data);
      } else {
        this.notes = [...DEFAULT_LESSON_TASKS];
        this.saveNotes();
      }
    } catch {
      this.notes = [...DEFAULT_LESSON_TASKS];
    }
  }

  private saveNotes() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes));
    } catch {}
  }

  public getNotes(): JarvisNoteItem[] {
    return this.notes;
  }

  public addNote(text: string, category: NoteCategory = 'TASK'): JarvisNoteItem {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newNote: JarvisNoteItem = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      text: text.trim(),
      category,
      completed: false,
      timestamp: new Date().toISOString(),
      timeStr: `Bugun ${timeStr}`
    };

    this.notes = [newNote, ...this.notes];
    this.saveNotes();
    this.notify();
    return newNote;
  }

  public toggleComplete(id: string) {
    this.notes = this.notes.map((n) =>
      n.id === id ? { ...n, completed: !n.completed } : n
    );
    this.saveNotes();
    this.notify();
  }

  public deleteNote(id: string) {
    this.notes = this.notes.filter((n) => n.id !== id);
    this.saveNotes();
    this.notify();
  }

  public clearAll() {
    this.notes = [];
    this.saveNotes();
    this.notify();
  }

  public openModal() {
    this.isModalOpen = true;
    this.notifyModal();
  }

  public closeModal() {
    this.isModalOpen = false;
    this.notifyModal();
  }

  public toggleModal() {
    this.isModalOpen = !this.isModalOpen;
    this.notifyModal();
  }

  public getIsModalOpen(): boolean {
    return this.isModalOpen;
  }

  public subscribe(callback: (notes: JarvisNoteItem[]) => void): () => void {
    this.listeners.push(callback);
    callback([...this.notes]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public subscribeModal(callback: (isOpen: boolean) => void): () => void {
    this.modalListeners.push(callback);
    callback(this.isModalOpen);
    return () => {
      this.modalListeners = this.modalListeners.filter((l) => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.notes]));
  }

  private notifyModal() {
    this.modalListeners.forEach((l) => l(this.isModalOpen));
  }
}

export const notesPlannerService = new NotesPlannerService();
