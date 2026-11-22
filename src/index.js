'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { MetricsCollector } = require('./collector');
const { HistoryManager } = require('./history');
const { renderRepoSvg, renderOverviewSvg } = require('./svg');

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const rootDir = path.resolve(__dirname, '..');
  const dataDir = path.join(rootDir, 'data');
  const chartsDir = path.join(rootDir, 'charts');

  if (!fs.existsSync(chartsDir)) {
    fs.mkdirSync(chartsDir, { recursive: true });
  }

  const collector = new MetricsCollector();
  const historyManager = new HistoryManager(dataDir);

  console.log('🚀 Iniciando sincronização e geração de métricas da Ricard Tech...');
  const result = await collector.collectAll();

  console.log(`📊 Total de repositórios identificados: ${result.repositories.length}`);
  console.log(`⭐ Total de estrelas no ecossistema: ${result.ecosystemTotals.stars}`);
  console.log(`🍴 Total de forks no ecossistema: ${result.ecosystemTotals.forks}`);
  console.log(`📦 Total de downloads de releases: ${result.ecosystemTotals.downloads}`);

  // 1. Processar cada repositório
  for (const repo of result.repositories) {
    if (!isDryRun) {
      const historyData = historyManager.saveRepoHistory(repo.slug, repo);
      const svgContent = renderRepoSvg(repo, historyData);
      fs.writeFileSync(path.join(chartsDir, `${repo.slug}.svg`), svgContent, 'utf8');
    }
  }

  // 2. Processar overview do ecossistema
  if (!isDryRun) {
    historyManager.saveEcosystemHistory(result);
    const overviewSvg = renderOverviewSvg(result.ecosystemTotals, result.repositories);
    fs.writeFileSync(path.join(chartsDir, 'overview.svg'), overviewSvg, 'utf8');
  }

  console.log(`✅ Sucesso! ${result.repositories.length} gráficos e overview gerados em charts/.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ Erro fatal ao coletar métricas:', err);
    process.exit(1);
  });
}

module.exports = { main };
