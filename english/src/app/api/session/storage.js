import {archiveListening} from './listening-history';
import fs from "fs";
import path from "path";
import os from "os";
import { normalizeTargetLang } from '../../../lib/lookup/languages.mjs';

const CACHE_DIR = process.env.CACHE_DIR || path.join(os.tmpdir(), "vocab_cache");
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day

const MODE_CONFIG = {
  vocab: {
    fields: ['words', 'preview', 'wordsTargetLang'],
    detect: (p) => 'words' in p || 'preview' in p || 'wordsTargetLang' in p,
    tag: (p) => p.wordsTargetLang ?? p.words?.targetLang ?? (('words' in p || 'preview' in p || 'wordsTargetLang' in p) ? p.targetLang : undefined),
    legacyTag: (raw) => raw.wordsTargetLang ?? 'vi',
  },
  grammar: {
    fields: ['grammar', 'gPreview', 'grammarTargetLang'],
    detect: (p) => 'grammar' in p || 'gPreview' in p || 'grammarTargetLang' in p,
    tag: (p) => p.grammarTargetLang ?? p.grammar?.targetLang ?? (('grammar' in p || 'gPreview' in p || 'grammarTargetLang' in p) ? p.targetLang : undefined),
    legacyTag: (raw) => raw.grammarTargetLang ?? raw.targetLang ?? 'vi',
  },
  writing: {
    fields: ['writing', 'wPreview1', 'wPreview2', 'writingTargetLang'],
    detect: (p) => 'writing' in p || 'wPreview1' in p || 'wPreview2' in p || 'writingTargetLang' in p,
    tag: (p) => p.writingTargetLang ?? p.writing?.targetLang ?? (('writing' in p || 'wPreview1' in p || 'wPreview2' in p || 'writingTargetLang' in p) ? p.targetLang : undefined),
    legacyTag: (raw) => raw.writingTargetLang ?? raw.targetLang ?? 'vi',
  },
  modelDraft: {
    fields: ['modelDraft', 'modelDraftTargetLang'],
    detect: (p) => 'modelDraft' in p || 'modelDraftTargetLang' in p,
    tag: (p) => p.modelDraftTargetLang ?? p.modelDraft?.targetLang ?? (('modelDraft' in p || 'modelDraftTargetLang' in p) ? p.targetLang : undefined),
    legacyTag: (raw) => raw.modelDraftTargetLang ?? 'vi',
  },
  listening: {
    fields: ['listening', 'lPreview', 'listeningTargetLang'],
    detect: (p) => 'listening' in p || 'lPreview' in p || 'listeningTargetLang' in p,
    tag: (p) => p.listeningTargetLang ?? p.listening?.targetLang ?? (('listening' in p || 'lPreview' in p || 'listeningTargetLang' in p) ? p.targetLang : undefined),
    legacyTag: (raw) => raw.listeningTargetLang ?? 'vi',
  },
};

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getFilePath(sid) {
  const clean = String(sid).replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(CACHE_DIR, `${clean}.json`);
}

function readRawFile(file) {
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (Date.now() - raw.savedAt > TTL_MS) {
      fs.unlinkSync(file);
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

function extractLocaleSnapshot(data) {
  const snapshot = {};
  for (const mode of Object.values(MODE_CONFIG)) {
    for (const f of mode.fields) {
      if (f in data) snapshot[f] = data[f];
    }
  }
  return snapshot;
}

function seedLocales(raw) {
  const locales = {};
  for (const [modeKey, cfg] of Object.entries(MODE_CONFIG)) {
    const hasField = cfg.fields.some(f => f in raw);
    if (!hasField) continue;
    const tag = cfg.legacyTag(raw);
    const lang = normalizeTargetLang(tag) || 'vi';
    locales[lang] = locales[lang] || {};
    for (const f of cfg.fields) {
      if (f in raw) locales[lang][f] = raw[f];
    }
  }
  return locales;
}

export function saveSession(sid, patch) {
  if (!sid || !patch) return;
  ensureDir();
  const file = getFilePath(sid);
  const rawFile = readRawFile(file);
  const existingData = rawFile ? rawFile.data : {};

  // Validate patch mode target languages
  const modeLocales = {};
  for (const [modeKey, cfg] of Object.entries(MODE_CONFIG)) {
    if (cfg.detect(patch)) {
      const rawTag = cfg.tag(patch);
      let lang = 'vi';
      if (rawTag !== undefined && rawTag !== null) {
        const norm = normalizeTargetLang(rawTag);
        if (!norm) return; // Invalid locale: do not write
        lang = norm;
      }
      modeLocales[modeKey] = lang;
    }
  }

  // Listening archive: real owner sid only, no owner suffix
  if (patch.listening) {
    archiveListening(sid, existingData.listening);
    archiveListening(sid, patch.listening);
  }

  // Internal _locales object
  let _locales = existingData._locales;
  if (!_locales) {
    _locales = seedLocales(existingData);
  } else {
    // clone to avoid mutating in place before update
    _locales = { ..._locales };
    for (const k of Object.keys(_locales)) {
      _locales[k] = { ..._locales[k] };
    }
  }

  // Update _locales per detected mode
  for (const [modeKey, lang] of Object.entries(modeLocales)) {
    const cfg = MODE_CONFIG[modeKey];
    _locales[lang] = _locales[lang] || {};
    for (const f of cfg.fields) {
      if (f in patch) {
        _locales[lang][f] = patch[f];
      }
    }
  }

  // Latest flat data retains all patch fields and latest flat representation for backward compatibility
  const flatData = { ...existingData, ...patch };
  delete flatData._locales;

  const dataToSave = {
    ...flatData,
    _locales,
  };

  // ponytail: local disk JSON cache. Upgrade to Redis when multi-instance horizontal scale.
  fs.writeFileSync(file, JSON.stringify({ savedAt: Date.now(), data: dataToSave }), "utf8");
}

export function loadSession(sid, targetLang) {
  if (!sid) return null;
  const file = getFilePath(sid);
  const rawFile = readRawFile(file);
  if (!rawFile || !rawFile.data) return null;

  const rawData = rawFile.data;
  const { _locales, ...flatData } = rawData;

  if (targetLang === undefined) {
    // Unchanged latest flat object for old callers, without _locales
    return flatData;
  }

  const norm = normalizeTargetLang(targetLang);
  if (!norm) return null;

  const effectiveLocales = _locales || seedLocales(flatData);
  const snapshot = effectiveLocales[norm] || {};
  const result = { ...snapshot };

  // Fall back to flat data for missing mode ONLY if flat data matches target locale and flatData has no _locales tracking
  if (!_locales) {
    for (const [modeKey, cfg] of Object.entries(MODE_CONFIG)) {
      const hasInSnapshot = cfg.fields.some(f => f in result);
      if (!hasInSnapshot) {
        const hasInFlat = cfg.fields.some(f => f in flatData);
        if (hasInFlat) {
          const flatTag = cfg.legacyTag(flatData);
          const flatNorm = normalizeTargetLang(flatTag) || 'vi';
          if (flatNorm === norm) {
            for (const f of cfg.fields) {
              if (f in flatData) result[f] = flatData[f];
            }
          }
        }
      }
    }
  }

  delete result._locales;
  return result;
}

export function deleteSession(sid, type, targetLang) {
  if (!sid) return;
  const file = getFilePath(sid);
  if (!fs.existsSync(file)) return;

  if (!type && targetLang === undefined) {
    try { fs.unlinkSync(file); } catch {}
    return;
  }

  const rawFile = readRawFile(file);
  if (!rawFile || !rawFile.data) return;

  const rawData = rawFile.data;
  let { _locales, ...existing } = rawData;
  _locales = _locales ? { ..._locales } : seedLocales(existing);
  for (const k of Object.keys(_locales)) {
    _locales[k] = { ..._locales[k] };
  }

  if (targetLang === undefined) {
    // Legacy deleteSession(sid, type) without third arg keeps existing semantics
    if (type === "listening") {
      delete existing.listening;
      delete existing.lPreview;
      delete existing.listeningTargetLang;
    } else if (type === "vocab") {
      delete existing.words;
      delete existing.preview;
      delete existing.wordsTargetLang;
    } else if (type === "grammar") {
      delete existing.grammar;
      delete existing.gPreview;
      delete existing.grammarTargetLang;
    } else if (type === "writing") {
      delete existing.writing;
      delete existing.wPreview1;
      delete existing.wPreview2;
      delete existing.writingTargetLang;
      delete existing.modelDraft;
      delete existing.modelDraftTargetLang;
    }
    // Also clear from _locales for backward consistency on legacy full delete of mode
    for (const lang of Object.keys(_locales)) {
      if (type === "listening") {
        delete _locales[lang].listening;
        delete _locales[lang].lPreview;
        delete _locales[lang].listeningTargetLang;
      } else if (type === "vocab") {
        delete _locales[lang].words;
        delete _locales[lang].preview;
        delete _locales[lang].wordsTargetLang;
      } else if (type === "grammar") {
        delete _locales[lang].grammar;
        delete _locales[lang].gPreview;
        delete _locales[lang].grammarTargetLang;
      } else if (type === "writing") {
        delete _locales[lang].writing;
        delete _locales[lang].wPreview1;
        delete _locales[lang].wPreview2;
        delete _locales[lang].writingTargetLang;
        delete _locales[lang].modelDraft;
        delete _locales[lang].modelDraftTargetLang;
      }
    }
    fs.writeFileSync(file, JSON.stringify({ savedAt: Date.now(), data: { ...existing, _locales } }), "utf8");
    return;
  }

  const norm = normalizeTargetLang(targetLang);
  if (!norm) return;

  // deleteSession(sid, type, targetLang) deletes selected locale matching mode fields only,
  // retains other locale snapshots and clears matching latest flat fields if they match targetLang.
  const targetSnapshot = _locales[norm];
  const deleteFieldsForMode = (obj, mKey) => {
    if (!obj) return;
    if (mKey === "listening") {
      delete obj.listening;
      delete obj.lPreview;
      delete obj.listeningTargetLang;
    } else if (mKey === "vocab") {
      delete obj.words;
      delete obj.preview;
      delete obj.wordsTargetLang;
    } else if (mKey === "grammar") {
      delete obj.grammar;
      delete obj.gPreview;
      delete obj.grammarTargetLang;
    } else if (mKey === "writing") {
      delete obj.writing;
      delete obj.wPreview1;
      delete obj.wPreview2;
      delete obj.writingTargetLang;
      delete obj.modelDraft;
      delete obj.modelDraftTargetLang;
    }
  };

  if (!type) {
    // Delete all modes for this locale
    delete _locales[norm];
    for (const mKey of ["listening", "vocab", "grammar", "writing", "modelDraft"]) {
      const cfg = MODE_CONFIG[mKey];
      const flatTag = cfg.legacyTag(existing);
      if ((normalizeTargetLang(flatTag) || 'vi') === norm) {
        deleteFieldsForMode(existing, mKey);
      }
    }
  } else {
    deleteFieldsForMode(targetSnapshot, type);
    const cfg = MODE_CONFIG[type];
    if (cfg) {
      const flatTag = cfg.legacyTag(existing);
      if ((normalizeTargetLang(flatTag) || 'vi') === norm) {
        deleteFieldsForMode(existing, type);
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify({ savedAt: Date.now(), data: { ...existing, _locales } }), "utf8");
}
