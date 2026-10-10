const STORAGE_KEYS = {
  API_KEY: 'hiyori_gemini_api_key',
  MODEL: 'hiyori_gemini_model',
  TTS_ENGINE: 'hiyori_tts_engine',
  TTS_VOICE: 'hiyori_tts_voice',
  ACTIVE_CHAR: 'hiyori_active_char',
  CHATS_PREFIX: 'hiyori_chats_',
  AFFECTION_PREFIX: 'hiyori_affection_',
  SETTINGS: 'hiyori_settings'
};

export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_TTS_ENGINE = 'gemini-3.8-flash-lite-tts';
export const DEFAULT_TTS_VOICE = 'Leda';

export const storage = {
  getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },

  setApiKey(key) {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
  },

  getModel() {
    return localStorage.getItem(STORAGE_KEYS.MODEL) || DEFAULT_MODEL;
  },

  setModel(model) {
    localStorage.setItem(STORAGE_KEYS.MODEL, model || DEFAULT_MODEL);
  },

  getTtsEngine() {
    return localStorage.getItem(STORAGE_KEYS.TTS_ENGINE) || DEFAULT_TTS_ENGINE;
  },

  setTtsEngine(engine) {
    localStorage.setItem(STORAGE_KEYS.TTS_ENGINE, engine || DEFAULT_TTS_ENGINE);
  },

  getTtsVoice() {
    const val = localStorage.getItem(STORAGE_KEYS.TTS_VOICE);
    if (!val || val === 'Kore') {
      return DEFAULT_TTS_VOICE; // Default to energetic Leda
    }
    return val;
  },

  setTtsVoice(voice) {
    localStorage.setItem(STORAGE_KEYS.TTS_VOICE, voice || DEFAULT_TTS_VOICE);
  },

  getActiveCharacterId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAR) || 'hiyori';
  },

  setActiveCharacterId(charId) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAR, charId || 'hiyori');
  },

  getChats(charId = 'hiyori') {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHATS_PREFIX + charId);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load chat history:', e);
      return [];
    }
  },

  saveChats(charId = 'hiyori', messages = []) {
    try {
      const trimmed = messages.slice(-100);
      localStorage.setItem(STORAGE_KEYS.CHATS_PREFIX + charId, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save chat history:', e);
    }
  },

  clearChats(charId = 'hiyori') {
    localStorage.removeItem(STORAGE_KEYS.CHATS_PREFIX + charId);
  },

  getAffection(charId = 'hiyori') {
    const val = localStorage.getItem(STORAGE_KEYS.AFFECTION_PREFIX + charId);
    return val !== null ? parseInt(val, 10) : 35; // 초기 호감도 35점 (친밀한 소꿉친구)
  },

  setAffection(charId = 'hiyori', value) {
    localStorage.setItem(STORAGE_KEYS.AFFECTION_PREFIX + charId, Math.max(0, value).toString());
  },

  addAffection(charId = 'hiyori', delta = 1) {
    const current = this.getAffection(charId);
    const updated = Math.min(999, Math.max(0, current + delta));
    this.setAffection(charId, updated);
    return updated;
  },

  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : { sound: true, tts: true, theme: 'blossom' };
    } catch {
      return { sound: true, tts: true, theme: 'blossom' };
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
};
