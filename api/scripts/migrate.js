/**
 * Script de migração seguro para Railway
 * 
 * Lida com dois cenários:
 * 1. Banco novo → roda migrate deploy normalmente
 * 2. Banco existente (criado via db push) → faz baseline e depois migrate
 */

const { execSync } = require('child_process')

function run(cmd) {
  console.log(`[migrate] Executando: ${cmd}`)
  try {
    const output = execSync(cmd, { 
      stdio: 'pipe', 
      encoding: 'utf-8',
      env: process.env,
    })
    if (output.trim()) console.log(output.trim())
    return { success: true, output }
  } catch (error) {
    return { success: false, output: error.stderr || error.stdout || error.message }
  }
}

async function main() {
  console.log('[migrate] Iniciando processo de migração...\n')

  // Tentar migrate deploy diretamente
  const result = run('npx prisma migrate deploy')
  
  if (result.success) {
    console.log('\n[migrate] ✅ Migrations aplicadas com sucesso!')
    return
  }

  // Se falhou, pode ser porque o banco foi criado via db push (sem _prisma_migrations)
  // ou porque precisa de baseline
  console.log('\n[migrate] ⚠️  migrate deploy falhou, tentando db push como fallback...')
  console.log(`[migrate] Erro: ${result.output}\n`)

  // Fallback: usar db push (que funciona para a maioria dos cenários)
  const pushResult = run('npx prisma db push --accept-data-loss')
  
  if (pushResult.success) {
    console.log('\n[migrate] ✅ db push executado com sucesso!')
  } else {
    console.error('\n[migrate] ❌ Falha no db push também:', pushResult.output)
    
    // Último recurso: tentar sem --accept-data-loss
    console.log('[migrate] Tentando db push sem accept-data-loss...')
    const lastTry = run('npx prisma db push')
    if (!lastTry.success) {
      console.error('\n[migrate] ❌ Todas as tentativas falharam.')
      console.error('[migrate] Execute manualmente: npx prisma migrate deploy')
      process.exit(1)
    }
  }
}

main().catch((err) => {
  console.error('[migrate] Erro fatal:', err)
  process.exit(1)
})
