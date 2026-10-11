export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const hasKey = !!process.env.OPENROUTER_API_KEY;
  return new Response(JSON.stringify({ configured: hasKey }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
