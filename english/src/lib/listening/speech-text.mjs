// Edge/Bing speech embeds input in SSML; escape text without changing the transcript.
export function speechText(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
