'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderDashboardSvg, compact, prettyDate, escapeXml } = require('../src/svg');

test('compact formata k e M corretamente', () => {
  assert.equal(compact(50), '50');
  assert.equal(compact(1200), '1.2k');
  assert.equal(compact(1000000), '1M');
});

test('escapeXml protege caracteres perigosos', () => {
  assert.equal(escapeXml('<script>&"test"\''), '&lt;script&gt;&amp;&quot;test&quot;&apos;');
});

test('renderDashboardSvg gera dashboard idêntico ao oficial com Commits, Tags e Releases em pt-BR', () => {
  const points = [
    { date: '2026-01-01', commits: 10, tags: 1, releases: 1 },
    { date: '2026-06-01', commits: 50, tags: 5, releases: 5 },
    { date: '2026-11-21', commits: 120, tags: 12, releases: 12 }
  ];

  const svg = renderDashboardSvg({
    repository: 'RicardTech/deskmax-crm',
    title: 'DeskMax CRM · Crescimento',
    points,
    updatedAt: '2026-11-21T12:00:00Z',
    metrics: ['commits', 'tags', 'releases']
  });

  assert.ok(svg.includes('DeskMax CRM · Crescimento'), 'Deve conter título');
  assert.ok(svg.includes('COMMITS'), 'Deve conter métrica COMMITS');
  assert.ok(svg.includes('TAGS'), 'Deve conter métrica TAGS');
  assert.ok(svg.includes('RELEASES'), 'Deve conter métrica RELEASES');
  assert.ok(svg.includes('HISTÓRICO LOCAL'), 'Deve conter tag HISTÓRICO LOCAL');
  assert.ok(svg.includes('Gerado por RicardTech Metrics ↗'), 'Deve conter assinatura em pt-BR');
  assert.ok(svg.includes('prefers-color-scheme: dark'), 'Deve suportar modo escuro e claro');
});
