const makeRepositoryName = (projectName) => projectName
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-_]/g, '')
  .slice(0, 90) || 'prodcollab-project';

async function createAvailableRepository(octokit, projectName, description, visibility) {
  const baseName = makeRepositoryName(projectName);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const name = attempt === 0 ? baseName : `${baseName}-${attempt + 1}`;
    try {
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name,
        description: description || '',
        private: visibility === 'private',
        auto_init: false
      });
      return data;
    } catch (error) {
      const conflict = error.status === 422 || String(error.message).toLowerCase().includes('already exists');
      if (!conflict) throw error;
    }
  }
  throw new Error('Could not create a unique project repository name');
}

module.exports = { createAvailableRepository, makeRepositoryName };
