import dictionary from './ipa-data/english.json';
// IPA-dict (MIT); regional dictionary readings, not contextual homograph disambiguation.
export function pronunciation(word) {
  const key = word.trim().toLowerCase();
  const value = dictionary[key];
  return value ? { uk: value.uk || '', us: value.us || '', source: 'IPA-dict' } : null;
}
