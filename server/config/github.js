
const { Octokit } = require('@octokit/rest');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const octokit = new Octokit({
  auth: process.env.PRODCOLLAB_GITHUB_TOKEN,
});
const GITHUB_OWNER = process.env.PRODCOLLAB_GITHUB_OWNER || 'prodcollab-app';

module.exports = { octokit, GITHUB_OWNER };
