import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ukCommon from './locales/uk/common.json'
import ukTickets from './locales/uk/tickets.json'
import ukUsers from './locales/uk/users.json'
import ukStations from './locales/uk/stations.json'
import ukKnowledge from './locales/uk/knowledge.json'

import enCommon from './locales/en/common.json'
import enTickets from './locales/en/tickets.json'
import enUsers from './locales/en/users.json'
import enStations from './locales/en/stations.json'
import enKnowledge from './locales/en/knowledge.json'

const resources = {
  uk: {
    common: ukCommon,
    tickets: ukTickets,
    users: ukUsers,
    stations: ukStations,
    knowledge: ukKnowledge,
  },
  en: {
    common: enCommon,
    tickets: enTickets,
    users: enUsers,
    stations: enStations,
    knowledge: enKnowledge,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'uk',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
