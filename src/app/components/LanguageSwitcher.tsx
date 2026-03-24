interface LanguageSwitcherProps {
  languages: string[];
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
}

export function LanguageSwitcher({ languages, currentLanguage, onLanguageChange }: LanguageSwitcherProps) {
  if (languages.length <= 1) return null;

  // Get the "other" language (toggle between first two languages)
  const otherLanguage = languages.find(lang => lang !== currentLanguage) || languages[0];

  // Get display name for language code
  const getLanguageDisplay = (code: string) => {
    const displays: Record<string, string> = {
      en: "English",
      zh: "中文",
      ja: "日本語",
      ko: "한국어",
      fr: "Français",
      de: "Deutsch",
      es: "Español",
    };
    return displays[code.toLowerCase()] || code.toUpperCase();
  };

  const handleToggle = () => {
    onLanguageChange(otherLanguage);
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      aria-label={`Switch to ${getLanguageDisplay(otherLanguage)}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span>{getLanguageDisplay(otherLanguage)}</span>
    </button>
  );
}
