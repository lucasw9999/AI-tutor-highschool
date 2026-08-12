const SOURCE = 'ap_csa/ap_csa_exam/topic-coverage-matrix.md'

/**
 * CSA has no "Plain idea / Worked example / #1 mistake" blocks (that structure is
 * Precalc's). So CSA teaching material is assembled from what exists: the topic's
 * EK becomes plain_idea, and the topic's first item explanation supplies the
 * worked example. Topics with too little material are reported as gaps rather
 * than silently shipped.
 *
 * common_mistake has NO genuine source here. topic-coverage-matrix.md carries no
 * "common mistake" or "trap" label the way the Precalc study packs do (see
 * parse-precalc-topics.js, where MISTAKE pulls a real "#1 mistake:" block). An
 * earlier version of this parser took the topic's SECOND item explanation and
 * called it common_mistake — but that is just another question's answer-key
 * rationale, not a description of a mistake anyone makes on this topic, and
 * gpt-instructions.md has the model present it to the student as "the trap". A
 * fabricated field is worse than a missing one, so it stays null: the consumer
 * (worker/src/teaching.js buildLesson) already omits fields that are not there,
 * and the lesson still counts as complete without it (see below).
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
      common_mistake: null,
      source_file: SOURCE,
      complete: Boolean(plain && notes[0]),
    }
  })
  return { entries, gaps: entries.filter((e) => !e.complete).map((e) => e.topic) }
}
