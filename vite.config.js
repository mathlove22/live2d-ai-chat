import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.OPENROUTER_API_KEY || '';

  return {
    base: './',
    build: {
      outDir: 'dist',
      assetsDir: 'assets'
    },
    plugins: [
      {
        name: 'local-api-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/check') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ configured: !!apiKey }));
              return;
            }

            if (req.url === '/api/chat' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr || '{}');
                  const keyToUse = apiKey || req.headers['x-user-key'] || '';
                  if (!keyToUse) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify({ error: '.env.local 파일에 OPENROUTER_API_KEY가 설정되지 않았습니다.' }));
                    return;
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

                  const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${keyToUse.trim()}`,
                      'HTTP-Referer': 'http://localhost:5173',
                      'X-Title': 'Zundamon AI Friend'
                    },
                    body: JSON.stringify({
                      model,
                      stream: true,
                      messages: formattedMessages,
                      temperature: body.temperature ?? 0.85
                    })
                  });

                  res.statusCode = orRes.status;
                  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
                  res.setHeader('Cache-Control', 'no-cache');
                  res.setHeader('Connection', 'keep-alive');

                  const reader = orRes.body.getReader();
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(value);
                  }
                  res.end();
                } catch (e) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
              return;
            }

            if (req.url === '/api/tts' && req.method === 'POST') {
              let bodyStr = '';
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', async () => {
                try {
                  const body = JSON.parse(bodyStr || '{}');
                  const keyToUse = apiKey || req.headers['x-user-key'] || '';
                  if (!keyToUse) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                    res.end(JSON.stringify({ error: '.env.local 파일에 OPENROUTER_API_KEY가 설정되지 않았습니다.' }));
                    return;
                  }

                  const text = body.text || body.input || '';
                  const model = body.model || 'google/gemini-3.8-flash-lite-tts';
                  const voice = body.voice || 'Leda';

                  const orRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${keyToUse.trim()}`,
                      'HTTP-Referer': 'http://localhost:5173',
                      'X-Title': 'Zundamon AI Friend'
                    },
                    body: JSON.stringify({
                      model,
                      input: text,
                      voice
                    })
                  });

                  res.statusCode = orRes.status;
                  res.setHeader('Content-Type', 'audio/mpeg');
                  const buffer = Buffer.from(await orRes.arrayBuffer());
                  res.end(buffer);
                } catch (e) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
              return;
            }

            next();
          });
        }
      }
    ]
  };
});
