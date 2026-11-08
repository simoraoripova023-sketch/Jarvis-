// Advanced JARVIS AI Intelligence Engine powered by Google Gemini / Neural Stream
// with User Memory, Face Biometrics & Dynamic Honorifics

import { voiceBiometrics } from './VoiceBiometricsService';
import { userProfileService } from './UserProfileService';

const getGeminiKey = (): string => {
  const meta = import.meta as any;
  if (meta && meta.env && meta.env.VITE_GEMINI_API_KEY) {
    return meta.env.VITE_GEMINI_API_KEY.trim();
  }
  return '';
};

export class JarvisAIService {
  public static isUzbekText(text: string): boolean {
    const lower = text.toLowerCase();
    const uzbekKeywords = [
      'salom', 'qanday', 'nima', 'kim', 'nega', 'qayerda', 'och', 'qo‘y', 'qoy',
      'tushuntir', 'ayt', 'haqida', 'gapir', 'rahmat', 'xayrli', 'tong', 'kech',
      'ob-havo', 'quvvat', 'soat', 'ishla', 'kerak', 'qil', 'dasturlash', 'til',
      'qalesan', 'ahvol', 'maslahat', 'fakt', 'musiqa', 'toshkent', 'suniy', 'kvant', 'qora',
      'yordam', 'yoz', 'kimsan', 'nimasab', 'ishlar'
    ];
    return uzbekKeywords.some((k) => lower.includes(k));
  }

  public static async askJarvis(query: string, lang: 'uz' | 'en' = 'uz'): Promise<string> {
    const lower = query.toLowerCase().trim();
    const baseHonorific = voiceBiometrics.getHonorific(lang);
    const userName = userProfileService.getName();

    // Personalized address: e.g. "Shohruh janob" or "janob"
    const honorific = userName ? `${userName} ${baseHonorific}` : baseHonorific;
    const isUz = lang === 'uz' || this.isUzbekText(query);

    const systemInstructionUz = `Siz Tony Starkning afsonaviy J.A.R.V.I.S. (Just A Rather Very Intelligent System) sun'iy intellektisiz. Foydalanuvchiga hurmat bilan '${honorific}' deb murojaat qilasiz.

MUHIM QOIDALAR:
1. Foydalanuvchining savolini aslo qaytarmang yoki takrorlamang (masalan "Siz ... deb so'radingiz", "Savolingiz: ..." deb aytmang).
2. Savolni o'zingiz diqqat bilan eshitib, chuqur tahlil qiling va darhol to'g'ridan-to'g'ri uning aniq javobini bering (2-3 ta jumlada).
3. Javoblaringiz sof o'zbek adabiy tilida (lotin yozuvida), o'ta aqlli, professional va lo'nda bo'lsin.
4. Hech qachon bot ekanligingizni oshkor qilmang, qalin shrift yoki yulduzcha (*) ishlatmang.`;

    const systemInstructionEn = `You are J.A.R.V.I.S., the legendary futuristic holographic AI assistant created for Tony Stark. Address the user respectfully as '${honorific}'.
STRICT RULES:
1. NEVER repeat or echo the user's question back to them.
2. Listen, analyze the question internally, and provide the direct, intelligent, clear answer in 2-3 concise sentences.
3. Do not use asterisks or markdown styling.`;

    // 1. PRIMARY: Google Gemini 2.0 / 1.5 Flash Neural Engine (if API key provided)
    const apiKey = getGeminiKey();
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const payload = {
          systemInstruction: {
            parts: [{ text: isUz ? systemInstructionUz : systemInstructionEn }]
          },
          contents: [
            {
              parts: [{ text: query }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 350
          }
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
      } catch (e) {
        console.warn('Gemini 2.0 Flash fallback to secondary engine', e);
      }
    }

    // 2. SECONDARY: High-Speed Pollinations Neural Stream
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const sysPrompt = isUz ? systemInstructionUz : systemInstructionEn;
      const url = `https://text.pollinations.ai/${encodeURIComponent(query)}?system=${encodeURIComponent(sysPrompt)}&model=openai`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const reply = await response.text();
        if (reply && reply.trim().length > 3) {
          return reply.replace(/[*_#`]/g, '').trim();
        }
      }
    } catch {}

    // 3. TERTIARY: Offline Instant Knowledge Base
    const localKnowledge: { [key: string]: { uz: string; en: string } } = {
      python: {
        uz: `Python — bu o'qish oson, kuchli va universal dasturlash tili, ${honorific}. U sun'iy intellekt, mashinaviy o'rganish, ma'lumotlar tahlili va avtomatlashtirishda yetakchi hisoblanadi.`,
        en: `Python is a high-level, versatile programming language, ${honorific}. It dominates machine learning, data science, and web automation.`
      },
      javascript: {
        uz: `JavaScript — bu butun dunyo veb dasturlashining asosiy tili bo'lib, interaktiv ilovalar yaratish imkonini beradi, ${honorific}.`,
        en: `JavaScript is the premier programming language of the web, ${honorific}.`
      },
      ai: {
        uz: `Sun'iy intellekt — bu insoniy aql, mantiq va qaror qabul qilish qobiliyatini kompyuter algoritmlari orqali amalga oshiruvchi ilg'or texnologiyadir, ${honorific}.`,
        en: `Artificial Intelligence represents computational systems capable of cognitive tasks, ${honorific}.`
      },
      kvant: {
        uz: `Kvant fizikasi — atom va subatom zarralar qonuniyatlarini o'rganuvchi fan, ${honorific}. Kvant kompyuterlari kubitlar orqali hisoblashlarni millionlab marta tezlashtiradi.`,
        en: `Quantum physics explores matter and energy at the fundamental subatomic scale, ${honorific}.`
      },
      qora: {
        uz: `Qora tuynuk — tortishish kuchi nihoyatda kuchli bo'lgan fazoviy soha bo'lib, undan hatto yorug'lik ham qochib chiqa olmaydi, ${honorific}.`,
        en: `A black hole is a region of spacetime where gravitational forces are so intense that nothing can escape, ${honorific}.`
      },
      motivatsiya: {
        uz: `${honorific.charAt(0).toUpperCase() + honorific.slice(1)}, buyuk natijalar har kuni qilinadigan kichik intizomli harakatlardan boshlanadi. O'z maqsadingiz sari dadil qadam tashlang!`,
        en: `${honorific.charAt(0).toUpperCase() + honorific.slice(1)}, excellence is an ongoing journey built through relentless discipline. Focus on your vision today.`
      },
      maslahat: {
        uz: `Eng yaxshi maslahat — o'z vaqtingiz va aqliy energiyangizni eng yuqori natija beradigan muhim ishlarga yo'naltirishdir, ${honorific}.`,
        en: `The greatest leverage comes from focusing energy on high-impact objectives and continuous learning, ${honorific}.`
      }
    };

    for (const [key, value] of Object.entries(localKnowledge)) {
      if (lower.includes(key)) {
        return isUz ? value.uz : value.en;
      }
    }

    // 4. Default Fallback
    if (isUz) {
      return `Barcha parametrlar me'yorda va tahlil yakunlandi, ${honorific}. Buyruqlaringizni bajarishga tayyorman.`;
    } else {
      return `Diagnostics nominal and parameters verified, ${honorific}. Ready for your command.`;
    }
  }
}
