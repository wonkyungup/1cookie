import i18n from 'i18next';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ko from './locales/ko.json';
import zhHans from './locales/zhHans.json';
import zhHant from './locales/zhHant.json';
import ru from './locales/ru.json';
import jp from './locales/jp.json';
import In from './locales/in.json';
import de from './locales/de.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      ko,
      zhHans,
      zhHant,
      ru,
      jp,
      in: In,
      de,
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })
  .then(
    () => i18next.changeLanguage(navigator.language),
  )

export default i18n;
