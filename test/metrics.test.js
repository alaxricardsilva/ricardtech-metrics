'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { renderRepoSvg, renderOverviewSvg, formatNumber, escapeXml } = require('../src/svg');
const { HistoryManager } = require('../src/history');

test('formatNumber formata k e M corretamente', () => {
  assert.equal(formatNumber(50), '50');
  assert.equal(formatNumber(1200), '1.2k');
  assert.equal(formatNumber(1000000), '1M');
  assert.equal(formatNumber(2500000), '2.5M');
});

test('escapeXml protege caracteres perigosos', () => {
  assert.equal(escapeXml('<script>&"test"\''), '&lt;script&gt;&amp;&quot;test&quot;&apos;');
});

test('renderRepoSvg gera SVG com dados corretos e modo dark/light', () => {
  const repoData = {
    slug: 'deskmax-crm',
    displayName: 'DeskMax CRM',
    updatedAt: '2026-11-21T12:00:00Z',
    totals: { stars: 42, forks: 8, downloads: 150 },
    breakdown: {
      github: { stars: 30, forks: 5, downloads: 100 },
      gitlab: { stars: 2, forks: 1, downloads: 0 },
      forgejo: { stars: 10, forks: 2, downloads: 50 }
    }
  };

  const svg = renderRepoSvg(repoData, { history: [{ stars: 40 }, { stars: 42 }] });
  assert.ok(svg.startsWith('<svg'), 'Deve iniciar com tag svg');
  assert.ok(svg.includes('DeskMax CRM'), 'Deve conter o nome do repo');
  assert.ok(svg.includes('⭐ 42'), 'Deve conter o total de estrelas');
  assert.ok(svg.includes('🍴 8'), 'Deve conter o total de forks');
  assert.ok(svg.includes('📦 150'), 'Deve conter o total de downloads');
  assert.ok(svg.includes('prefers-color-scheme: light'), 'Deve ter suporte a tema claro');
});

test('renderOverviewSvg gera visão global do ecossistema', () => {
  const totals = { repositories: 62, stars: 250, forks: 45, downloads: 1800 };
  const topRepos = [
    { displayName: 'DeskMax CRM', totals: { stars: 50, forks: 10, downloads: 500 } },
    { displayName: 'PaperPlane Next', totals: { stars: 40, forks: 8, downloads: 300 } }
  ];

  const svg = renderOverviewSvg(totals, topRepos);
  assert.ok(svg.includes('📁 62'), 'Deve listar 62 repositórios');
  assert.ok(svg.includes('⭐ 250'), 'Deve exibir 250 estrelas');
  assert.ok(svg.includes('DeskMax CRM'), 'Deve listar o top repo');
});

test('HistoryManager salva e carrega histórico sem duplicatas no mesmo dia', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metrics-test-'));
  const manager = new HistoryManager(tempDir);

  const repo = {
    slug: 'test-repo',
    displayName: 'Test Repo',
    totals: { stars: 10, forks: 2, downloads: 5 },
    breakdown: {
      github: { stars: 10, forks: 2, downloads: 5 },
      gitlab: { stars: 0, forks: 0, downloads: 0 },
      forgejo: { stars: 0, forks: 0, downloads: 0 }
    }
  };

  const date = new Date('2026-11-21T12:00:00Z');
  manager.saveRepoHistory('test-repo', repo, date);
  
  // Salvar no mesmo dia deve atualizar o mesmo ponto
  repo.totals.stars = 12;
  manager.saveRepoHistory('test-repo', repo, date);

  const loaded = manager.loadRepoHistory('test-repo');
  assert.equal(loaded.history.length, 1, 'Deve ter apenas 1 ponto para o mesmo dia');
  assert.equal(loaded.history[0].stars, 12, 'Deve ter atualizado o ponto do dia');

  fs.rmSync(tempDir, { recursive: true, force: true });
});
