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
    q1:  { a: 'Never', b: 'Almost never', c: 'Sometimes', d: 'Fairly often', e: 'Very often' },
    q2:  { a: 'Never', b: 'Almost never', c: 'Sometimes', d: 'Fairly often', e: 'Very often' },
    q3:  { a: 'Very confident', b: 'Mostly confident', c: 'Somewhat confident', d: 'Not very confident', e: 'Not confident at all' },
    q4:  { a: 'Never', b: 'Almost never', c: 'Sometimes', d: 'Fairly often', e: 'Very often' },
    q5:  { a: '1 - Very low', b: '2 - Low', c: '3 - Moderate', d: '4 - High', e: '5 - Very high' },
    q6:  { a: 'Never or rarely', b: 'Once or twice a month', c: 'Once or twice a week', d: 'Several times a week', e: 'Daily or almost daily' },
    q7:  { a: 'Never or rarely', b: 'Once or twice a month', c: 'Once or twice a week', d: 'Several times a week', e: 'Daily or almost daily' },
    q8:  { a: 'Never or rarely', b: 'Once or twice a month', c: 'Once or twice a week', d: 'Several times a week', e: 'Daily or almost daily' },
    q9:  { a: 'Never or rarely', b: 'Once or twice a month', c: 'Once or twice a week', d: 'Several times a week', e: 'Almost every night' },
    q10: { a: 'High - energized most of the day', b: 'Moderate - some dips but generally okay', c: 'Low - often drained by midday', d: 'Very low - exhausted most of the time' },
    q11: { a: 'Never or rarely', b: 'Sometimes', c: 'Fairly often', d: 'Very often' },
    q12: { a: 'Never or rarely', b: 'Sometimes', c: 'Fairly often', d: 'Very often' },
    q13: { a: 'Never', b: 'Rarely', c: 'Sometimes', d: 'Often' },
    q14: { a: 'Never or rarely', b: 'Sometimes', c: 'Fairly often', d: 'Very often' },
    q15: { a: 'Mostly positive and stable', b: 'Somewhat variable but generally okay', c: 'Frequently low, flat, or anxious', d: 'Persistently low - noticeably affecting my life' },
    q16: { a: 'Regularly - key part of how I cope', b: 'Sometimes - when I remember or have time', c: 'Rarely', d: 'Never' },
    q17: { a: 'Yes - daily or near-daily practice', b: 'Occasionally - a few times a week', c: 'Rarely - only when very stressed', d: "No - I don't use these techniques" },
    q18: { a: 'Regularly - strong social support', b: 'Sometimes - when it gets bad enough', c: 'Rarely - keep it to myself', d: 'Never - prefer to handle it alone' },
    q19: { a: 'Very effectively - good tools and use them', b: 'Somewhat effectively - could do better', c: 'Not very effectively - stress often wins', d: 'Not at all - no control over it' },
    q20: { a: 'Plenty - regular part of my week', b: "Some - but not as much as I'd like", c: 'Very little - stress crowds it out', d: 'None - rarely make time for myself' },
    q21: { a: 'Manageable - handle it comfortably', b: 'Busy but sustainable', c: 'Heavy - often stretched thin', d: "Overwhelming - can't keep up" },
    q22: { a: 'Very well - switch off easily', b: 'Somewhat - takes effort but manage', c: 'Poorly - work thoughts follow me home', d: "Not at all - always 'on'" },
    q23: { a: 'Very satisfied', b: 'Mostly satisfied', c: 'Somewhat dissatisfied', d: 'Very dissatisfied' },
    q24: { a: 'Almost always', b: 'Often', c: 'Sometimes', d: 'Rarely or never' },
    q25: { a: 'Work or career pressure', b: 'Financial stress', c: 'Relationship or family stress', d: 'Health concerns (mine or others\')', e: 'General feeling of being overwhelmed', f: 'No specific concern - generally manageable' }
  };

  function readable(qKey) {
    const val = answers?.[qKey];
    if (!val) return 'not answered';
    return answerMap[qKey]?.[val] || val;
  }

  const prompt = `You are an expert stress management and wellness coach reviewing a completed stress assessment. Write a personalized coaching report for the coach to use in their session with this member.

Structure your response as:
1. Stress Profile Summary (2-3 sentences capturing the overall picture)
2. Key Findings - 2-4 specific issues identified from their responses
3. Prioritized Recommendations - specific, actionable steps ranked by impact
4. A brief encouraging close

Be specific - reference their actual answers. Avoid generic advice. Tone: warm, supportive, coach-like, not clinical. Write at a 7th grade reading level. Use short sentences. Choose simple, everyday words over clinical or technical language. Use contractions. Avoid jargon.

MEMBER: ${member_id || 'not provided'} | DOB: ${dob || 'not provided'} | Sex: ${sex || 'not provided'} | Coach: ${assigned_coach || 'not provided'} | Date: ${intake_date || 'not provided'}

PERCEIVED STRESS:
- Feeling out of control: ${readable('q1')}
- Feeling overwhelmed: ${readable('q2')}
- Confidence handling problems: ${readable('q3')}
- Feeling nervous/anxious: ${readable('q4')}
- Overall stress rating (1-5): ${readable('q5')}

PHYSICAL SYMPTOMS:
- Headaches/migraines: ${readable('q6')}
- Muscle tension/pain: ${readable('q7')}
- GI symptoms from stress: ${readable('q8')}
- Stress disrupting sleep: ${readable('q9')}
- Overall energy level: ${readable('q10')}

EMOTIONAL & BEHAVIORAL:
- Irritability/frustration: ${readable('q11')}
- Emotional withdrawal: ${readable('q12')}
- Using food/alcohol to cope: ${readable('q13')}
- Procrastination/avoidance: ${readable('q14')}
- General mood past month: ${readable('q15')}

COPING STRATEGIES:
- Exercise for stress relief: ${readable('q16')}
- Relaxation/mindfulness practice: ${readable('q17')}
- Social support use: ${readable('q18')}
- Overall stress management effectiveness: ${readable('q19')}
- Time for enjoyable activities: ${readable('q20')}

WORK & LIFE BALANCE:
- Current workload: ${readable('q21')}
- Ability to disconnect: ${readable('q22')}
- Work-life balance satisfaction: ${readable('q23')}
- Time for recovery/renewal: ${readable('q24')}
- Primary stress concern: ${readable('q25')}`;

  // Step 1: Generate report via Anthropic
  let report = 'Report generation failed.';
  try {
    const aiResult = await httpsPost(
      'https://api.anthropic.com/v1/messages',
      { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
    );
    if (aiResult.content && aiResult.content.length > 0) {
      report = aiResult.content.map(b => b.text || '').join('');
    } else if (aiResult.error) {
      report = 'API error: ' + aiResult.error.message;
    }
  } catch(err) { report = 'Report generation error: ' + err.message; }

  // Step 2: Format email HTML
  function mdToHtml(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  const reportHtml = report.split('\n').map(line => {
    if (!line.trim()) return '<br>';
    if (line.match(/^#+\s/)) return '<h3 style="color:#3D3A8A;margin:1rem 0 0.4rem;">' + mdToHtml(line.replace(/^#+\s/, '')) + '</h3>';
    if (line.match(/^\d+\.\s/)) return '<p style="margin:0.4rem 0;"><strong>' + mdToHtml(line) + '</strong></p>';
    return '<p style="margin:0.3rem 0;line-height:1.6;">' + mdToHtml(line) + '</p>';
  }).join('');

  const submittedAt = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:0;background:#F4F6F9;">
  <div style="background:#3D3A8A;padding:1.5rem 2rem;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:600;">Stress Assessment Report</h1>
    <p style="color:#C8C6F5;margin:0.3rem 0 0;font-size:0.85rem;">Ovation Personalized Longevity Plan &nbsp;&middot;&nbsp; Submitted ${submittedAt}</p>
  </div>
  <div style="background:#fff;padding:1.5rem 2rem;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:1.5rem;">
      <tr style="background:#E0DFFA;"><td colspan="2" style="padding:0.5rem 0.75rem;font-weight:600;color:#3D3A8A;">Member Information</td></tr>
      <tr style="background:#F7F7FD;"><td style="padding:0.4rem 0.75rem;color:#6B7280;width:40%;">Member ID / Name</td><td style="padding:0.4rem 0.75rem;font-weight:500;">${member_id || '&mdash;'}</td></tr>
      <tr><td style="padding:0.4rem 0.75rem;color:#6B7280;">Date of Birth</td><td style="padding:0.4rem 0.75rem;">${dob || '&mdash;'}</td></tr>
      <tr style="background:#F7F7FD;"><td style="padding:0.4rem 0.75rem;color:#6B7280;">Biological Sex</td><td style="padding:0.4rem 0.75rem;">${sex || '&mdash;'}</td></tr>
      <tr><td style="padding:0.4rem 0.75rem;color:#6B7280;">Assigned Coach</td><td style="padding:0.4rem 0.75rem;font-weight:500;">${assigned_coach || '&mdash;'}</td></tr>
      <tr style="background:#F7F7FD;"><td style="padding:0.4rem 0.75rem;color:#6B7280;">Assessment Date</td><td style="padding:0.4rem 0.75rem;">${intake_date || '&mdash;'}</td></tr>
    </table>
    <div style="border-top:2px solid #3D3A8A;padding-top:1.25rem;">
      <h2 style="color:#3D3A8A;font-size:1.1rem;margin:0 0 1rem;">Coaching Report</h2>
      ${reportHtml}
    </div>
  </div>
  <div style="background:#F4F6F9;padding:1rem 2rem;border-radius:0 0 8px 8px;border:1px solid #E2E8F0;border-top:none;">
    <p style="font-size:0.75rem;color:#9CA3AF;margin:0;">Generated by the Ovation PLP Stress Assessment Module &nbsp;&middot;&nbsp; For coach use only &mdash; not for distribution to members.</p>
  </div>
</body></html>`;

  // Step 3: Send via Resend
  try {
    await httpsPost(
      'https://api.resend.com/emails',
      { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
      JSON.stringify({
        from: 'HSMI Stress Assessment <onboarding@resend.dev>',
        to: ['mdwolf@ccphp.net'],
        subject: 'Stress Assessment Report - ' + (member_id || 'Member') + ' - Coach: ' + (assigned_coach || 'Unassigned') + ' - ' + (intake_date || submittedAt),
        html: emailHtml
      })
    );
  } catch(err) { console.error('Email error:', err.message); }

  // DATABASE PLACEHOLDER
  // const record = { member_id, dob, sex, assigned_coach, intake_date, answers, report, submitted_at: new Date().toISOString() };
  // await httpsPost('https://your-internal-api.com/stress-records', { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.DB_API_KEY }, JSON.stringify(record));

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
};
