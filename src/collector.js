'use strict';

/**
 * Coletor de métricas multi-cloud (GitHub, GitLab, Forgejo).
 * Não depende de bibliotecas externas (usa fetch nativo do Node 20+).
 */

const DEFAULT_FORGEJO_URL = 'https://git.ricardtech.top';
const DEFAULT_FORGEJO_TOKEN = '35ca768625442043458cc09c973ba1851d2cae55';

class MetricsCollector {
  constructor(options = {}) {
    this.githubToken = options.githubToken || process.env.GITHUB_TOKEN || '';
    this.githubUsers = (options.githubUsers || process.env.GITHUB_USERS || 'ricardtech,alaxricardsilva').split(',').map(s => s.trim()).filter(Boolean);
    
    this.gitlabToken = options.gitlabToken || process.env.GITLAB_TOKEN || '';
    this.gitlabUsers = (options.gitlabUsers || process.env.GITLAB_USERS || 'ricard-tech,alaxricard').split(',').map(s => s.trim()).filter(Boolean);
    
    this.forgejoToken = options.forgejoToken || process.env.FORGEJO_TOKEN || DEFAULT_FORGEJO_TOKEN;
    this.forgejoUsers = (options.forgejoUsers || process.env.FORGEJO_USERS || 'RicardTech').split(',').map(s => s.trim()).filter(Boolean);
    this.forgejoUrl = (options.forgejoUrl || process.env.FORGEJO_URL || DEFAULT_FORGEJO_URL).replace(/\/$/, '');
  }

  async fetchJson(url, headers = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'RicardTech-Metrics/1.0',
            ...headers
          },
          signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error(`HTTP ${response.status} ao acessar ${url}`);
        }
        return await response.json();
      } catch (err) {
        if (attempt === retries) {
          console.warn(`[WARN] Falha ao consultar ${url} (tentativa ${attempt}/${retries}): ${err.message}`);
          return null;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    return null;
  }

  async collectGitHub() {
    const reposMap = new Map();
    const headers = { Accept: 'application/vnd.github+json' };
    if (this.githubToken) headers.Authorization = `Bearer ${this.githubToken}`;

    for (const user of this.githubUsers) {
      const endpoints = [
        `https://api.github.com/users/${user}/repos?per_page=100&type=all`,
        `https://api.github.com/orgs/${user}/repos?per_page=100&type=all`
      ];
      let repos = [];
      for (const ep of endpoints) {
        const fetched = await this.fetchJson(ep, headers);
        if (Array.isArray(fetched)) repos.push(...fetched);
      }
      if (repos.length === 0) continue;

      for (const r of repos) {
        if (r.fork) continue;
        const repoName = r.name.toLowerCase();
        let downloads = 0;

        const releases = await this.fetchJson(`https://api.github.com/repos/${user}/${r.name}/releases?per_page=100`, headers);
        if (Array.isArray(releases)) {
          for (const rel of releases) {
            if (Array.isArray(rel.assets)) {
              for (const asset of rel.assets) {
                downloads += Number(asset.download_count) || 0;
              }
            }
          }
        }

        reposMap.set(repoName, {
          name: r.name,
          stars: Number(r.stargazers_count) || 0,
          forks: Number(r.forks_count) || 0,
          downloads,
          url: r.html_url
        });
      }
    }

    return reposMap;
  }

  async collectGitLab() {
    const reposMap = new Map();
    const headers = {};
    if (this.gitlabToken) headers['PRIVATE-TOKEN'] = this.gitlabToken;

    for (const user of this.gitlabUsers) {
      const url = `https://gitlab.com/api/v4/users/${user}/projects?per_page=100`;
      const projects = await this.fetchJson(url, headers);
      if (!Array.isArray(projects)) continue;

      for (const p of projects) {
        if (p.forked_from_project) continue;
        const repoName = p.path.toLowerCase();
        let downloads = 0;

        reposMap.set(repoName, {
          name: p.path,
          stars: Number(p.star_count) || 0,
          forks: Number(p.forks_count) || 0,
          downloads,
          url: p.web_url
        });
      }
    }

    return reposMap;
  }

  async collectForgejo() {
    const reposMap = new Map();
    const headers = {};
    if (this.forgejoToken) headers.Authorization = `token ${this.forgejoToken}`;

    const endpoints = [`${this.forgejoUrl}/api/v1/user/repos?limit=100`];
    for (const user of this.forgejoUsers) {
      endpoints.push(`${this.forgejoUrl}/api/v1/users/${user}/repos?limit=100`);
    }

    for (const ep of endpoints) {
      const repos = await this.fetchJson(ep, headers);
      if (!Array.isArray(repos)) continue;

      for (const r of repos) {
        if (r.fork) continue;
        const repoName = r.name.toLowerCase();
        let downloads = 0;

        const ownerName = (r.owner && r.owner.login) || this.forgejoUsers[0];
        const releases = await this.fetchJson(`${this.forgejoUrl}/api/v1/repos/${ownerName}/${r.name}/releases?limit=100`, headers);
        if (Array.isArray(releases)) {
          for (const rel of releases) {
            if (Array.isArray(rel.assets)) {
              for (const asset of rel.assets) {
                downloads += Number(asset.download_count) || 0;
              }
            }
          }
        }

        reposMap.set(repoName, {
          name: r.name,
          stars: Number(r.stars_count) || 0,
          forks: Number(r.forks_count) || 0,
          downloads,
          url: r.html_url
        });
      }
    }

    return reposMap;
  }

  async collectAll() {
    console.log('🔄 Coletando métricas do ecossistema Ricard Tech...');
    const [ghMap, glMap, fjMap] = await Promise.all([
      this.collectGitHub(),
      this.collectGitLab(),
      this.collectForgejo()
    ]);

    const allSlugs = new Set([
      ...ghMap.keys(),
      ...glMap.keys(),
      ...fjMap.keys()
    ]);

    const aggregated = [];

    for (const slug of allSlugs) {
      const gh = ghMap.get(slug) || { stars: 0, forks: 0, downloads: 0 };
      const gl = glMap.get(slug) || { stars: 0, forks: 0, downloads: 0 };
      const fj = fjMap.get(slug) || { stars: 0, forks: 0, downloads: 0 };

      const displayName = (gh.name || fj.name || gl.name || slug);
      const totalStars = gh.stars + gl.stars + fj.stars;
      const totalForks = gh.forks + gl.forks + fj.forks;
      const totalDownloads = gh.downloads + gl.downloads + fj.downloads;

      aggregated.push({
        slug,
        displayName,
        totals: {
          stars: totalStars,
          forks: totalForks,
          downloads: totalDownloads
        },
        breakdown: {
          github: { stars: gh.stars, forks: gh.forks, downloads: gh.downloads },
          gitlab: { stars: gl.stars, forks: gl.forks, downloads: gl.downloads },
          forgejo: { stars: fj.stars, forks: fj.forks, downloads: fj.downloads }
        }
      });
    }

    // Ordenar por estrelas totais decrescente
    aggregated.sort((a, b) => b.totals.stars - a.totals.stars || b.totals.downloads - a.totals.downloads);

    const ecosystemTotals = aggregated.reduce((acc, curr) => {
      acc.stars += curr.totals.stars;
      acc.forks += curr.totals.forks;
      acc.downloads += curr.totals.downloads;
      return acc;
    }, { stars: 0, forks: 0, downloads: 0, repositories: aggregated.length });

    return {
      updatedAt: new Date().toISOString(),
      ecosystemTotals,
      repositories: aggregated
    };
  }
}

module.exports = { MetricsCollector };
