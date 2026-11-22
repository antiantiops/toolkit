const OXFORD_HOSTS = new Set(['www.oxfordlearnersdictionaries.com', 'oxfordlearnersdictionaries.com']);

const OXFORD_MEDIA_ERRORS = {
  1: 'MEDIA_ERR_ABORTED',
  2: 'MEDIA_ERR_NETWORK',
  3: 'MEDIA_ERR_DECODE',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
};

export function oxfordAudioUrl(raw) {
  if (typeof raw !== 'string' || !raw) return '';
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && OXFORD_HOSTS.has(u.hostname) && !u.port && !u.username && !u.password
      ? u.href
      : '';
  } catch {
    return '';
  }
}

export function oxfordPageUrl(sourceUrl, word) {
  if (typeof sourceUrl === 'string' && sourceUrl) {
    try {
      const u = new URL(sourceUrl);
      const validPath = (u.pathname.startsWith('/definition/english/') && u.pathname.length > '/definition/english/'.length)
        || (u.pathname.startsWith('/us/definition/english/') && u.pathname.length > '/us/definition/english/'.length);
      if (u.protocol === 'https:' && OXFORD_HOSTS.has(u.hostname) && !u.port && !u.username && !u.password && validPath) {
        return u.href;
      }
    } catch {}
  }
  const q = String(word ?? '').trim().toLowerCase();
  if (!q) return '';
  return `https://www.oxfordlearnersdictionaries.com/search/english/?q=${encodeURIComponent(q)}`;
}

export function clientEnv(nav = globalThis.navigator) {
  const ua = nav?.userAgent || '';
  let browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/CriOS\/|Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  const platform = nav?.userAgentData?.platform || nav?.platform || '';
  const osSrc = `${platform} ${ua}`;
  let os = 'Unknown';
  if (/Android/i.test(osSrc)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(osSrc)) os = 'iOS';
  else if (/Mac/i.test(osSrc)) os = 'macOS';
  else if (/Win/i.test(osSrc)) os = 'Windows';
  else if (/Linux/i.test(osSrc)) os = 'Linux';
  return { browser, os };
}

export function describeMediaFailure(player, fallbackCause = 'unknown') {
  const code = player?.error?.code ?? null;
  const cause = fallbackCause || (code ? (OXFORD_MEDIA_ERRORS[code] || `MEDIA_ERR_${code}`) : 'unknown');
  return {
    audioErrorCode: code,
    networkState: player?.networkState ?? null,
    readyState: player?.readyState ?? null,
    cause,
  };
}

export function logOxfordFailure({ word, accent, player, cause, nav, logger = console.warn }) {
  const { browser, os } = clientEnv(nav);
  const details = describeMediaFailure(player, cause || '');
  logger('[oxford-playback]', {
    word,
    accent,
    browser,
    os,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

export function createOxfordAttemptController({
  getAudio,
  onPlaying,
  onWaiting,
  onEnded,
  onPause,
  onFail,
  logger,
} = {}) {
  let active = null;
  let seq = 0;

  const isCurrent = (attempt) => Boolean(attempt && active === attempt && !attempt.settled);

  const settle = (attempt) => {
    if (!attempt || attempt.settled) return false;
    attempt.settled = true;
    if (active === attempt) active = null;
    return true;
  };

  return {
    start({ word = '', accent = '' } = {}) {
      if (active) active.settled = true;
      const attempt = { id: ++seq, word, accent, settled: false, played: false };
      active = attempt;
      return attempt;
    },
    cancel() {
      if (!active) return;
      active.settled = true;
      active = null;
      seq += 1;
    },
    hasActive() {
      return Boolean(active && !active.settled);
    },
    current() {
      return active && !active.settled ? active : null;
    },
    handlePlaying(attempt = active) {
      if (!isCurrent(attempt)) return false;
      attempt.played = true;
      onPlaying?.(attempt);
      return true;
    },
    handleWaiting(attempt = active) {
      if (!isCurrent(attempt)) return false;
      onWaiting?.(attempt);
      return true;
    },
    handleEnded(attempt = active) {
      if (!isCurrent(attempt)) return false;
      settle(attempt);
      if (!attempt.played) {
        logOxfordFailure({ word: attempt.word, accent: attempt.accent, player: getAudio?.(), cause: 'ended-without-playing', logger });
        onFail?.('ended-without-playing', attempt);
        return false;
      }
      onEnded?.(attempt);
      return true;
    },
    handlePause(attempt = active) {
      if (!isCurrent(attempt)) return false;
      settle(attempt);
      onPause?.(attempt);
      return true;
    },
    handleError(attempt = active) {
      if (!isCurrent(attempt)) return false;
      settle(attempt);
      const player = getAudio?.();
      const code = player?.error?.code;
      const cause = code ? (OXFORD_MEDIA_ERRORS[code] || `MEDIA_ERR_${code}`) : 'audio-error-event';
      logOxfordFailure({ word: attempt.word, accent: attempt.accent, player, cause, logger });
      onFail?.(cause, attempt);
      return true;
    },
    handlePlayRejected(err, attempt = active) {
      if (!isCurrent(attempt)) return false;
      settle(attempt);
      const cause = err?.name ? `play-rejected:${err.name}` : 'play-rejected';
      logOxfordFailure({ word: attempt.word, accent: attempt.accent, player: getAudio?.(), cause, logger });
      onFail?.(cause, attempt);
      return true;
    },
  };
}
