// config/github.js
// ── Phase 4.2 ──────────────────────────────────────────────────────────────
// Single shared Octokit instance for the dedicated ProdCollab GitHub account.
// This account owns ALL repos. Individual users no longer need a GitHub account
// or a personal access token (the old github_tokens table is retired in 4.3).
//
// Required env vars (see server/.env):
//   PRODCOLLAB_GITHUB_TOKEN  → a Personal Access Token with `repo` scope
//   PRODCOLLAB_GITHUB_OWNER  → the fixed account/org login that owns the repos
// ────────────────────────────────────────────────────────────────────────────
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const octokit = new Octokit({
  auth: process.env.PRODCOLLAB_GITHUB_TOKEN,
});

// Fixed account name that owns every ProdCollab repo.
// Falls back to 'prodcollab-app' if the env var is not set.
const GITHUB_OWNER = process.env.PRODCOLLAB_GITHUB_OWNER || 'prodcollab-app';

module.exports = { octokit, GITHUB_OWNER };
