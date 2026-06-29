// On-site internationalisation for non-English markets. ONE multi-tenant
// codebase serves every city; the active city's native language comes from
// city-config (slugToNativeLang). For English-language cities this is inert:
// the provider defaults to "en" and renders nothing extra.
//
// Design (matches the agreed hybrid):
//  - UI chrome (nav, CTAs) is translated from the static DICT below, with an
//    automatic English fallback for any missing key, so a partial dictionary
//    never shows a blank label.
//  - Article BODY is translated on demand by the translate-article edge
//    function and cached in Postgres (see the article route).
//
// SSR-safety: the initial language is deterministic on both server and first
// client render (the city's native language for multilingual cities, else
// "en"), so hydration always matches. A stored preference / browser language
// is applied AFTER mount in an effect, which may trigger one re-render.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { citySlug } from "./city";
import { slugToNativeLang, cityIsMultilingual } from "./city-config";

export interface LangMeta {
  label: string; // endonym, shown in the switcher
  flag: string; // emoji flag for the switcher
  dir?: "rtl";
}

// Endonyms + flags. English uses a globe-ish UK flag; per-city the English
// option simply reads "English".
export const LANG_META: Record<string, LangMeta> = {
  en: { label: "English", flag: "🇬🇧" },
  fr: { label: "Français", flag: "🇫🇷" },
  es: { label: "Español", flag: "🇪🇸" },
  de: { label: "Deutsch", flag: "🇩🇪" },
  it: { label: "Italiano", flag: "🇮🇹" },
  nl: { label: "Nederlands", flag: "🇳🇱" },
  pt: { label: "Português", flag: "🇧🇷" },
  ja: { label: "日本語", flag: "🇯🇵" },
  zh: { label: "中文", flag: "🇨🇳" },
  th: { label: "ไทย", flag: "🇹🇭" },
  id: { label: "Bahasa Indonesia", flag: "🇮🇩" },
  tr: { label: "Türkçe", flag: "🇹🇷" },
  ar: { label: "العربية", flag: "🇦🇪", dir: "rtl" },
  vi: { label: "Tiếng Việt", flag: "🇻🇳" },
  hi: { label: "हिन्दी", flag: "🇮🇳" },
};

export type UiKey =
  | "home" | "today" | "news" | "finance" | "property" | "wellness" | "sport"
  | "events" | "subscribe" | "advertise" | "search" | "world" | "allSections"
  | "menu" | "subscribeFree" | "language" | "listen" | "translated"
  | "readOriginal" | "showTranslation" | "translating" | "availableIn"
  | "switchTo" | "dismiss";

// English is the source of truth and the fallback for every other language.
const EN: Record<UiKey, string> = {
  home: "Home", today: "Today", news: "News", finance: "Finance",
  property: "Property", wellness: "Wellness", sport: "Sport", events: "Events",
  subscribe: "Subscribe", advertise: "Advertise", search: "Search",
  world: "The World", allSections: "All Sections", menu: "Menu",
  subscribeFree: "Subscribe Free", language: "Language",
  listen: "Listen to this article", translated: "Automatically translated",
  readOriginal: "Read the English original", showTranslation: "Show translation",
  translating: "Translating…", availableIn: "This site is available in your language.",
  switchTo: "Switch", dismiss: "Not now",
};

// Partial dictionaries; any missing key falls back to EN at lookup time.
const DICT: Record<string, Partial<Record<UiKey, string>>> = {
  en: EN,
  fr: {
    home: "Accueil", today: "Aujourd'hui", news: "Actualités", finance: "Finance",
    property: "Immobilier", wellness: "Bien-être", sport: "Sport", events: "Agenda",
    subscribe: "S'abonner", advertise: "Annoncer", search: "Rechercher",
    world: "Le Monde", allSections: "Toutes les rubriques", menu: "Menu",
    subscribeFree: "Abonnement gratuit", language: "Langue",
    listen: "Écouter cet article", translated: "Traduit automatiquement",
    readOriginal: "Lire l'original en anglais", showTranslation: "Afficher la traduction",
    translating: "Traduction en cours…", availableIn: "Ce site est disponible en français.",
    switchTo: "Passer au français", dismiss: "Plus tard",
  },
  es: {
    home: "Inicio", today: "Hoy", news: "Noticias", finance: "Finanzas",
    property: "Inmobiliaria", wellness: "Bienestar", sport: "Deportes", events: "Agenda",
    subscribe: "Suscribirse", advertise: "Anunciar", search: "Buscar",
    world: "El Mundo", allSections: "Todas las secciones", menu: "Menú",
    subscribeFree: "Suscripción gratuita", language: "Idioma",
    listen: "Escuchar este artículo", translated: "Traducido automáticamente",
    readOriginal: "Leer el original en inglés", showTranslation: "Mostrar traducción",
    translating: "Traduciendo…", availableIn: "Este sitio está disponible en español.",
    switchTo: "Cambiar a español", dismiss: "Ahora no",
  },
  de: {
    home: "Start", today: "Heute", news: "Nachrichten", finance: "Finanzen",
    property: "Immobilien", wellness: "Wellness", sport: "Sport", events: "Termine",
    subscribe: "Abonnieren", advertise: "Werben", search: "Suchen",
    world: "Die Welt", allSections: "Alle Rubriken", menu: "Menü",
    subscribeFree: "Kostenlos abonnieren", language: "Sprache",
    listen: "Diesen Artikel anhören", translated: "Automatisch übersetzt",
    readOriginal: "Englisches Original lesen", showTranslation: "Übersetzung anzeigen",
    translating: "Wird übersetzt…", availableIn: "Diese Seite ist auf Deutsch verfügbar.",
    switchTo: "Zu Deutsch wechseln", dismiss: "Später",
  },
  it: {
    home: "Home", today: "Oggi", news: "Notizie", finance: "Finanza",
    property: "Immobiliare", wellness: "Benessere", sport: "Sport", events: "Eventi",
    subscribe: "Abbonati", advertise: "Pubblicità", search: "Cerca",
    world: "Il Mondo", allSections: "Tutte le sezioni", menu: "Menu",
    subscribeFree: "Abbonamento gratuito", language: "Lingua",
    listen: "Ascolta questo articolo", translated: "Tradotto automaticamente",
    readOriginal: "Leggi l'originale in inglese", showTranslation: "Mostra traduzione",
    translating: "Traduzione in corso…", availableIn: "Questo sito è disponibile in italiano.",
    switchTo: "Passa all'italiano", dismiss: "Non ora",
  },
  nl: {
    home: "Home", today: "Vandaag", news: "Nieuws", finance: "Financiën",
    property: "Vastgoed", wellness: "Welzijn", sport: "Sport", events: "Agenda",
    subscribe: "Abonneren", advertise: "Adverteren", search: "Zoeken",
    world: "De Wereld", allSections: "Alle rubrieken", menu: "Menu",
    subscribeFree: "Gratis abonneren", language: "Taal",
    listen: "Luister naar dit artikel", translated: "Automatisch vertaald",
    readOriginal: "Lees het Engelse origineel", showTranslation: "Vertaling tonen",
    translating: "Bezig met vertalen…", availableIn: "Deze site is beschikbaar in het Nederlands.",
    switchTo: "Naar Nederlands", dismiss: "Niet nu",
  },
  pt: {
    home: "Início", today: "Hoje", news: "Notícias", finance: "Finanças",
    property: "Imóveis", wellness: "Bem-estar", sport: "Esportes", events: "Agenda",
    subscribe: "Assinar", advertise: "Anunciar", search: "Buscar",
    world: "O Mundo", allSections: "Todas as seções", menu: "Menu",
    subscribeFree: "Assinatura gratuita", language: "Idioma",
    listen: "Ouvir este artigo", translated: "Traduzido automaticamente",
    readOriginal: "Ler o original em inglês", showTranslation: "Mostrar tradução",
    translating: "Traduzindo…", availableIn: "Este site está disponível em português.",
    switchTo: "Mudar para português", dismiss: "Agora não",
  },
  tr: {
    home: "Ana sayfa", today: "Bugün", news: "Haberler", finance: "Finans",
    property: "Emlak", wellness: "Sağlık", sport: "Spor", events: "Etkinlikler",
    subscribe: "Abone ol", advertise: "Reklam", search: "Ara",
    world: "Dünya", allSections: "Tüm bölümler", menu: "Menü",
    subscribeFree: "Ücretsiz abone ol", language: "Dil",
    listen: "Bu makaleyi dinle", translated: "Otomatik çevrildi",
    readOriginal: "İngilizce orijinalini oku", showTranslation: "Çeviriyi göster",
    translating: "Çevriliyor…", availableIn: "Bu site Türkçe olarak mevcuttur.",
    switchTo: "Türkçeye geç", dismiss: "Şimdi değil",
  },
  id: {
    home: "Beranda", today: "Hari ini", news: "Berita", finance: "Keuangan",
    property: "Properti", wellness: "Kesehatan", sport: "Olahraga", events: "Acara",
    subscribe: "Berlangganan", advertise: "Pasang iklan", search: "Cari",
    world: "Dunia", allSections: "Semua bagian", menu: "Menu",
    subscribeFree: "Berlangganan gratis", language: "Bahasa",
    listen: "Dengarkan artikel ini", translated: "Diterjemahkan otomatis",
    readOriginal: "Baca versi asli bahasa Inggris", showTranslation: "Tampilkan terjemahan",
    translating: "Menerjemahkan…", availableIn: "Situs ini tersedia dalam Bahasa Indonesia.",
    switchTo: "Ganti ke Bahasa Indonesia", dismiss: "Nanti saja",
  },
  vi: {
    home: "Trang chủ", today: "Hôm nay", news: "Tin tức", finance: "Tài chính",
    property: "Bất động sản", wellness: "Sức khỏe", sport: "Thể thao", events: "Sự kiện",
    subscribe: "Đăng ký", advertise: "Quảng cáo", search: "Tìm kiếm",
    world: "Thế giới", allSections: "Tất cả chuyên mục", menu: "Menu",
    subscribeFree: "Đăng ký miễn phí", language: "Ngôn ngữ",
    listen: "Nghe bài viết này", translated: "Dịch tự động",
    readOriginal: "Đọc bản gốc tiếng Anh", showTranslation: "Hiện bản dịch",
    translating: "Đang dịch…", availableIn: "Trang web này có sẵn bằng tiếng Việt.",
    switchTo: "Chuyển sang tiếng Việt", dismiss: "Để sau",
  },
  ja: {
    home: "ホーム", today: "今日", news: "ニュース", finance: "経済",
    property: "不動産", wellness: "ウェルネス", sport: "スポーツ", events: "イベント",
    subscribe: "購読", advertise: "広告", search: "検索",
    world: "世界", allSections: "すべてのセクション", menu: "メニュー",
    subscribeFree: "無料購読", language: "言語",
    listen: "この記事を聴く", translated: "自動翻訳",
    readOriginal: "英語の原文を読む", showTranslation: "翻訳を表示",
    translating: "翻訳中…", availableIn: "このサイトは日本語でご覧いただけます。",
    switchTo: "日本語に切り替える", dismiss: "後で",
  },
  zh: {
    home: "首页", today: "今日", news: "新闻", finance: "财经",
    property: "房产", wellness: "健康", sport: "体育", events: "活动",
    subscribe: "订阅", advertise: "广告", search: "搜索",
    world: "世界", allSections: "全部栏目", menu: "菜单",
    subscribeFree: "免费订阅", language: "语言",
    listen: "收听本文", translated: "自动翻译",
    readOriginal: "阅读英文原文", showTranslation: "显示翻译",
    translating: "翻译中…", availableIn: "本网站提供中文版本。",
    switchTo: "切换到中文", dismiss: "暂不",
  },
  th: {
    home: "หน้าแรก", news: "ข่าว", search: "ค้นหา", world: "โลก", menu: "เมนู",
    language: "ภาษา", listen: "ฟังบทความนี้", translated: "แปลโดยอัตโนมัติ",
    readOriginal: "อ่านต้นฉบับภาษาอังกฤษ", showTranslation: "แสดงคำแปล",
    translating: "กำลังแปล…", availableIn: "เว็บไซต์นี้มีให้บริการเป็นภาษาไทย",
    switchTo: "เปลี่ยนเป็นภาษาไทย", dismiss: "ไว้ทีหลัง", subscribeFree: "สมัครฟรี",
  },
  hi: {
    home: "होम", news: "समाचार", search: "खोजें", world: "दुनिया", menu: "मेन्यू",
    language: "भाषा", listen: "यह लेख सुनें", translated: "स्वचालित अनुवाद",
    readOriginal: "अंग्रेज़ी मूल पढ़ें", showTranslation: "अनुवाद दिखाएँ",
    translating: "अनुवाद हो रहा है…", availableIn: "यह साइट हिन्दी में उपलब्ध है।",
    switchTo: "हिन्दी में बदलें", dismiss: "अभी नहीं", subscribeFree: "निःशुल्क सब्सक्राइब करें",
  },
  ar: {
    home: "الرئيسية", news: "الأخبار", search: "بحث", world: "العالم", menu: "القائمة",
    language: "اللغة", listen: "استمع إلى هذا المقال", translated: "تُرجم تلقائياً",
    readOriginal: "اقرأ الأصل بالإنجليزية", showTranslation: "إظهار الترجمة",
    translating: "جارٍ الترجمة…", availableIn: "هذا الموقع متوفر بالعربية.",
    switchTo: "التبديل إلى العربية", dismiss: "ليس الآن", subscribeFree: "اشترك مجاناً",
  },
};

interface LangContextValue {
  lang: string; // active language code
  native: string; // the city's native language ("en" for English cities)
  multilingual: boolean; // true when native !== "en"
  setLang: (l: string) => void;
  t: (k: UiKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);
const STORAGE_KEY = "tdc-lang";

function ssrDefaultLang(): string {
  // Deterministic on server + first client paint.
  return slugToNativeLang(citySlug());
}

export function LangProvider({ children }: { children: ReactNode }) {
  const native = ssrDefaultLang();
  const multilingual = native !== "en";
  const [lang, setLangState] = useState<string>(native);

  // After mount, honour an explicit stored choice, else the browser language
  // when it matches our native language. Never silently switch an English
  // city away from English.
  useEffect(() => {
    if (!multilingual) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "en" || stored === native)) {
        if (stored !== lang) setLangState(stored);
        return;
      }
      const nav = (navigator.language || "").slice(0, 2).toLowerCase();
      if (nav === "en" && lang !== "en") setLangState("en");
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> + text direction in sync for a11y / SEO / RTL.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = LANG_META[lang]?.dir === "rtl" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: string) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (k: UiKey) => DICT[lang]?.[k] ?? EN[k],
    [lang],
  );

  const value = useMemo(
    () => ({ lang, native, multilingual, setLang, t }),
    [lang, native, multilingual, setLang, t],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (ctx) return ctx;
  // Fallback for any component rendered outside the provider (defensive):
  // behaves as a non-multilingual English site.
  return {
    lang: "en",
    native: "en",
    multilingual: false,
    setLang: () => {},
    t: (k: UiKey) => EN[k],
  };
}

// Convenience hook for components that only need the translator.
export function useT(): (k: UiKey) => string {
  return useLang().t;
}

export { cityIsMultilingual };
