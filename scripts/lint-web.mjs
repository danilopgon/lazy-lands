import { spawn } from 'node:child_process'
import process from 'node:process'

const child = spawn('pnpm --filter web lint', {
  shell: true,
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
