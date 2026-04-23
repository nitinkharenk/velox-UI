require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function testGemini() {
  const prompt = `OUTPUT — return this exact JSON structure:
{
  "name": "...",
  "description": "..."
}

INPUT:
{"name":"Synapse AI Landing Page","type":"hover","category":"template","tech":["Tailwind","Framer Motion","GSAP"],"complexity":"high","feel":"Ensure the UI is visually polished"}`;

  const res = await fetch(
    `${GEMINI_BASE}/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4000,
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

testGemini();
