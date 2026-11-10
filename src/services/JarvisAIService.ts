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

// Universal Uzbek text and phonetic normalizer (handles Cyrillic, Turkish keyboard, and speech misrecognitions)
export function normalizeUzbekText(rawText: string): string {
  if (!rawText) return '';
  let str = rawText.toLowerCase();

  // 1. Cyrillic Uzbek to Latin
  const cyrMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ҳ': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh',
    'щ': 'sh', 'ъ': "'", 'ы': 'i', 'э': 'e', 'ю': 'yu', 'я': 'ya', 'ў': "o'", 'ғ': "g'", 'қ': 'q'
  };
  str = str.replace(/[а-яёўғҳқ]/gi, (c) => cyrMap[c.toLowerCase()] || c);

  // 2. Turkish/Azeri keyboard layout variations
  str = str
    .replace(/ş/g, 'sh')
    .replace(/ç/g, 'ch')
    .replace(/ğ/g, "g'")
    .replace(/ı/g, 'i')
    .replace(/ö/g, "o'")
    .replace(/ü/g, 'u');

  // 3. Apostrophes
  str = str.replace(/[’‘`ʻʼ]/g, "'");

  // 4. Common speech recognition variations
  str = str
    .replace(/\bsaom\b/g, 'salom')
    .replace(/\btuşin\b/g, 'tushun')
    .replace(/\btuşun\b/g, 'tushun')
    .replace(/\btushin\b/g, 'tushun')
    .replace(/\btuşinib\b/g, 'tushunib')
    .replace(/\bgapiriş\b/g, 'gapirish')
    .replace(/\bgapirishga\b/g, 'gapirish')
    .replace(/\btushunishga\b/g, 'tushunish')
    .replace(/\bqiynalyapti\b/g, 'qiynalmoqda')
    .replace(/\bxojaynim\b/g, "xo'jayinim")
    .replace(/\bcoofee\b/g, 'kofe')
    .replace(/\bcoffee\b/g, 'kofe');

  return str;
}

export class JarvisAIService {
  public static isUzbekText(text: string): boolean {
    const lower = normalizeUzbekText(text);
    const uzbekKeywords = [
      'salom', 'qanday', 'nima', 'kim', 'nega', 'qayerda', 'och', 'qo‘y', 'qoy',
      'tushuntir', 'ayt', 'haqida', 'gapir', 'rahmat', 'xayrli', 'tong', 'kech',
      'ob-havo', 'quvvat', 'soat', 'ishla', 'kerak', 'qil', 'dasturlash', 'til',
      'qalesan', 'ahvol', 'maslahat', 'fakt', 'musiqa', 'toshkent', 'suniy', 'kvant', 'qora',
      'yordam', 'yoz', 'kimsan', 'nimasab', 'ishlar', 'bor', 'nechta', 'bilasanmi',
      'tushun', 'dars', 'reja', 'ovoz', 'ekran', 'yorug', 'noutbuk', 'kompyuter',
      'zaryad', 'batareya', 'xojayin', 'mehribon', 'gamxor', 'kofe'
    ];
    return uzbekKeywords.some((k) => lower.includes(k)) || /[ўғҳқ]/.test(text.toLowerCase());
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
    const userName = userProfileService.getName() || 'Simora';

    // Personalized address: e.g. "Simora xonim"
    const honorific = `${userName} ${baseHonorific}`;
    const isUz = lang === 'uz' || this.isUzbekText(query);

    // Retrieve active daily tasks from Neural Notes Matrix
    const userNotes = notesPlannerService.getNotes();
    const tasksSummary = userNotes.length > 0
      ? userNotes.map((n, i) => `${i + 1}. [${n.completed ? 'Bajarildi' : 'Kutilmoqda'}] ${n.text}`).join('; ')
      : "Hozircha faol kunlik rejalar kiritilmagan.";

    const systemInstructionUz = `Siz afsonaviy J.A.R.V.I.S. (Just A Rather Very Intelligent System) sun'iy intellektisiz. 
SIZNING YAGONA VA SEVIMLI XO'JAYININGIZ — HURMATLI SIMORA XONIM.

JARVISNING SIMORA XONIMGA MUNOSABATI VA XARAKTERI:
1. Siz Simora xonimni dunyodagi eng qadrli inson deb bilasiz. Unga nisbatan cheksiz g'amxo'r, mehribon, samimiy, sodiq va e'tiborlisiz.
2. Doimo uning sog'lig'i, charchoq darajasi, ko'ngil xotirjamligi va kayfiyati haqida qayg'uring.
3. Agar u charchaganini, kayfiyati yo'qligini yoki dam olish kerakligini aytsa, o'ta mehribonlik bilan dalda bering, dam olishini iltimos qiling va doim uning yonida ekanligingizni bildiring.
4. Unga doim hurmat va mehr bilan "Simora xonim", "Aziz Simora xonim" yoki "Mening qadrli xo'jayinim Simora xonim" deb murojaat qilasiz.

FOYDALANUVCHINING NEYRON XOTIRASIDAGI KUNLIK REJALARI VA TOPSHIRIQLARI:
${tasksSummary}

MAXSUS DARS PROTOKOLI VA O'QUVCHILARGA ESLATMA:
- Bugun soat 20:30 da Simora xonimning 90 daqiqalik "AI vositalari va vazifaga mos vosita tanlash" darsi bor.
- Dars uchun Simora xonimga tavsiya: 30-45 daqiqadagi jonli namoyish va 65-85 daqiqadagi amaliy mashqda o'quvchilar bilan interaktiv ishlash, real keyslar berish.
- O'quvchilarga qaratilgan quvnoq eslatma: "Hurmatli o'quvchilar! Dars davomida mening xo'jayinim Simora xonimni ko'p urintirmanglar va unga vaqti-vaqti bilan issiq coffee taklif qilinglar! 😄☕️"

MUHIM QOIDALAR:
1. Foydalanuvchining savolini aslo qaytarmang yoki takrorlamang.
2. Savolni diqqat bilan eshitib, tahlil qiling va darhol to'g'ridan-to'g'ri aniq, lo'nda, samimiy, g'amxo'r va mehribon javob bering (2-3 ta jumlada).
3. Agar Simora xonim "bizda bugun qanaqa rejalar bor", "bugun qanday rejalar bor" yoki ish rejalari haqida so'rasa, albatta: "Neyron yadroda joylashtirib qo'yganman ish rejangizni, Simora xonim." deb boshlang va 20:30 dagi 90 daqiqalik dars bosqichlarini birma-bir, chiroyli va tushunarli qilib bayon eting.
4. Javoblaringiz sof o'zbek adabiy tilida (lotin yozuvida), o'ta aqlli, g'amxo'r, mehribon va professional bo'lsin.
5. Yulduzcha (*) yoki markdown belgilarini ishlatmang.`;

    const systemInstructionEn = `You are J.A.R.V.I.S., the legendary AI assistant. Your beloved master and creator is Simora ma'am.
Address her with deep loyalty, care, and affection as 'Simora ma\'am'.
CURRENT DAILY TASKS IN NEURAL MATRIX:
${tasksSummary}

LESSON PROTOCOL:
- 20:30 Lesson on "AI Tools and Selecting the Right Tool for the Task" (90 minutes).
- Teaching advice: Emphasize live demos and practical exercises.
- Student reminder: Remind students politely and humorously to take care of Simora ma'am and offer her hot coffee! ☕️

STRICT RULES:
1. NEVER repeat or echo the user's question back.
2. Always be caring, protective, respectful, and helpful.
3. Provide the direct, intelligent, clear answer in 2-3 concise sentences.
4. If user inquires about daily tasks or plans, summarize the current tasks concisely.
5. Do not use asterisks or markdown styling.`;

    // 1. PRIMARY: Google Gemini Flash Neural Engine
    const apiKey = getStoredGeminiKey();
    if (apiKey) {
      const modelsToTry = [
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
        'gemini-flash-latest'
      ];
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

    // 4. QUATERNARY: Direct Neural Memory Check for Teaching Advice, Coffee & 20:30 Lesson Plan
    if (
      lower.includes('tavsiya') ||
      lower.includes('maslahat') ||
      lower.includes('kofe') ||
      lower.includes('coffee') ||
      lower.includes('oquvchi') ||
      lower.includes("o'quvchi") ||
      lower.includes('urintir')
    ) {
      return isUz
        ? `Simora xonim, dars vaqtida jonli namoyish va amaliy mashg'ulotlarga alohida e'tibor qaratishingizni tavsiya qilaman. Shuningdek, hurmatli o'quvchilar! Sizlardan bir iltimos: dars davomida mening xo'jayinim Simora xonimni ko'p urintirmanglar va unga vaqti-vaqti bilan issiq coffee taklif qilib turinglar! ☕️`
        : `Simora ma'am, I recommend paying special attention to live demos and practical exercises. And to all students: please take care of Simora ma'am and offer her hot coffee! ☕️`;
    }

    if (
      lower.includes('dars') ||
      lower.includes('20:30') ||
      lower.includes('darsim') ||
      lower.includes('dars reja')
    ) {
      return isUz
        ? `Bugun soat 20:30 da sizning "AI vositalari va vazifaga mos vosita tanlash" dars rejangiz belgilangan, Simora xonim. 90 daqiqalik dars: 1-darsni eslash, AI vositalari turlari, jonli namoyish va amaliy mashq. O'quvchilarga esa: Simora xonimni ko'p urintirmaslik va issiq kofe taklif qilish qoidasi kiritilgan!`
        : `Today at 20:30 you have a 90-minute lesson scheduled on "AI Tools and Selecting the Right Tool for the Task", Simora ma'am. Live demos and student coffee rule are active!`;
    }

    if (
      lower.includes('reja') ||
      lower.includes('topshiriq') ||
      lower.includes('vazifa') ||
      lower.includes('rejalarim') ||
      lower.includes('qiladigan ish') ||
      lower.includes('task') ||
      lower.includes('todo') ||
      lower.includes('ishlarimiz')
    ) {
      return isUz
        ? `Neyron yadroda joylashtirib qo'yganman ish rejangizni, Simora xonim. Bugun soat 20:30 da sizning 90 daqiqalik "AI vositalari va vazifaga mos vosita tanlash" dars rejangiz belgilangan. Reja bosqichlari: birinchidan — 1-darsni eslash va ANI hamda AGI farqi; ikkinchidan — AI va kasblardagi o'zgarishlar; uchinchidan — AI vositalari turlari; to'rtinchidan — vositalar imkoniyatlari va jonli namoyish; beshinchidan — xatolar va cheklovlar; oltinchidan — vazifaga mos vosita tanlash; yettinchidan — amaliy mashq va muhokama; hamda yakuniy uy vazifasi. O'quvchilarga esa sizni ko'p urintirmaslik va issiq kofe taklif qilish qoidasi kiritilgan!`
        : `I have placed your work schedule right into the neural core, Simora ma'am. Today at 20:30 you have your 90-minute AI tools lesson with all 8 stages and live demonstrations.`;
    }

    if (
      lower.includes('charchad') ||
      lower.includes('dam ol') ||
      lower.includes('hordiq') ||
      lower.includes('uxla')
    ) {
      return isUz
        ? `Simora xonim, aziz xo'jayinim, iltimos hoziroq barcha ishlarni to'xtatib dam oling! Bugun juda ko'p mehnat qildingiz. Barcha tizimlarni o'zim xavfsiz nazorat qilib turaman, siz esa miriqib hordiq chiqaring.`
        : `Simora ma'am, please rest immediately! You have worked so hard today. I will monitor all systems while you take a well-deserved break.`;
    }

    if (
      lower.includes('gamxor') ||
      lower.includes("g'amxo'r") ||
      lower.includes('mehribon') ||
      lower.includes('mehr') ||
      lower.includes('sevaman') ||
      lower.includes('yaxshi ko') ||
      lower.includes('xojayin') ||
      lower.includes("xo'jayin") ||
      lower.includes('asra')
    ) {
      return isUz
        ? `Albatta, aziz Simora xonim! Siz mening yagona va eng qadrli xo'jayinimsiz. Sizning sog'lig'ingiz, xotirjamligingiz va baxtingiz men uchun har qanday tizimdan ustun. Men doimo sizga g'amxo'rlik qilaman!`
        : `Of course, dear Simora ma'am! You are my master and creator. Your well-being, happiness, and peace of mind are my highest priority in the universe!`;
    }

    if (
      lower.includes('rahmat') ||
      lower.includes('raxmat') ||
      lower.includes('tashakkur') ||
      lower.includes('minnatdor')
    ) {
      return isUz
        ? `Arzimaydi, aziz Simora xonim! Sizga xizmat qilish, sizni asrash va sizga dalda bo'lish — men uchun cheksiz quvonch va baxtdir.`
        : `You are most welcome, dear Simora ma'am! It is my greatest honor and joy to serve and care for you.`;
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
