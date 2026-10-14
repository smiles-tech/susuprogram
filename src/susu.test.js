import test from 'node:test'
import assert from 'node:assert/strict'
import { formatGhs, parseGhsCents, SusuGroup } from './susu.js'

test('example: partial payment blocks payout until the balance is paid', () => {
  const group = new SusuGroup(parseGhsCents('50.00'))
  for (const name of ['Ama', 'Kofi', 'Esi']) group.addMember(name)
  group.recordContribution('Ama', parseGhsCents('50'))
  group.recordContribution('Kofi', parseGhsCents('50'))
  group.recordContribution('Esi', parseGhsCents('30'))
  const firstClose = group.closeWeek()
  assert.equal(firstClose.paidOut, false)
  assert.deepEqual(firstClose.outstanding, [{ member: 'Esi', owed: 2000 }])
  group.recordContribution('Esi', parseGhsCents('20'))
  const secondClose = group.closeWeek()
  assert.equal(secondClose.payout.recipient, 'Ama')
  assert.equal(formatGhs(secondClose.payout.amount), '150.00')
  assert.equal(group.getReport().currentWeek, 2)
  assert.deepEqual(group.getReport().payoutHistory.map(({ recipient }) => recipient), ['Ama'])
})

test('rejects invalid payments, unknown members, and duplicate members', () => {
  const group = new SusuGroup(5000)
  group.addMember('Ama')
  assert.throws(() => group.addMember('ama'), /already exists/)
  assert.throws(() => group.recordContribution('Kofi', 100), /Unknown member/)
  assert.throws(() => group.recordContribution('Ama', 0), /positive/)
  assert.throws(() => group.recordContribution('Ama', -1), /positive/)
  assert.throws(() => group.recordContribution('Ama', 5001), /only owes/)
  assert.throws(() => parseGhsCents('1.234'), /at most two decimal places/)
})

test('locks membership and completes after one payout per member', () => {
  const group = new SusuGroup(100)
  group.addMember('Ama')
  group.addMember('Kofi')
  group.recordContribution('Ama', 100)
  assert.throws(() => group.addMember('Esi'), /before week 1 starts/)
  group.recordContribution('Kofi', 100)
  group.closeWeek()
  group.recordContribution('Ama', 100)
  group.recordContribution('Kofi', 100)
  group.closeWeek()
  assert.equal(group.getReport().complete, true)
  assert.deepEqual(group.getReport().payoutHistory.map(({ recipient }) => recipient), ['Ama', 'Kofi'])
  assert.throws(() => group.closeWeek(), /completed its rotation/)
})

test('keeps large amounts exact and rejects a pot beyond the safe integer range', () => {
  const group = new SusuGroup(Number.MAX_SAFE_INTEGER)
  group.addMember('Ama')
  assert.equal(formatGhs(Number.MAX_SAFE_INTEGER), '90071992547409.91')
  assert.throws(() => group.addMember('Kofi'), /maximum exactly representable amount/)
})