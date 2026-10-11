export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-key',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY || req.headers.get('x-user-key');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: '서버에 OpenRouter API Key가 설정되지 않았습니다. Vercel 환경 변수(OPENROUTER_API_KEY)를 확인해주세요.' }),
        { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    let model = (body.model || 'google/gemini-3.8-flash').trim();
    if (!model.includes('/')) model = `google/${model}`;

    const formattedMessages = [];
    if (body.systemPrompt) {
      formattedMessages.push({ role: 'system', content: body.systemPrompt });
    }

    const messages = body.messages || [];
    const recentMessages = messages.slice(-14);
    for (const m of recentMessages) {
      if (!m || (m.role !== 'user' && m.role !== 'model' && m.role !== 'assistant')) continue;
      const cleanText = (m.text || m.content || '').replace(/\[emotion:[^\]]+\]/gi, '').trim();
      if (!cleanText) continue;
      const role = (m.role === 'model' || m.role === 'assistant') ? 'assistant' : 'user';
      formattedMessages.push({ role, content: cleanText });
    }

    if (formattedMessages.length === 0 || formattedMessages[formattedMessages.length - 1].role !== 'user') {
      formattedMessages.push({ role: 'user', content: '안녕!' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': req.headers.get('origin') || 'https://vercel.app',
        'X-Title': 'Zundamon AI Friend',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: formattedMessages,
        temperature: body.temperature ?? 0.85,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, {
        status: response.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
