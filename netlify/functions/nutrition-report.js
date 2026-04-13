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
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { member_id, dob, sex, assigned_coach, intake_date, answers } = payload;

  // ── ANSWER MAP ─────────────────────────────────────────────────────────────
  // Mirrors the exact option labels in index.html (Q1–Q38)
  const answerMap = {
    // Section 1 — Dietary Quality (Q1–Q8)
    q1:  { a: '5 or more servings/day', b: '3–4 servings/day', c: '1–2 servings/day', d: 'Less than 1 serving/day' },
    q2:  { a: '2 or more servings/day', b: '1 serving/day', c: 'Less than 1 serving/day' },
    q3:  { a: 'Almost always whole grains', b: 'More often than not', c: 'About half the time', d: 'Rarely or never' },
    q4:  { a: 'Mostly plant-based and/or fish', b: 'Mix of poultry, fish, eggs, red meat, some plant-based', c: 'Mostly poultry and eggs', d: 'Mostly red or processed meat' },
    q5:  { a: '2 or more times per week', b: 'Once per week', c: '1–3 times per month', d: 'Rarely or never' },
    q6:  { a: 'Olive oil or avocado oil', b: 'Mostly plant oils (canola, sunflower)', c: 'Mix of plant oils and butter', d: 'Mostly butter, lard, or coconut oil' },
    q7:  { a: '4 or more times per week', b: '2–3 times per week', c: 'Once per week', d: 'Rarely or never' },
    q8:  { a: 'Daily or almost daily', b: 'A few times a week', c: 'Rarely or never' },

    // Section 2 — Eating Patterns (Q9–Q16)
    q9:  { a: 'Very consistent meal times', b: 'Mostly consistent', c: 'Inconsistent — varies a lot', d: 'No regular meal pattern' },
    q10: { a: 'Daily or almost daily', b: 'Most days (4–5/week)', c: 'Some days (2–3/week)', d: 'Rarely or never' },
    q11: { a: 'Rarely or never', b: 'Once or twice a week', c: 'Most days' },
    q12: { a: 'Rarely or never', b: '1–2 times per week', c: 'Most nights' },
    q13: { a: 'Rarely or never', b: 'Occasionally (a few times a week)', c: 'Most meals' },
    q14: { a: 'Slow — pauses between bites', b: 'Moderate', c: 'Fast — tends to finish quickly' },
    q15: { a: '5 or more times per week', b: '3–4 times per week', c: '1–2 times per week', d: 'Rarely — most meals are out or delivery' },
    q16: { a: 'Almost always chooses healthier', b: 'Sometimes', c: 'Rarely or never', d: 'Rarely eats out' },

    // Section 3 — Hydration (Q17–Q22)
    q17: { a: '8 or more cups/day', b: '5–7 cups/day', c: '3–4 cups/day', d: 'Fewer than 3 cups/day' },
    q18: { a: 'Never or almost never', b: 'A few times per week', c: 'Once daily', d: 'Multiple times per day' },
    q19: { a: 'None', b: '1–2 per day', c: '3–4 per day', d: '5 or more per day' },
    q20: { a: 'None', b: 'Within guidelines', c: 'Moderately above guidelines', d: 'Well above guidelines' },
    q21: { a: 'Rarely or never', b: 'Occasionally', c: 'Often or most days' },
    q22: { a: 'Yes, consistently', b: 'Sometimes', c: 'No — intake stays the same' },

    // Section 4 — Behavioral & Mindful Eating (Q23–Q30)
    q23: { a: 'Rarely or never', b: 'Occasionally (once or twice a month)', c: 'Weekly', d: 'Most days' },
    q24: { a: 'Very well — reliably tells the difference', b: 'Usually', c: 'Sometimes — often unclear', d: 'Rarely — struggles to distinguish' },
    q25: { a: 'Rarely or never', b: 'Occasionally', c: 'Most meals' },
    q26: { a: 'Rarely or never', b: 'Occasionally', c: 'Often or most days' },
    q27: { a: 'Rarely or never', b: 'Occasionally', c: 'Often or most days' },
    q28: { a: 'Rarely or never', b: 'Occasionally', c: 'Weekly or more' },
    q29: { a: 'Most meals', b: 'About half the time', c: 'Rarely' },
    q30: { a: 'Positive — food is enjoyable and feels in control', b: 'Neutral — does not think about it much', c: 'Complicated — ongoing struggles or ambivalence' },

    // Section 5 — Dietary Variety & Limits (Q31–Q38)
    q31: { a: 'Rarely or never', b: 'A few times per week', c: 'Once daily', d: 'Multiple times per day' },
    q32: { a: 'Rarely or never', b: 'A few times per week', c: 'Once daily', d: 'Multiple times per day' },
    q33: { a: 'Almost always', b: 'Sometimes', c: 'Rarely or never' },
    q34: { a: 'Low — actively avoids salty/processed foods', b: 'Moderate — aware and limits where possible', c: 'High — eats a lot of salty, processed, or restaurant food', d: 'Not sure' },
    q35: { a: 'Very varied — wide range of foods regularly', b: 'Moderately varied', c: 'Fairly repetitive', d: 'Very limited range' },
    q36: { a: 'Daily or almost daily', b: 'A few times per week', c: 'Rarely or never' },
    q37: { a: 'Daily or almost daily', b: 'A few times per week', c: 'Rarely or never' },
    q38: { a: 'Very intentional — plans and thinks about nutrition regularly', b: 'Somewhat — tries to make good choices but does not plan much', c: 'Not very — eats whatever is convenient or available' }
  };

  function readable(qKey) {
    const val = answers?.[qKey];
    if (!val) return 'not answered';
    return answerMap[qKey]?.[val] || val;
  }

  const prompt = `You are an expert nutrition coach reviewing a completed nutrition assessment. Write a personalized coaching report for the coach to use in their session with this member.

Structure your response as:
1. Nutrition Profile Summary (2-3 sentences)
2. Key Findings - 2-4 specific strengths and gaps from their responses
3. Prioritized Recommendations - specific, actionable steps ranked by impact
4. A brief encouraging close

Be specific - reference their actual answers. Avoid generic advice. Tone: warm, coach-like, not clinical. Write at a 7th grade reading level. Use short sentences. Choose simple, everyday words over clinical or technical language. Use contractions. Avoid jargon.

MEMBER: ${member_id || 'not provided'} | DOB: ${dob || 'not provided'} | Sex: ${sex || 'not provided'} | Coach: ${assigned_coach || 'not provided'} | Date: ${intake_date || 'not provided'}

DIETARY QUALITY:
- Vegetable intake: ${readable('q1')}
- Fruit intake: ${readable('q2')}
- Whole grains: ${readable('q3')}
- Protein sources: ${readable('q4')}
- Fatty fish: ${readable('q5')}
- Cooking fats: ${readable('q6')}
- Legumes: ${readable('q7')}
- Nuts & seeds: ${readable('q8')}

EATING PATTERNS:
- Meal consistency: ${readable('q9')}
- Breakfast habit: ${readable('q10')}
- Meal skipping: ${readable('q11')}
- Late-night eating: ${readable('q12')}
- Screen use during meals: ${readable('q13')}
- Eating pace: ${readable('q14')}
- Home cooking frequency: ${readable('q15')}
- Healthy choices eating out: ${readable('q16')}

HYDRATION:
- Plain water intake: ${readable('q17')}
- Sugar-sweetened beverages: ${readable('q18')}
- Caffeinated beverages: ${readable('q19')}
- Alcohol: ${readable('q20')}
- Dehydration signs: ${readable('q21')}
- Fluid adjustment with activity/heat: ${readable('q22')}

BEHAVIORAL & MINDFUL EATING:
- Emotional eating: ${readable('q23')}
- Hunger vs. craving awareness: ${readable('q24')}
- Eating past fullness: ${readable('q25')}
- Boredom eating: ${readable('q26')}
- Food guilt: ${readable('q27')}
- Restrict-overeat cycle: ${readable('q28')}
- Mindful eating at meals: ${readable('q29')}
- Overall relationship with food: ${readable('q30')}

DIETARY VARIETY & LIMITS:
- Ultra-processed food: ${readable('q31')}
- Added sugar: ${readable('q32')}
- Nutrition label use: ${readable('q33')}
- Sodium intake: ${readable('q34')}
- Dietary variety: ${readable('q35')}
- Dairy/calcium-rich foods: ${readable('q36')}
- Fermented foods: ${readable('q37')}
- Overall intentionality: ${readable('q38')}`;

  // Step 1: Generate report via Anthropic
  let report = 'Report generation failed.';
  try {
    const aiResult = await httpsPost(
      'https://api.anthropic.com/v1/messages',
      {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    );
    if (aiResult.content && aiResult.content.length > 0) {
      report = aiResult.content.map(b => b.text || '').join('');
    } else if (aiResult.error) {
      report = `API error: ${aiResult.error.message}`;
    }
  } catch (err) {
    report = `Report generation error: ${err.message}`;
  }

  // Step 2: Format report as HTML email
  function mdToHtml(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  const reportHtml = report
    .split('\n')
    .map(line => {
      if (!line.trim()) return '<br>';
      if (line.match(/^#+\s/)) return `<h3 style="color:#2E6B4F;margin:1rem 0 0.4rem;">${mdToHtml(line.replace(/^#+\s/, ''))}</h3>`;
      if (line.match(/^\d+\.\s/)) return `<p style="margin:0.4rem 0;"><strong>${mdToHtml(line)}</strong></p>`;
      return `<p style="margin:0.3rem 0;line-height:1.6;">${mdToHtml(line)}</p>`;
    })
    .join('');

  const submittedAt = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:0;background:#F4F6F9;">
  <div style="background:#2E6B4F;padding:1.5rem 2rem;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:600;">Nutrition Assessment Report</h1>
    <p style="color:#C8E6D6;margin:0.3rem 0 0;font-size:0.85rem;">Ovation Personalized Longevity Plan &nbsp;&middot;&nbsp; Submitted ${submittedAt}</p>
  </div>
  <div style="background:#fff;padding:1.5rem 2rem;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:1.5rem;">
      <tr style="background:#D4EDE2;">
        <td colspan="2" style="padding:0.5rem 0.75rem;font-weight:600;color:#2E6B4F;">Member Information</td>
      </tr>
      <tr style="background:#F7FBF9;">
        <td style="padding:0.4rem 0.75rem;color:#6B7280;width:40%;">Member ID / Name</td>
        <td style="padding:0.4rem 0.75rem;font-weight:500;">${member_id || '&mdash;'}</td>
      </tr>
      <tr>
        <td style="padding:0.4rem 0.75rem;color:#6B7280;">Date of Birth</td>
        <td style="padding:0.4rem 0.75rem;">${dob || '&mdash;'}</td>
      </tr>
      <tr style="background:#F7FBF9;">
        <td style="padding:0.4rem 0.75rem;color:#6B7280;">Biological Sex</td>
        <td style="padding:0.4rem 0.75rem;">${sex || '&mdash;'}</td>
      </tr>
      <tr>
        <td style="padding:0.4rem 0.75rem;color:#6B7280;">Assigned Coach</td>
        <td style="padding:0.4rem 0.75rem;font-weight:500;">${assigned_coach || '&mdash;'}</td>
      </tr>
      <tr style="background:#F7FBF9;">
        <td style="padding:0.4rem 0.75rem;color:#6B7280;">Assessment Date</td>
        <td style="padding:0.4rem 0.75rem;">${intake_date || '&mdash;'}</td>
      </tr>
    </table>
    <div style="border-top:2px solid #2E6B4F;padding-top:1.25rem;">
      <h2 style="color:#2E6B4F;font-size:1.1rem;margin:0 0 1rem;">Coaching Report</h2>
      ${reportHtml}
    </div>
  </div>
  <div style="background:#F4F6F9;padding:1rem 2rem;border-radius:0 0 8px 8px;border:1px solid #E2E8F0;border-top:none;">
    <p style="font-size:0.75rem;color:#9CA3AF;margin:0;">Generated by the HSMI Nutrition Assessment Module</p>
  </div>
</body>
</html>`;

  // Step 3: Send email via Resend
  try {
    await httpsPost(
      'https://api.resend.com/emails',
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      JSON.stringify({
        from: 'HSMI Nutrition Assessment <onboarding@resend.dev>',
        to: ['mdwolf@ccphp.net'],
        subject: `Nutrition Assessment Report - ${member_id || 'Member'} - Coach: ${assigned_coach || 'Unassigned'} - ${intake_date || submittedAt}`,
        html: emailHtml
      })
    );
  } catch (err) {
    console.error('Email send error:', err.message);
  }

  // DATABASE PLACEHOLDER
  // When your internal DB is ready, replace this comment block with your insert call.
  //
  // const record = { member_id, dob, sex, intake_date, answers, report, submitted_at: new Date().toISOString() };
  // await httpsPost('https://your-internal-api.com/nutrition-records',
  //   { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DB_API_KEY}` },
  //   JSON.stringify(record)
  // );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true })
  };
};
