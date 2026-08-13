/**
 * Mechanically verify MCQ answer keys by COMPILING AND RUNNING the Java.
 *
 * Reasoning about a trace is an opinion; the JVM's stdout is evidence. This tool
 * only auto-verifies items where that evidence is obtainable:
 *
 *   - the stem contains a fenced ```java block
 *   - the snippet is statements only (no method/class declarations to hoist)
 *   - the program's stdout exactly matches exactly one of the four options
 *
 * Everything else is reported as SKIPPED with a reason, never silently passed.
 * A mismatch between the matched option and the keyed answer is a MISKEY.
 *
 * Usage: node tools/verify/verify-keys.js [--limit N]
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const JAVAC = '/opt/homebrew/opt/openjdk/bin/javac'
const JAVA = '/opt/homebrew/opt/openjdk/bin/java'

const DECL = /^\s*(public|private|protected)?\s*(static\s+)?[A-Za-z_<>\[\]]+\s+\w+\s*\([^)]*\)\s*\{/m
const BLANK = /\/\*\s*BLANK\s*\*\/|INSERT HERE/i
// "How many times…" style items: options are a COUNT, but the program prints marks.
const ASKS_COUNT = /how many times|how many .* (execute|run|iterations)|statement execute/i
// "Which change fixes…" style items: options are edits, not output.
const ASKS_FIX = /which (change|fix|edit|option) |which of the following fixes|fixes it\?/i
// Items whose snippet leans on a class or variable described only in prose.
const NEEDS_CONTEXT = /\b(Team|Counter|Cell|Roster|Bank|Student)\b|\bwords\b|\bcheck\(\)/

function extractJava(stem) {
  const m = stem.match(/```java\s*\n([\s\S]*?)```/)
  return m ? m[1].trim() : null
}

function runSnippet(code, dir) {
  const src = `import java.util.*;
public class T {
  public static void main(String[] args) {
${code
  .split('\n')
  .map((l) => `    ${l}`)
  .join('\n')}
  }
}
`
  writeFileSync(join(dir, 'T.java'), src)
  // Compile errors are a real defect. Runtime exceptions may BE the answer.
  execFileSync(JAVAC, ['-nowarn', 'T.java'], { cwd: dir, stdio: 'pipe' })
  try {
    const out = execFileSync(JAVA, ['T'], { cwd: dir, stdio: 'pipe', timeout: 8000 })
    return { stdout: out.toString().replace(/\r/g, '').trim(), threw: null }
  } catch (e) {
    if (e.killed || e.signal) {
      return { stdout: '', threw: null, timedOut: true }
    }
    const err = (e.stderr?.toString() || '') + (e.stdout?.toString() || '')
    const m = err.match(/Exception in thread "main"\s+(?:[\w.$]*\.)?(\w*(?:Exception|Error))/)
    return {
      stdout: (e.stdout?.toString() || '').replace(/\r/g, '').trim(),
      threw: m ? m[1] : 'UnknownThrowable',
    }
  }
}

function norm(s) {
  return String(s).trim().replace(/\s+/g, ' ')
}

const items = JSON.parse(readFileSync('content/items.json', 'utf8'))
const limitArg = process.argv.indexOf('--limit')
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : items.length

const dir = mkdtempSync(join(tmpdir(), 'apcsa-verify-'))
const results = { verified: [], miskeyed: [], noMatch: [], skipped: [], compileError: [] }

for (const it of items.slice(0, limit)) {
  const code = extractJava(it.stem)
  if (!code) {
    results.skipped.push([it.id, 'no fenced java block'])
    continue
  }
  if (DECL.test(code)) {
    results.skipped.push([it.id, 'declares a method/class — not a plain statement body'])
    continue
  }
  if (BLANK.test(code)) {
    results.skipped.push([it.id, 'fill-in-the-blank item — incomplete by design'])
    continue
  }
  if (ASKS_COUNT.test(it.stem)) {
    results.skipped.push([it.id, 'asks for an execution COUNT, not printed output'])
    continue
  }
  if (ASKS_FIX.test(it.stem)) {
    results.skipped.push([it.id, 'asks which change fixes the code, not what it prints'])
    continue
  }
  if (NEEDS_CONTEXT.test(code)) {
    results.skipped.push([it.id, 'snippet uses a class/variable defined only in the prose'])
    continue
  }
  if (/new File\(|new Scanner\(/.test(code)) {
    results.skipped.push([it.id, 'file I/O — needs fixture data'])
    continue
  }
  if (!/System\.out\.print/.test(code)) {
    results.skipped.push([it.id, 'no println — nothing to capture'])
    continue
  }

  let res
  try {
    res = runSnippet(code, dir)
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message || '').split('\n')[0].slice(0, 120)
    results.compileError.push([it.id, msg])
    continue
  }

  // An item whose answer is "throws X" is matched on the exception name.
  // Multi-line stdout is compared both verbatim and with newlines collapsed,
  // because options are often written inline ("1 12 123"). A newline-normalised
  // match is reported separately so it is never a silent pass.
  let matches
  let evidence
  let loose = false
  if (res.timedOut) {
    matches = Object.entries(it.options).filter(([, v]) => /forever|infinite|never (ends|terminates)|does not terminate/i.test(String(v)))
    evidence = 'timed out (infinite loop)'
  } else if (res.threw) {
    matches = Object.entries(it.options).filter(([, v]) => new RegExp(`\\b${res.threw}\\b`).test(String(v)))
    evidence = `throws ${res.threw}`
  } else {
    evidence = `stdout ${JSON.stringify(res.stdout)}`
    matches = Object.entries(it.options).filter(([, v]) => norm(v) === norm(res.stdout))
    if (matches.length !== 1 && res.stdout.includes('\n')) {
      const flat = res.stdout.split('\n').join(' ')
      const alt = Object.entries(it.options).filter(([, v]) => norm(v) === norm(flat))
      if (alt.length === 1) {
        matches = alt
        loose = true
      }
    }
  }

  if (matches.length !== 1) {
    results.noMatch.push([it.id, `${evidence} matched ${matches.length} options`])
    continue
  }
  const [letter] = matches[0]
  if (letter === it.answer) {
    results.verified.push(loose ? `${it.id} (newline-normalised)` : it.id)
  } else {
    results.miskeyed.push([it.id, `JVM says ${letter} (${evidence}), key says ${it.answer}`])
  }
}

rmSync(dir, { recursive: true, force: true })

const line = (n) => '─'.repeat(n)
console.log(line(70))
console.log(`VERIFIED BY EXECUTION : ${results.verified.length}`)
console.log(`MISKEYED              : ${results.miskeyed.length}`)
console.log(`OUTPUT MATCHED NO/MANY: ${results.noMatch.length}`)
console.log(`COMPILE/RUN ERROR     : ${results.compileError.length}`)
console.log(`SKIPPED (not eligible): ${results.skipped.length}`)
console.log(line(70))

if (results.miskeyed.length) {
  console.log('\n### MISKEYED — the JVM disagrees with the answer key')
  for (const [id, why] of results.miskeyed) console.log(`  ${id}: ${why}`)
}
if (results.noMatch.length) {
  console.log('\n### OUTPUT MATCHED NO OPTION (or several) — inspect these')
  for (const [id, why] of results.noMatch) console.log(`  ${id}: ${why}`)
}
if (results.compileError.length) {
  console.log('\n### COMPILE/RUN ERRORS (often an intentional exception item)')
  for (const [id, why] of results.compileError) console.log(`  ${id}: ${why}`)
}

const skipReasons = {}
for (const [, why] of results.skipped) skipReasons[why] = (skipReasons[why] || 0) + 1
console.log('\n### SKIP REASONS')
for (const [why, n] of Object.entries(skipReasons)) console.log(`  ${n}  ${why}`)

process.exitCode = results.miskeyed.length ? 1 : 0
