import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { pathToFileURL } from 'node:url'
import { formatGhs, parseGhsCents, SusuGroup } from './src/susu.js'

function printReport(group) {
  const report = group.getReport()
  console.log(`\nWeekly contribution: GHS ${formatGhs(report.weeklyContribution)}`)
  if (report.complete) console.log('Group rotation complete.')
  else {
    console.log(`Current week: ${report.currentWeek}`)
    if (report.members.length === 0) console.log('No members have been added.')
    for (const member of report.members) {
      const status = member.paidInFull ? 'paid in full' : `owes GHS ${formatGhs(member.owed)}`
      console.log(`- ${member.member}: ${status}`)
    }
  }
  console.log('Payout history:')
  if (report.payoutHistory.length === 0) console.log('- None')
  for (const payout of report.payoutHistory) {
    console.log(`- Week ${payout.week}: GHS ${formatGhs(payout.amount)} to ${payout.recipient}`)
  }
}

export async function runCli() {
  const input = readline.createInterface({ input: stdin, output: stdout })
  try {
    const weeklyContribution = parseGhsCents(
      await input.question('Weekly contribution in GHS: '),
      'Weekly contribution',
    )
    const group = new SusuGroup(weeklyContribution)
    console.log('Commands: add <name> | pay <name> <amount> | close | report | help | exit')
    while (true) {
      const command = (await input.question('susu> ')).trim()
      if (!command) continue
      if (command.toLowerCase() === 'exit') break
      try {
        if (/^help$/i.test(command)) {
          console.log('add <name>         Add a member before week 1 starts')
          console.log('pay <name> <amount> Record a partial or full payment for the current week')
          console.log('close              Close the week; payout occurs only when all are paid')
          console.log('report             Show current week, balances, and payout history')
          console.log('exit               Quit the program')
        } else if (/^add\s+/i.test(command)) {
          const name = command.replace(/^add\s+/i, '').trim()
          group.addMember(name)
          console.log(`Added ${name}.`)
        } else if (/^pay\s+/i.test(command)) {
          const match = command.match(/^pay\s+(.+?)\s+(\S+)$/i)
          if (!match) throw new Error('Use: pay <member name> <amount>')
          const amount = parseGhsCents(match[2], 'Payment')
          const result = group.recordContribution(match[1], amount)
          console.log(`${result.member} paid GHS ${formatGhs(amount)}; remaining: GHS ${formatGhs(result.owed)}.`)
        } else if (/^close$/i.test(command)) {
          const result = group.closeWeek()
          if (result.paidOut) {
            console.log(`Week ${result.payout.week} paid out GHS ${formatGhs(result.payout.amount)} to ${result.payout.recipient}.`)
          } else {
            console.log('No payout. Outstanding contributions:')
            for (const entry of result.outstanding) {
              console.log(`- ${entry.member} owes GHS ${formatGhs(entry.owed)}`)
            }
          }
        } else if (/^report$/i.test(command)) printReport(group)
        else console.log('Unknown command. Type help for available commands.')
      } catch (error) {
        console.log(`Error: ${error.message}`)
      }
    }
  } finally {
    input.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(`Error: ${error.message}`)
    process.exitCode = 1
  })
}