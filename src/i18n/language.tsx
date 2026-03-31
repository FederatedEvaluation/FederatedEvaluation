import React from 'react';

export type Language = 'en' | 'zh';

const STORAGE_KEY = 'fedeva-language';

export const getPreferredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'zh' ? 'zh' : 'en';
};

type LanguageContextValue = {
  language: Language;
  isZh: boolean;
  setLanguage: (language: Language) => void;
};

const LanguageContext = React.createContext<LanguageContextValue>({
  language: 'en',
  isZh: false,
  setLanguage: () => {},
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = React.useState<Language>(() => getPreferredLanguage());

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    }
  }, [language]);

  const value = React.useMemo(
    () => ({
      language,
      isZh: language === 'zh',
      setLanguage: setLanguageState,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => React.useContext(LanguageContext);
