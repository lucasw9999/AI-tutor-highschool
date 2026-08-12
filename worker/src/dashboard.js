// Parent dashboard: one page, server-rendered, no JavaScript and no dependencies.
//
// The audience is a parent who wants one question answered — "is he actually on
// track?" — so the page leads with the honest number and what is blocking it,
// then shows the evidence behind it. Nothing here computes anything; it renders
// what the readiness engine already decided.

/** Escape text for HTML. Item stems contain Java and LaTeX, so this is not optional. */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const CSS = `
:root { color-scheme: light dark; --ink:#1a1a1a; --dim:#666; --line:#e3e3e3;
        --ok:#0a7d33; --no:#b3261e; --wait:#8a6d00; --bg:#fff; --card:#fafafa; }
@media (prefers-color-scheme: dark) {
  :root { --ink:#ececec; --dim:#a0a0a0; --line:#333; --ok:#4ec26f; --no:#f2857c;
          --wait:#e0b93a; --bg:#161616; --card:#1f1f1f; }
}
* { box-sizing: border-box }
body { margin:0; padding:2rem 1.25rem 4rem; background:var(--bg); color:var(--ink);
       font:16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
       max-width:52rem; margin-inline:auto; }
h1 { font-size:1.35rem; margin:0 0 .25rem; letter-spacing:-.01em }
h2 { font-size:1.1rem; margin:2.5rem 0 .75rem; letter-spacing:-.01em }
.sub { color:var(--dim); font-size:.9rem; margin:0 0 2rem }
.card { background:var(--card); border:1px solid var(--line); border-radius:12px;
        padding:1.1rem 1.25rem; margin-bottom:1rem }
.head { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; flex-wrap:wrap }
.pct { font-size:2.6rem; font-weight:650; letter-spacing:-.03em; line-height:1 }
.pct small { font-size:.9rem; font-weight:400; color:var(--dim); letter-spacing:0 }
.meta { color:var(--dim); font-size:.875rem; text-align:right }
.bar { height:7px; background:var(--line); border-radius:99px; overflow:hidden; margin:.9rem 0 .5rem }
.bar i { display:block; height:100%; background:var(--no); border-radius:99px }
.bar i.ready { background:var(--ok) }
.block { margin:.75rem 0 0; padding:.7rem .85rem; border-left:3px solid var(--no);
         background:color-mix(in srgb, var(--no) 8%, transparent); font-size:.925rem; border-radius:0 6px 6px 0 }
.block.ready { border-color:var(--ok); background:color-mix(in srgb, var(--ok) 8%, transparent) }
table { width:100%; border-collapse:collapse; font-size:.9rem }
td, th { text-align:left; padding:.5rem .6rem; border-bottom:1px solid var(--line); vertical-align:top }
th { font-weight:600; color:var(--dim); font-size:.8rem; text-transform:uppercase; letter-spacing:.04em }
td.s { width:1.8rem; text-align:center; font-weight:700 }
.yes { color:var(--ok) } .nope { color:var(--no) } .pend { color:var(--wait) }
td.ev { color:var(--dim); text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums }
.note { color:var(--dim); font-size:.85rem; margin-top:.75rem; line-height:1.5 }
.chips { display:flex; gap:.4rem; flex-wrap:wrap; margin-top:.6rem }
.chip { font-size:.8rem; padding:.15rem .5rem; border:1px solid var(--line); border-radius:99px; color:var(--dim) }
.adv { border-left:3px solid var(--wait); background:color-mix(in srgb, var(--wait) 10%, transparent);
       padding:.7rem .85rem; border-radius:0 6px 6px 0; font-size:.9rem; margin-top:.75rem }
footer { color:var(--dim); font-size:.8rem; margin-top:3rem; border-top:1px solid var(--line); padding-top:1rem }
.facts { list-style:none; margin:.9rem 0 0; padding:0; font-size:.9rem; color:var(--dim) }
.facts li { padding:.25rem 0; border-bottom:1px solid var(--line) }
.facts li:last-child { border-bottom:0 }
.facts b { color:var(--ink); font-weight:600 }
.facts .stale { color:var(--wait) }
.facts .bad { color:var(--no) }
`

function criteriaTable(criteria) {
  const rows = criteria.map((c) => {
    const mark = c.met ? '<td class="s yes">✓</td>' : c.pending ? '<td class="s pend">·</td>' : '<td class="s nope">✗</td>'
    return `<tr>${mark}<td>${esc(c.label)}</td><td class="ev">${esc(c.detail)}</td></tr>`
  }).join('')
  return `<table><thead><tr><th></th><th>Requirement</th><th class="ev">Evidence</th></tr></thead><tbody>${rows}</tbody></table>`
}


/**
 * When he last answered anything.
 *
 * The page carried no dates at all except the mock chips, so six weeks of silence
 * rendered identically to a hard week — same 0%, same blocker, same chips — and
 * nothing on it could tell "working hard, not yet measurable" from "stopped".
 * `days` is a whole calendar count computed in api.js (in the exam's own zone, the
 * same unit as the days-to-exam figure above it, so the two cannot disagree).
 */
function lastAnswerLine(last) {
  if (!last) return `<li><b>No answers recorded yet.</b> Nothing on this card has been measured from anything.</li>`
  const when = last.days <= 0 ? 'today' : last.days === 1 ? 'yesterday' : `${last.days} days ago`
  const stale = last.days >= 7 ? ' class="stale"' : ''
  return `<li${stale}>Last answer <b>${esc(when)}</b> (${esc(last.on ?? String(last.at).slice(0, 10))}).`
    + (last.days >= 7
      ? ` Every number on this card is a snapshot of that date, not of today.`
      : '')
    + `</li>`
}

/**
 * How fast he is answering, against the pace the real exam allows.
 *
 * Always shown when it can be computed at all, not only when it is bad: pace is
 * the one thing that decides a timed exam and is invisible in every percentage on
 * this page. A sample too small to conclude from is labelled rather than hidden,
 * which is the same rule the pending criteria follow.
 */
function paceLine(pace) {
  if (!pace) return ''
  const projection = pace.projected_minutes && pace.budget_minutes && pace.section_questions
    ? ` At that pace a ${pace.section_questions}-question section takes about <b>${pace.projected_minutes} minutes</b>`
      + ` against the ${pace.budget_minutes} it gets.`
    : ''
  const measured = pace.measured
    ? ''
    : ` Measured over ${pace.n} answer(s) — too few to conclude from, so it is not yet being reported to him.`
  const flag = pace.over ? ' class="bad"' : ''
  return `<li${flag}>Pace <b>${pace.seconds}s</b> per multiple-choice question (middle of the last ${pace.n}),`
    + ` against the <b>${pace.target_seconds}s</b> one question gets on the real exam.${projection}${measured}</li>`
}

/**
 * Open teaching gaps, with how long each has been open.
 *
 * These were passed to this page and rendered nowhere, so a gap open since
 * September looked exactly like one opened this morning — and a gap is the one
 * thing on the card that a parent can actually act on.
 */
function gapLines(gaps) {
  if (!gaps?.length) return ''
  const rows = gaps.map((g) => {
    const age = g.days_open == null ? 'open' : g.days_open === 0 ? 'opened today' : `open ${g.days_open} days`
    const state = g.taught ? 'taught, awaiting a cold re-test' : 'lesson not given yet'
    return `<li><b>${esc(g.topic)}</b> — ${esc(age)}, ${esc(state)}</li>`
  }).join('')
  return `<h2>Open gaps</h2><ul class="facts">${rows}</ul>`
}

/** Sittings that were started and never submitted, once past their own budget. */
function unfinishedLines(unfinished) {
  if (!unfinished?.length) return ''
  return unfinished.map((u) =>
    `<div class="adv">Sitting <b>#${u.id}</b> (section ${esc(u.section)}) was started ${esc(String(u.started_at).slice(0, 10))}`
    + ` and <b>never submitted</b> — open ${u.open_minutes} minutes against the ${u.budget_minutes} minutes section`
    + ` ${esc(u.section)} gets on the real exam, with ${u.answered} answer(s) on it. Until it is submitted it counts as`
    + ` nothing: it is absent from the mock count and from every requirement below.</div>`).join('')
}

/**
 * Render one subject's card.
 *
 * @param {object} s  { config, readiness, coverage, attempts, mocks, last_answer,
 *        pace, open_gaps, unfinished_sittings } — everything after `mocks` is
 *        computed in api.js. Nothing here derives anything; a missing value is
 *        rendered as the absence it is, never as a zero or a guessed date.
 */
export function subjectSection(s) {
  const { config, readiness: r, coverage, attempts, mocks } = s
  const { last_answer = null, pace = null, open_gaps = [], unfinished_sittings = [] } = s
  const days = Math.ceil((new Date(config.exam_date) - new Date(s.now)) / 86400000)
  const blocker = r.criteria.find((c) => !c.met)
  const scored = mocks.filter((m) => m.proctored && m.composite_pct != null)
  const recent = scored.slice(-6).map((m) =>
    `<span class="chip">${esc(m.started_at.slice(0, 10))} · ${m.composite_pct.toFixed(0)}%${m.source === 'official' ? ' · official' : ''}</span>`,
  ).join('')

  return `
<div class="card">
  <div class="head">
    <div>
      <h1>${esc(config.display_name)}</h1>
      <p class="sub" style="margin:0">Target ${esc(config.goal)} · exam ${esc(config.exam_date)}${days > 0 ? ` · ${days} days away` : ''}</p>
    </div>
    <div class="pct">${r.readiness_pct}<small>% ready</small></div>
  </div>

  <div class="bar"><i class="${r.ready ? 'ready' : ''}" style="width:${r.readiness_pct}%"></i></div>

  <div class="block ${r.ready ? 'ready' : ''}">
    ${r.ready
      ? '<strong>Every requirement is met.</strong> The evidence supports sitting the exam.'
      : `<strong>Blocked on:</strong> ${esc(blocker?.label ?? 'unknown')}<br><span style="color:var(--dim)">${esc(blocker?.detail ?? '')}</span>`}
  </div>

  ${r.advisories.map((a) => `<div class="adv">${esc(a)}</div>`).join('')}

  <div class="chips">
    <span class="chip">${coverage.topics_drilled}/${coverage.topics_total} topics attempted</span>
    <span class="chip">${attempts.length} questions answered</span>
    <span class="chip">${scored.length} proctored mock${scored.length === 1 ? '' : 's'}</span>
  </div>

  ${unfinishedLines(unfinished_sittings)}

  <ul class="facts">
    ${lastAnswerLine(last_answer)}
    ${paceLine(pace)}
  </ul>

  <h2>Every requirement</h2>
  ${criteriaTable(r.criteria)}
  <p class="note">
    A <span class="pend">·</span> means not yet measurable — there is no proctored mock evidence to judge it
    against, so it is not being reported as a failure.
    Free response stays pending, not failing, until the grader is calibrated against an officially
    scored College Board response — until then, 100% is not reachable no matter what every other row shows.
    Readiness reaches 100% only when every row shows ✓ at the same time.
    Answering practice questions correctly, however many, does not move this number.
  </p>

  ${gapLines(open_gaps)}

  ${scored.length ? `<h2>Mock history</h2><div class="chips">${recent}</div>` : ''}
</div>`
}

export function renderDashboard({ subjects, now }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>AP readiness</title>
<style>${CSS}</style>
</head><body>
<h1 style="font-size:1.05rem; color:var(--dim); font-weight:600; letter-spacing:.02em; text-transform:uppercase">AP readiness</h1>
<p class="sub">Every number below is computed from recorded answers. Nothing here is asserted.</p>
${subjects.map((s) => subjectSection({ ...s, now })).join('')}
<footer>
  Generated ${esc(now)}. Free-response evidence cannot count toward readiness until the grader is
  calibrated against an officially scored College Board response.
  Until then, 100% readiness is not reachable no matter how strong every other criterion is.
</footer>
</body></html>`
}
