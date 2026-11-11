export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { prevWords, forbiddenWords } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'Server API Key not configured' });

  const prompt = `你現在是台灣派對遊戲《腦波連接》的核心裁判。
【上一輪場上的題目詞語】：${JSON.stringify(prevWords || [])}
【絕對禁止作為答案的禁用詞】：${JSON.stringify(forbiddenWords || [])}

請根據【上一輪場上的題目詞語】，找出一個最精準、最能把這些詞串聯起來的「最佳關聯詞 (bestWord)」。
例如：如果上一輪是「天堂、嬰兒」，最佳關聯詞應該是「天使」或「輪迴」。
規則：
1. 必須是台灣繁體中文慣用語、通俗好懂。
2. bestWord 絕對不能出現在禁用詞清單中！
3. 請同時列出 synonyms、highRel、midRel。

請嚴格只回傳純 JSON 物件（不要加 markdown 語法）：
{"bestWord":"最佳關聯詞","synonyms":["近義1","近義2"],"highRel":["高關聯1","高關聯2"],"midRel":["中關聯1","中關聯2"]}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    rawText = rawText.replace(/```json|```/g, "").trim();
    return res.status(200).json(JSON.parse(rawText));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
