// Server-side grading. The model never decides whether an answer was right.
//
// Two kinds are graded here with certainty: multiple choice (letter match) and
// short constructed answers (canonical form + explicit accepted variants).
// FRQs cannot be graded mechanically; they are routed to the model and marked
// `graded_by: 'model'`, which excludes them from readiness until the grader has
// been calibrated against an officially scored response.

// --- reading a multiple-choice response ------------------------------------
//
// A response is read as a choice only when the WHOLE response says so. The
// original scan was /\b([A-E])\b/ over free text with first-match-wins, so the
// English article 'a' read as choice A: on the shipped item csa-ac-q60 (key C)
// 'it throws a NullPointerException' scored as a wrong pick of A, and on
// csa-ac-q33 (key D) the correct option's own wording, 'a
// StringIndexOutOfBoundsException', did the same. 108 of 218 shipped stems
// contain a standalone a-e token, so this was not a corner case.

/**
 * The whole response is one letter, however the student decorated it: 'B', 'b',
 * '(B)', 'B)', ' b. ', 'B?'. The decoration is an explicit list rather than
 * \W*, which swallowed operators: on csa-u2-q27 (options 'c <= n', 'c <= r',
 * 'c < r', 'c <= n - r') the partial answer 'c <=' read as choice C.
 */
const LETTER_ONLY = /^["'“‘(\[\s]*([a-e])[)\]"'”’.,!?:;\s]*$/i

/**
 * A letter introduced by a marker that can only mean the LABEL: 'choice B',
 * 'option (b)', 'I pick B'. Strong enough to win a collision with an option
 * whose text happens to be a letter.
 */
const STRONG_LABEL =
  /(?:^|[^a-z])(?:choice|option|letter|i\s+choose|i\s+pick|i\s+select|i'?ll\s+go\s+with|going\s+with)\s*(?:is\s+)?[:=]?\s*\(?([a-e])[)\]"'”’.,!?:;\s]*$/i

/**
 * 'answer: B', 'the answer is B'. Usually the label — but on an item whose
 * option TEXT is itself a letter, 'the answer is B' just as plausibly means the
 * value B, so this reading never wins a collision.
 */
const WEAK_LABEL = /(?:^|[^a-z])answer\s*(?:is\s+)?[:=]?\s*\(?([a-e])[)\]"'”’.,!?:;\s]*$/i

/** Hedges a student wraps an answer in. Stripped, never interpreted. */
const HEDGE_HEAD =
  /^(?:i\s+think(?:\s+it(?:'s|\s+is))?|i\s+believe|i\s+guess|i'?d\s+say|i\s+would\s+say|my\s+answer\s+is|the\s+answer\s+is|maybe|probably|hmm+|well|so|it\s+must\s+be|must\s+be|it\s+has\s+to\s+be|has\s+to\s+be)\b[\s:,]*/i
const HEDGE_TAIL = /[\s,]*(?:i\s+think|i\s+guess|i\s+believe|maybe|probably)[\s.?!]*$/i

/**
 * A marker that can only mean the VALUE: 'it prints B', 'the output is ef', 'it
 * throws a NullPointerException'. Strong enough to win a collision with a label.
 * The optional trailing ' is' has to sit outside the alternation — with
 * `output\s+is` as one more branch, `outputs?` matched first and left the 'is'
 * behind, so 'the output is ef' looked for an option called 'is ef'.
 */
const VALUE_MARKER =
  /^(?:it\s+|the\s+program\s+|the\s+code\s+|the\s+method\s+|this\s+|the\s+)?(?:prints?(?:\s+out)?|printed|outputs?|returns?|throws?|displays?|shows?|evaluates?\s+to|results?|values?)\b(?:\s+is)?[\s:=]*/i

/** Words too common to identify an option on their own. */
const STOPWORDS = new Set(['the', 'and', 'not', 'for', 'but', 'its', 'it', 'is', 'an', 'a', 'of', 'to', 'in', 'or'])

// --- characters that MEAN an ASCII character --------------------------------
//
// Every canonical form below is folded through foldLookalikes, so it runs on the
// RESPONSE and on the stored KEY and OPTION TEXT alike. Which side carries the
// exotic character cannot matter: both sides land on the same ASCII spelling.
//
// Only the RESPONSE side was ever considered before, and only implicitly, via
// `\s+`. The bank carries these characters in its own answers: substituting
// U+2212 MINUS SIGN for the ASCII hyphen in a shipped CORRECT answer marked 7 of
// the 24 keyed short answers wrong ('mismatch', booked as a miss) and pushed 80
// option texts across 26 mcq items to 'unparsed' — a spent serve that api.js says
// cannot be re-graded. In the other direction the bank's own `n(n−1)/2`, `n²`,
// `π/3`, `cos θ`, `15 ≤ H ≤ 62.5`, `-√3/2`, `show(7) → show(int)` and `résumé`
// refused the plain ASCII spelling of the option printed in front of the student.
//
// tools/build/parse-precalc.js gates accepted forms with `isTypeable =
// /^[\x20-\x7E]+$/`, so an ASCII-typeable spelling is guaranteed to exist. That
// gate is one-directional — it never made a Unicode-typed response acceptable,
// and it does not reach mcq option text at all. This is the other half of it, and
// it is why ASCII is the fold TARGET rather than the source.
//
// Folding is a character equivalence and nothing more. It may never make two
// different answers equal, which is why `×` and `·` are left alone: canonAnswer
// strips `*` as markdown emphasis, so folding a multiplication sign onto `*`
// would DELETE the operator and turn `2×3` into `23`. `≈`, `°` and `‖` are left
// alone for the same reason from the other end — none has one ASCII spelling.

/** Marks a paste carries that a keyboard cannot type. They mean nothing. */
const ZERO_WIDTH = /[​‌‍⁠﻿]/g

/** Space-likes. `\s` already covers most; these are the ones it misses. */
const SPACE_LIKE = /[  ᠎ -   　]/g

/** Fullwidth ASCII, offset by exactly 0xFEE0 from the character it means. */
const FULLWIDTH = /[！-～]/g

/**
 * Hyphen-likes. U+2212 MINUS SIGN is what a CAS, a PDF and Word all emit for a
 * negative sign; U+2013/U+2014 are what a word processor autocorrects `-` into.
 */
const HYPHEN_LIKE = /[‐-―˗⁃−➖﹘﹣]/g

const APOSTROPHE_LIKE = /[‘’‚‛′ʼ´]/g
const QUOTE_LIKE = /[“”„‟″]/g

/** Slash-likes: a fraction is written with all three of these. */
const SLASH_LIKE = /[⁄∕]/g

/** A run of superscript characters is an exponent: `n²` is `n^2`. */
const SUPERSCRIPT = /[⁰¹²³⁴-ⁿ]+/g
const SUPERSCRIPT_ASCII = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')', 'ⁿ': 'n',
}

/** One character that spells a whole fraction. */
const VULGAR = /[¼½¾⅓-⅞]/g
const VULGAR_ASCII = {
  '¼': '1/4', '½': '1/2', '¾': '3/4',
  '⅓': '1/3', '⅔': '2/3', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5',
  '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8',
  '⅝': '5/8', '⅞': '7/8',
}

/**
 * Symbols with exactly one ASCII spelling. `π` folds TO `pi` rather than the
 * other way round because `pi` is what the build gate guarantees is typeable —
 * and because the bank ships both: pc-u3-p1's variants spell it `π`, while
 * pc-u3-p19's options spell it `π` and its own answer key spells it `pi`. A
 * student typing `pi/3` at pc-u3-p19 was refused outright.
 */
const SYMBOL = /[πϖθϑ√∞≤≥≠→⇒↔±…]/g
const SYMBOL_ASCII = {
  'π': 'pi', 'ϖ': 'pi', 'θ': 'theta', 'ϑ': 'theta',
  '√': 'sqrt', '∞': 'infinity',
  '≤': '<=', '≥': '>=', '≠': '!=',
  '→': '->', '⇒': '=>', '↔': '<->',
  '±': '+/-', '…': '...',
}

/** A combining accent, once NFD has split it off its letter: `résumé`/`resume`. */
const COMBINING = /[̀-ͯ]/g

/**
 * A decimal a student started at the point: `.8` for `0.8`. Every shipped item
 * declares `tolerance: null`, so the numeric-tolerance branch never runs and this
 * was a plain mismatch — on pc-u2-p1 (`exponential, y=50(0.8)^x`) writing
 * `y=50(.8)^x` was marked wrong. The lookbehind is what keeps it a spelling and
 * not a widening: a dot with a digit or a word character in front of it is
 * already part of something ('3.4', 'v1.8'), and a sentence period is followed by
 * a space rather than a digit.
 */
const LEADING_DOT = /(?<![\w.])\.(\d)/g

/**
 * Fold every character that means an ASCII character onto that character.
 *
 * Applied to both sides of every comparison, so it is an equivalence and not a
 * relaxation: it can only ever make two spellings of the SAME answer agree.
 */
export function foldLookalikes(value) {
  return String(value)
    .replace(ZERO_WIDTH, '')
    .replace(SPACE_LIKE, ' ')
    .replace(FULLWIDTH, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(HYPHEN_LIKE, '-')
    .replace(APOSTROPHE_LIKE, "'")
    .replace(QUOTE_LIKE, '"')
    .replace(SLASH_LIKE, '/')
    .replace(SUPERSCRIPT, (run) => {
      const ascii = [...run].map((c) => SUPERSCRIPT_ASCII[c]).join('')
      return ascii.length > 1 ? `^(${ascii})` : `^${ascii}`
    })
    // A fraction glued to a whole number is mixed, not concatenated: `1½` is
    // `1 1/2`, and folding it to `11/2` would invent a different number.
    .replace(VULGAR, (c, at, whole) => (/\d/.test(whole[at - 1] ?? '') ? ' ' : '') + VULGAR_ASCII[c])
    .replace(SYMBOL, (c) => SYMBOL_ASCII[c])
    .normalize('NFD')
    .replace(COMBINING, '')
    .replace(LEADING_DOT, '0.$1')
}

/** Returned by the option-text matcher when more than one option could match. */
const AMBIGUOUS = Symbol('ambiguous')

/**
 * Case-folded, decoration-stripped form used to compare a response against an
 * option's text. Markdown ticks go (students rarely type them), one trailing
 * period goes, whitespace collapses. Quotes and '!' are kept: on csa-ac-q46
 * `"50"` and `50` are different options, and on csa-ac-q76 so are `go` and `go!`.
 *
 * Lookalikes fold FIRST, so an option printed `n(n−1)/2` and a student typing
 * `n(n-1)/2` reach the same form. It has to run before the strips rather than
 * after: a fullwidth `＄` or `＊` only reaches the `$`/markdown strip once it is
 * ASCII, and a non-breaking space only collapses once it is a space.
 */
function canonAnswer(value) {
  return foldLookalikes(value)
    .toLowerCase()
    .replace(/[`*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '')
    .trim()
}

const isBareLetter = (text) => /^[a-e]$/i.test(text)
const tokensOf = (text) => text.split(' ').filter(Boolean)

/**
 * The canonical form of a response, and — when a hedge is there to strip — the
 * same form without it. Every reader works from these, so none of them can be
 * the one reader that only ever sees the hedged text.
 *
 * The trailing-period strip is repeated after HEDGE_TAIL because canonAnswer's
 * own strip ran against the OLD end of the string: 'the program throws an
 * arithmeticexception. i think' loses ' i think' here, which uncovers a period
 * that was mid-string when canonAnswer looked.
 */
function hedgeBases(response) {
  const canon = canonAnswer(response)
  const hedged = canon.replace(HEDGE_HEAD, '').replace(HEDGE_TAIL, '').replace(/\.$/, '').trim()
  return hedged && hedged !== canon ? [canon, hedged] : [canon]
}

/** The tokens that carry meaning — what is left once the filler is dropped. */
const contentWords = (tokens) => tokens.filter((t) => !STOPWORDS.has(t))

/** How much meaning the heaviest word of an option carries. */
const substanceOf = (tokens) => contentWords(tokens).reduce((max, t) => Math.max(max, t.length), 0)

/** True when `want` appears in `have` as a run of whole tokens. */
function isTokenRun(want, have) {
  if (!want.length || want.length > have.length) return false
  outer: for (let i = 0; i + want.length <= have.length; i++) {
    for (let j = 0; j < want.length; j++) if (have[i + j] !== want[j]) continue outer
    return true
  }
  return false
}

/** The item's options as label -> canonical text, or null when unknown. */
function optionIndex(options) {
  if (!options || typeof options !== 'object') return null
  const index = new Map()
  for (const [label, text] of Object.entries(options)) {
    if (!/^[a-e]$/i.test(label) || text == null) continue
    const canon = canonAnswer(text)
    const tokens = tokensOf(canon)
    index.set(label.toUpperCase(), { canon, tokens, substance: substanceOf(tokens) })
  }
  return index.size ? index : null
}

/** The option whose text is exactly this, AMBIGUOUS if several, null if none. */
function matchExact(text, index) {
  if (!text) return null
  const hits = [...index].filter(([, o]) => o.canon === text).map(([label]) => label)
  if (hits.length === 1) return hits[0]
  return hits.length ? AMBIGUOUS : null
}

/**
 * The option whose text contains this as a run of whole tokens — 'a
 * StringIndexOutOfBoundsException' for 'A StringIndexOutOfBoundsException is
 * thrown.' Every token he typed has to appear, in order, so an added word (a
 * negation, another option's wording) fails to match rather than matching
 * loosely. AMBIGUOUS if several options contain it, null if none.
 *
 * A fragment that comes down to ONE content word has to be that option's
 * substance, not a word out of its sentence frame. Options are written as
 * sentences, so 'thrown', 'prints' and 'loop' each sit in exactly one option and
 * used to resolve to it: on csa-ac-q60 (key C, option C 'A `NullPointerException`
 * is thrown.') the response 'thrown' was credited, and on csa-ac-q4 (key C)
 * 'prints' booked a miss as a pick of D. Neither response states an option.
 * Feeding every word of every shipped option back in as a response, this
 * frame-matching produced 225 credits and 517 misses; requiring the word to be
 * at least as heavy as every other content word in its option leaves 45 and 158,
 * and the words it keeps are the answers that really are one word —
 * 'NullPointerException', 'ArithmeticException', 'Infinity'.
 */
function matchFragment(text, index) {
  if (!text || isBareLetter(text) || text.length < 3) return null
  const want = tokensOf(text)
  const said = contentWords(want)
  if (!said.length) return null
  const hits = [...index].filter(([, o]) => isTokenRun(want, o.tokens))
  if (hits.length !== 1) return hits.length ? AMBIGUOUS : null
  const [label, option] = hits[0]
  if (said.length === 1 && said[0].length < option.substance) return null
  return label
}

/** The label the student named, with whether he named it explicitly. */
function labelReading(response) {
  // The two label patterns are the only readers that work from the RAW response
  // rather than a canonical form, so they are the only ones that have to fold for
  // themselves — otherwise a fullwidth 'Ｂ' or a curly-quoted '‘b’' is a letter
  // everywhere except here.
  const raw = foldLookalikes(response)
  const strong = raw.match(STRONG_LABEL)
  if (strong) return { letter: strong[1].toUpperCase(), strong: true }
  const weak = raw.match(WEAK_LABEL)
  if (weak) return { letter: weak[1].toUpperCase(), strong: false }
  const bare = canonAnswer(raw).replace(HEDGE_HEAD, '').replace(HEDGE_TAIL, '').trim()
  const only = bare.match(LETTER_ONLY)
  return only ? { letter: only[1].toUpperCase(), strong: false } : null
}

/** The option whose value he stated, with whether he said so plainly. */
function valueReading(response, index, letter) {
  const bases = hedgeBases(response)
  if (!bases[0]) return null
  // A letter he decorated is a candidate VALUE as well as a label. LETTER_ONLY
  // strips `"`, `'`, brackets and ',!?:;' off a letter but canonAnswer keeps
  // them, and matchFragment ignores anything under three characters — so on the
  // items where an option's TEXT is a bare letter the value reading silently
  // vanished and the label won a confident verdict. On csa-u2-q7 (key A, option
  // A's text is the printed character 'C') the response '"C"' was scored as a
  // wrong pick of C, and '(A)' — option D's text — was credited. Bare 'C' and
  // 'A' declined correctly, so one comma was the whole difference. Only a
  // reading the label cannot own outright is offered here: a letter introduced
  // by an unmistakable label marker ('choice B') is not a value.
  if (letter && !bases.includes(letter)) bases.push(letter)

  // An option's text typed verbatim outranks every looser reading. csa-u3-q19
  // offers the option `return balance;`, and treating its leading 'return' as a
  // value marker would reduce a verbatim answer to a fragment two options share.
  for (const base of bases) {
    const hit = matchExact(base, index)
    if (hit === AMBIGUOUS) return null
    if (hit) return { letter: hit, explicit: false }
  }
  // Then a value he stated in so many words: 'it prints B', 'the output is ef'.
  for (const base of bases) {
    const stated = base.replace(VALUE_MARKER, '').trim()
    if (!stated || stated === base) continue
    for (const match of [matchExact, matchFragment]) {
      const hit = match(stated, index)
      if (hit === AMBIGUOUS) return null
      if (hit) return { letter: hit, explicit: true }
    }
  }
  // Then part of exactly one option's wording.
  for (const base of bases) {
    const hit = matchFragment(base, index)
    if (hit === AMBIGUOUS) return null
    if (hit) return { letter: hit, explicit: false }
  }
  return null
}

/**
 * A label with its own text after it, which is how the options are PRINTED:
 * 'C. 3.2', '(C) 3.2', 'C) 3.2', 'C - 3.2', 'C: 3.2'. The separator has to be
 * there — a bare space would make the article in 'a NullPointerException' a
 * label prefix.
 */
const LABEL_THEN_TEXT = /^["'“‘([\s]*([a-e])(?:[)\]]|\s*[.:,;]|\s*[-–—])\s+(\S.*)$/i

/** The same pairing, label last: '3.2 (C)'. */
const TEXT_THEN_LABEL = /^(\S.*?)[\s,]*[([]([a-e])[)\]][\s.!?]*$/i

/**
 * One trailing mark a student leaves on the end of an answer. LETTER_ONLY has
 * always tolerated exactly this set on a bare letter, so 'C?' is credited; the
 * text half of the printed form has to tolerate it too, or 'C. 3.2?' declines
 * while both of its halves resolve. Only ONE character, and only after the
 * undecorated text has already failed to match: quotes carry meaning here (on
 * csa-ac-q46 `"50"` and `50` are different options), so a quote is never
 * stripped off a reading that matched with it.
 */
const TRAILING_MARK = /[)\]"'”’.,!?:;]$/

/**
 * The option a half of the printed form names, tolerating one trailing mark.
 */
function textReading(text, index) {
  const first = valueReading(text, index, null)
  if (first || !TRAILING_MARK.test(text)) return first
  return valueReading(text.replace(TRAILING_MARK, ''), index, null)
}

/**
 * The option he named by giving BOTH halves of it — the label and the text
 * printed next to it. Neither single reading sees this: LETTER_ONLY needs the
 * letter to be the whole response, and the label prefix stops the text matching
 * any option, so all 218 shipped items declined 'C. 3.2' with reason no_letter.
 * api.js has already spent the serve by the time the grader says so and states
 * that the attempt cannot be re-graded, so a right answer in the most natural
 * possible format produced no evidence at all, permanently, on every item.
 *
 * `agrees` is false when the two halves name different options — 'C. 3.4' where
 * 3.4 is option A. That is the same standoff as any other double reading and is
 * reported unparsed rather than resolved to whichever half is checked first.
 *
 * Both patterns are anchored at ^, so this reader is the one that cannot afford
 * to work from the raw response: 'I think C. 3.2' matched neither shape and was
 * thrown away even though 'C. 3.2' and 'I think C' are each credited on their
 * own. It reads the hedge-stripped canonical forms instead, newest reading
 * first, so an unhedged response is judged exactly as it was before.
 */
function labelWithText(response, index) {
  for (const base of hedgeBases(response)) {
    for (const [pattern, letterAt, textAt] of [
      [LABEL_THEN_TEXT, 1, 2],
      [TEXT_THEN_LABEL, 2, 1],
    ]) {
      const split = base.match(pattern)
      if (!split) continue
      const letter = split[letterAt].toUpperCase()
      // 'E. 3.2' on a four-option item names nothing, so it is not this shape.
      if (!index.has(letter)) continue
      const value = textReading(split[textAt], index)
      if (!value) continue
      return { letter, agrees: value.letter === letter }
    }
  }
  return null
}

/**
 * Read a response as one of `options`, reporting why when it cannot be read.
 *
 * Two readings compete: the LABEL he named, and the option VALUE he stated. When
 * they disagree, either can be the right one and no rule can tell which without
 * peeking at the key — and both shapes ship. csa-ac-q14 offers a label B and an
 * option C whose text is the string 'B'; csa-u2-q7 offers a label A and an
 * option D whose text is 'A', with A as the key. Preferring the label marks a
 * right answer wrong on the first; preferring the value marks a right answer
 * wrong on the second. So a genuinely ambiguous response is reported unparsed
 * and nothing at all is booked against it.
 */
function readChoice(response, options) {
  if (response == null) return { letter: null, reason: 'no_letter' }
  const index = optionIndex(options)
  let label = labelReading(response)
  // 'E' on a four-option item names nothing, so it is not a competing reading.
  if (label && index && !index.has(label.letter)) label = null
  // A letter he did not introduce with a label marker is also a candidate value,
  // so the two readings can collide and be reported instead of one guessing.
  const candidate = label && !label.strong ? label.letter.toLowerCase() : null
  const value = index ? valueReading(response, index, candidate) : null

  if (!label && !value) {
    // Neither half of the response is a reading on its own. It may still be a
    // whole printed option: both halves, which have to agree.
    const printed = index ? labelWithText(response, index) : null
    if (printed?.agrees) return { letter: printed.letter, reason: 'labelled_value' }
    return { letter: null, reason: printed ? 'ambiguous_choice' : 'no_letter' }
  }

  if (!value) return { letter: label.letter, reason: 'label' }
  if (!label) return { letter: value.letter, reason: 'value' }
  if (label.letter === value.letter) return { letter: label.letter, reason: 'label' }
  if (value.explicit && !label.strong) return { letter: value.letter, reason: 'value' }
  if (label.strong && !value.explicit) return { letter: label.letter, reason: 'label' }
  return { letter: null, reason: 'ambiguous_choice' }
}

/**
 * Pull the option letter out of whatever the student typed, using the item's
 * options when they are known. Null when the response cannot be read as exactly
 * one option, which callers must treat as unanswered rather than wrong — see the
 * 'unparsed' branch of grade().
 */
export function resolveChoice(response, options) {
  return readChoice(response, options).letter
}

/**
 * The letter a bare choice names, ignoring option text: 'b', 'B', '(B)', 'B)',
 * ' b. ', 'answer: B', 'choice B', 'I think B'. Null for anything that is not
 * itself a choice, including prose that merely contains a letter. Used for
 * answer KEYS, which are always labels, and for responses on items whose options
 * are not to hand.
 */
export function normalizeChoice(response) {
  if (response == null) return null
  return labelReading(response)?.letter ?? null
}

/** True when the student left it blank or typed only whitespace. */
export function isBlank(response) {
  return response == null || String(response).trim() === ''
}

/**
 * Canonical form for a short answer: case-folded, whitespace-collapsed, and
 * stripped of the decoration students add ($, spaces around operators, a
 * trailing period, 'x =' prefixes).
 *
 * Order matters. Trimming happens BEFORE the anchored prefix and suffix strips —
 * with a leading space, `^(x|y|...)=` never matches, and ' x = 4. ' would
 * normalize to 'x=4.' and be marked wrong against a key of '4'. A false
 * negative here tells a student they got something wrong when they did not,
 * which is the one grading error this system must never make.
 *
 * The lookalike fold is the first step for the same reason: `−`, `–` and `—` only
 * collapse to `x-1` at the operator strip once they are an ASCII hyphen, and
 * `x ＝ 4` only loses its prefix once the `＝` is an `=`.
 */
export function normalizeShort(response) {
  if (response == null) return ''
  const cleaned = foldLookalikes(response)
    .toLowerCase()
    .replace(/\$/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned
    .replace(/^(x|y|f\(x\)|answer)\s*=\s*/, '')
    .replace(/\s*([=+\-*/^,])\s*/g, '$1')
    .replace(/\.$/, '')
    .trim()
}

/** Parse a lone number, tolerating commas and a leading +. Null if not numeric. */
export function asNumber(text) {
  const t = String(text).replace(/,/g, '').replace(/^\+/, '').trim()
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return null
  return Number(t)
}

/**
 * Kinds the server refuses to score. These go to the model and are recorded
 * `graded_by: 'model'`, which excludes them from every mechanical readiness
 * floor until the grader is calibrated.
 */
export const MODEL_GRADED = new Set(['frq', 'constructed_model_graded'])

/**
 * True when an attempt's verdict was reached mechanically, and may therefore
 * count toward a performance number.
 *
 * Excludes model-graded work (quarantined until the grader is calibrated),
 * unkeyed items (never graded at all), and responses the grader could not read
 * as one answer ('unparsed'). Treats a missing `graded_by` as server-graded,
 * since the field post-dates the earliest attempt rows.
 *
 * Every place that computes a percentage or counts a miss must filter through
 * this. Counting an ungraded attempt as a miss would blame the student for a gap
 * in the question bank.
 */
export function isServerGraded(attempt) {
  return attempt.graded_by !== 'model' && attempt.graded_by !== 'unkeyed' && attempt.graded_by !== 'unparsed'
}

/**
 * Grade one attempt against a stored item.
 *
 * Returns { correct, blank, graded_by, keyed, detail }. `graded_by` is 'server'
 * only when the verdict is mechanical, 'model' for rubric-scored work, 'unkeyed'
 * when the item itself has no usable answer key, and 'unparsed' when the response
 * could not be read as one answer. Only 'server' is a verdict; the other three
 * all mean "not graded", and isServerGraded() excludes them.
 */
export function grade(item, response) {
  if (MODEL_GRADED.has(item.kind)) {
    return { correct: 0, blank: isBlank(response), graded_by: 'model', keyed: null, detail: 'rubric' }
  }

  // An item with no answer key cannot be graded. Returning `correct: 0` with
  // graded_by 'server' would tell the student he got it WRONG when the content
  // is what is missing — a false negative caused by a gap in the bank rather
  // than by anything he did. This is reported as ungraded instead, and
  // 'unkeyed' attempts are excluded from every readiness floor.
  //
  // An mcq keyed with something that is not a letter choice is the same failure
  // in a different hat: the key exists but nothing can be compared to it, so
  // scoring it would mark EVERY student wrong. validate.js does not cover every
  // subject, so the grader checks for itself.
  const unusableKey =
    item.answer == null ||
    String(item.answer).trim() === '' ||
    (item.kind === 'mcq' && normalizeChoice(item.answer) === null)
  if (unusableKey) {
    return {
      correct: 0,
      blank: isBlank(response),
      graded_by: 'unkeyed',
      keyed: null,
      detail: 'no_answer_key',
    }
  }

  if (isBlank(response)) {
    return { correct: 0, blank: true, graded_by: 'server', keyed: item.answer, detail: 'blank' }
  }

  if (item.kind === 'mcq') {
    const keyed = normalizeChoice(item.answer)
    const { letter: picked, reason } = readChoice(response, item.options)
    // A response the grader cannot read as one answer is NOT a wrong answer.
    // 'unparsed' keeps it out of percentages, gap detection and readiness, so
    // nothing he typed can become a miss he then has to work off.
    if (picked === null) {
      return { correct: 0, blank: false, graded_by: 'unparsed', keyed, detail: reason }
    }
    return {
      correct: picked === keyed ? 1 : 0,
      blank: false,
      graded_by: 'server',
      keyed,
      picked,
      detail: 'letter',
    }
  }

  // Short constructed answer: exact canonical match, or any accepted variant,
  // or numeric agreement inside a tolerance the item may specify. An answer of 0
  // is a real answer, so this filters on absence rather than falsiness —
  // filter(Boolean) dropped a key or variant of 0 and marked '0' wrong.
  const got = normalizeShort(response)
  const accepted = [item.answer, ...(item.answer_variants ?? [])]
    .filter((a) => a != null && String(a).trim() !== '')
    .map(normalizeShort)
  if (accepted.includes(got)) {
    return { correct: 1, blank: false, graded_by: 'server', keyed: item.answer, detail: 'exact' }
  }

  const gotNum = asNumber(got)
  if (gotNum !== null) {
    const tol = item.tolerance ?? 0
    // The bound has to include the tolerance the item declared, and binary
    // floating point makes a bare `<= tol` exclusive at the edge: 3.1 - 3 is
    // 0.10000000000000009, so a tolerance of 0.1 rejected 3.1. A relative slack
    // restores the inclusive bound without widening it.
    const slack = tol * 1e-9
    for (const a of accepted) {
      const want = asNumber(a)
      if (want !== null && Math.abs(want - gotNum) <= tol + slack) {
        return { correct: 1, blank: false, graded_by: 'server', keyed: item.answer, detail: 'numeric' }
      }
    }
  }

  return { correct: 0, blank: false, graded_by: 'server', keyed: item.answer, detail: 'mismatch' }
}
