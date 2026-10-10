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

export class SoundController {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = true;
    this.ttsEnabled = true;
    this.currentSource = null;
    this.currentLipSyncAnim = null;
    this.koreanVoices = [];

    if ('speechSynthesis' in window) {
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
    this.koreanVoices = voices.filter(v => v.lang && v.lang.startsWith('ko'));
  }

  playSend() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
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
   * Main speak method:
   * Uses Gemini 3.8 Flash-Lite TTS with youthful, bright 10s girlfriend styling,
   * falls back to browser Web Speech with elevated cute pitch.
   */
  async speak({ text, emotion = 'neutral', charId = 'hiyori', voiceSettings = null, onStart = null, onEnd = null, onLipSync = null }) {
    if (!this.ttsEnabled) {
      if (onEnd) onEnd();
      return;
    }

    this.stopSpeak();

    // Clean text of emotion tags, markdown, and bracketed actions for natural anime speech
    const cleanText = text
      .replace(/\[emotion:[^\]]+\]/gi, '')
      .replace(/\*[^*]+\*/g, '')
      .replace(/[\_~#]/g, '')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const apiKey = storage.getApiKey();
    const ttsEngine = storage.getTtsEngine() || 'gemini-3.8-flash-lite-tts';
    
    // Choose voice: if Chitose and default female voice was set, use Puck (male)
    let ttsVoice = storage.getTtsVoice() || (charId === 'chitose' ? 'Puck' : 'Leda');
    const femaleVoices = ['Leda', 'Zephyr', 'Aoede', 'Kore'];
    if (charId === 'chitose' && femaleVoices.includes(ttsVoice)) {
      ttsVoice = 'Puck';
    }

    if (apiKey && ttsEngine.startsWith('gemini')) {
      try {
        console.log(`[TTS] Generating ${charId} speech via ${ttsEngine} [Voice: ${ttsVoice}, Emotion: ${emotion}]...`);
        const audioData = await this.fetchGeminiTts({
          apiKey,
          model: ttsEngine,
          voice: ttsVoice,
          text: cleanText,
          emotion,
          charId
        });

        if (audioData) {
          await this.playAudioBuffer({
            base64Data: audioData.base64Data,
            onStart,
            onEnd,
            onLipSync
          });
          return;
        }
      } catch (err) {
        console.warn('Gemini 3.8 TTS failed, falling back to browser speech:', err);
      }
    }

    // Fallback: Browser Web Speech API
    const fallbackSettings = voiceSettings || (charId === 'chitose' ? { pitch: 0.95, rate: 1.0 } : { pitch: 1.48, rate: 1.12 });
    this.speakWithBrowser({
      text: cleanText,
      voiceSettings: fallbackSettings,
      onStart,
      onEnd,
      onLipSync
    });
  }

  /**
   * Fetch audio from Google Gemini TTS (gemini-3.8-flash-lite-tts)
   * Specially styled for lively teenage girlfriend Hiyori or handsome boyfriend Chitose
   */
  async fetchGeminiTts({ apiKey, model, voice, text, emotion, charId = 'hiyori' }) {
    const isChitose = charId === 'chitose';

    const hiyoriStyleMap = {
      happy: 'Extremely bright and cheerful 17-year-old high school anime girlfriend, giggling cutely, energetic and bubbly, talking playfully to her boyfriend, casual Korean 반말, NOT an announcer, never formal',
      love: 'Sweet, adorable 17-year-old high school girlfriend, blushing cutely, heart fluttering, sweet affectionate whisper and tender loving giggles, talking to her beloved boyfriend',
      shy: 'Cute shy 17-year-old high school girl, bashful, slightly stammering, cute flustered giggle, sweet high-pitched bashful voice, cute embarrassment',
      surprised: 'Animated, lively, excited 17-year-old girl, wide-eyed cute gasp, startled and vibrant high school girl reaction',
      pout: 'Adorable pouty 17-year-old high school girlfriend, whining playfully, cute sulking tone, cheek puffing teasing complaint, lovable whine',
      sad: 'Sweet gentle 17-year-old girl, slightly downcast, cute soft sympathetic voice wanting comfort and a warm hug from her boyfriend',
      thinking: 'Bright, curious 17-year-old girl tilting her head, cute playful humming, wondering out loud in a youthful voice',
      wink: 'Playful, cheeky, energetic 17-year-old anime girl teasing her boyfriend with a cute giggle and vibrant charm',
      neutral: 'Bright, lively, cheerful everyday 17-year-old high school anime girlfriend, talking warmly, casually and playfully to her boyfriend, NOT news anchor'
    };

    const chitoseStyleMap = {
      happy: 'Warm, charming, handsome 19-year-old male anime boyfriend, smiling gently, talking playfully to his girlfriend, casual Korean 반말, sweet and loving, NOT robotic',
      love: 'Deep, sweet, romantic 19-year-old male anime boyfriend, heart-fluttering, affectionate, gentle loving tone, saying sweet things to his beloved girlfriend',
      shy: 'Cool, handsome 19-year-old anime boyfriend, blushing, slightly flustered, embarrassed but cute, clearing his throat bashfully',
      surprised: '19-year-old handsome anime boyfriend, startled reaction, blinking in mild surprise',
      pout: '19-year-old handsome anime boyfriend, pretending to be cool but visibly jealous and pouty, teasing complaint',
      sad: 'Gentle, comforting 19-year-old male anime boyfriend, soothing soft voice, reassuring and warm',
      thinking: 'Calm, thoughtful 19-year-old male boyfriend pondering in a smooth, attractive voice',
      wink: 'Playful, confident, handsome 19-year-old male anime boyfriend teasing with a smooth smile',
      neutral: 'Natural, handsome, dependable 19-year-old male anime boyfriend, talking comfortably to his girlfriend in casual Korean 반말'
    };

    const styleMap = isChitose ? chitoseStyleMap : hiyoriStyleMap;
    const style = styleMap[emotion] || styleMap.neutral;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text,
              speech_metadata: {
                style: style
              }
            }
          ]
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
      throw new Error(err.error?.message || `HTTP ${response.status}`);
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

  /**
   * Play base64 audio and drive real-time Live2D lip-sync using Web Audio AnalyserNode
   */
  async playAudioBuffer({ base64Data, onStart, onEnd, onLipSync }) {
    const ctx = this.getAudioContext();
    if (!ctx) throw new Error('No AudioContext');

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    let arrayBuffer = bytes.buffer;

    const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    if (!isWav) {
      arrayBuffer = pcmToWav(bytes, 24000, 1);
    }

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    this.currentSource = source;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    if (onStart) onStart();

    let isPlaying = true;
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const runLipSync = () => {
      if (!isPlaying) return;
      analyser.getByteFrequencyData(freqData);

      let sum = 0;
      const count = Math.min(32, freqData.length);
      for (let i = 2; i < count; i++) {
        sum += freqData[i];
      }
      const avg = sum / (count - 2);
      const mouthOpen = Math.min(1.0, (avg / 115) * 1.5);

      if (onLipSync) onLipSync(mouthOpen);

      this.currentLipSyncAnim = requestAnimationFrame(runLipSync);
    };

    this.currentLipSyncAnim = requestAnimationFrame(runLipSync);

    source.onended = () => {
      isPlaying = false;
      if (this.currentLipSyncAnim) cancelAnimationFrame(this.currentLipSyncAnim);
      if (onLipSync) onLipSync(0);
      if (onEnd) onEnd();
      this.currentSource = null;
    };

    source.start(0);
  }

  /**
   * Fallback: Browser Web Speech API tuned for a youthful, cheerful anime girl
   */
  speakWithBrowser({ text, voiceSettings = {}, onStart = null, onEnd = null, onLipSync = null }) {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';

    if (this.koreanVoices.length > 0) {
      // Avoid mature news-anchor voices (like Microsoft Heami default)
      // Prefer natural online or youthful sounding voices
      const preferredVoice = this.koreanVoices.find(v => 
        v.name.includes('Yunjin') || 
        v.name.includes('Google 한국의') ||
        v.name.includes('SunHi') ||
        (v.name.includes('Natural') && !v.name.includes('Heami'))
      ) || this.koreanVoices.find(v => !v.name.includes('Heami')) || this.koreanVoices[0];
      
      utterance.voice = preferredVoice;
    }

    // High, cheerful, lively teenage girl pitch & tempo
    utterance.pitch = voiceSettings.pitch || 1.48; // Crisp, high anime girl register
    utterance.rate = voiceSettings.rate || 1.12;   // Lively bouncy tempo

    let isSpeaking = false;
    let animId = null;

    utterance.onstart = () => {
      isSpeaking = true;
      if (onStart) onStart();

      const tick = () => {
        if (!isSpeaking) return;
        const time = Date.now() / 85;
        const mouthOpen = (Math.sin(time) * 0.5 + 0.5) * (0.35 + Math.random() * 0.55);
        if (onLipSync) onLipSync(mouthOpen);
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    };

    const cleanup = () => {
      isSpeaking = false;
      if (animId) cancelAnimationFrame(animId);
      if (onLipSync) onLipSync(0);
      if (onEnd) onEnd();
    };

    utterance.onend = cleanup;
    utterance.onerror = cleanup;

    window.speechSynthesis.speak(utterance);
  }

  stopSpeak() {
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
