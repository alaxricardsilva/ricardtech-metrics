'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { renderDashboardSvg } = require('./svg');

const DOC_ROOTS = [
  '/home/alaxricard/Documentos/Projetos',
  '/home/alaxricard/Documentos/APK',
  '/home/alaxricard/Documentos/ricard-infra-bot'
];

const EXCLUDE_DIRS = [
  '/tools/flutter',
  '/local_data',
  '/node_modules',
  '/.tmp',
  'ricardtech-metrics'
];

function findGitRepos() {
  const repos = [];
  function scan(dir) {
    if (!fs.existsSync(dir)) return;
    if (EXCLUDE_DIRS.some((ex) => dir.includes(ex))) return;
    if (fs.existsSync(path.join(dir, '.git'))) {
      repos.push(dir);
      return;
    }
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          scan(path.join(dir, entry.name));
        }
      }
    } catch {}
  }

  for (const root of DOC_ROOTS) {
    scan(root);
  }
  return [...new Set(repos)].sort();
}

function getRepoSlug(repoPath) {
  try {
    const remotes = execSync('git config --get-all remote.origin.url', { cwd: repoPath, encoding: 'utf8' }).trim().split('\n');
    for (const rem of remotes) {
      const m = rem.match(/\/([^/]+?)(?:\.git)?$/);
      if (m) return m[1].toLowerCase();
    }
  } catch {}
  return path.basename(repoPath).toLowerCase();
}

function collectRepoGitHistory(repoPath) {
  try {
    // 1. Commits por data
    const logOutput = execSync('git log --date=short --pretty=format:%ad', {
      cwd: repoPath,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }).trim();

    if (!logOutput) {
      return null;
    }

    const commitDates = logOutput.split('\n').filter(Boolean);
    const dateCounts = new Map();
    for (const d of commitDates) {
      dateCounts.set(d, (dateCounts.get(d) || 0) + 1);
    }

    // 2. Tags por data
    const tagDatesMap = new Map();
    try {
      const tagOutput = execSync('git tag --format="%(creatordate:short)"', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim();
      if (tagOutput) {
        for (const td of tagOutput.split('\n').filter(Boolean)) {
          const cleanDate = td.slice(0, 10);
          tagDatesMap.set(cleanDate, (tagDatesMap.get(cleanDate) || 0) + 1);
        }
      }
    } catch {}

    // Ordenar datas
    const allDates = [...new Set([...dateCounts.keys(), ...tagDatesMap.keys()])].sort();
    let cumulativeCommits = 0;
    let cumulativeTags = 0;
    const points = [];

    for (const date of allDates) {
      cumulativeCommits += dateCounts.get(date) || 0;
      cumulativeTags += tagDatesMap.get(date) || 0;
      points.push({
        date,
        commits: cumulativeCommits,
        tags: cumulativeTags,
        releases: cumulativeTags // Releases acompanham tags de release
      });
    }

    // Adiciona data atual se necessário
    const today = new Date().toISOString().slice(0, 10);
    if (points.length > 0 && points.at(-1).date !== today) {
      points.push({
        date: today,
        commits: cumulativeCommits,
        tags: cumulativeTags,
        releases: cumulativeTags
      });
    }

    return points;
  } catch (err) {
    return null;
  }
}

function runLocalCollector() {
  const rootDir = path.resolve(__dirname, '..');
  const chartsDir = path.join(rootDir, 'charts');
  const dataDir = path.join(rootDir, 'data');

  if (!fs.existsSync(chartsDir)) fs.mkdirSync(chartsDir, { recursive: true });
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const repos = findGitRepos();
  console.log(`🔍 Repositórios locais escaneados para métricas privadas: ${repos.length}`);

  let totalEcosystemCommits = 0;
  let totalEcosystemTags = 0;
  const ecosystemDateMap = new Map();

  for (const repoPath of repos) {
    const slug = getRepoSlug(repoPath);
    const repoTitle = path.basename(repoPath);
    const points = collectRepoGitHistory(repoPath);

    if (!points || points.length === 0) continue;

    const latest = points.at(-1);
    totalEcosystemCommits += latest.commits;
    totalEcosystemTags += latest.tags;

    // Agregar para o overview global
    for (const p of points) {
      const existing = ecosystemDateMap.get(p.date) || { commits: 0, tags: 0, releases: 0 };
      existing.commits += p.commits;
      existing.tags += p.tags;
      existing.releases += p.releases;
      ecosystemDateMap.set(p.date, existing);
    }

    const svgContent = renderDashboardSvg({
      repository: `RicardTech/${slug}`,
      title: `${repoTitle} · Crescimento`,
      points,
      updatedAt: new Date().toISOString(),
      metrics: ['commits', 'tags', 'releases']
    });

    // Salva com todos os aliases possíveis
    const baseName = slug.toLowerCase();
    const hyphenName = baseName.replace(/_/g, '-');
    const underscoreName = baseName.replace(/-/g, '_');

    fs.writeFileSync(path.join(chartsDir, `${baseName}.svg`), svgContent, 'utf8');
    fs.writeFileSync(path.join(chartsDir, `${hyphenName}.svg`), svgContent, 'utf8');
    fs.writeFileSync(path.join(chartsDir, `${underscoreName}.svg`), svgContent, 'utf8');

    // Salva histórico JSON
    fs.writeFileSync(path.join(dataDir, `${baseName}.json`), JSON.stringify({
      repository: slug,
      updatedAt: new Date().toISOString(),
      totals: latest,
      points
    }, null, 2), 'utf8');

    console.log(`  📊 ${slug}: ${latest.commits} commits, ${latest.tags} tags gerados com sucesso.`);
  }

  // Gera o overview consolidado global
  const ecosystemDates = [...ecosystemDateMap.keys()].sort();
  const ecosystemPoints = ecosystemDates.map((d) => ({
    date: d,
    ...ecosystemDateMap.get(d)
  }));

  const overviewSvg = renderDashboardSvg({
    repository: 'RicardTech · Ecossistema Completo',
    title: 'Visão Geral do Ecossistema Ricard Tech',
    points: ecosystemPoints,
    updatedAt: new Date().toISOString(),
    metrics: ['commits', 'tags', 'releases']
  });

  fs.writeFileSync(path.join(chartsDir, 'overview.svg'), overviewSvg, 'utf8');
  console.log(`\n🏆 Painel Global Concluído: ${totalEcosystemCommits} commits e ${totalEcosystemTags} tags totais.`);
}

if (require.main === module) {
  runLocalCollector();
}

module.exports = { runLocalCollector, collectRepoGitHistory };
