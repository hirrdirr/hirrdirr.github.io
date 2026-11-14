import english from './locales/en.js';

export const LANGUAGE = 'en';

// A locale is a flat dictionary, independent of gameplay IDs and saved characters.
// Future locales can override individual keys; missing translations fall back to English.
// Values are plain text. Escape at the HTML boundary, as with any other UI text.
export function createTranslator(messages = english) {
  return (key, ...values) => {
    const message = Object.hasOwn(messages, key) ? messages[key] : english[key];
    if (typeof message !== 'string') throw new Error(`Unknown localization key: ${key}`);
    return message.replace(/\{(\d+)\}/g, (_, index) => {
      if (Number(index) >= values.length) throw new Error(`Missing localization value ${index}: ${key}`);
      return String(values[Number(index)]);
    });
  };
}
export const tr = createTranslator();
