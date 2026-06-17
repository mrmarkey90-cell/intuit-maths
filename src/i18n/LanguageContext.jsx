import { createContext, useContext, useState } from 'react'
import { translations } from './translations'

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: key => key,
})

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en')

  function t(key) {
    return translations[language]?.[key] ?? translations.en[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LanguageContext)
}
