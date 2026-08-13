import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ping } from '../build.js'

test('harness runs and build.js is importable', () => {
  assert.equal(ping(), 'pong')
})
