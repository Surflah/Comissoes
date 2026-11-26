import { runSaplSync } from '../src/services/sapl-sync';

async function main() {
  const forceAll = process.argv.includes('--full');
  console.log(`🔄 Iniciando sincronização com o SAPL (modo: ${forceAll ? 'COMPLETO' : 'INCREMENTAL'})...`);
  const res = await runSaplSync(forceAll);
  console.log('✅ Sincronização concluída:', res);
}

main().catch((err) => {
  console.error('❌ Erro na sincronização SAPL:', err);
  process.exit(1);
});
