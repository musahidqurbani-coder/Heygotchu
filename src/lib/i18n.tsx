import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'hi' | 'id'

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
]

// Register note: these are deliberately written at everyday-conversation
// level, not textbook level — Hindi says "Trip" and "Safar", never "Yatra";
// Indonesian uses the casual register young people actually type. Slang
// keys (glowUp, noOutfits, drip) stay playful in every language.
const STRINGS = {
  heroTitle: {
    en: 'Dress for the trip, not just the weather.',
    hi: 'ट्रिप के लिए तैयार हो जाओ — सिर्फ़ मौसम के लिए नहीं।',
    id: 'Tampil kece buat trip-mu, bukan cuma soal cuaca.',
  },
  heroSub: {
    en: "Tell Heygotchu where you're going. It reads your closet, checks the forecast, and builds a day-by-day outfit plan that matches the vibe.",
    hi: 'Heygotchu को बताओ कहाँ जा रहे हो। ये तुम्हारा क्लोज़ेट देखता है, मौसम चेक करता है, और हर दिन का आउटफिट प्लान बना देता है — बिल्कुल तुम्हारी वाइब के हिसाब से।',
    id: 'Kasih tau Heygotchu kamu mau ke mana. Dia baca isi lemarimu, cek cuaca, dan bikin rencana outfit harian yang pas sama vibe-mu.',
  },
  today: { en: '☀️ Today', hi: '☀️ आज', id: '☀️ Hari Ini' },
  occasion: { en: '🎉 Occasion', hi: '🎉 फ़ंक्शन', id: '🎉 Acara' },
  trip: { en: '✈️ Trip', hi: '✈️ ट्रिप', id: '✈️ Trip' },
  todayVibeQ: { en: "What's the vibe today?", hi: 'आज की वाइब क्या है?', id: 'Vibe hari ini apa nih?' },
  styleCasual: { en: 'Casual', hi: 'कैज़ुअल', id: 'Santai' },
  styleOffice: { en: 'Office', hi: 'ऑफ़िस', id: 'Kantor' },
  styleParty: { en: 'Party', hi: 'पार्टी', id: 'Pesta' },
  styleAthletic: { en: 'Athletic', hi: 'स्पोर्ट्स', id: 'Olahraga' },
  remix: { en: '🔀 Remix', hi: '🔀 रीमिक्स', id: '🔀 Remix' },
  glowUp: { en: '✨ Glow Up', hi: '✨ Glow Up', id: '✨ Glow Up' },
  noOutfits: {
    en: "Logic is not logicing 💀 — your closet needs a few more pieces for this one. Add some fits first.",
    hi: 'Logic is not logicing 💀 — इस इवेंट के लिए क्लोज़ेट में थोड़े और कपड़े चाहिए। पहले कुछ फ़िट्स ऐड करो।',
    id: 'Logic is not logicing 💀 — lemarimu butuh beberapa item lagi buat acara ini. Tambahin dulu ya.',
  },
  dailyGrind: { en: 'Daily Grind', hi: 'Daily Grind', id: 'Daily Grind' },
  myCloset: { en: 'My Closet', hi: 'मेरा क्लोज़ेट', id: 'Lemariku' },
  preferences: { en: 'Preferences', hi: 'सेटिंग्स', id: 'Preferensi' },
  savedTrips: { en: 'Saved Trips', hi: 'सेव्ड ट्रिप्स', id: 'Trip Tersimpan' },
  logout: { en: 'Log out', hi: 'लॉग आउट', id: 'Keluar' },
  saveTheDate: { en: 'Save the date 📌', hi: 'डेट पक्की 📌', id: 'Tandai tanggalnya 📌' },
  addADate: { en: '+ Add a date', hi: '+ डेट ऐड करो', id: '+ Tambah tanggal' },
  saveTheDateEmpty: {
    en: 'Pin a wedding, a festival, a trip departure — Heygotchu reminds you 5 days, 2 days and 1 day before, and on the day itself.',
    hi: 'शादी, फ़ेस्टिवल, या ट्रिप की डेट पिन करो — Heygotchu 5 दिन, 2 दिन और 1 दिन पहले, और उसी दिन याद दिला देगा।',
    id: 'Simpan tanggal nikahan, festival, atau keberangkatan trip — Heygotchu ingetin 5 hari, 2 hari, 1 hari sebelumnya, dan di hari-H.',
  },
  drip: { en: '🔥 Drip — pack it', hi: '🔥 Drip — पैक करो', id: '🔥 Drip — masukin' },
  nah: { en: '✕ Nah', hi: '✕ रहने दो', id: '✕ Skip' },
  packFromOwn: { en: 'Pack from what you already own', hi: 'जो पहले से है, वही पैक करो', id: 'Pakai yang sudah kamu punya' },
} satisfies Record<string, Record<Lang, string>>

export type StringKey = keyof typeof STRINGS

const STORAGE_KEY = 'heygotchu.lang.v1'

function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'hi' || stored === 'id') return stored
  } catch { /* private mode */ }
  return 'en'
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: StringKey) => string }>({
  lang: 'en',
  setLang: () => undefined,
  t: (k) => STRINGS[k].en,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch { /* private mode */ }
  }, [lang])

  const t = (k: StringKey) => STRINGS[k][lang]
  return <LangContext.Provider value={{ lang, setLang: setLangState, t }}>{children}</LangContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
  return useContext(LangContext)
}
