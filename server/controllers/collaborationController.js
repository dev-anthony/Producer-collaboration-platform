const crypto = require('crypto');
const pool = require('../config/db');
const { Octokit } = require('@octokit/rest');

// Generate share link for a project
exports.generateShareLink = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      // Verify user owns the project
      const [projects] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      const project = projects[0];

      // Generate share token if doesn't exist
      let shareToken = project.share_token;
      if (!shareToken) {
        shareToken = crypto.randomBytes(32).toString('hex');
        await connection.execute(
          'UPDATE projects SET share_token = ? WHERE id = ?',
          [shareToken, projectId]
        );
      }

      // Generate share link
      const shareLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join/${shareToken}`;

      res.json({
        shareLink,
        shareToken,
        projectName: project.repo_name,
        repoUrl: project.repo_url
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({
      error: 'Failed to generate share link',
      message: error.message
    });
  }
};

// Get project info from share token
exports.getProjectByToken = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const connection = await pool.promise().getConnection();

    try {
      const [projects] = await connection.execute(
        `SELECT p.*, u.username as owner_username, u.avatar_url as owner_avatar
         FROM projects p
         JOIN users u ON p.user_id = u.id
         WHERE p.share_token = ?`,
        [shareToken]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Invalid share link' });
      }

      const project = projects[0];
      const fileList = JSON.parse(project.file_list || '[]');

      res.json({
        id: project.id,
        name: project.repo_name,
        description: project.description,
        visibility: project.visibility,
        repoUrl: project.repo_url,
        owner: {
          username: project.owner_username,
          avatar: project.owner_avatar
        },
        fileCount: fileList.length,
        createdAt: project.created_at
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get project by token error:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      message: error.message
    });
  }
};

// Join project as collaborator
exports.joinProject = async (req, res) => {
  try {
    const { shareToken } = req.body;
    const userId = req.userId;

    if (!shareToken) {
      return res.status(400).json({ error: 'Share token required' });
    }

    const connection = await pool.promise().getConnection();

    try {
      await connection.beginTransaction();

      // Get project from share token
      const [projects] = await connection.execute(
        'SELECT * FROM projects WHERE share_token = ?',
        [shareToken]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Invalid share link' });
      }

      const project = projects[0];

      // Check if user is already owner
      if (project.user_id === userId) {
        return res.status(400).json({ error: 'You already own this project' });
      }

      // Check if already a collaborator
      const [existing] = await connection.execute(
        'SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?',
        [project.id, userId]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'You are already a collaborator' });
      }

      // Add as collaborator
      await connection.execute(
        `INSERT INTO project_collaborators (project_id, user_id, role, joined_at)
         VALUES (?, ?, 'collaborator', NOW())`,
        [project.id, userId]
      );

      await connection.commit();

      res.json({
        message: 'Successfully joined project',
        project: {
          id: project.id,
          name: project.repo_name,
          repoUrl: project.repo_url,
          description: project.description
        }
      });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Join project error:', error);
    res.status(500).json({
      error: 'Failed to join project',
      message: error.message
    });
  }
};

// Get collaborated projects (projects I've joined)
exports.getCollaboratedProjects = async (req, res) => {
  try {
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      const [projects] = await connection.execute(
        `SELECT 
          p.id,
          p.repo_name as name,
          p.repo_url as url,
          p.description,
          p.visibility,
          p.file_list,
          p.has_changes,
          p.updated_at,
          pc.role,
          u.username as owner_username,
          u.avatar_url as owner_avatar
         FROM project_collaborators pc
         JOIN projects p ON pc.project_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE pc.user_id = ?
         ORDER BY pc.joined_at DESC`,
        [userId]
      );

      const formattedProjects = projects.map(p => {
        const fileList = JSON.parse(p.file_list || '[]');

        return {
          id: p.id,
          name: p.name,
          url: p.url,
          description: p.description,
          visibility: p.visibility,
          fileCount: fileList.length,
          updatedAt: p.updated_at,
          hasUnpushedChanges: p.has_changes === 1,
          role: p.role,
          owner: {
            username: p.owner_username,
            avatar: p.owner_avatar
          },
          isCollaborator: true
        };
      });

      res.json({ projects: formattedProjects });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get collaborated projects error:', error);
    res.status(500).json({
      error: 'Failed to fetch collaborated projects',
      message: error.message
    });
  }
};

// Pull project files (for initial clone or updates)
exports.pullProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      // Check if user is owner or collaborator
      const [owner] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      const [collab] = await connection.execute(
        'SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (owner.length === 0 && collab.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get project details
      const [projects] = await connection.execute(
        `SELECT p.*, gt.access_token
         FROM projects p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN github_tokens gt ON u.id = gt.user_id
         WHERE p.id = ?`,
        [projectId]
      );

      if (projects.length === 0 || !projects[0].access_token) {
        return res.status(404).json({ error: 'Project not found or no token' });
      }

      const project = projects[0];

      // Initialize Octokit with owner's token
      const octokit = new Octokit({ auth: project.access_token });

      // Get repo details
      const repoUrl = project.repo_url;
      const urlParts = repoUrl.split('/');
      const repoOwner = urlParts[urlParts.length - 2];

      // Get all files from GitHub
      const files = await getAllRepoFiles(octokit, repoOwner, project.repo_name);

      res.json({
        message: 'Files fetched successfully',
        files: files,
        repoUrl: project.repo_url,
        projectName: project.repo_name
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Pull project error:', error);
    res.status(500).json({
      error: 'Failed to pull project',
      message: error.message
    });
  }
};

// Helper: Get all files from GitHub repo
async function getAllRepoFiles(octokit, owner, repo) {
  const files = [];
  
  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch || 'main';

    // Get tree
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`
    });

    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: refData.object.sha,
      recursive: true
    });

    // Get each file's content
    for (const item of treeData.tree) {
      if (item.type === 'blob') {
        try {
          const { data: fileData } = await octokit.git.getBlob({
            owner,
            repo,
            file_sha: item.sha
          });

          files.push({
            name: item.path.split('/').pop(),
            path: item.path,
            size: item.size,
            content: fileData.content, // base64
            encoding: fileData.encoding
          });
        } catch (err) {
          console.warn(`Failed to fetch ${item.path}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('Error getting repo files:', error.message);
    throw error;
  }

  return files;
}

module.exports = {
  generateShareLink: exports.generateShareLink,
  getProjectByToken: exports.getProjectByToken,
  joinProject: exports.joinProject,
  getCollaboratedProjects: exports.getCollaboratedProjects,
  pullProject: exports.pullProject
};