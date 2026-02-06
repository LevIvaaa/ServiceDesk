import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ukCommon from './locales/uk/common.json'
import ukTickets from './locales/uk/tickets.json'
import ukUsers from './locales/uk/users.json'
import ukStations from './locales/uk/stations.json'
import ukKnowledge from './locales/uk/knowledge.json'
import ukLogAnalysis from './locales/uk/logAnalysis.json'
import ukSettings from './locales/uk/settings.json'

import enCommon from './locales/en/common.json'
import enTickets from './locales/en/tickets.json'
import enUsers from './locales/en/users.json'
import enStations from './locales/en/stations.json'
import enKnowledge from './locales/en/knowledge.json'
import enLogAnalysis from './locales/en/logAnalysis.json'
import enSettings from './locales/en/settings.json'

const resources = {
  uk: {
    common: ukCommon,
    tickets: ukTickets,
    users: ukUsers,
    stations: ukStations,
    knowledge: ukKnowledge,
    logAnalysis: ukLogAnalysis,
    settings: ukSettings,
  },
  en: {
    common: enCommon,
    tickets: enTickets,
    users: enUsers,
    stations: enStations,
    knowledge: enKnowledge,
    logAnalysis: enLogAnalysis,
    settings: enSettings,
  },
}

// Initialize language from localStorage or set default
const savedLanguage = localStorage.getItem('language')
const initialLanguage = (savedLanguage === 'uk' || savedLanguage === 'en') ? savedLanguage : 'uk'

// Save to localStorage if not set or invalid
if (!savedLanguage || (savedLanguage !== 'uk' && savedLanguage !== 'en')) {
  localStorage.setItem('language', 'uk')
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage, // Use language from localStorage or default to 'uk'
    fallbackLng: 'uk',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
