const STORAGE_KEYS = {
  OPENROUTER_KEY: 'zundamon_openrouter_key',
  MODEL: 'zundamon_gemini_model',
  TTS_MODEL: 'zundamon_openrouter_tts_model',
  TTS_VOICE: 'zundamon_openrouter_tts_voice',
  ACTIVE_CHAR: 'zundamon_active_char',
  CHATS_PREFIX: 'zundamon_chats_',
  AFFECTION_PREFIX: 'zundamon_affection_',
  SETTINGS: 'zundamon_settings'
};

export const DEFAULT_OPENROUTER_KEY = '';
export const DEFAULT_API_KEY = DEFAULT_OPENROUTER_KEY;
export const DEFAULT_MODEL = 'google/gemini-3.8-flash';
export const DEFAULT_TTS_ENGINE = 'google/gemini-3.8-flash-lite-tts';
export const DEFAULT_TTS_VOICE = 'Leda';

export const storage = {
  getOpenRouterKey() {
    const val = localStorage.getItem(STORAGE_KEYS.OPENROUTER_KEY);
    return (val && val.trim()) ? val.trim() : DEFAULT_OPENROUTER_KEY;
  },

  setOpenRouterKey(key) {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEYS.OPENROUTER_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.OPENROUTER_KEY);
    }
  },

  getApiKey() {
    return this.getOpenRouterKey();
  },

  setApiKey(key) {
    this.setOpenRouterKey(key);
  },

  getOpenRouterTtsModel() {
    return (localStorage.getItem(STORAGE_KEYS.TTS_MODEL) || DEFAULT_TTS_ENGINE).trim();
  },

  setOpenRouterTtsModel(model) {
    localStorage.setItem(STORAGE_KEYS.TTS_MODEL, (model || DEFAULT_TTS_ENGINE).trim());
  },

  getOpenRouterTtsVoice() {
    return (localStorage.getItem(STORAGE_KEYS.TTS_VOICE) || DEFAULT_TTS_VOICE).trim();
  },

  setOpenRouterTtsVoice(voice) {
    localStorage.setItem(STORAGE_KEYS.TTS_VOICE, (voice || DEFAULT_TTS_VOICE).trim());
  },

  getModel() {
    const val = localStorage.getItem(STORAGE_KEYS.MODEL);
    if (!val || val === 'gemini-3.5-flash' || val === 'google/gemini-3.5-flash') {
      return DEFAULT_MODEL;
    }
    return val.trim();
  },

  setModel(model) {
    localStorage.setItem(STORAGE_KEYS.MODEL, model || DEFAULT_MODEL);
  },

  getTtsEngine() {
    return this.getOpenRouterTtsModel();
  },

  setTtsEngine(engine) {
    this.setOpenRouterTtsModel(engine);
  },

  getTtsVoice() {
    return this.getOpenRouterTtsVoice();
  },

  setTtsVoice(voice) {
    this.setOpenRouterTtsVoice(voice);
  },

  getActiveCharacterId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAR) || 'zundamon';
  },

  setActiveCharacterId(charId) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAR, charId || 'zundamon');
  },

  getChats(charId = 'zundamon') {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHATS_PREFIX + charId);
      if (!data) return [];
      const parsed = JSON.parse(data);
      // Filter out any corrupted or blank messages from past bugs
      return Array.isArray(parsed) ? parsed.filter(m => m && typeof m.text === 'string' && m.text.trim().length > 0) : [];
    } catch (e) {
      console.error('Failed to load chat history:', e);
      return [];
    }
  },

  saveChats(charId = 'zundamon', messages = []) {
    try {
      const trimmed = messages.slice(-100);
      localStorage.setItem(STORAGE_KEYS.CHATS_PREFIX + charId, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  },

  clearChats(charId = 'zundamon') {
    localStorage.removeItem(STORAGE_KEYS.CHATS_PREFIX + charId);
  },

  getAffection(charId = 'zundamon') {
    const val = localStorage.getItem(STORAGE_KEYS.AFFECTION_PREFIX + charId);
    return val !== null ? parseInt(val, 10) : 40; // 초기 친밀도 40점 (친한 단짝 친구)
  },

  setAffection(charId = 'zundamon', value) {
    localStorage.setItem(STORAGE_KEYS.AFFECTION_PREFIX + charId, Math.max(0, value).toString());
  },

  addAffection(charId = 'zundamon', delta = 1) {
    const current = this.getAffection(charId);
    const updated = Math.min(999, Math.max(0, current + delta));
    this.setAffection(charId, updated);
    return updated;
  },

  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : { sound: true, tts: true, theme: 'zunda' };
    } catch {
      return { sound: true, tts: true, theme: 'zunda' };
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
};
