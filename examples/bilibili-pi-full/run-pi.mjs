import { spawn } from 'node:child_process'
import { createWriteStream, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const trial = dirname(fileURLToPath(import.meta.url))
const sessionPath = process.argv[2]
const sessionId = sessionPath ? null : randomUUID()
const prompt = process.argv[3] ?? '@run.md'
const argv = [
  '--print', '--mode', 'json', '--provider', 'deepseek', '--model', 'deepseek-v4-flash', '--thinking', 'high',
  '--no-extensions', '--extension', join(trial, 'pi-mcp.ts'),
  '--no-skills', '--no-prompt-templates', '--no-context-files', '--offline', '--approve',
  '--tools', 'read,write,edit,powershell,mcp,mcpScript',
  '--session-dir', join(trial, 'pi-sessions'),
  ...(sessionPath ? ['--session', sessionPath] : ['--session-id', sessionId]),
  prompt,
]
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const eventsPath = join(trial, `pi-events-${stamp}.jsonl`)
const stderrPath = join(trial, `pi-stderr-${stamp}.log`)
const events = createWriteStream(eventsPath)
const errors = createWriteStream(stderrPath)
const child = spawn('<pi-executable>', argv, {
  cwd: trial, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
})
const run = { runner: 'pi', provider: 'deepseek', model: 'deepseek-v4-flash', sessionId, sessionPath, pid: child.pid,
  startedAt: new Date().toISOString(), eventsPath, stderrPath }
writeFileSync(join(trial, 'pi-run.json'), JSON.stringify(run, null, 2) + '\n')
console.log(JSON.stringify({ event: 'pi_started', ...run }))
child.stderr.pipe(errors)
const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
let tools = 0
lines.on('line', line => {
  let event
  try { event = JSON.parse(line) }
  catch { errors.write(line + '\n'); return }
  if (event.type !== 'message_update') events.write(line + '\n')
  if (event.type === 'tool_execution_start') {
    tools++
    console.log(JSON.stringify({ event: 'tool_start', n: tools, tool: event.toolName,
      path: event.args?.path, target: event.args?.tool, command: event.args?.command?.slice(0, 180) }))
  } else if (event.type === 'tool_execution_end') {
    const text = (event.result?.content ?? []).filter(part => part.type === 'text').map(part => part.text).join('\n')
    console.log(JSON.stringify({ event: 'tool_end', tool: event.toolName, error: event.isError,
      result: text.slice(0, 1000) }))
  } else if (event.type === 'message_end' && event.message?.role === 'assistant') {
    const text = (event.message.content ?? []).filter(part => part.type === 'text').map(part => part.text).join('\n')
    if (text) console.log(JSON.stringify({ event: 'pi_message', stopReason: event.message.stopReason, text: text.slice(0, 1800) }))
  }
})
child.once('error', error => { console.error(String(error)); process.exitCode = 1 })
child.once('close', (code, signal) => {
  events.end(); errors.end()
  writeFileSync(join(trial, 'pi-run.json'), JSON.stringify({ ...run, endedAt: new Date().toISOString(), code, signal, toolCalls: tools }, null, 2) + '\n')
  console.log(JSON.stringify({ event: 'pi_finished', code, signal, toolCalls: tools, sessionId }))
  process.exitCode = code ?? 1
})
