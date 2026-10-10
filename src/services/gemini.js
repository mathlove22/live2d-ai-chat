/**
 * Google Gemini API Client
 * Configured for Gemini Flash Lite models (e.g. gemini-2.5-flash-lite / gemini-3.5-flash-lite)
 */

export const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export const SUPPORTED_MODELS = [
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite (초고속/경량 권장)' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'custom', name: '직접 모델명 입력' }
];

/**
 * Extracts [emotion:xxx] tag from response text and returns clean text + emotion
 */
export function parseEmotionAndText(rawText) {
  if (!rawText) return { text: '', emotion: 'neutral' };

  let emotion = 'neutral';
  // Regex to catch [emotion:xxx] or [emotion: xxx]
  const tagMatch = rawText.match(/\[emotion:\s*([a-zA-Z가-힣_]+)\]/i);

  if (tagMatch) {
    emotion = tagMatch[1].toLowerCase();
    // Normalize aliases
    if (emotion === 'blush') emotion = 'shy';
    if (emotion === 'worried') emotion = 'sad';
    if (emotion === 'excited') emotion = 'happy';
    if (emotion === 'tsundere') emotion = 'pout';
    if (emotion === 'cheer') emotion = 'happy';
    if (emotion === 'playful') emotion = 'wink';
  } else {
    // Fallback: simple heuristic sentiment analysis for Korean
    const lower = rawText.toLowerCase();
    if (lower.includes('사랑') || lower.includes('좋아') || lower.includes('두근') || lower.includes('심쿵')) {
      emotion = 'love';
    } else if (lower.includes('부끄') || lower.includes('빨개') || lower.includes('쑥스')) {
      emotion = 'shy';
    } else if (lower.includes('흥') || lower.includes('삐') || lower.includes('바보') || lower.includes('토라')) {
      emotion = 'pout';
    } else if (lower.includes('깜짝') || lower.includes('놀랐') || lower.includes('대박') || lower.includes('헉')) {
      emotion = 'surprised';
    } else if (lower.includes('슬퍼') || lower.includes('힘들') || lower.includes('울') || lower.includes('우울')) {
      emotion = 'sad';
    } else if (lower.includes('윙크') || lower.includes('장난') || lower.includes('메롱')) {
      emotion = 'wink';
    } else if (lower.includes('고민') || lower.includes('생각') || lower.includes('글쎄')) {
      emotion = 'thinking';
    } else if (lower.includes('행복') || lower.includes('기뻐') || lower.includes('헤헤') || lower.includes('ㅎㅎ')) {
      emotion = 'happy';
    }
  }

  // Remove the tag from the user-facing text
  const cleanText = rawText.replace(/\[emotion:\s*[a-zA-Z가-힣_]+\]/gi, '').trim();

  return {
    text: cleanText,
    emotion
  };
}

/**
 * Test API key connectivity
 */
export async function testConnection(apiKey, model = DEFAULT_MODEL) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API 키가 입력되지 않았습니다.');
  }

  const cleanModel = (model || DEFAULT_MODEL).trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: '테스트 연결 확인: "OK" 라고 한 단어로만 답해줘.' }]
        }
      ],
      generationConfig: { maxOutputTokens: 20 }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP 오류 (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return { success: true, text };
}

/**
 * Stream or call Gemini API for girlfriend chat
 */
export async function callGeminiStream({ apiKey, model, messages, systemPrompt, onChunk }) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('NO_API_KEY');
  }

  const cleanModel = (model || DEFAULT_MODEL).trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey.trim())}`;

  // Format messages for Gemini API
  const formattedContents = [];
  const recentMessages = messages.slice(-14);

  for (const m of recentMessages) {
    if (m.role === 'user' || m.role === 'model') {
      formattedContents.push({
        role: m.role,
        parts: [{ text: m.text }]
      });
    }
  }

  if (formattedContents.length === 0 || formattedContents[formattedContents.length - 1].role !== 'user') {
    formattedContents.push({
      role: 'user',
      parts: [{ text: '안녕!' }]
    });
  }

  const payload = {
    contents: formattedContents,
    generationConfig: {
      temperature: 0.88,
      topP: 0.95,
      maxOutputTokens: 1000
    }
  };

  if (systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errMessage = errorData.error?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(errMessage);
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
    buffer = lines.pop(); // Retain incomplete line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const jsonStr = trimmed.slice(6).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (chunkText) {
          fullAccumulatedText += chunkText;
          if (onChunk) onChunk(chunkText, fullAccumulatedText);
        }
      } catch (_) {}
    }
  }

  return fullAccumulatedText;
}
