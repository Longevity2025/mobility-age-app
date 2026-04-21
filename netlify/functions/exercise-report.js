// netlify/functions/exercise-report.js
// Ovation Personalized Longevity Plan — Exercise Assessment
// Uses native Node.js https — no npm dependencies required.

const https = require('https');

// ── Native https helpers ──────────────────────────────────────────────────────

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

// ── Question & answer label maps ─────────────────────────────────────────────

const QUESTIONS = {
  q1:  'Exercise history over the course of their life',
  q2:  'Days per week of aerobic exercise',
  q3:  'Typical aerobic session length',
  q4:  'Typical aerobic intensity',
  q5:  'Frequency of intentional brisk walking',
  q6:  'Total weekly minutes of moderate-to-vigorous aerobic activity',
  q7:  'Consistency of aerobic exercise week to week',
  q8:  'Frequency of varied intensity in aerobic activity (intervals, hills, etc.)',
  q9:  'Types of aerobic or recreational activity done regularly [multi-select]',
  q10: 'Use of wearable device or app to track exercise/activity',
  q11: 'Days per week of strength or resistance training',
  q12: 'Years of consistent strength training experience',
  q13: 'Muscle groups typically trained',
  q14: 'Frequency of training to a challenging level (last few reps difficult)',
  q15: 'Structured strength program vs. training without a plan',
  q16: 'Frequency of lower-body strength exercises',
  q17: 'Confidence performing strength exercises with good form',
  q18: 'Frequency of deliberate stretching or flexibility work',
  q19: 'Current overall flexibility',
  q20: 'Frequency of specific balance training exercises',
  q21: 'Frequency of activities that incidentally challenge balance (pickleball, hiking, etc.)',
  q22: 'Overall balance and stability in daily life',
  q23: 'Frequency of stiffness, joint discomfort, or limited range of motion',
  q24: 'Inclusion of warm-up or cool-down in workouts',
  q25: 'Hours per day sitting or lying down (excluding sleep)',
  q26: 'Regularity of movement breaks during extended sitting',
  q27: 'Estimated daily step count',
  q28: 'Activity level in daily life outside formal exercise',
  q29: 'Stair vs. elevator/escalator usage',
  q30: 'Frequency of sitting 2+ hours without moving',
  q31: 'Injuries, surgeries, or chronic conditions in past 2 years affecting exercise',
  q32: 'Current physical limitations, pain, or areas requiring modification',
  q33: 'General feelings about exercise',
  q34: 'Barriers to exercise [multi-select]',
  q35: 'Quality of recovery between exercise sessions',
  q36: 'Overall satisfaction with current physical fitness',
};

const ANSWER_LABELS = {
  q1:  { a:'Consistently active most of adult life', b:'Active earlier, significant gaps since', c:'Active recently after mostly sedentary past', d:'Largely sedentary most of life', e:'Activity level has varied significantly throughout life' },
  q2:  { a:'5+ days/week', b:'3–4 days/week', c:'1–2 days/week', d:'Rarely or never' },
  q3:  { a:'45+ minutes', b:'30–44 minutes', c:'15–29 minutes', d:'Less than 15 minutes' },
  q4:  { a:'Vigorous most of the time', b:'Moderate most of the time', c:'Easy most of the time', d:'Varies a lot or not sure' },
  q5:  { a:'Daily or almost daily', b:'3–4 days/week', c:'1–2 days/week', d:'Rarely or never' },
  q6:  { a:'150+ minutes', b:'90–149 minutes', c:'30–89 minutes', d:'Less than 30 minutes' },
  q7:  { a:'Very consistent — rarely misses', b:'Fairly consistent — misses occasionally', c:'Inconsistent — good weeks and bad weeks', d:'Very inconsistent or no routine' },
  q8:  { a:'Regularly (most weeks)', b:'Sometimes (a few times a month)', c:'Rarely', d:'Always exercises at the same pace' },
  q9:  { walking_hiking:'Walking or hiking', running_jogging:'Running or jogging', cycling:'Cycling (outdoor or stationary)', swimming:'Swimming or water aerobics', group_fitness:'Group fitness classes', racquet_sports:'Racquet sports', rowing_kayaking:'Rowing or kayaking', dance:'Dance', team_sports:'Team or field sports', cardio_machines:'Elliptical/stair climber/cardio machines', yoga_pilates:'Yoga or Pilates (cardio/flow)', none:'None' },
  q10: { a:'Yes — checks regularly, influences training', b:'Yes — rarely looks at data', c:'Has one but inconsistent use', d:'No tracking device or app' },
  q11: { a:'3+ days/week', b:'2 days/week', c:'1 day/week', d:'Rarely or never' },
  q12: { a:'2+ years', b:'6 months to 2 years', c:'Less than 6 months', d:'Little or no experience' },
  q13: { a:'Full body — upper, lower, and core', b:'Mostly one or two areas, neglects others', c:'Mostly core or toning', d:'Does not do strength training' },
  q14: { a:'Most sessions', b:'About half the time', c:'Rarely — keeps it light', d:'Does not do strength training' },
  q15: { a:'Structured program with progressive overload', b:'Loose plan, adjusts often', c:'No plan — does whatever feels right', d:'Does not do strength training' },
  q16: { a:'Most sessions', b:'Occasionally', c:'Rarely or never', d:'Does not do strength training' },
  q17: { a:'Very confident', b:'Somewhat confident', c:'Not very confident', d:'Not confident / has not tried' },
  q18: { a:'5+ days/week', b:'3–4 days/week', c:'1–2 days/week', d:'Rarely or never' },
  q19: { a:'Good — wide range of motion', b:'Fair — some tightness, manages most activities', c:'Limited — noticeable tightness affecting movement', d:'Poor — quite stiff, feels restricted' },
  q20: { a:'Regularly (most weeks)', b:'Occasionally (a few times a month)', c:'Rarely', d:'Never — has not thought about it' },
  q21: { a:'Several times per week', b:'Once or twice per week', c:'A few times per month', d:'Rarely or never' },
  q22: { a:'Strong — very steady and confident', b:'Good — generally stable, occasional minor wobbles', c:'Fair — unsteady at times, cautious', d:'Poor — avoids balance-challenging situations' },
  q23: { a:'Rarely or never', b:'Occasionally (a few times a month)', c:'Weekly', d:'Most days' },
  q24: { a:'Always — warms up and cools down', b:'Usually — does one or the other', c:'Sometimes — skips more often than not', d:'Rarely or never' },
  q25: { a:'Less than 4 hours', b:'4–6 hours', c:'7–9 hours', d:'10+ hours' },
  q26: { a:'Yes, consistently', b:'Sometimes — a few times a day', c:'Rarely — sits for long stretches', d:'Does not sit for long periods / N/A' },
  q27: { a:'10,000+', b:'7,000–9,999', c:'4,000–6,999', d:'Fewer than 4,000 or no idea' },
  q28: { a:'Very active — on feet a lot throughout the day', b:'Moderately active — some incidental movement most days', c:'Lightly active — mostly sits, little movement', d:'Sedentary — very little physical activity' },
  q29: { a:'Almost always takes the stairs', b:'Takes stairs about half the time', c:'Usually takes elevator/escalator', d:'Always takes elevator/escalator' },
  q30: { a:'Rarely or never', b:'A few times a week', c:'Most days', d:'Every day, most of the day' },
  q31: { a:'No — injury- and limitation-free', b:'Yes, minor — works around it mostly', c:'Yes, moderate — meaningfully limited for a period', d:'Yes, significant — major ongoing barrier' },
  q32: { a:'No — exercises without restrictions', b:'Minor — modifies a few things', c:'Moderate — meaningful restrictions affecting choices', d:'Significant — severely restricts activity' },
  q33: { a:'Genuinely enjoys it, looks forward to it', b:'Sees it as necessary — neutral', c:'Does it reluctantly or out of obligation', d:'Dislikes or dreads it, avoids when possible' },
  q34: { time:'Lack of time/scheduling', energy:'Low energy or fatigue', pain_injury:'Pain, injury, or limitation', motivation:'Lack of motivation or accountability', no_barriers:'No major barriers' },
  q35: { a:'Very well — feels recovered and ready', b:'Well enough — some fatigue but manageable', c:'Poorly — often sore, tired, or overtrained', d:'Exercises too infrequently for recovery to be an issue' },
  q36: { a:'Very satisfied — strong, capable, and active', b:'Somewhat satisfied — okay but could do more', c:'Not very satisfied — below where they want to be', d:'Very unsatisfied — feels out of shape or limited' },
};

const MULTI_SELECT_QS = ['q9', 'q34'];

// ── Format answers for AI prompt ─────────────────────────────────────────────

function formatAnswers(answers) {
  return Object.entries(QUESTIONS).map(([qKey, qText]) => {
    const raw = answers[qKey];
    let label = 'Not answered';
    if (raw !== null && raw !== undefined) {
      if (MULTI_SELECT_QS.includes(qKey)) {
        const vals = Array.isArray(raw) ? raw : [raw];
        if (vals.length > 0) {
          label = vals.map(v => ANSWER_LABELS[qKey]?.[v] || v).join('; ');
        }
      } else {
        label = ANSWER_LABELS[qKey]?.[raw] || raw;
      }
    }
    return `${qKey.toUpperCase()} — ${qText}\nResponse: ${label}`;
  }).join('\n\n');
}

// ── AI report generation via native https ────────────────────────────────────

async function generateReport(payload) {
  const { member_id, dob, sex, assigned_coach, intake_date, answers } = payload;
  const formattedAnswers = formatAnswers(answers);

  const prompt = `You are an exercise physiologist writing a concise clinical intake report for a longevity health coach. Be direct and specific — 2-3 sentences per section maximum. No generic advice.

MEMBER: ${member_id} | DOB: ${dob || 'N/A'} | Sex: ${sex || 'N/A'} | Coach: ${assigned_coach} | Date: ${intake_date}

RESPONSES:
${formattedAnswers}

Write a brief report with these sections (2-3 sentences each):
1. OVERVIEW — fitness history and overall picture
2. AEROBIC FITNESS — vs. 150 min/week guideline, activity types
3. STRENGTH TRAINING — frequency, structure, gaps
4. FLEXIBILITY, MOBILITY & BALANCE — stretching, balance training, joint issues
5. DAILY MOVEMENT — sitting time, steps, incidental activity
6. INJURY & LIMITATIONS — history and current restrictions
7. MINDSET & RECOVERY — motivation, barriers, recovery quality
8. TOP RECOMMENDATIONS — 4 specific actions tied to their data
9. COACH NOTES — key conversation starters`;

  const requestBody = JSON.stringify({
    model: 'claude-opus-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }]
  });

  const response = await httpsPost(
    'https://api.anthropic.com/v1/messages',
    {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    requestBody
  );

  return response.content[0].text;
}

// ── Send email via Resend native https ───────────────────────────────────────

async function sendEmail(report, payload) {
  const { member_id, dob, sex, assigned_coach, intake_date } = payload;

  const escaped = report
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#F4F6F9;margin:0;padding:2rem 1rem;">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#2E6B4F,#1A6B8A);padding:2rem 2rem 1.5rem;">
      <div style="font-size:0.75rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:0.4rem;">Ovation Personalized Longevity Plan</div>
      <h1 style="color:#fff;margin:0;font-size:1.6rem;font-weight:600;">Exercise Assessment Report</h1>
    </div>
    <div style="padding:1.5rem 2rem;background:#F8FAFB;border-bottom:1px solid #E2E8F0;">
      <table style="width:100%;font-size:0.85rem;color:#374151;border-collapse:collapse;">
        <tr>
          <td style="padding:0.3rem 1rem 0.3rem 0;font-weight:600;color:#6B7280;white-space:nowrap;">Member</td>
          <td style="padding:0.3rem 0;">${member_id || '—'}</td>
          <td style="padding:0.3rem 1rem;font-weight:600;color:#6B7280;white-space:nowrap;">Coach</td>
          <td style="padding:0.3rem 0;">${assigned_coach || '—'}</td>
        </tr>
        <tr>
          <td style="padding:0.3rem 1rem 0.3rem 0;font-weight:600;color:#6B7280;">DOB</td>
          <td style="padding:0.3rem 0;">${dob || '—'}</td>
          <td style="padding:0.3rem 1rem;font-weight:600;color:#6B7280;">Sex</td>
          <td style="padding:0.3rem 0;">${sex || '—'}</td>
        </tr>
        <tr>
          <td style="padding:0.3rem 1rem 0.3rem 0;font-weight:600;color:#6B7280;">Date</td>
          <td style="padding:0.3rem 0;" colspan="3">${intake_date || '—'}</td>
        </tr>
      </table>
    </div>
    <div style="padding:2rem;font-size:0.9rem;line-height:1.75;color:#1A1A2E;">
      <p>${escaped}</p>
    </div>
    <div style="padding:1rem 2rem;background:#F8FAFB;border-top:1px solid #E2E8F0;font-size:0.75rem;color:#9CA3AF;text-align:center;">
      Generated by Ovation AI &nbsp;&middot;&nbsp; Confidential — For coaching use only
    </div>
  </div>
</body>
</html>`;

  const memberName = member_id || 'a member';
  const coachName  = assigned_coach || 'Your Coach';

  const emailBody = JSON.stringify({
    from:    process.env.RESEND_FROM_EMAIL,
    to:      [process.env.RESEND_TO_EMAIL],
    subject: `Exercise Assessment — ${memberName} (Coach: ${coachName})`,
    html,
  });

  await httpsPost(
    'https://api.resend.com/emails',
    {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    emailBody
  );
}

// ── Netlify handler ───────────────────────────────────────────────────────────

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
try {
    console.log('Generating report...');
    const report = await generateReport(payload);
    console.log('Report generated, length:', report.length);
    await sendEmail(report, payload);
    console.log('Email sent successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error('exercise-report error:', err);
    console.error('Error stack:', err.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
