const https = require('https');

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { name, age, sex, mobAge, vo2, vo2Pct, tug, tugPct, sit, sitPct, gripPct, swayPct, mtpPct } = payload;

  function ordinal(n) {
    n = Math.round(Number(n));
    var s = ['th','st','nd','rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  const prompt = `You are a health and fitness coach writing personalized recommendations for a client.
Write at a Flesch-Kincaid 6th to 8th grade reading level. Use short sentences and plain words. Do not use jargon. Be warm and encouraging but honest.

Client: ${name || 'Member'}, Age ${age}, ${sex}
Mobility Age Equivalent: ${mobAge ? Number(mobAge).toFixed(1) : 'N/A'}

Test results:
- VO2 Max: ${vo2} ml/kg/min, approx ${ordinal(vo2Pct)} percentile (Z-score estimate)
- Timed Up & Go (TUG): ${tug} seconds, approx ${ordinal(tugPct)} percentile (Z-score estimate)
- Sit & Reach: ${sit} inches, approx ${ordinal(sitPct)} percentile (Z-score estimate)
- Grip Strength: ${ordinal(gripPct)} percentile (vendor-normed)
- Postural Sway: ${ordinal(swayPct)} percentile (vendor-normed)
- Mid-Thigh Pull: ${ordinal(mtpPct)} percentile (vendor-normed)

Write exactly 6 recommendation sections, one per test, in this order:
1. VO2 Max  2. TUG  3. Sit & Reach  4. Grip Strength  5. Postural Sway  6. Mid-Thigh Pull

Return ONLY a valid JSON array with no markdown fences and no extra text, in this exact shape:
[
  {"test":"VO2 Max","score":"${vo2} ml/kg/min","pct":${vo2Pct},"est":true,"rec":"2-4 sentences of plain-language recommendations."},
  {"test":"TUG","score":"${tug} seconds","pct":${tugPct},"est":true,"rec":"..."},
  {"test":"Sit & Reach","score":"${sit} inches","pct":${sitPct},"est":true,"rec":"..."},
  {"test":"Grip Strength","score":"${ordinal(gripPct)} percentile","pct":${gripPct},"est":false,"rec":"..."},
  {"test":"Postural Sway","score":"${ordinal(swayPct)} percentile","pct":${swayPct},"est":false,"rec":"..."},
  {"test":"Mid-Thigh Pull","score":"${ordinal(mtpPct)} percentile","pct":${mtpPct},"est":false,"rec":"..."}
]`;

  let recs = null;
  try {
    console.log('Calling Anthropic API for HSMI recommendations...');
    const aiResult = await httpsPost(
      'https://api.anthropic.com/v1/messages',
      {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    );
    if (aiResult.error) {
      console.log('Anthropic error:', JSON.stringify(aiResult.error));
      return { statusCode: 500, body: JSON.stringify({ error: aiResult.error.message }) };
    }
    if (aiResult.content && aiResult.content.length > 0) {
      let text = aiResult.content.map(b => b.text || '').join('');
      text = text.replace(/```json|```/g, '').trim();
      recs = JSON.parse(text);
      console.log('Recommendations generated successfully.');
    }
  } catch(err) {
    console.log('Error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, recs: recs })
  };
};
