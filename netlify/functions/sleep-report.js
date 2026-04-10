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

  const answerMap = {
    q1:  { a: 'Before 9:00 PM', b: '9:00-10:30 PM', c: '10:30 PM-12:00 AM', d: 'After 12:00 AM' },
    q2:  { a: 'Before 5:30 AM', b: '5:30-7:00 AM', c: '7:00-8:30 AM', d: 'After 8:30 AM' },
    q3:  { a: 'Less than 5 hours', b: '5-6 hours', c: '6-7 hours', d: '7-8 hours', e: 'More than 8 hours' },
    q4:  { a: 'Same schedule as weekdays', b: 'Up to 1 hour later', c: '1-2 hours later', d: 'More than 2 hours later' },
    q5:  { a: 'Never', b: 'Rarely (once a week or less)', c: 'Sometimes (2-3x per week)', d: 'Most days' },
    q6:  { a: 'Under 20 minutes', b: '20-45 minutes', c: '45-90 minutes', d: 'Over 90 minutes', e: "I don't nap" },
    q7:  { a: 'Yes, I feel well-rested', b: 'Mostly, but could use more', c: 'No, I rarely feel rested', d: "I'm not sure" },
    q8:  { a: 'Under 10 minutes', b: '10-20 minutes', c: '20-45 minutes', d: 'Over 45 minutes' },
    q9:  { a: 'Rarely or never', b: 'Once, fall back easily', c: 'Multiple times, fall back easily', d: 'Multiple times, struggle to return' },
    q10: { a: '1 - Very poor', b: '2 - Poor', c: '3 - Fair', d: '4 - Good', e: '5 - Excellent' },
    q11: { a: 'Very restless, lots of tossing/turning', b: 'Somewhat restless', c: 'Mostly still', d: 'Very still and deep' },
    q12: { a: "Yes - told I snore loudly or stop breathing", b: 'Mild snoring only', c: 'Not that I know of', d: 'Sleep alone, unsure' },
    q13: { a: 'Refreshed and alert', b: 'Groggy but okay within 30 min', c: 'Fatigued - takes over an hour', d: 'Exhausted regardless of sleep amount' },
    q14: { a: 'Steady energy all day', b: 'Mild afternoon dip', c: 'Significant afternoon crash', d: 'Fatigued most of the day' },
    q15: { a: 'Sharp and focused', b: 'Occasional brain fog', c: 'Frequent difficulty concentrating', d: 'Significant impairment most days' },
    q16: { a: 'Stable and positive', b: 'Somewhat irritable or flat', c: 'Noticeably moody or anxious', d: 'Significantly affected most days' },
    q17: { a: 'None', b: 'Morning only (before noon)', c: 'Afternoon (before 3 PM)', d: 'Evening or unpredictable' },
    q18: { a: 'Never', b: 'Rarely', c: '1-2x per week near bedtime', d: 'Most nights' },
    q19: { a: 'No screens within 1 hour of bed', b: 'Screens until 30 min before bed', c: 'Screens right up until sleep', d: 'Screens in bed until falling asleep' },
    q20: { a: 'No regular exercise', b: '1-2x per week', c: '3-4x per week', d: '5+ times per week' },
    q21: { a: 'Morning (before noon)', b: 'Afternoon', c: 'Evening (after 7 PM)', d: "I don't exercise regularly" },
    q22: { a: 'Cool, dark, and quiet', b: 'Mostly good, minor issues', c: 'Too warm, bright, or noisy', d: 'Significant environmental issues' },
    q23: { a: 'Consistent wind-down routine', b: 'Sometimes wind down, sometimes not', c: 'Usually stimulated until bed', d: 'No real routine' },
    q24: { a: 'Rarely affects my sleep', b: 'Occasionally', c: 'Frequently', d: 'Almost every night' },
    q25: { a: 'Difficulty falling asleep', b: 'Staying asleep / nighttime waking', c: 'Not feeling rested despite adequate sleep', d: 'Sleep schedule / consistency', e: 'Daytime fatigue or concentration', f: 'No specific concern' }
  };

  function readable(qKey) {
    const val = answers?.[qKey];
    if (!val) return 'not answered';
    return answerMap[qKey]?.[val] || val;
  }

  const prompt = `You are an expert sleep health coach reviewing a completed sleep assessment. Write a personalized coaching report for the coach to use in their session with this member.

Structure your response as:
1. Sleep Profile Summary (2-3 sentences)
2. Key Findings - 2-4 specific issues from their responses
3. Prioritized Recommendations - specific, actionable steps ranked by impact
4. A brief encouraging close

Be specific - reference their actual answers. Avoid generic advice. Tone: warm, coach-like, not clinical. Write at a 7th grade reading level. Use short sentences. Choose simple, everyday words over clinical or technical language. Use contractions. Avoid jargon.

MEMBER: ${member_id || 'not provided'} | DOB: ${dob || 'not provided'} | Sex: ${sex || 'not provided'} | Coach: ${assigned_coach || 'not provided'} | Date: ${intake_date || 'not provided'}

SLEEP SCHEDULE & DURATION:
- Bedtime: ${readable('q1')}
- Wake time: ${readable('q2')}
- Total sleep: ${readable('q3')}
- Weekend shift: ${readable('q4')}
- Napping: ${readable('q5')} / ${readable('q6')}
- Satisfied with duration: ${readable('q7')}

SLEEP QUALITY:
- Time to fall asleep: ${readable('q8')}
- Nighttime waking: ${readable('q9')}
- Self-rated quality: ${readable('q10')}
- Restlessness: ${readable('q11')}
- Snoring/apnea: ${readable('q12')}

DAYTIME EFFECTS:
- Morning feel: ${readable('q13')}
- Daytime energy: ${readable('q14')}
- Concentration: ${readable('q15')}
- Mood: ${readable('q16')}

HABITS & ENVIRONMENT:
- Caffeine: ${readable('q17')}
- Alcohol: ${readable('q18')}
- Screens before bed: ${readable('q19')}
- Exercise: ${readable('q20')} / ${readable('q21')}
- Bedroom: ${readable('q22')}
- Pre-bed routine: ${readable('q23')}
- Stress impact: ${readable('q24')}

PRIMARY CONCERN: ${readable('q25')}`;

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
  const reportHtml = report
    .split('\n')
    .map(line => {
      if (!line.trim()) return '<br>';
      if (line.match(/^#+\s/)) return `<h3 style="color:#1A6B8A;margin:1rem 0 0.4rem;">${line.replace(/^#+\s/, '')}</h3>`;
      if (line.match(/^\d+\.\s/)) return `<p style="margin:0.4rem 0;"><strong>${line}</strong></p>`;
      return `<p style="margin:0.3rem 0;line-height:1.6;">${line}</p>`;
    })
    .join('');

  const submittedAt = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

  const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:0;background:#F4F6F9;">
  <div style="background:#1A6B8A;padding:1.5rem 2rem;border-radius:8px 8px 0 0;">
    <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:600;">Sleep Assessment Report</h1>
    <p style="color:#C8E6F0;margin:0.3rem 0 0;font-size:0.85rem;">Health Span Mobility Index &nbsp;&middot;&nbsp; Submitted ${submittedAt}</p>
  </div>
  <div style="background:#fff;padding:1.5rem 2rem;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
    <table style="width:100%;border-collapse:collapse;font-size:0.85rem;margin-bottom:1.5rem;">
      <tr style="background:#D0E8F2;">
        <td colspan="2" style="padding:0.5rem 0.75rem;font-weight:600;color:#1A6B8A;">Member Information</td>
      </tr>
      <tr style="background:#F7FBFD;">
        <td style="padding:0.4rem 0.75rem;color:#6B7280;width:40%;">Member ID / Name</td>
        <td style="padding:0.4rem 0.75rem;font-weight:500;">${member_id || '&mdash;'}</td>
      </tr>
      <tr>
        <td style="padding:0.4rem 0.75rem;color:#6B7280;">Date of Birth</td>
        <td style="padding:0.4rem 0.75rem;">${dob || '&mdash;'}</td>
      </tr>
      <tr style="background:#F7FBFD;">
        <td style="padding:0.4rem 0.75rem;color:#6B7280;">Biological Sex</td>
        <td style="padding:0.4rem 0.75rem;">${sex || '&mdash;'}</td>
      </tr>
      <tr style="background:#F7FBFD;">
        <td style="padding:0.4rem 0.75rem;color:#6B7280;">Assigned Coach</td>
        <td style="padding:0.4rem 0.75rem;font-weight:500;">${assigned_coach || '&mdash;'}</td>
      </tr>
      <tr>
        <td style="padding:0.4rem 0.75rem;color:#6B7280;">Assessment Date</td>
        <td style="padding:0.4rem 0.75rem;">${intake_date || '&mdash;'}</td>
      </tr>
    </table>
    <div style="border-top:2px solid #1A6B8A;padding-top:1.25rem;">
      <h2 style="color:#1A6B8A;font-size:1.1rem;margin:0 0 1rem;">Coaching Report</h2>
      ${reportHtml}
    </div>
  </div>
  <div style="background:#F4F6F9;padding:1rem 2rem;border-radius:0 0 8px 8px;border:1px solid #E2E8F0;border-top:none;">
    <p style="font-size:0.75rem;color:#9CA3AF;margin:0;">Generated by the Ovation PLP Sleep Assessment Module</p>
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
        from: 'HSMI Sleep Assessment <onboarding@resend.dev>',
        to: ['mdwolf@ccphp.net'],
        subject: `Sleep Assessment Report - ${member_id || 'Member'} - Coach: ${assigned_coach || 'Unassigned'} - ${intake_date || submittedAt}`,
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
  // await httpsPost('https://your-internal-api.com/sleep-records',
  //   { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DB_API_KEY}` },
  //   JSON.stringify(record)
  // );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true })
  };
};
