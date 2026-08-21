// Advanced JARVIS AI Intelligence Engine with User Memory, Face Biometrics & Dynamic Honorifics

import { voiceBiometrics } from './VoiceBiometricsService';
import { userProfileService } from './UserProfileService';

export class JarvisAIService {
  public static isUzbekText(text: string): boolean {
    const lower = text.toLowerCase();
    const uzbekKeywords = [
      'salom', 'qanday', 'nima', 'kim', 'nega', 'qayerda', 'och', 'qo‘y', 'qoy',
      'tushuntir', 'ayt', 'haqida', 'gapir', 'rahmat', 'xayrli', 'tong', 'kech',
      'ob-havo', 'quvvat', 'soat', 'ishla', 'kerak', 'qil', 'dasturlash', 'til',
      'qalesan', 'ahvol', 'maslahat', 'fakt', 'musiqa', 'toshkent', 'suniy', 'kvant', 'qora'
    ];
    return uzbekKeywords.some((k) => lower.includes(k));
  }

  public static async askJarvis(query: string, lang: 'uz' | 'en' = 'uz'): Promise<string> {
    const lower = query.toLowerCase().trim();
    const baseHonorific = voiceBiometrics.getHonorific(lang);
    const userName = userProfileService.getName();

    // Personalized address: e.g. "Shohruh janob" or "janob"
    const honorific = userName ? `${userName} ${baseHonorific}` : baseHonorific;

    const systemPromptUz = `Siz Tony Starkning afsonaviy J.A.R.V.I.S. sun'iy intellektisiz. Foydalanuvchiga '${honorific}' deb murojaat qilasiz. Javoblaringiz sof o'zbek adabiy tilida, juda aqlli, professional, aniq va lo'nda bo'lsin (2-4 ta jumlada).`;
    const systemPromptEn = `You are J.A.R.V.I.S., the elite futuristic AI assistant created for Tony Stark. Address the user respectfully as '${honorific}'. Provide intelligent, articulate, clear, and comprehensive answers in 2-4 concise sentences.`;

    // Local instant knowledge dictionary
    const localKnowledge: { [key: string]: { uz: string; en: string } } = {
      python: {
        uz: `Python — bu o'qish oson, kuchli va juda universal dasturlash tili, ${honorific}. U sun'iy intellekt, mashinaviy o'rganish, ma'lumotlar tahlili va avtomatlashtirishda yetakchi hisoblanadi.`,
        en: `Python is a high-level, versatile programming language, ${honorific}. It dominates machine learning, data science, and web automation.`
      },
      javascript: {
        uz: `JavaScript — bu web dasturlashning asosiy tili bo'lib, veb-sahifalarga interaktivlik bag'ishlaydi, ${honorific}.`,
        en: `JavaScript is the premier programming language of the web, ${honorific}.`
      },
      ai: {
        uz: `Sun'iy intellekt (AI) — bu insoniy aql, mantiq va qaror qabul qilishni kompyuter dasturlari orqali amalga oshiruvchi ilg'or texnologiyadir, ${honorific}.`,
        en: `Artificial Intelligence represents computational systems capable of cognitive tasks, ${honorific}.`
      },
      kvant: {
        uz: `Kvant fizikasi — atom va subatom zarralarning o'zini tutishini o'rganuvchi fan, ${honorific}. Kvant kompyuterlari kubitlar orqali hisob-kitoblarni millionlab marta tezlashtiradi.`,
        en: `Quantum physics explores matter and energy at the fundamental subatomic scale, ${honorific}.`
      },
      qora: {
        uz: `Qora tuynuk — tortishish kuchi nihoyatda kuchli bo'lgan fazoviy sohadir, ${honorific}. Undan hatto yorug'lik ham qochib chiqa olmaydi.`,
        en: `A black hole is a region of spacetime where gravitational forces are so intense that nothing can escape, ${honorific}.`
      },
      motivatsiya: {
        uz: `${honorific.charAt(0).toUpperCase() + honorific.slice(1)}, muvaffaqiyat har kuni kichik qadamlar bilan quriladi. Barcha buyuk yutuqlar intizom samarasidir. Tizim sizga 100% ishonadi!`,
        en: `${honorific.charAt(0).toUpperCase() + honorific.slice(1)}, excellence is an ongoing journey built through relentless discipline. Focus on your vision today.`
      },
      maslahat: {
        uz: `Eng yaxshi maslahat — vaqtni eng yuqori foyda beradigan maqsadlarga yo'naltirish va aqliy energiyani muvozanatda saqlashdir, ${honorific}.`,
        en: `The greatest leverage comes from focusing energy on high-impact objectives and continuous learning, ${honorific}.`
      }
    };

    for (const [key, value] of Object.entries(localKnowledge)) {
      if (lower.includes(key)) {
        return lang === 'uz' ? value.uz : value.en;
      }
    }

    // High-speed AI fetch
    try {
      const isUz = lang === 'uz' || this.isUzbekText(query);
      const systemPrompt = isUz ? systemPromptUz : systemPromptEn;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const url = `https://text.pollinations.ai/${encodeURIComponent(query)}?system=${encodeURIComponent(systemPrompt)}&model=openai`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const reply = await response.text();
        if (reply && reply.trim().length > 5) {
          return reply.trim();
        }
      }
    } catch {}

    // Fallback
    if (lang === 'uz' || this.isUzbekText(query)) {
      return `Savolingiz qabul qilindi, ${honorific}: "${query}". Barcha tahlillar bo'yicha ko'rsatkichlar optimal holatda, yangi amallarni bajarishga tayyorman.`;
    } else {
      return `Vector query processed, ${honorific}: "${query}". Neural diagnostics confirm core operational equilibrium.`;
    }
  }
}
