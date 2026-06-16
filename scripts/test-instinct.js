import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()] })
)

const level = parseInt(process.argv[2])
if (!level || level < 1 || level > 6) {
  console.error('\nUsage: node scripts/test-instinct.js <level> [delay_seconds]')
  console.error('  level         1–6')
  console.error('  delay_seconds seconds before session auto-starts (default: 15)\n')
  process.exit(1)
}
const delay = parseInt(process.argv[3]) || 15

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_KEY)

async function run() {
  const { data: joinCode, error } = await supabase.rpc('dev_setup_instinct_session', { p_level: level })
  if (error) { console.error('\nSetup failed:', error.message, '\n'); process.exit(1) }

  console.log(`\n  Instinct — Level ${level}`)
  console.log(`  ────────────────────────────────────`)
  console.log(`  http://localhost:5173/play/${joinCode}`)
  console.log(`  ────────────────────────────────────`)
  console.log(`\n  Select "Test Pupil" from the grid.`)
  console.log(`  Session starts in ${delay}s...\n`)

  await new Promise(r => setTimeout(r, delay * 1000))

  const { error: startErr } = await supabase.rpc('dev_start_session', { p_join_code: joinCode })
  if (startErr) { console.error('\nFailed to start:', startErr.message, '\n'); process.exit(1) }

  console.log('  Go!\n')
  process.exit(0)
}

run()
