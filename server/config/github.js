
const { Octokit } = require('@octokit/rest');
require('dotenv').config();

const octokit = new Octokit({
  auth: process.env.PRODCOLLAB_GITHUB_TOKEN,
});
const GITHUB_OWNER = process.env.PRODCOLLAB_GITHUB_OWNER || 'prodcollab-app';

module.exports = { octokit, GITHUB_OWNER };
