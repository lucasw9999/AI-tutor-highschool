const SOURCE = 'ap_csa/ap_csa_exam/topic-coverage-matrix.md'

/**
 * CSA has no "Plain idea / Worked example / #1 mistake" blocks (that structure is
 * Precalc's). So CSA teaching material is assembled from what exists: the topic's
 * EK becomes plain_idea, and item explanations on that topic supply the example
 * and the trap. Topics with too little material are reported as gaps rather than
 * silently shipped.
 */
export function buildTeaching(topics, items) {
  const entries = topics.map((t) => {
    const notes = items
      .filter((i) => i.topic === t.id && i.explanation)
      .map((i) => i.explanation)
    const plain = t.ek || null
    return {
      topic: t.id,
      subject: t.subject,
      plain_idea: plain,
      worked_example: notes[0] ?? null,
      common_mistake: notes[1] ?? null,
      source_file: SOURCE,
      complete: Boolean(plain && notes[0]),
    }
  })
  return { entries, gaps: entries.filter((e) => !e.complete).map((e) => e.topic) }
}
