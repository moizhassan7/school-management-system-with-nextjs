import assert from 'node:assert/strict';
import test from 'node:test';
import { stripSecrets, assertSameSchool, type AppSession } from '../lib/authz';
import { hashPassword, legacySha256, verifyPassword, wrapLegacySha256 } from '../lib/password';
import { PaymentRejectedError } from '../lib/payments';

function session(role: string, schoolId: string): AppSession {
  return { user: { role, schoolId, id: 'u1' } };
}

test('stripSecrets removes password hashes from nested payloads', () => {
  const payload = stripSecrets({
    id: '1',
    passwordHash: 'secret',
    studentRecord: { user: { name: 'A', password: 'nope' } },
  });
  assert.equal('passwordHash' in (payload as object), false);
  assert.equal((payload as { studentRecord: { user: { password?: string } } }).studentRecord.user.password, undefined);
  assert.equal((payload as { studentRecord: { user: { name: string } } }).studentRecord.user.name, 'A');
});

test('assertSameSchool blocks cross-school access', () => {
  const denied = assertSameSchool(session('ADMIN', 'school-a'), 'school-b');
  assert.equal(denied?.status, 403);
  assert.equal(assertSameSchool(session('ADMIN', 'school-a'), 'school-a'), null);
  assert.equal(assertSameSchool(session('SUPER_ADMIN', 'school-a'), 'school-b'), null);
});

test('verifyPassword accepts legacy SHA-256 and flags upgrade', async () => {
  const legacy = legacySha256('password123');
  const legacyResult = await verifyPassword('password123', legacy);
  assert.equal(legacyResult.ok, true);
  assert.equal(legacyResult.needsUpgrade, true);

  const modern = await hashPassword('password123');
  const modernResult = await verifyPassword('password123', modern);
  assert.equal(modernResult.ok, true);
  assert.equal(modernResult.needsUpgrade, false);
  assert.equal((await verifyPassword('wrong-pass', modern)).ok, false);
});

test('wrapped SHA-256 hashes verify without storing the raw hash', async () => {
  const raw = legacySha256('password123');
  const wrapped = await wrapLegacySha256(raw);
  assert.equal(wrapped.startsWith('sha256$'), true);
  assert.equal(wrapped.includes(raw), false);
  const result = await verifyPassword('password123', wrapped);
  assert.equal(result.ok, true);
  assert.equal(result.needsUpgrade, true);
});

test('PaymentRejectedError is distinguishable for overpay races', () => {
  const error = new PaymentRejectedError('Amount exceeds pending balance or invoice is not payable');
  assert.equal(error.name, 'PaymentRejectedError');
  assert.match(error.message, /pending balance/);
});
