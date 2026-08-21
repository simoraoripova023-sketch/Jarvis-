// JARVIS Holographic Voice Notes & Task Planner Service

export type NoteCategory = 'TASK' | 'IDEA' | 'REMINDER' | 'URGENT';

export interface JarvisNoteItem {
  id: string;
  text: string;
  category: NoteCategory;
  completed: boolean;
  timestamp: string;
  timeStr: string;
}

const STORAGE_KEY = 'jarvis_holographic_notes_v1';

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
        // Initial welcome sample notes
        this.notes = [
          {
            id: 'note-init-1',
            text: "Mark VII neyron yadrosini to'liq kalibrlash va optimallash",
            category: 'TASK',
            completed: true,
            timestamp: new Date().toISOString(),
            timeStr: 'Bugun 10:00'
          },
          {
            id: 'note-init-2',
            text: "Soat 16:00 da loyiha bo'yicha muhim uchrashuv",
            category: 'REMINDER',
            completed: false,
            timestamp: new Date().toISOString(),
            timeStr: 'Bugun 16:00'
          },
          {
            id: 'note-init-3',
            text: "Kvant shina quvvatini 100 TB/s ga oshirish rejalashtirilsin",
            category: 'IDEA',
            completed: false,
            timestamp: new Date().toISOString(),
            timeStr: 'Bugun 14:20'
          }
        ];
        this.saveNotes();
      }
    } catch {
      this.notes = [];
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
