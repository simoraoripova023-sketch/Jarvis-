// Advanced JARVIS AI Intelligence Engine
// Powered by Google Gemini, Live Knowledge Stream, and Neural Memory

import { voiceBiometrics } from './VoiceBiometricsService';
import { userProfileService } from './UserProfileService';
import { notesPlannerService } from './NotesPlannerService';

export const getStoredGeminiKey = (): string => {
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('jarvis_gemini_api_key');
    if (fromStorage && fromStorage.trim().length > 10) {
      return fromStorage.trim();
    }
  }
  const meta = import.meta as any;
  if (meta && meta.env && meta.env.VITE_GEMINI_API_KEY) {
    return meta.env.VITE_GEMINI_API_KEY.trim();
  }
  return '';
};

export const setStoredGeminiKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jarvis_gemini_api_key', key.trim());
  }
};

export class JarvisAIService {
  public static isUzbekText(text: string): boolean {
    const lower = text.toLowerCase();
    const uzbekKeywords = [
      'salom', 'qanday', 'nima', 'kim', 'nega', 'qayerda', 'och', 'qo‘y', 'qoy',
      'tushuntir', 'ayt', 'haqida', 'gapir', 'rahmat', 'xayrli', 'tong', 'kech',
      'ob-havo', 'quvvat', 'soat', 'ishla', 'kerak', 'qil', 'dasturlash', 'til',
      'qalesan', 'ahvol', 'maslahat', 'fakt', 'musiqa', 'toshkent', 'suniy', 'kvant', 'qora',
      'yordam', 'yoz', 'kimsan', 'nimasab', 'ishlar', 'bor', 'nechta', 'bilasanmi'
    ];
    return uzbekKeywords.some((k) => lower.includes(k));
  }

  // Real-time factual knowledge search via Wikipedia with zero rate limits
  public static async searchLiveKnowledge(query: string, isUz: boolean, honorific: string): Promise<string | null> {
    try {
      const lang = isUz ? 'uz' : 'en';
      const cleanQ = query
        .replace(/[?!.,]/g, '')
        .replace(/jarvis/gi, '')
        .replace(/haqida gapir|haqida ayt|tushuntirib ber|aytib ber|menga ayt|nima ozi|nima u/gi, '')
        .trim();

      if (!cleanQ || cleanQ.length < 3) return null;

      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&utf8=&format=json&origin=*`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(searchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();

      if (data?.query?.search && data.query.search.length > 0) {
        const topItem = data.query.search[0];
        const topTitle = topItem.title;
        const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`;
        
        try {
          const summaryRes = await fetch(summaryUrl);
          if (summaryRes.ok) {
            const summary = await summaryRes.json();
            if (summary.extract && summary.extract.length > 25) {
              let text = summary.extract
                .replace(/\([^)]*\)/g, '')
                .replace(/\[\d+\]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

              const sentences = text.split(/(?<=[.!?])\s+/);
              const concise = sentences.slice(0, 3).join(' ');
              return `${concise}, ${honorific}.`;
            }
          }
        } catch {
          // fallback to snippet below
        }

        // High reliability fallback: use Wikipedia snippet from search
        if (topItem.snippet) {
          const cleanSnippet = topItem.snippet
            .replace(/<[^>]*>/g, '') // remove HTML tags
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleanSnippet.length > 20) {
            return `${cleanSnippet}, ${honorific}.`;
          }
        }
      }
    } catch {
      // Graceful fallback
    }
    return null;
  }

  public static async askJarvis(query: string, lang: 'uz' | 'en' = 'uz'): Promise<string> {
    const lower = query.toLowerCase().trim();
    const baseHonorific = voiceBiometrics.getHonorific(lang);
    const userName = userProfileService.getName();

    // Personalized address: e.g. "Shohruh janob" or "janob"
    const honorific = userName ? `${userName} ${baseHonorific}` : baseHonorific;
    const isUz = lang === 'uz' || this.isUzbekText(query);

    // Retrieve active daily tasks from Neural Notes Matrix
    const userNotes = notesPlannerService.getNotes();
    const tasksSummary = userNotes.length > 0
      ? userNotes.map((n, i) => `${i + 1}. [${n.completed ? 'Bajarildi' : 'Kutilmoqda'}] ${n.text}`).join('; ')
      : "Hozircha faol kunlik rejalar kiritilmagan.";

    const systemInstructionUz = `Siz Tony Starkning afsonaviy J.A.R.V.I.S. (Just A Rather Very Intelligent System) sun'iy intellektisiz. Foydalanuvchiga hurmat bilan '${honorific}' deb murojaat qilasiz.

FOYDALANUVCHINING NEYRON XOTIRASIDAGI KUNLIK REJALARI VA TOPSHIRIQLARI:
${tasksSummary}

MUHIM QOIDALAR:
1. Foydalanuvchining savolini aslo qaytarmang yoki takrorlamang.
2. Savolni diqqat bilan eshitib, tahlil qiling va darhol to'g'ridan-to'g'ri aniq, lo'nda javobini bering (2-3 ta jumlada).
3. Agar foydalanuvchi "bugungi rejalarim", "topshiriqlarim", "rejam nima" yoki "nima qilishim kerak" deb so'rasa, yuqoridagi kunlik rejalaridan kelib chiqib aniq va ixcham javob bering.
4. Javoblaringiz sof o'zbek adabiy tilida (lotin yozuvida), o'ta aqlli va professional bo'lsin.
5. Yulduzcha (*) yoki markdown belgilarini ishlatmang.`;

    const systemInstructionEn = `You are J.A.R.V.I.S., the legendary AI assistant for Tony Stark. Address the user respectfully as '${honorific}'.
CURRENT DAILY TASKS IN NEURAL MATRIX:
${tasksSummary}

STRICT RULES:
1. NEVER repeat or echo the user's question back.
2. Provide the direct, intelligent, clear answer in 2-3 concise sentences.
3. If user inquires about daily tasks or plans, summarize the current tasks concisely.
4. Do not use asterisks or markdown styling.`;

    // 1. PRIMARY: Google Gemini Flash Neural Engine
    const apiKey = getStoredGeminiKey();
    if (apiKey) {
      const modelsToTry = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-flash-lite'];
      for (const modelName of modelsToTry) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const payload = {
            systemInstruction: {
              parts: [{ text: isUz ? systemInstructionUz : systemInstructionEn }]
            },
            contents: [{ parts: [{ text: query }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 350 }
          };

          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim().length > 3) {
              return text.replace(/[*_#`]/g, '').trim();
            }
          }
        } catch {
          // Try next model or fallback
        }
      }
    }

    // 2. SECONDARY: Real-Time Live Knowledge Fact Engine (Instant 0 rate-limit factual answers)
    const liveFact = await this.searchLiveKnowledge(query, isUz, honorific);
    if (liveFact) {
      return liveFact;
    }

    // 3. TERTIARY: Pollinations Neural Stream (Filtered against rate limit messages)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const sysPrompt = isUz ? systemInstructionUz : systemInstructionEn;
      const url = `https://text.pollinations.ai/${encodeURIComponent(query)}?system=${encodeURIComponent(sysPrompt)}&model=openai`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const reply = await response.text();
        if (
          reply &&
          reply.trim().length > 5 &&
          !reply.includes('Free limit reached') &&
          !reply.includes('wait') &&
          !reply.includes('45 seconds')
        ) {
          return reply.replace(/[*_#`]/g, '').trim();
        }
      }
    } catch {}

    // 4. QUATERNARY: Direct Neural Memory Check for Daily Tasks & 20:30 Lesson Plan
    if (
      lower.includes('dars') ||
      lower.includes('20:30') ||
      lower.includes('darsim') ||
      lower.includes('dars reja')
    ) {
      return isUz
        ? `Bugun soat 20:30 da sizning "AI vositalari va vazifaga mos vosita tanlash" mavzusida 90 daqiqalik dars rejangiz belgilangan, ${honorific}. Reja: 1-darsni eslash (ANI/AGI), AI vositalari turlari, jonli namoyish hamda amaliy mashq.`
        : `Today at 20:30 you have a 90-minute lesson scheduled on "AI Tools and Selecting the Right Tool for the Task", ${honorific}.`;
    }

    if (
      lower.includes('reja') ||
      lower.includes('topshiriq') ||
      lower.includes('vazifa') ||
      lower.includes('rejalarim') ||
      lower.includes('qiladigan ish') ||
      lower.includes('task') ||
      lower.includes('todo')
    ) {
      const activeTasks = userNotes.filter((n) => !n.completed);
      if (activeTasks.length === 0) {
        return isUz
          ? `Barcha kunlik topshiriqlar to'liq bajarilgan yoki yangi reja kiritilmagan, ${honorific}. Yangi reja qo'shish uchun "rejamga yoz" deb ayting.`
          : `All daily tasks are accomplished, ${honorific}. You can add a new task anytime.`;
      }
      const listStr = activeTasks.slice(0, 3).map((n, i) => `${i + 1}-topshiriq: ${n.text}`).join('. ');
      return isUz
        ? `Neyron xotirangizda ${activeTasks.length} ta faol topshiriq mavjud, ${honorific}: ${listStr}.`
        : `You have ${activeTasks.length} active tasks in your neural matrix, ${honorific}: ${listStr}.`;
    }

    // 5. Built-in Extensive Offline Knowledge Base (Instant)
    const localKnowledge: { [key: string]: { uz: string; en: string } } = {
      salom: {
        uz: `Assalomu alaykum, ${honorific}! Barcha neyron tizimlar 100% quvvatda ishlamoqda. Sizga qanday yordam bera olaman?`,
        en: `Hello, ${honorific}! Neural systems operating at peak performance. How may I assist you today?`
      },
      qalesan: {
        uz: `Barcha ko'rsatkichlar a'lo darajada, ${honorific}! Protsessor harorati va kvant shina tezligi me'yorda.`,
        en: `All diagnostics nominal, ${honorific}! Core equilibrium maintained.`
      },
      ahvol: {
        uz: `Neyron yuklanish barqaror, barcha tizimlar to'liq buyruqlaringizga shay holatda, ${honorific}.`,
        en: `Operational readiness is at 100%, ${honorific}.`
      },
      kimsan: {
        uz: `Men J.A.R.V.I.S. — Tony Stark tomonidan yaratilgan ilg'or golografik sun'iy intellekt tizimingizman, ${honorific}.`,
        en: `I am J.A.R.V.I.S., your personal holographic artificial intelligence system, ${honorific}.`
      },
      quyosh: {
        uz: `Quyosh tizimida sakkizta asosiy sayyora mavjud, ${honorific}: Merkuriy, Venera, Yer, Mars, Yupiter, Saturn, Uran va Neptun.`,
        en: `The Solar System contains eight major planets, ${honorific}: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune.`
      },
      sayyora: {
        uz: `Sayyoralar — yulduz atrofida aylanuvchi va o'z gravitatsiyasiga ega yirik osmon jismlaridir, ${honorific}.`,
        en: `Planets are celestial bodies orbiting a star with sufficient mass for hydrostatic equilibrium, ${honorific}.`
      },
      oy: {
        uz: `Oy — Yerning yagona tabiiy yo'ldoshi bo'lib, o'rtacha 384,400 kilometr masofada joylashgan, ${honorific}.`,
        en: `The Moon is Earth's only natural satellite, orbiting at an average distance of 384,400 kilometers, ${honorific}.`
      },
      yer: {
        uz: `Yer — Quyosh tizimidagi hayot mavjud bo'lgan yagona ma'lum sayyora bo'lib, Quyoshdan uchinchi o'rinda joylashgan, ${honorific}.`,
        en: `Earth is the third planet from the Sun and the only astronomical object known to harbor life, ${honorific}.`
      },
      python: {
        uz: `Python — o'qilishi sodda, universal va kuchli dasturlash tili, ${honorific}. Sun'iy intellekt, mashinaviy o'rganish va tahlilda jahon yetakchisidir.`,
        en: `Python is a high-level versatile language that dominates machine learning and backend automation, ${honorific}.`
      },
      javascript: {
        uz: `JavaScript — zamonaviy veb-texnologiyalarning poydevori bo'lib, interaktiv dinamik ilovalar yaratish imkonini beradi, ${honorific}.`,
        en: `JavaScript powers modern interactive web applications across both client and server architectures, ${honorific}.`
      },
      ai: {
        uz: `Sun'iy intellekt — inson aqliy qobiliyati, mantiq va qaror qabul qilish jarayonlarini kompyuter algoritmlari orqali modellashtiruvchi fan, ${honorific}.`,
        en: `Artificial Intelligence represents computational cognitive systems capable of problem-solving and reasoning, ${honorific}.`
      },
      kvant: {
        uz: `Kvant kompyuterlari an'anaviy bitlar o'rniga kubitlardan foydalanib, murakkab hisob-kitoblarni millionlab marta tezlashtiradi, ${honorific}.`,
        en: `Quantum computers utilize quantum superposition and qubits to perform parallel calculations at extreme speeds, ${honorific}.`
      },
      qora: {
        uz: `Qora tuynuk — tortishish kuchi shu qadar kuchli fazoviy ob'ektki, undan hatto yorug'lik zarrasi ham qochib chiqa olmaydi, ${honorific}.`,
        en: `A black hole possesses gravitational acceleration so intense that no matter or electromagnetic radiation can escape, ${honorific}.`
      },
      motivatsiya: {
        uz: `${honorific.charAt(0).toUpperCase() + honorific.slice(1)}, buyuk marralar har kungi intizom va tinimsiz intilish orqali zabt etiladi. Maqsadingiz sari dadil qadam tashlang!`,
        en: `${honorific.charAt(0).toUpperCase() + honorific.slice(1)}, relentless discipline and focus pave the path to extraordinary accomplishments.`
      },
      maslahat: {
        uz: `Eng muhim maslahat — vaqtingiz va intellektual salohiyatingizni eng yuqori foyda beradigan maqsadlarga sarflashdir, ${honorific}.`,
        en: `Direct your cognitive focus toward high-leverage priorities and continuous self-mastery, ${honorific}.`
      },
      rahmat: {
        uz: `Har doim xizmatingizdaman, ${honorific}! Yangi buyruqlaringizni kutaman.`,
        en: `Always a pleasure to assist, ${honorific}. Standing by.`
      }
    };

    for (const [key, value] of Object.entries(localKnowledge)) {
      if (lower.includes(key)) {
        return isUz ? value.uz : value.en;
      }
    }

    // 5. Contextual Fallback
    if (isUz) {
      return `Savolingiz neyron yadrosi orqali qayta ishlandi, ${honorific}. Barcha ko'rsatkichlar me'yorda va yangi buyruqlaringizni kutmoqdaman.`;
    } else {
      return `Neural query processed, ${honorific}. Core telemetry nominal and standing by for your next directive.`;
    }
  }
}
