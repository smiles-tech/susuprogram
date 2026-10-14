export function parseGhsCents(value, label = 'Amount') {
  const text = String(value).trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new Error(`${label} must be a positive amount with at most two decimal places.`)
  }
  const [whole, fraction = ''] = text.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error(`${label} must be a positive amount.`)
  }
  return cents
}

export function formatGhs(cents) {
  const amount = BigInt(cents)
  return `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`
}

export class SusuGroup {
  constructor(weeklyContributionCents) {
    if (!Number.isSafeInteger(weeklyContributionCents) || weeklyContributionCents <= 0) {
      throw new Error('Weekly contribution must be a positive amount in pesewas.')
    }
    this.weeklyContributionCents = weeklyContributionCents
    this.members = []
    this.currentWeek = 1
    this.weeklyPayments = new Map()
    this.payoutHistory = []
    this.started = false
  }

  addMember(name) {
    const cleanName = String(name).trim()
    if (!cleanName) throw new Error('Member name cannot be empty.')
    if (this.started) throw new Error('Members can only be added before week 1 starts.')
    if (this.members.some((member) => member.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error(`A member named "${cleanName}" already exists.`)
    }
    if (BigInt(this.weeklyContributionCents) * BigInt(this.members.length + 1) > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('The group pot would exceed the maximum exactly representable amount.')
    }
    this.members.push(cleanName)
  }

  recordContribution(name, amountCents) {
    const member = this.findMember(name)
    this.ensureActive()
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      throw new Error('Payment must be a positive amount in pesewas.')
    }
    const payments = this.weeklyPayments.get(this.currentWeek) ?? new Map()
    const paid = payments.get(member) ?? 0
    const owed = this.weeklyContributionCents - paid
    if (amountCents > owed) {
      throw new Error(`${member} only owes GHS ${formatGhs(owed)} for week ${this.currentWeek}.`)
    }
    this.started = true
    payments.set(member, paid + amountCents)
    this.weeklyPayments.set(this.currentWeek, payments)
    return { member, paid: paid + amountCents, owed: owed - amountCents }
  }

  closeWeek() {
    this.ensureActive()
    if (this.members.length === 0) throw new Error('Add at least one member before closing a week.')
    this.started = true
    const payments = this.weeklyPayments.get(this.currentWeek) ?? new Map()
    const outstanding = this.members
      .map((member) => ({ member, owed: this.weeklyContributionCents - (payments.get(member) ?? 0) }))
      .filter(({ owed }) => owed > 0)
    if (outstanding.length > 0) return { paidOut: false, outstanding }

    const payout = {
      week: this.currentWeek,
      recipient: this.members[this.payoutHistory.length],
      amount: this.weeklyContributionCents * this.members.length,
    }
    this.payoutHistory.push(payout)
    this.currentWeek += 1
    return { paidOut: true, payout }
  }

  getReport() {
    const complete = this.members.length > 0 && this.payoutHistory.length === this.members.length
    const payments = this.weeklyPayments.get(this.currentWeek) ?? new Map()
    return {
      currentWeek: complete ? null : this.currentWeek,
      weeklyContribution: this.weeklyContributionCents,
      complete,
      members: complete ? [] : this.members.map((member) => {
        const paid = payments.get(member) ?? 0
        return {
          member,
          paid,
          owed: this.weeklyContributionCents - paid,
          paidInFull: paid === this.weeklyContributionCents,
        }
      }),
      payoutHistory: [...this.payoutHistory],
    }
  }

  findMember(name) {
    const member = this.members.find((entry) => entry.toLowerCase() === String(name).trim().toLowerCase())
    if (!member) throw new Error(`Unknown member: "${name}".`)
    return member
  }

  ensureActive() {
    if (this.members.length > 0 && this.payoutHistory.length >= this.members.length) {
      throw new Error('This susu group has completed its rotation.')
    }
  }
}