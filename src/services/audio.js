import { storage } from './storage.js';

/**
 * Converts raw 16-bit PCM buffer into standard WAV buffer with 44-byte RIFF header
 */
function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1) {
  const buffer = new ArrayBuffer(44 + pcmData.byteLength);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.byteLength, true);

  new Uint8Array(buffer, 44).set(new Uint8Array(pcmData));
  return buffer;
}

/**
 * Prepares text specifically for OpenRouter & Gemini TTS:
 * 1. Strips all emojis and pictographs so TTS never reads "새싹", "초록색 하트", etc.
 * 2. Strips all text inside parentheses (e.g. (스쿨), (school), (큐트), (방긋)) so only the main word is read once
 *    and parenthetical pronunciation guides or emoticons are not spoken.
 * 3. Removes stage directions in asterisks (*...*), markdown symbols, quotes, and tildes (~).
 */
export function prepareTtsSpeechText(rawText) {
  if (!rawText) return '';
  return rawText
    // 1. Remove emotion tags like [emotion:happy]
    .replace(/\[emotion:[^\]]+\]/gi, '')
    // 2. Unwrap bold markdown **text** -> text FIRST so words inside ** are never lost
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // 3. Remove stage directions in single asterisks like *방방 뛰며 방긋 웃는다*
    .replace(/\*[^*]+\*/g, '')
    // 4. Remove markdown formatting symbols
    .replace(/[\*\_`\#]/g, '')
    // 5. Remove all emojis, pictographs, and symbols (🌱, 💚, 🍎, 😊, ⭐, ✨, etc.) so TTS never reads emoji names
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    // 6. Remove text inside all parenthetical forms: standard (), CJK （）, square brackets [], 【】, etc.
    // e.g. Smile(스마일) -> Smile, 스쿨(school) -> 스쿨, (방긋), (웃음) -> completely removed!
    .replace(/[\(\（\[\［\【\〔\《\〈][^\)\）\]\］\】\〕\》\〉]*[\)\）\]\］\】\〕\》\〉]/g, ' ')
    // 7. Remove single/double quotes around words: '스쿨' -> 스쿨
    .replace(/['"“”‘’]/g, '')
    // 8. Remove tildes that disrupt TTS cadence or cause silence/glitches: 스마일~ -> 스마일
    .replace(/~+/g, ' ')
    // 9. Remove text faces / emoticons like ^^, ^^;, ㅠㅠ, ㅎㅎ, ㅋㅋ
    .replace(/[\^]{2,}|[\^]_[\\^]|[ㅠㅜ]{2,}/g, ' ')
    // 10. Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean and convert text for Web Speech API fallback so browser voices don't glitch
 */
function sanitizeKoreanTtsSpeech(rawText) {
  if (!rawText) return '';
  const text = prepareTtsSpeechText(rawText);
  // Common basic English words -> friendly Korean phonetic pronunciation for browser voice
  const dict = {
    apple: '애플',
    banana: '바나나',
    cat: '캣',
    dog: '도그',
    school: '스쿨',
    friend: '프렌드',
    jump: '점프',
    rope: '로프',
    happy: '해피',
    love: '러브',
    sun: '썬',
    star: '스타',
    book: '북',
    hi: '하이',
    hello: '헬로',
    good: '굿',
    morning: '모닝',
    red: '레드',
    blue: '블루',
    green: '그린',
    yellow: '옐로우',
    pink: '핑크',
    quiz: '퀴즈',
    yes: '예스',
    no: '노',
    smile: '스마일',
    cute: '큐트',
    pencil: '펜슬',
    water: '워터',
    family: '패밀리',
    thank: '땡큐',
    thanks: '땡큐',
    like: '라이크',
    play: '플레이',
    game: '게임',
    music: '뮤직',
    sing: '싱',
    dance: '댄스',
    tree: '트리',
    flower: '플라워',
    rain: '레인',
    snow: '스노우',
    candy: '캔디',
    cookie: '쿠키',
    milk: '밀크',
    bear: '베어',
    rabbit: '래빗'
  };
  return text.replace(/\b[a-zA-Z]+\b/g, (match) => {
    const lower = match.toLowerCase();
    return dict[lower] || match;
  });
}

export class SoundController {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.ttsEnabled = true;
    this.currentSource = null;
    this.currentLipSyncAnim = null;
    this.koreanVoices = [];
    this.lockedKoreanVoice = null;

    // Streaming Queue state for sentence-by-sentence TTS
    this.speechQueue = [];
    this.isQueueProcessing = false;
    this.currentQueueSession = 0;
    this.activeSessionEngine = null; // Locked engine for current turn ('gemini' | 'browser')

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => this.initVoices();
    }
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  initVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    this.koreanVoices = voices.filter(v => v.lang && (v.lang.startsWith('ko') || v.lang.startsWith('KO') || v.lang.includes('KR')));
    if (this.koreanVoices.length > 0) {
      // Find the highest-quality natural voice once and permanently lock it
      this.lockedKoreanVoice = this.koreanVoices.find(v => 
        v.name.includes('SunHi') ||
        v.name.includes('Yunjin') ||
        v.name.includes('Google 한국의') ||
        (v.name.includes('Natural') && !v.name.includes('Heami'))
      ) || this.koreanVoices.find(v => !v.name.includes('Heami')) || this.koreanVoices[0];
    }
  }

  playSend() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playReceive() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(659.25, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.06);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.08);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playHeart() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playGift() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Check if speech queue is currently processing or playing audio
   */
  isSpeaking() {
    const isBrowserSpeaking = (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking);
    return this.isQueueProcessing || this.speechQueue.length > 0 || !!this.currentSource || isBrowserSpeaking;
  }

  /**
   * Reset/Start a new speech stream session (cancels any running speech)
   */
  startStreamSession() {
    this.stopSpeak();
    this.currentQueueSession = Date.now();
    this.activeSessionEngine = null; // Unset engine lock for new turn
    return this.currentQueueSession;
  }

  /**
   * Enqueue a sentence chunk for sequential prefetching and synchronized speech playback
   */
  enqueueSentence({
    text,
    emotion = 'neutral',
    charId = 'zundamon',
    voiceSettings = null,
    sessionId = null,
    onStart = null,
    onProgress = null,
    onEnd = null,
    onLipSync = null
  }) {
    const currentSession = sessionId || this.currentQueueSession;

    // Clean text of emotion tags, markdown, bracketed actions
    const cleanText = text
      .replace(/\[emotion:[^\]]+\]/gi, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*[^*]+\*/g, '')
      .replace(/[\_~#\*]/g, '')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    if (!this.ttsEnabled) {
      // If TTS is disabled, simulate typewriter output smoothly
      this.simulateTypewriterWithoutAudio({ text, sessionId: currentSession, onStart, onProgress, onEnd });
      return;
    }

    const ttsText = prepareTtsSpeechText(text);

    const queueItem = {
      text,
      cleanText,
      ttsText,
      emotion,
      charId,
      voiceSettings,
      sessionId: currentSession,
      onStart,
      onProgress,
      onEnd,
      onLipSync,
      audioPromise: null
    };

    // Immediately trigger parallel background prefetch so sentences 2, 3, etc. are downloaded while sentence 1 plays!
    queueItem.audioPromise = this.prefetchAudio(queueItem);

    this.speechQueue.push(queueItem);
    this.processSpeechQueue();
  }

  /**
   * Prefetch audio buffer for a queued speech item
   */
  async prefetchAudio(item) {
    const orKey = storage.getOpenRouterKey();
    const orModel = storage.getOpenRouterTtsModel();
    if (orModel && orModel !== 'none') {
      try {
        return await this.fetchOpenRouterTts({
          apiKey: orKey,
          model: orModel,
          voice: storage.getOpenRouterTtsVoice() || 'Leda',
          text: item.ttsText
        });
      } catch (err) {
        console.warn('[TTS] OpenRouter prefetch failed:', err);
      }
    }

    const apiKey = storage.getApiKey();
    const ttsEngine = storage.getTtsEngine();
    const ttsVoice = storage.getTtsVoice();
    if (apiKey && ttsEngine && ttsEngine.startsWith('gemini')) {
      try {
        return await this.fetchGeminiTtsWithFallback({
          apiKey,
          preferredModel: ttsEngine,
          voice: ttsVoice,
          text: item.ttsText
        });
      } catch (err) {
        console.warn('[TTS] Gemini fallback prefetch failed:', err);
      }
    }
    return null;
  }

  /**
   * Process queued speech items sequentially with guaranteed single-voice engine consistency
   */
  async processSpeechQueue() {
    if (this.isQueueProcessing) return;
    if (this.speechQueue.length === 0) return;

    this.isQueueProcessing = true;

    while (this.speechQueue.length > 0) {
      const item = this.speechQueue.shift();

      // Check if session has been cancelled
      if (item.sessionId !== this.currentQueueSession) {
        if (item.onEnd) item.onEnd();
        continue;
      }

      try {
        let audioData = null;
        if (item.audioPromise) {
          audioData = await item.audioPromise;
        } else {
          audioData = await this.prefetchAudio(item);
        }

        // Check again after async fetch
        if (item.sessionId !== this.currentQueueSession) {
          if (item.onEnd) item.onEnd();
          continue;
        }

        if (audioData) {
          await this.playAudioBufferSynced({
            base64Data: audioData.base64Data,
            text: item.text,
            sessionId: item.sessionId,
            onStart: item.onStart,
            onProgress: item.onProgress,
            onEnd: item.onEnd,
            onLipSync: item.onLipSync
          });
        } else {
          await this.speakWithBrowserSynced({
            text: item.ttsText || item.cleanText,
            rawText: item.text,
            voiceSettings: item.voiceSettings,
            sessionId: item.sessionId,
            charId: item.charId,
            onStart: item.onStart,
            onProgress: item.onProgress,
            onEnd: item.onEnd,
            onLipSync: item.onLipSync
          });
        }
      } catch (err) {
        console.warn('[TTS Queue] Error playing sentence:', err);
        if (item.onEnd) item.onEnd();
      }
    }

    this.isQueueProcessing = false;
  }

  /**
   * Play base64 audio and drive synchronized character/word typing alongside Live2D lip-sync
   */
  async playAudioBufferSynced({ base64Data, text, sessionId, onStart, onProgress, onEnd, onLipSync }) {
    const ctx = this.getAudioContext();
    if (!ctx) {
      if (onEnd) onEnd();
      return;
    }

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    let arrayBuffer = bytes.buffer;
    const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const isMp3 = (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0);
    if (!isWav && !isMp3) {
      arrayBuffer = pcmToWav(bytes, 24000, 1);
    }

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const duration = audioBuffer.duration; // Exact seconds of the audio

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    this.currentSource = source;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    return new Promise((resolve) => {
      let isPlaying = true;
      const startTime = ctx.currentTime;
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      if (onStart) onStart();

      const ticker = () => {
        if (!isPlaying || sessionId !== this.currentQueueSession) return;

        const elapsed = ctx.currentTime - startTime;
        const ratio = Math.min(1.0, elapsed / duration);
        // Calculate characters revealed in exact sync with audio duration
        const charCount = Math.max(1, Math.min(text.length, Math.floor(ratio * text.length)));

        if (onProgress) {
          onProgress(text.slice(0, charCount), ratio);
        }

        // Live2D audio-driven LipSync
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        const count = Math.min(32, freqData.length);
        for (let i = 2; i < count; i++) {
          sum += freqData[i];
        }
        const avg = sum / (count - 2);
        const mouthOpen = Math.min(1.0, (avg / 115) * 1.5);
        if (onLipSync) onLipSync(mouthOpen);

        this.currentLipSyncAnim = requestAnimationFrame(ticker);
      };

      this.currentLipSyncAnim = requestAnimationFrame(ticker);

      source.onended = () => {
        isPlaying = false;
        if (this.currentLipSyncAnim) cancelAnimationFrame(this.currentLipSyncAnim);
        if (onLipSync) onLipSync(0);
        if (sessionId === this.currentQueueSession) {
          if (onProgress) onProgress(text, 1.0); // Fully reveal sentence
          if (onEnd) onEnd();
        }
        this.currentSource = null;
        resolve();
      };

      source.start(0);
    });
  }

  /**
   * Browser Web Speech API synchronized with character typing
   */
  speakWithBrowserSynced({ text, rawText, voiceSettings = {}, sessionId, charId = 'zundamon', onStart, onProgress, onEnd, onLipSync }) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        if (onProgress) onProgress(rawText, 1.0);
        if (onEnd) onEnd();
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      // Sanitize English words to Korean phonetic pronunciations so browser won't switch to English narrator
      const speechText = sanitizeKoreanTtsSpeech(text);
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'ko-KR';

      if (!this.lockedKoreanVoice && this.koreanVoices.length > 0) {
        this.initVoices();
      }
      if (this.lockedKoreanVoice) {
        utterance.voice = this.lockedKoreanVoice;
      }

      // Mild, fixed settings: slightly brighter than normal, no exaggerated effect
      utterance.pitch = 1.15;
      utterance.rate = 1.0;

      const estDuration = Math.max(0.6, (text.length / 8) / utterance.rate);
      let startTime = 0;
      let animId = null;

      utterance.onstart = () => {
        startTime = Date.now();
        if (onStart) onStart();

        const tick = () => {
          if (sessionId !== this.currentQueueSession) return;
          const elapsed = (Date.now() - startTime) / 1000;
          const ratio = Math.min(1.0, elapsed / estDuration);
          const charCount = Math.max(1, Math.min(rawText.length, Math.floor(ratio * rawText.length)));

          if (onProgress) onProgress(rawText.slice(0, charCount), ratio);

          const timeWave = Date.now() / 85;
          const mouthOpen = (Math.sin(timeWave) * 0.5 + 0.5) * (0.35 + Math.random() * 0.55);
          if (onLipSync) onLipSync(mouthOpen);

          animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);
      };

      utterance.onboundary = (e) => {
        if (e.name === 'word' && onProgress) {
          const idx = Math.min(rawText.length, e.charIndex + (e.charLength || 1));
          onProgress(rawText.slice(0, idx), idx / rawText.length);
        }
      };

      const finish = () => {
        if (animId) cancelAnimationFrame(animId);
        if (onLipSync) onLipSync(0);
        if (sessionId === this.currentQueueSession) {
          if (onProgress) onProgress(rawText, 1.0);
          if (onEnd) onEnd();
        }
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Smooth fallback typewriter when TTS is switched off
   */
  simulateTypewriterWithoutAudio({ text, sessionId, onStart, onProgress, onEnd }) {
    if (onStart) onStart();
    const durationMs = Math.max(300, text.length * 35);
    const startTime = Date.now();

    const interval = setInterval(() => {
      if (sessionId !== this.currentQueueSession) {
        clearInterval(interval);
        return;
      }
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(1.0, elapsed / durationMs);
      const chars = Math.max(1, Math.min(text.length, Math.floor(ratio * text.length)));
      if (onProgress) onProgress(text.slice(0, chars), ratio);

      if (ratio >= 1.0) {
        clearInterval(interval);
        if (onEnd) onEnd();
      }
    }, 35);
  }

  /**
   * One-shot speak helper (e.g. for message replay click)
   */
  async speak({ text, emotion = 'neutral', charId = 'zundamon', voiceSettings = null, onStart = null, onEnd = null, onLipSync = null }) {
    if (!this.ttsEnabled) {
      if (onEnd) onEnd();
      return;
    }
    const sessionId = this.startStreamSession();
    this.enqueueSentence({
      text,
      emotion,
      charId,
      voiceSettings,
      sessionId,
      onStart,
      onProgress: null,
      onEnd,
      onLipSync
    });
  }

  /**
   * OpenRouter speech models (via /api/tts serverless proxy or direct OpenRouter). Returns mp3.
   */
  async fetchOpenRouterTts({ apiKey, model, voice, text }) {
    const key = (apiKey && apiKey.trim()) || storage.getOpenRouterKey();
    const targetModel = (model && model !== 'none') ? model : 'google/gemini-3.8-flash-lite-tts';
    const targetVoice = (voice && voice !== 'default') ? voice : (storage.getOpenRouterTtsVoice() || 'Leda');

    // 1. Try /api/tts serverless proxy first
    const endpoint = '/api/tts';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (key) {
      headers['x-user-key'] = key.trim();
    }

    let response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: targetModel,
        text,
        input: text,
        voice: targetVoice
      })
    }).catch(() => null);

    // 2. Fall back to direct OpenRouter if proxy is 404 (not deployed yet) and direct key is available
    if ((!response || response.status === 404) && key) {
      response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key.trim()}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          'X-Title': 'Zundamon AI Friend'
        },
        body: JSON.stringify({
          model: targetModel,
          input: text,
          voice: targetVoice
        })
      });
    }

    if (!response || !response.ok) {
      const body = response ? await response.text().catch(() => '') : '';
      let errMsg = `TTS 요청 실패 (${response ? response.status : '네트워크 오류'})`;
      try {
        const parsed = JSON.parse(body);
        if (parsed.error?.message || parsed.error) {
          errMsg = parsed.error.message || parsed.error;
        }
      } catch (_) {
        if (body) errMsg += `: ${body.slice(0, 120)}`;
      }
      throw new Error(errMsg);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 100) throw new Error('OpenRouter에서 빈 오디오 데이터가 반환되었습니다.');

    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return { mimeType: 'audio/mpeg', base64Data: btoa(binary) };
  }

  /**
   * Test OpenRouter TTS with a short 1-second sample ("안녕 친구야! 나는 즌다몬이야!")
   */
  async testOpenRouterTts({ apiKey, model, voice }) {
    const testText = '안녕 친구야! 나는 즌다몬이야!';
    const audioData = await this.fetchOpenRouterTts({
      apiKey,
      model,
      voice,
      text: testText
    });

    await this.playAudioBufferSynced({
      base64Data: audioData.base64Data,
      text: testText,
      sessionId: Date.now(),
      onStart: () => {},
      onProgress: () => {},
      onEnd: () => {},
      onLipSync: () => {}
    });
    return true;
  }

  /**
   * Models skipped for the rest of the day after a daily-quota (429) error.
   * Stored per calendar day so they are retried automatically tomorrow.
   */
  getExhaustedModels() {
    try {
      const raw = JSON.parse(localStorage.getItem('zundamon_tts_exhausted') || '{}');
      const today = new Date().toDateString();
      return raw.day === today ? (raw.models || []) : [];
    } catch (_) {
      return [];
    }
  }

  markModelExhausted(model) {
    const models = new Set(this.getExhaustedModels());
    models.add(model);
    localStorage.setItem('zundamon_tts_exhausted', JSON.stringify({
      day: new Date().toDateString(),
      models: [...models]
    }));
  }

  /**
   * One request per reply. If a model's daily free quota is used up, try the next Gemini TTS model.
   * Throws only if every model failed (caller then uses the browser voice).
   */
  async fetchGeminiTtsWithFallback({ apiKey, preferredModel, voice, text }) {
    const chain = [preferredModel, 'gemini-3.1-flash-tts-preview', 'gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts']
      .filter((m, i, arr) => m && arr.indexOf(m) === i);
    const exhausted = this.getExhaustedModels();
    const candidates = chain.filter(m => !exhausted.includes(m));

    let lastError = new Error('No available Gemini TTS model');
    for (const model of candidates) {
      try {
        return await this.fetchGeminiTts({ apiKey, model, voice, text });
      } catch (err) {
        lastError = err;
        console.warn(`[TTS] ${model} failed:`, err.message);
        if (err.status === 429 && /retry in \d+h/i.test(err.message || '')) this.markModelExhausted(model);
      }
    }
    throw lastError;
  }

  /**
   * Fetch audio from Google Gemini TTS. Plain text + one fixed voice: no style/effect prompts,
   * so the voice stays the same every time.
   */
  async fetchGeminiTts({ apiKey, model, voice, text }) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text }]
        }
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice || "Leda"
            }
          }
        }
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const error = new Error(err.error?.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const part = data.candidates?.[0]?.content?.parts?.[0];
    const inlineData = part?.inlineData || part?.inline_data;

    if (!inlineData || !inlineData.data) {
      throw new Error('No audio returned');
    }

    return {
      mimeType: inlineData.mimeType || inlineData.mime_type || 'audio/wav',
      base64Data: inlineData.data
    };
  }

  stopSpeak() {
    this.currentQueueSession = Date.now();
    this.speechQueue = [];
    this.isQueueProcessing = false;

    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (_) {}
      this.currentSource = null;
    }
    if (this.currentLipSyncAnim) {
      cancelAnimationFrame(this.currentLipSyncAnim);
      this.currentLipSyncAnim = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundController = new SoundController();
