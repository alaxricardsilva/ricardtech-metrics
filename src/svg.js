'use strict';

/**
 * Gerador de SVGs modernos, leves e responsivos com suporte a Dark/Light Mode nativo.
 */

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(num || 0);
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderSparkline(points, width, height, color = '#10b981') {
  if (!points || points.length < 2) {
    return `<line x1="0" y1="${height / 2}" x2="${width}" y2="${height / 2}" stroke="${color}" stroke-dasharray="3,3" stroke-width="1.5" opacity="0.4"/>`;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p.value - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = coords.join(' ');
  const areaCoords = `0,${height} ${polyline} ${width},${height}`;

  return `
    <polygon points="${areaCoords}" fill="${color}" fill-opacity="0.12" />
    <polyline points="${polyline}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  `;
}

function renderRepoSvg(repoData, historyData) {
  const title = escapeXml(repoData.displayName || repoData.slug);
  const updatedAt = new Date(repoData.updatedAt || Date.now()).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const stars = repoData.totals.stars;
  const forks = repoData.totals.forks;
  const downloads = repoData.totals.downloads;

  const gh = repoData.breakdown.github;
  const gl = repoData.breakdown.gitlab;
  const fj = repoData.breakdown.forgejo;

  const starPoints = (historyData && historyData.history || []).map((h) => ({ value: h.stars }));
  const sparklineSvg = renderSparkline(starPoints, 180, 40, '#f59e0b');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 210" width="100%" height="210" style="max-width:760px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <style>
    .bg { fill: #0d1117; stroke: #30363d; }
    .card { fill: #161b22; stroke: #30363d; }
    .title { fill: #f0f6fc; font-size: 16px; font-weight: 600; }
    .meta { fill: #8b949e; font-size: 11px; }
    .stat-label { fill: #8b949e; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .stat-val { fill: #f0f6fc; font-size: 24px; font-weight: 700; }
    .sub-stat { fill: #8b949e; font-size: 10px; }
    .tag { fill: #238636; fill-opacity: 0.2; stroke: #2ea043; }
    .tag-text { fill: #3fb950; font-size: 10px; font-weight: 600; }
    @media (prefers-color-scheme: light) {
      .bg { fill: #ffffff; stroke: #d0d7de; }
      .card { fill: #f6f8fa; stroke: #d0d7de; }
      .title { fill: #1f2328; }
      .meta { fill: #656d76; }
      .stat-label { fill: #656d76; }
      .stat-val { fill: #1f2328; }
      .sub-stat { fill: #656d76; }
      .tag { fill: #dafbe1; stroke: #1a7f37; }
      .tag-text { fill: #1a7f37; }
    }
  </style>

  <!-- Container -->
  <rect class="bg" x="0.5" y="0.5" width="759" height="209" rx="10" stroke-width="1" />

  <!-- Header -->
  <g transform="translate(24, 20)">
    <!-- Ícone Repo -->
    <path fill="#10b981" d="M3 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-11zM4 3v10h6V3H4z"/>
    <text class="title" x="18" y="14">${title}</text>
    <rect class="tag" x="320" y="2" width="130" height="18" rx="9" stroke-width="1"/>
    <text class="tag-text" x="385" y="14" text-anchor="middle">Triplo-Push Sincronizado</text>
    <text class="meta" x="712" y="14" text-anchor="end">Atualizado: ${updatedAt}</text>
  </g>

  <!-- Cards Grid -->
  <g transform="translate(24, 55)">
    <!-- Card 1: Stars -->
    <g transform="translate(0, 0)">
      <rect class="card" width="224" height="135" rx="8" stroke-width="1"/>
      <g transform="translate(16, 18)">
        <text class="stat-label" x="0" y="0">Estrelas Multi-Cloud</text>
        <text class="stat-val" x="0" y="28">⭐ ${formatNumber(stars)}</text>
        <g transform="translate(0, 48)">
          ${sparklineSvg}
        </g>
        <g transform="translate(0, 100)">
          <text class="sub-stat" x="0" y="0">GitHub: ${gh.stars} · GitLab: ${gl.stars} · Forgejo: ${fj.stars}</text>
        </g>
      </g>
    </g>

    <!-- Card 2: Forks -->
    <g transform="translate(244, 0)">
      <rect class="card" width="224" height="135" rx="8" stroke-width="1"/>
      <g transform="translate(16, 18)">
        <text class="stat-label" x="0" y="0">Forks &amp; Derivados</text>
        <text class="stat-val" x="0" y="28">🍴 ${formatNumber(forks)}</text>
        <g transform="translate(0, 48)">
          <rect fill="#3b82f6" fill-opacity="0.1" width="192" height="38" rx="6"/>
          <text class="meta" x="96" y="24" text-anchor="middle">Ecossistema Colaborativo</text>
        </g>
        <g transform="translate(0, 100)">
          <text class="sub-stat" x="0" y="0">GitHub: ${gh.forks} · GitLab: ${gl.forks} · Forgejo: ${fj.forks}</text>
        </g>
      </g>
    </g>

    <!-- Card 3: Release Downloads -->
    <g transform="translate(488, 0)">
      <rect class="card" width="224" height="135" rx="8" stroke-width="1"/>
      <g transform="translate(16, 18)">
        <text class="stat-label" x="0" y="0">Downloads de Releases</text>
        <text class="stat-val" x="0" y="28">📦 ${formatNumber(downloads)}</text>
        <g transform="translate(0, 48)">
          <rect fill="#10b981" fill-opacity="0.1" width="192" height="38" rx="6"/>
          <text class="meta" x="96" y="24" text-anchor="middle">Instalações e Pacotes</text>
        </g>
        <g transform="translate(0, 100)">
          <text class="sub-stat" x="0" y="0">GitHub: ${gh.downloads} · GitLab: ${gl.downloads} · Forgejo: ${fj.downloads}</text>
        </g>
      </g>
    </g>
  </g>
</svg>`;
}

function renderOverviewSvg(ecosystemTotals, topRepos = []) {
  const updatedAt = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const totalRepos = ecosystemTotals.repositories || 0;
  const totalStars = ecosystemTotals.stars || 0;
  const totalForks = ecosystemTotals.forks || 0;
  const totalDownloads = ecosystemTotals.downloads || 0;

  let topRowsSvg = '';
  const rowsToDisplay = topRepos.slice(0, 5);

  rowsToDisplay.forEach((r, idx) => {
    const yOffset = idx * 26;
    const name = escapeXml(r.displayName || r.slug);
    topRowsSvg += `
      <g transform="translate(0, ${yOffset})">
        <text class="row-rank" x="0" y="15">#${idx + 1}</text>
        <text class="row-name" x="25" y="15">${name}</text>
        <text class="row-stat" x="260" y="15" text-anchor="end">⭐ ${r.totals.stars}</text>
        <text class="row-stat" x="330" y="15" text-anchor="end">🍴 ${r.totals.forks}</text>
        <text class="row-stat" x="410" y="15" text-anchor="end">📦 ${formatNumber(r.totals.downloads)}</text>
      </g>
    `;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 320" width="100%" height="320" style="max-width:760px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <style>
    .bg { fill: #0d1117; stroke: #30363d; }
    .card { fill: #161b22; stroke: #30363d; }
    .title { fill: #f0f6fc; font-size: 18px; font-weight: 700; }
    .meta { fill: #8b949e; font-size: 11px; }
    .stat-label { fill: #8b949e; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
    .stat-val { fill: #f0f6fc; font-size: 22px; font-weight: 700; }
    .row-rank { fill: #8b949e; font-size: 11px; font-weight: 600; }
    .row-name { fill: #58a6ff; font-size: 12px; font-weight: 600; }
    .row-stat { fill: #e6edf3; font-size: 12px; }
    .tag { fill: #238636; fill-opacity: 0.2; stroke: #2ea043; }
    .tag-text { fill: #3fb950; font-size: 10px; font-weight: 600; }
    @media (prefers-color-scheme: light) {
      .bg { fill: #ffffff; stroke: #d0d7de; }
      .card { fill: #f6f8fa; stroke: #d0d7de; }
      .title { fill: #1f2328; }
      .meta { fill: #656d76; }
      .stat-label { fill: #656d76; }
      .stat-val { fill: #1f2328; }
      .row-rank { fill: #656d76; }
      .row-name { fill: #0969da; }
      .row-stat { fill: #1f2328; }
      .tag { fill: #dafbe1; stroke: #1a7f37; }
      .tag-text { fill: #1a7f37; }
    }
  </style>

  <rect class="bg" x="0.5" y="0.5" width="759" height="319" rx="10" stroke-width="1" />

  <!-- Header -->
  <g transform="translate(24, 22)">
    <text class="title" x="0" y="16">Ecossistema Ricard Tech · Métricas Globais</text>
    <rect class="tag" x="380" y="2" width="160" height="20" rx="10" stroke-width="1"/>
    <text class="tag-text" x="460" y="16" text-anchor="middle">GitHub + GitLab + Forgejo</text>
    <text class="meta" x="712" y="16" text-anchor="end">Atualizado: ${updatedAt}</text>
  </g>

  <!-- 4 Cards Top Grid -->
  <g transform="translate(24, 60)">
    <!-- Repos -->
    <g transform="translate(0, 0)">
      <rect class="card" width="168" height="75" rx="8" stroke-width="1"/>
      <g transform="translate(14, 16)">
        <text class="stat-label" x="0" y="0">Repositórios</text>
        <text class="stat-val" x="0" y="28">📁 ${totalRepos}</text>
      </g>
    </g>

    <!-- Estrelas -->
    <g transform="translate(181, 0)">
      <rect class="card" width="168" height="75" rx="8" stroke-width="1"/>
      <g transform="translate(14, 16)">
        <text class="stat-label" x="0" y="0">Total Estrelas</text>
        <text class="stat-val" x="0" y="28">⭐ ${formatNumber(totalStars)}</text>
      </g>
    </g>

    <!-- Forks -->
    <g transform="translate(362, 0)">
      <rect class="card" width="168" height="75" rx="8" stroke-width="1"/>
      <g transform="translate(14, 16)">
        <text class="stat-label" x="0" y="0">Total Forks</text>
        <text class="stat-val" x="0" y="28">🍴 ${formatNumber(totalForks)}</text>
      </g>
    </g>

    <!-- Downloads -->
    <g transform="translate(543, 0)">
      <rect class="card" width="168" height="75" rx="8" stroke-width="1"/>
      <g transform="translate(14, 16)">
        <text class="stat-label" x="0" y="0">Total Downloads</text>
        <text class="stat-val" x="0" y="28">📦 ${formatNumber(totalDownloads)}</text>
      </g>
    </g>
  </g>

  <!-- Top Repos Table Card -->
  <g transform="translate(24, 150)">
    <rect class="card" width="712" height="150" rx="8" stroke-width="1"/>
    <g transform="translate(20, 20)">
      <text class="stat-label" x="0" y="0">Projetos em Destaque no Ecossistema</text>
      <g transform="translate(0, 16)">
        ${topRowsSvg}
      </g>
    </g>
  </g>
</svg>`;
}

module.exports = { renderRepoSvg, renderOverviewSvg, formatNumber, escapeXml };
