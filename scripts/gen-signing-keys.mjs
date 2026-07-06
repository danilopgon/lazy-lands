import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'

const outPath = resolve(
  import.meta.dirname,
  '..',
  'supabase',
  'signing_keys.json'
)

if (existsSync(outPath)) {
  const existing = JSON.parse(readFileSync(outPath, 'utf8'))
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(
      'supabase/signing_keys.json already exists with keys. Delete it first to regenerate.'
    )
    process.exit(0)
  }
  unlinkSync(outPath)
}

writeFileSync(outPath, '[]')

try {
  execSync('supabase gen signing-key --algorithm ES256', { stdio: 'pipe' })
  const keys = JSON.parse(readFileSync(outPath, 'utf8'))
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('Generated signing keys file is empty or invalid')
  }
  console.log(`Wrote supabase/signing_keys.json (${keys.length} key(s))`)
} catch (err) {
  if (existsSync(outPath)) unlinkSync(outPath)
  throw err
}
