import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
const routes = new Map([
  ['/architecture.html', await readFile(new URL('./normify-architecture-view/normify.html', import.meta.url))],
  ['/data.html', await readFile(new URL('./normify-data/normify.html', import.meta.url))],
])
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const html = routes.get(path)
  if (!html) { response.writeHead(404); response.end('Not found'); return }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(html)
})
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port
  console.log(JSON.stringify({ architecture: `http://127.0.0.1:${port}/architecture.html?lang=zh#module=bili`, data: `http://127.0.0.1:${port}/data.html?lang=zh#module=data` }))
})
