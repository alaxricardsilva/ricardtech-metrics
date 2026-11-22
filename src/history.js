'use strict';

const fs = require('node:fs');
const path = require('node:path');

class HistoryManager {
  constructor(dataDir = path.resolve(__dirname, '../data')) {
    this.dataDir = dataDir;
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  getRepoFilePath(slug) {
    const safeSlug = slug.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    return path.join(this.dataDir, `${safeSlug}.json`);
  }

  getEcosystemFilePath() {
    return path.join(this.dataDir, 'ecosystem.json');
  }

  loadRepoHistory(slug) {
    const file = this.getRepoFilePath(slug);
    if (!fs.existsSync(file)) {
      return {
        repository: slug,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        latest: null,
        history: []
      };
    }
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return {
        repository: slug,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        latest: null,
        history: []
      };
    }
  }

  saveRepoHistory(slug, repoData, now = new Date()) {
    const existing = this.loadRepoHistory(slug);
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString();

    const snapshot = {
      timestamp: timeStr,
      date: dateStr,
      stars: repoData.totals.stars,
      forks: repoData.totals.forks,
      downloads: repoData.totals.downloads
    };

    // Evitar poluição excessiva: se o último ponto foi no mesmo dia e os valores forem idênticos, substitui
    const lastPoint = existing.history[existing.history.length - 1];
    if (lastPoint && lastPoint.date === dateStr) {
      existing.history[existing.history.length - 1] = snapshot;
    } else {
      existing.history.push(snapshot);
    }

    // Limitar histórico a no máximo 365 pontos
    if (existing.history.length > 365) {
      existing.history = existing.history.slice(-365);
    }

    existing.updatedAt = timeStr;
    existing.displayName = repoData.displayName;
    existing.latest = {
      totals: repoData.totals,
      breakdown: repoData.breakdown
    };

    fs.writeFileSync(this.getRepoFilePath(slug), JSON.stringify(existing, null, 2), 'utf8');
    return existing;
  }

  saveEcosystemHistory(ecosystemData, now = new Date()) {
    const file = this.getEcosystemFilePath();
    let existing = {
      updatedAt: null,
      latest: null,
      history: []
    };
    if (fs.existsSync(file)) {
      try {
        existing = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {}
    }

    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toISOString();

    const snapshot = {
      timestamp: timeStr,
      date: dateStr,
      repositories: ecosystemData.ecosystemTotals.repositories,
      stars: ecosystemData.ecosystemTotals.stars,
      forks: ecosystemData.ecosystemTotals.forks,
      downloads: ecosystemData.ecosystemTotals.downloads
    };

    const lastPoint = existing.history[existing.history.length - 1];
    if (lastPoint && lastPoint.date === dateStr) {
      existing.history[existing.history.length - 1] = snapshot;
    } else {
      existing.history.push(snapshot);
    }

    if (existing.history.length > 365) {
      existing.history = existing.history.slice(-365);
    }

    existing.updatedAt = timeStr;
    existing.latest = ecosystemData.ecosystemTotals;

    fs.writeFileSync(file, JSON.stringify(existing, null, 2), 'utf8');
    return existing;
  }
}

module.exports = { HistoryManager };
