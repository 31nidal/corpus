import {test} from 'node:test'
import assert from 'node:assert/strict'
import {applySecurityHeaders, SECURITY_HEADERS} from '../server/security.mjs'

test('les réponses HTTP reçoivent les en-têtes de sécurité attendus', () => {
  const received = {}
  applySecurityHeaders({setHeader(name, value) { received[name] = value }})
  assert.deepEqual(received, SECURITY_HEADERS)
  assert.match(received['Content-Security-Policy'], /frame-ancestors 'none'/)
  assert.equal(received['X-Content-Type-Options'], 'nosniff')
  assert.equal(received['X-Frame-Options'], 'DENY')
})
