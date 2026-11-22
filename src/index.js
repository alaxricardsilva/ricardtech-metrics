'use strict';

const { runLocalCollector } = require('./local-collector');

async function main() {
  console.log('🚀 Iniciando geração do Painel de Métricas Privadas da Ricard Tech...');
  runLocalCollector();
  console.log('✅ Todos os dashboards em SVG (Commits, Tags e Releases) foram gerados com sucesso!');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Erro fatal ao coletar métricas:', err);
    process.exit(1);
  });
}

module.exports = { main };
