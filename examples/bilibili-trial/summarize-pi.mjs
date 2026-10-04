import { readFile } from 'node:fs/promises'
const raw = await readFile(new URL('./pi-events.jsonl', import.meta.url), 'utf8')
const lines = raw.split('\n').slice(0, -1).filter(line => line.trim())
const counts = {}
const calls = []
const messages = []
for (const line of lines) {
  const event = JSON.parse(line)
  counts[event.type] = (counts[event.type] ?? 0) + 1
  if (event.type === 'tool_execution_start') calls.push({ id: event.toolCallId, name: event.toolName, tool: event.args?.tool, connect: event.args?.connect, argsKeys: Object.keys(event.args ?? {}), modules: event.args?.args?.graph?.modules?.length })
  if (event.type === 'tool_execution_end') {
    const entry = calls.find(call => call.id === event.toolCallId)
    if (entry) { entry.done = true; entry.error = event.isError; entry.resultChars = JSON.stringify(event.result).length; entry.preview = event.result?.content?.filter(content => content.type === 'text').map(content => content.text.slice(0, 200)).join(' | ') }
  }
  if (event.type === 'message_end') {
    const message = event.message
    messages.push({ role: message.role, stopReason: message.stopReason, contentTypes: (message.content ?? []).map(content => content.type) })
  }
}
console.log(JSON.stringify({ bytes: Buffer.byteLength(raw), counts, calls: process.argv.includes('--compact') ? calls.slice(-6) : calls, messages: messages.slice(-3) }, null, 2))
