// ===== api/chat.js (Serverless funktion) =====
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

export default async function handler(req, res) {
  // Endast POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Endast POST tillåtet' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Meddelande krävs' });
    }

    // Läs dokumentet från fil
    const documentPath = path.join(process.cwd(), 'document.txt');
    let documentContent;
    
    try {
      documentContent = fs.readFileSync(documentPath, 'utf-8');
    } catch (error) {
      console.error('Kunde inte läsa dokument:', error);
      return res.status(500).json({ error: 'Kunde inte läsa dokumentet' });
    }

    // Skapa system prompt
    const systemPrompt = `Du är en hjälpsam assistent som endast svarar baserat på följande dokument. Svara alltid på svenska och var tydlig med att du baserar ditt svar på det givna dokumentet. Om frågan inte kan besvaras utifrån dokumentet, säg det tydligt.

DOKUMENT:
${documentContent}

Besvara endast frågor som kan besvaras utifrån informationen i dokumentet ovan. Om informationen inte finns i dokumentet, säg att du inte kan svara på det baserat på det givna dokumentet.`;

    // Anropa OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error('OpenAI API fel:', error);
      return res.status(500).json({ error: 'AI-tjänsten är inte tillgänglig just nu' });
    }

    const data = await openaiResponse.json();
    const aiResponse = data.choices[0].message.content;

    res.status(200).json({ response: aiResponse });

  } catch (error) {
    console.error('Serverfel:', error);
    res.status(500).json({ error: 'Ett oväntat fel uppstod' });
  }
}
