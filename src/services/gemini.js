import { storage } from './storage.js';

export const DEFAULT_MODEL = 'google/gemini-3.8-flash';

export const SUPPORTED_MODELS = [
  { id: 'google/gemini-3.8-flash', name: '✨ Google: Gemini 3.8 Flash (최신 모델 - 추천)' },
  { id: 'google/gemini-3.5-flash', name: 'Google: Gemini 3.5 Flash' },
  { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash' }
];

/**
 * Extracts [emotion:xxx] tag from response text and returns clean text + emotion
 */
export function parseEmotionAndText(rawText) {
  if (!rawText) return { text: '', emotion: 'neutral' };

  let emotion = 'neutral';
  const tagMatch = rawText.match(/\[emotion:\s*([a-zA-Z가-힣_]+)\]/i);

  if (tagMatch) {
    emotion = tagMatch[1].toLowerCase();
    if (emotion === 'blush') emotion = 'shy';
    if (emotion === 'worried') emotion = 'sad';
    if (emotion === 'excited') emotion = 'happy';
    if (emotion === 'tsundere') emotion = 'pout';
    if (emotion === 'cheer') emotion = 'happy';
    if (emotion === 'playful') emotion = 'wink';
    if (emotion === 'english' || emotion === 'study' || emotion === 'teach') emotion = 'english';
  } else {
    const lower = rawText.toLowerCase();
    if (lower.includes('영어로') || lower.includes('영단어') || lower.includes('알파벳') || lower.includes('apple') || lower.includes('school')) {
      emotion = 'english';
    } else if (lower.includes('사랑') || lower.includes('좋아') || lower.includes('단짝') || lower.includes('친구 최고')) {
      emotion = 'love';
    } else if (lower.includes('부끄') || lower.includes('빨개') || lower.includes('쑥스') || lower.includes('에헤헤')) {
      emotion = 'shy';
    } else if (lower.includes('흥') || lower.includes('삐') || lower.includes('바보') || lower.includes('토라')) {
      emotion = 'pout';
    } else if (lower.includes('깜짝') || lower.includes('놀랐') || lower.includes('대박') || lower.includes('우와')) {
      emotion = 'surprised';
    } else if (lower.includes('슬퍼') || lower.includes('힘들') || lower.includes('울') || lower.includes('속상')) {
      emotion = 'sad';
    } else if (lower.includes('윙크') || lower.includes('장난') || lower.includes('메롱')) {
      emotion = 'wink';
    } else if (lower.includes('고민') || lower.includes('생각') || lower.includes('글쎄') || lower.includes('퀴즈')) {
      emotion = 'thinking';
    } else if (lower.includes('행복') || lower.includes('기뻐') || lower.includes('신나') || lower.includes('헤헤') || lower.includes('ㅎㅎ')) {
      emotion = 'happy';
    }
  }

  const cleanText = rawText.replace(/\[emotion:\s*[a-zA-Z가-힣_]+\]/gi, '').trim();

  return {
    text: cleanText,
    emotion
  };
}

/**
 * Test API key connectivity via OpenRouter or Serverless Proxy
 */
export async function testConnection(apiKey, model = DEFAULT_MODEL) {
  const key = (apiKey && apiKey.trim()) || storage.getOpenRouterKey();

  // If no client key provided, check if server proxy has an environment key configured
  if (!key) {
    try {
      const checkRes = await fetch('/api/check');
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (data.configured) {
          return { success: true, text: 'Vercel 서버 환경 변수(OPENROUTER_API_KEY) 연결이 확인되었습니다!' };
        }
      }
    } catch (_) {}
  }

  let cleanModel = (model || DEFAULT_MODEL).trim();
  if (!cleanModel.includes('/')) cleanModel = `google/${cleanModel}`;

  const endpoint = key ? 'https://openrouter.ai/api/v1/chat/completions' : '/api/chat';
  const headers = { 'Content-Type': 'application/json' };
  if (key) {
    headers['Authorization'] = `Bearer ${key.trim()}`;
    headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    headers['X-Title'] = 'Zundamon AI Friend';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: cleanModel,
      messages: [{ role: 'user', content: '테스트 연결 확인: "OK" 라고 한 단어로만 답해줘.' }],
      max_tokens: 15
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.error || `HTTP 오류 (${response.status})`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || 'OK';
  return { success: true, text };
}

/**
 * Stream OpenRouter chat completions for friend chat (via /api/chat serverless proxy or direct key)
 */
export async function callGeminiStream({ apiKey, model, messages, systemPrompt, onChunk }) {
  const key = (apiKey && apiKey.trim()) || storage.getOpenRouterKey();

  let cleanModel = (model || DEFAULT_MODEL).trim();
  if (!cleanModel.includes('/')) cleanModel = `google/${cleanModel}`;

  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({ role: 'system', content: systemPrompt });
  }

  const recentMessages = messages.slice(-14);
  for (const m of recentMessages) {
    if (!m || (m.role !== 'user' && m.role !== 'model' && m.role !== 'assistant')) continue;
    const cleanText = (m.text || '').replace(/\[emotion:[^\]]+\]/gi, '').trim();
    if (!cleanText) continue;
    const role = (m.role === 'model' || m.role === 'assistant') ? 'assistant' : 'user';
    formattedMessages.push({ role, content: cleanText });
  }

  if (formattedMessages.length === 0 || formattedMessages[formattedMessages.length - 1].role !== 'user') {
    formattedMessages.push({ role: 'user', content: '안녕!' });
  }

  // Use /api/chat serverless proxy by default, or fallback to direct OpenRouter if client key is explicitly passed
  let endpoint = '/api/chat';
  let headers = {
    'Content-Type': 'application/json'
  };
  if (key) {
    headers['x-user-key'] = key.trim();
  }

  let response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: cleanModel,
      stream: true,
      messages: formattedMessages,
      temperature: 0.85
    })
  }).catch(() => null);

  // If server proxy returned 404 and user has a direct key, fall back to direct OpenRouter
  if ((!response || response.status === 404) && key) {
    endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key.trim()}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      'X-Title': 'Zundamon AI Friend'
    };
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cleanModel,
        stream: true,
        messages: formattedMessages,
        temperature: 0.85
      })
    });
  }

  if (!response || !response.ok) {
    const errorData = response ? await response.json().catch(() => ({})) : {};
    throw new Error(errorData.error?.message || errorData.error || `HTTP ${response ? response.status : '오류'}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullAccumulatedText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const jsonStr = trimmed.slice(6).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const chunkText = parsed.choices?.[0]?.delta?.content || '';
        if (chunkText) {
          fullAccumulatedText += chunkText;
          if (onChunk) onChunk(chunkText, fullAccumulatedText);
        }
      } catch (_) {}
    }
  }

  return fullAccumulatedText;
}
