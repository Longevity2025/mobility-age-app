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

  const { member_id, dob, sex, assigned_coach, intake_date, answers } = payload;

  const answerMap = {
    q1:  { a: '5 or more servings/day', b: '3-4 servings/day', c: '1-2 servings/day', d: 'Less than 1 serving/day' },
    q2:  { a: '2 or more servings/day', b: '1 serving/day', c: 'Less than 1 serving/day' },
    q3:  { a: 'Almost always whole grains', b: 'More often than not', c: 'About half the time', d: 'Rarely or never' },
    q4:  { a: 'Mostly plant-based and/or fish', b: 'Mix of poultry, fish, eggs, plant-based', c: 'Mostly poultry and eggs', d: 'Mostly red or processed meat' },
    q5:  { a: '2+ times per week', b: 'Once per week', c: '1-3 times per month', d: 'Rarely or never' },
    q6:  { a: 'Olive oil or avocado oil', b: 'Mostly plant oils', c: 'Mix of plant oils and butter', d: 'Mostly butter, lard, or coconut oil' },
    q7:  { a: '4+ times per week', b: '2-3 times per week', c: 'Once per week', d: 'Rarely or never' },
    q8:  { a: 'Daily or almost daily', b: 'A few times a week', c: 'Rarely or never' },
    q9:  { a: 'Very consistent meal times', b: 'Mostly consistent', c: 'Inconsistent', d: 'No regular meal pattern' },
    q10: { a: 'Daily or almost daily', b: 'Most days (4-5/week)', c: 'Some days (2-3/week)', d: 'Rarely or never' },
    q11: { a: 'Rarely or never', b: 'Once or twice a week', c: 'Most days' },
    q12: { a: 'Rarely or never', b: '1-2 times per week', c: 'Most nights' },
    q13: { a: 'Rarely or never', b: 'Occasionally', c: 'Most meals' },
    q14: { a: 'Slow', b: 'Moderate', c: 'Fast' },
    q15: { a: '5+ times per week', b: '3-4 times per week', c: '1-2 times per week', d: 'Rarely - mostly restaurant/takeout' },
    q16: { a: 'Almost always chooses healthier options', b: 'Sometimes', c: 'Rarely or never', d: 'Rarely eats out' },
    q17: { a: '8+ cups/day', b: '5-7 cups/day', c: '3-4 cups/day', d: 'Fewer than 3 cups/day' },
    q18: { a: 'Never or almost never', b: 'A few times per week', c: 'Once daily', d: 'Multiple times per day' },
    q19: { a: 'None', b: '1-2 per day', c: '3-4 per day', d: '5 or more per day' },
    q20: { a: 'None', b: 'Within guidelines', c: 'Moderately above guidelines', d: 'Well above guidelines' },
    q21: { a: 'Rarely or never', b: 'Occasionally', c: 'Often or most days' },
    q22: { a: 'Yes, consistently', b: 'Sometimes', c: 'No - intake stays the same' },
    q23: { a: 'Rarely or never', b: 'Occasionally (1-2x/month)', c: 'Weekly', d: 'Most days' },
    q24: { a: 'Very well - reliably distinguishes hunger from cravings', b: 'Usually', c: 'Sometimes - often unclear', d: 'Rarely - struggles to distinguish' },
    q25: { a: 'Rarely or never', b: 'Occasionally', c: 'Most meals' },
    q26: { a: 'Rarely or never', b: 'Occasionally', c: 'Often or most days' },
    q27: { a: 'Rarely or never', b: 'Occasionally', c: 'Often or most days' },
    q28: { a: 'Rarely or never', b: 'Occasionally', c: 'Weekly or more' },
    q29: { a: 'Most meals', b: 'About half the time', c: 'Rarely' },
    q30: { a: 'Positive - enjoyable, feels in control', b: 'Neutral', c: 'Complicated - ongoing struggles' },
    q31: { a: 'Rarely or never', b: 'A few times per week', c: 'Once daily', d: 'Multiple times per day' },
    q32: { a: 'Rarely or never', b: 'A few times per week', c: 'Once daily', d: 'Multiple times per day' },
    q33: { a: 'Almost always', b: 'Sometimes', c: 'Rarely or never' },
    q34: { a: 'Low - actively avoids salty/processed foods', b: 'Moderate - aware and limits where can', c: 'High - lots of salty/processed/restaurant food', d: 'Not sure' },
    q35: { a: 'Very varied', b: 'Moderately varied', c: 'Fairly repetitive', d: 'Very limited' },
    q36: { a: 'Daily or almost daily', b: 'A few times per week', c: 'Rarely or never' },
    q37: { a: 'Daily or almost daily', b: 'A few times per week', c: 'Rarely or never' },
    q38: { a: 'Very intentional - plans and thinks about nutrition', b: 'Somewhat - tries but does not plan much', c: 'Not very - eats whatever is convenient' }
  };

  function readable(qKey) {
    const val = answers?.[qKey];
    if (!val) return 'not answered';
    return answerMap[qKey]?.[val] || val;
  }

  const prompt = `You are an expert nutrition coach reviewing a completed nutrition assessment. Write a personalized coaching report for the coach to use in their session with this member.

Structure your response as:
1. Nutrition Profile Summary (2-3 sentences capturing the overall picture)
2. Key Findings - 3-5 specific strengths AND areas for improvement identified from their responses
3. Prioritized Recommendations - specific, actionable steps ranked by impact (most impactful first)
4. A brief encouraging close

Be specific - reference their actual answers. Avoid generic advice. Base findings on current evidence-based nutritional science. Tone: warm, supportive, coach-like, not clinical. Do not moralize about food choices.

MEMBER: ${member_id || 'not provided'} | DOB: ${dob || 'not provided'} | Sex: ${sex || 'not provided'} | Coach: ${assigned_coach || 'not provided'} | Date: ${intake_date || 'not provided'}

DOMAIN 1 - DIETARY QUALITY:
- Vegetable intake: ${readable('q1')}
- Fruit intake: ${readable('q2')}
- Whole vs refined grains: ${readable('q3')}
- Main protein sources: ${readable('q4')}
- Fatty fish consumption: ${readable('q5')}
- Cooking fats/oils: ${readable('q6')}
- Legume consumption: ${readable('q7')}
- Nuts and seeds: ${readable('q8')}

DOMAIN 2 - EATING PATTERNS:
- Meal timing consistency: ${readable('q9')}
- Breakfast frequency: ${readable('q10')}
- Unintentional meal skipping: ${readable('q11')}
- Late-night eating: ${readable('q12')}
- Eating in front of screens: ${readable('q13')}
- Eating pace: ${readable('q14')}
- Home cooking frequency: ${readable('q15')}
- Healthier choices when eating out: ${readable('q16')}

DOMAIN 3 - HYDRATION:
- Plain water intake: ${readable('q17')}
- Sugar-sweetened beverages: ${readable('q18')}
- Caffeinated beverages: ${readable('q19')}
- Alcohol intake: ${readable('q20')}
- Dehydration symptoms: ${readable('q21')}
- Fluid adjustment for activity/heat: ${readable('q22')}

DOMAIN 4 - BEHAVIORAL & MINDFUL EATING:
- Emotional eating: ${readable('q23')}
- Hunger vs craving awareness: ${readable('q24')}
- Eating past fullness: ${readable('q25')}
- Boredom eating: ${readable('q26')}
- Food guilt or shame: ${readable('q27')}
- Restrict-then-overeat patterns: ${readable('q28')}
- Mindful eating focus: ${readable('q29')}
- Overall relationship with food: ${readable('q30')}

DOMAIN 5 - DIETARY VARIETY & LIMITS:
- Ultra-processed food intake: ${readable('q31')}
- Added sugar consumption: ${readable('q32')}
- Nutrition label reading: ${readable('q33')}
- Sodium intake: ${readable('q34')}
- Dietary variety: ${readable('q35')}
- Dairy or calcium-rich foods: ${readable('q36')}
- Fermented foods: ${readable('q37')}
- Intentionality about diet: ${readable('q38')}`;

  // Step 1: Generate report
  let report = 'Report generation failed.';
  try {
    const aiResult = await httpsPost(
      'https://api.anthropic.com/v1/messages',
      { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] })
    );
    if (aiResult.content && aiResult.content.length > 0) {
      report = aiResult.content.map(b => b.text || '').join('');
    } else if (aiResult.error) {
      report = 'API error: ' + aiResult.error.message;
    }
  } catch(err) { report = 'Report generation error: ' + err.message; }

  // Step 2: Format email
  const reportHtml = report.split('\n').map(line => {
    if (!line.trim()) return '<br>';
    if (line.match(/^#+\s/)) return '<h3 style="color:#2E6B4F;margin:1rem 0 0.4rem;">' + line.replace(/^#+\s/, '') + '</h3>';
    if (line.match(/^\d+\.\s/)) return '<p style="margin:0.4rem 0;"><strong>' + line + '</strong></p>';
    return '<p style="margin:0.3rem 0;line-height:1.6;">' + line + '</p>';
  }).join('');

  const submittedAt = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:0;background:#F4F6F9;">
  <div style="background:#2E6B4F;padding:1.5rem 2rem;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:600;">Nutrition Assessment Report</h1>
    <p style="color:#A8D8C0;margin:0.3rem 0 0;font-size:0.85rem;">Health Span Mobility Index &nbsp;&middot;&nbsp; Submitted ${submittedAt}</p>
  </div>
  <div style="background:#fff;padding:1.5rem 2rem;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:1.5rem;">
      <tr style="background:#D4EDE2;"><td colspan="2" style="padding:0.5rem 0.75rem;font-weight:600;color:#2E6B4F;">Member Information</td></tr>
      <tr style="background:#F4FAF7;"><td style="padding:0.4rem 0.75rem;color:#6B7280;width:40%;">Member ID / Name</td><td style="padding:0.4rem 0.75rem;font-weight:500;">${member_id || '&mdash;'}</td></tr>
      <tr><td style="padding:0.4rem 0.75rem;color:#6B7280;">Date of Birth</td><td style="padding:0.4rem 0.75rem;">${dob || '&mdash;'}</td></tr>
      <tr style="background:#F4FAF7;"><td style="padding:0.4rem 0.75rem;color:#6B7280;">Biological Sex</td><td style="padding:0.4rem 0.75rem;">${sex || '&mdash;'}</td></tr>
      <tr><td style="padding:0.4rem 0.75rem;color:#6B7280;">Assigned Coach</td><td style="padding:0.4rem 0.75rem;font-weight:500;">${assigned_coach || '&mdash;'}</td></tr>
      <tr style="background:#F4FAF7;"><td style="padding:0.4rem 0.75rem;color:#6B7280;">Assessment Date</td><td style="padding:0.4rem 0.75rem;">${intake_date || '&mdash;'}</td></tr>
    </table>
    <div style="border-top:2px solid #2E6B4F;padding-top:1.25rem;">
      <h2 style="color:#2E6B4F;font-size:1.1rem;margin:0 0 1rem;">Coaching Report</h2>
      ${reportHtml}
    </div>
  </div>
  <div style="background:#F4F6F9;padding:1rem 2rem;border-radius:0 0 8px 8px;border:1px solid #E2E8F0;border-top:none;">
    <p style="font-size:0.75rem;color:#9CA3AF;margin:0;">Generated by the Ovation PLP Nutrition Assessment Module &nbsp;&middot;&nbsp; For coach use only &mdash; not for distribution to members.</p>
  </div>
</body></html>`;

  // Step 3: Send via Resend
  try {
    await httpsPost(
      'https://api.resend.com/emails',
      { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
      JSON.stringify({
        from: 'HSMI Nutrition Assessment <onboarding@resend.dev>',
        to: ['mdwolf@ccphp.net', 'lizmasik@ccphp.net'],
        subject: 'Nutrition Assessment Report - ' + (member_id || 'Member') + ' - Coach: ' + (assigned_coach || 'Unassigned') + ' - ' + (intake_date || submittedAt),
        html: emailHtml
      })
    );
  } catch(err) { console.error('Email error:', err.message); }

  // DATABASE PLACEHOLDER
  // const record = { member_id, dob, sex, assigned_coach, intake_date, answers, report, submitted_at: new Date().toISOString() };
  // await httpsPost('https://your-internal-api.com/nutrition-records', { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.DB_API_KEY }, JSON.stringify(record));

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
};
