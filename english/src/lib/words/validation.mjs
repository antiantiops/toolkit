// ponytail: IPA using only ordinary Latin letters is indistinguishable from prose; do not block slashes.
export function validSavedText(text) {
  return typeof text === 'string' && text.trim().length > 0 && text.length <= 500
    && !/[\u0250-\u02af\u02c8\u02cc\u02d0\u02d1\u1d00-\u1dbf\uab30-\uab6f]/u.test(text)
    && !/[/\[][A-Za-z\s.\u0300-\u036f]*[æøœðθŋβχ][A-Za-z\s.æøœðθŋβχ\u0300-\u036f]*[/\]]/u.test(text)
    && !/[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u20e3]/u.test(text);
}
