export const normalizeWord = text => text.trim().replace(/\s+/g,' ').toLowerCase().replace(/[.\u2026]+$/u,'').trimEnd();
