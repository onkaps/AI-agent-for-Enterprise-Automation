const axios = require('axios');
require('dotenv').config();



async function handleGeminiExtraction(inputText) {
  const API_KEY = process.env.GEMINI_API_KEY;

  console.log(API_KEY);
  const prompt = `
  Extract the following from this input: 
  - intent (assign or revoke),
  - email
  - list of groups

  Respond in JSON:
  {
    "intent": "assign",
    "email": "john@example.com",
    "groups": ["Developers", "Admins"]
  }

  Input: "${inputText}"
  `;

  const response = await axios.post(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    {
      contents: [{ parts: [{ text: prompt }] }]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      }
    }
  );

  try {
    const raw = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    return result;
  } catch (e) {
    console.error('[GeminiParser] ❌ Failed to parse Gemini response:', e);
    return { intent: null, email: null, groups: [] };
  }
}

module.exports = { handleGeminiExtraction };
