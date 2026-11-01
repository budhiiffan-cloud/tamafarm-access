import test from 'node:test'
import assert from 'node:assert/strict'
import { orderCodeFromQr } from './orderQr.js'

test('accepts the Android QR format and manually entered order code', () => {
  assert.equal(orderCodeFromQr('TAMAFARM:ORDER:TF-ABC123DEF456'), 'TF-ABC123DEF456')
  assert.equal(orderCodeFromQr(' TF-ABC123DEF456 '), 'TF-ABC123DEF456')
})
test('rejects URLs, path injection, another QR format and oversized input', () => {
  for (const text of ['https://example.com', 'TAMAFARM:ORDER:TF-ABC123DEF456/../admin', 'TF-123', 'OTHER:TF-ABC123DEF456', 'x'.repeat(101), null]) {
    assert.equal(orderCodeFromQr(text), null)
  }
})
