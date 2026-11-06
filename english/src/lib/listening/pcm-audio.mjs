// ponytail: mono 24 kHz speech playback; use multichannel buffers for music.
export async function decodeSpeech(blob) {
  const Context = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Context) throw new Error('Browser không hỗ trợ giải mã audio. Hãy mở bằng Chrome hoặc Safari mới.');
  const audio = await new Context(1, 1, 24000).decodeAudioData(await blob.arrayBuffer());
  if (!audio.length || !Number.isFinite(audio.duration)) throw new Error('TTS trả audio không hợp lệ');
  return audio;
}
export function speechWav(buffers) {
  if (!buffers.length || buffers.some(a => a.sampleRate !== 24000)) throw new Error('Audio sample rate không hợp lệ');
  const frames = buffers.reduce((n, a) => n + a.length, 0);
  const bytes = new ArrayBuffer(44 + frames * 2), view = new DataView(bytes);
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, frames * 2, true);
  let offset = 44;
  for (const audio of buffers) {
    const samples = audio.getChannelData(0);
    for (const sample of samples) { const n = Math.max(-1, Math.min(1, sample)); view.setInt16(offset, Math.round(n * (n < 0 ? 32768 : 32767)), true); offset += 2; }
  }
  return new Blob([bytes], {type: 'audio/wav'});
}
