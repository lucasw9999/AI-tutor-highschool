const SLUGS = {
  'mcq-analyze-code.md': 'ac',
  'mcq-unit-1.md': 'u1',
  'mcq-unit-2.md': 'u2',
  'mcq-unit-3.md': 'u3',
  'mcq-unit-4.md': 'u4',
}

function stripTicks(s) {
  const t = s.trim()
  if (t.startsWith('`') && t.endsWith('`') && t.length > 1 && !t.slice(1, -1).includes('`')) {
    return t.slice(1, -1).trim()
  }
  return t
}

/** Split an "A) x   B) y   C) z   D) w" line into {A,B,C,D}, or null if malformed. */
export function parseOptions(line) {
  const letters = ['A', 'B', 'C', 'D']
  const pos = []
  let from = 0
  for (const L of letters) {
    const i = line.indexOf(`${L})`, from)
    if (i === -1) return null
    pos.push(i)
    from = i + 2
  }
  const out = {}
  letters.forEach((L, k) => {
    const start = pos[k] + 2
    const end = k < 3 ? pos[k + 1] : line.length
    out[L] = stripTicks(line.slice(start, end))
  })
  return out
}

/** Parse one `---`-delimited block into an item, or null if it is not a question. */
export function parseBlock(block, slug) {
  const lines = block.split('\n')
  const hIdx = lines.findIndex((l) => /^\*\*Q\d+\.\s*\(/.test(l.trim()))
  if (hIdx === -1) return null

  const h = lines[hIdx].trim().match(/^\*\*Q(\d+)\.\s*\((.*)\)\*\*/)
  if (!h) return null

  const optIdx = lines.findIndex((l, i) => i > hIdx && /^A\)/.test(l.trim()))
  const ansIdx = lines.findIndex((l, i) => i > hIdx && /^\*\*Answer:/.test(l.trim()))

  const stem = optIdx > hIdx ? lines.slice(hIdx + 1, optIdx).join('\n').trim() : ''
  const options = optIdx > hIdx ? parseOptions(lines[optIdx].trim()) : null

  let answer = null
  let explanation = null
  if (ansIdx > hIdx) {
    const m = lines[ansIdx].trim().match(/^\*\*Answer:\s*([A-D])\.?\*\*\s*(.*)$/)
    if (m) {
      answer = m[1]
      const tail = lines
        .slice(ansIdx + 1)
        .filter((l) => !/\[topic\s/.test(l))
        .join(' ')
      explanation = `${m[2]} ${tail}`.replace(/\s+/g, ' ').trim()
    }
  }

  const tagLine = lines.find((l) => /\[topic\s/.test(l)) || ''
  const tags = tagLine.match(/\[topic\s+(\d+\.\d+)\]\[practice\s+(P[1-5])\]/)

  return {
    id: `csa-${slug}-q${Number(h[1])}`,
    subject: 'ap_csa',
    number: Number(h[1]),
    label: h[2].trim(),
    kind: 'mcq',
    stem,
    options,
    answer,
    explanation,
    topic: tags ? tags[1] : null,
    practice: tags ? tags[2] : null,
    allowOffSyllabus: /\[allow-offsyllabus\]/.test(tagLine),
  }
}

export function parseMcqFile(text, filename) {
  const slug = SLUGS[filename]
  if (!slug) throw new Error(`unknown MCQ file: ${filename}`)
  return text
    .split(/\n-{3,}\n/)
    .map((b) => parseBlock(b, slug))
    .filter(Boolean)
}

export const MCQ_FILES = Object.keys(SLUGS)
