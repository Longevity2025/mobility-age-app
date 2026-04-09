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

  const { member_id, dob, sex, intake_date, answers } = payload;

  const answerMap = {
    q1:  { a: 'Before 9:00 PM', b: '9:00–10:30 PM', c: '10:30 PM–12:00 AM', d: 'After 12:00 AM' },
    q2:  { a: 'Before 5:30 AM', b: '5:30–7:00 AM', c: '7:00–8:30 AM', d: 'After 8:30 AM' },
    q3:  { a: 'Less than 5 hours', b: '5–6 hours', c: '6–7 hours', d: '7–8 hours', e: 'More than 8 hours' },
    q4:  { a: 'Same schedule as weekdays', b: 'Up to 1 hour later', c: '1–2 hours later', d: 'More than 2 hours later' },
    q5:  { a: 'Never', b: 'Rarely (once a week or less)', c: 'Sometimes (2–3x per week)', d: 'Most days' },
    q6:  { a: 'Under 20 minutes', b: '20–45 minutes', c: '45–90 minutes', d: 'Over 90 minutes', e: "I don't nap" },
    q7:  { a: 'Yes, I feel well-rested', b: 'Mostly, but could use more', c: 'No, I rarely feel rested', d: "I'm not sure" },
    q8:  { a: 'Under 10 minutes', b: '10–20 minutes', c: '20–45 minutes', d: 'Over 45 minutes' },
    q9:  { a: 'Rarely or never', b: 'Once, fall back easily', c: 'Multiple times, fall back easily', d: 'Multiple times, struggle to return' },
    q10: { a: '1 — Very poor', b: '2 — Poor', c: '3 — Fair', d: '4 — Good', e: '5 — Excellent' },
    q11: { a: 'Very restless, lots of tossing/turning', b: 'Somewhat restless', c: 'Mostly still', d: 'Very still and deep' },
    q12: { a: "Yes — told I snore loudly or stop breathing", b: 'Mild snoring only', c: 'Not that I know of', d: 'Sleep alone, unsure' },
    q13: { a: 'Refreshed and alert', b: 'Groggy but okay within 30 min', c: 'Fatigued — takes over an hour', d: 'Exhausted regardless of sleep amount' },
    q14: { a: 'Steady energy all day', b: 'Mild afternoon dip', c: 'Significant afternoon crash', d: 'Fatigued most of the day' },
    q15: { a: 'Sharp and focused', b: 'Occasional brain fog', c: 'Frequent difficulty concentrating', d: 'Significant impairment most days' },
    q16: { a: 'Stable and positive', b: 'Somewhat irritable or flat', c: 'Noticeably moody or anxious', d: 'Significantly affected most days' },
    q17: { a: 'None', b: 'Morning only (before noon)', c: 'Afternoon (before 3 PM)', d: 'Evening or unpredictable' },
    q18: { a: 'Never', b: 'Rarely', c: '1–2x per week near bedtime', d: 'Most nights' },
    q19: { a: 'No screens within 1 hour of bed', b: 'Screens until 30 min before bed', c: 'Screens right up until sleep', d: 'Screens in bed until falling asleep' },
    q20: { a: 'No regular exercise', b: '1–2x per week', c: '3–4x per week', d: '5+ times per week' },
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
1. Sleep Profile Summary (2–3 sentences)
2. Key Findings — 2–4 specific issues from their responses
3. Prioritized Recommendations — specific, actionable steps ranked by impact
4. A brief encouraging close

Be specific — reference their actual answers. Avoid generic advice. Tone: warm, coach-like, not clinical.

MEMBER: ${member_id || 'not provided'} | DOB: ${dob || 'not provided'} | Sex: ${sex || 'not provided'} | Date: ${intake_date || 'not provided'}

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

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const result = await response.json();
    const report = result.content?.map(b => b.text || '').join('') || 'No response received.';

    // ── DATABASE PLACEHOLDER ────────────────────────────────────────────────
    // When your internal DB is ready, insert the record here.
    // Replace the comment block below with your actual DB call.
    //
    // const record = {
    //   member_id, dob, sex, intake_date,
    //   answers, report,
    //   submitted_at: new Date().toISOString()
    // };
    //
    // await fetch('https://your-internal-api.com/sleep-records', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.DB_API_KEY}`
    //   },
    //   body: JSON.stringify(record)
    // });
    // ── END PLACEHOLDER ─────────────────────────────────────────────────────

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, report })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
