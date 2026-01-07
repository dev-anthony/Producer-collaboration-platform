
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Octokit } = require('@octokit/rest');
const crypto = require('crypto');
const pool = require('../config/db');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads', req.userId.toString());
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', 
      '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
    ];
    
    const fileName = file.originalname.toLowerCase();
    const ext = path.extname(fileName);
    
    // Skip hidden files and system files
    if (fileName.startsWith('.') || fileName.includes('/.git/') || fileName.includes('\\.git\\')) {
      console.log('⚠️ Skipping system/hidden file:', fileName);
      return cb(null, false); // Skip this file without error
    }
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      console.log('⚠️ Skipping unsupported file type:', fileName, ext);
      cb(null, false); // Skip instead of throwing error
    }
  }
});

// Helper function to convert file to base64
const fileToBase64 = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  return fileBuffer.toString('base64');
};

// Helper function to push files to GitHub
const pushFilesToGitHub = async (octokit, owner, repo, files, message = 'Initial commit') => {
  try {
    // Get the default branch reference
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    });

    const commitSha = refData.object.sha;

    // Get the commit
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: commitSha
    });

    const treeSha = commitData.tree.sha;

    // Create blobs for all files with better error handling
    const blobs = [];
    for (const file of files) {
      try {
        console.log(`📤 Uploading: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Check file size (GitHub has a 100MB limit per file)
        if (file.size > 100 * 1024 * 1024) {
          console.warn(`⚠️ Skipping ${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
          continue;
        }

        const content = await fileToBase64(file.path);
        
        // Validate base64 content
        if (!content || content.length === 0) {
          console.warn(`⚠️ Skipping ${file.name}: Empty file`);
          continue;
        }

        const { data: blobData } = await octokit.git.createBlob({
          owner,
          repo,
          content,
          encoding: 'base64'
        });

        // Use relativePath if available, otherwise use just the name
        const filePath = file.relativePath || file.name;
        
        blobs.push({
          path: filePath,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha
        });

        console.log(`✅ Uploaded: ${filePath}`);
      } catch (fileError) {
        console.error(`❌ Error uploading ${file.name}:`, fileError.message);
        // Continue with other files instead of failing completely
      }
    }

    if (blobs.length === 0) {
      throw new Error('No files were successfully uploaded');
    }

    console.log(`📦 Creating tree with ${blobs.length} files`);

    // Create a new tree with all files
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: treeSha,
      tree: blobs
    });

    // Create a new commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [commitSha]
    });

    // Update the reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: 'heads/main',
      sha: newCommit.sha
    });

    console.log(`✅ Successfully pushed ${blobs.length} files`);
    return newCommit;
  } catch (error) {
    throw new Error(`Failed to push files to GitHub: ${error.message}`);
  }
};

// Main controller function
exports.createProjectRepo = async (req, res) => {
  // Use multer middleware
  upload.array('files', 50)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        error: 'File upload error', 
        message: err.message 
      });
    }

    try {
      const { projectName, description, visibility } = req.body;
      const userId = req.userId;
      const uploadedFiles = req.files;

      // Validation
      if (!projectName) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      if (!['public', 'private'].includes(visibility)) {
        return res.status(400).json({ error: 'Invalid visibility value' });
      }

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ error: 'At least one file is required' });
      }

      const connection = await pool.promise().getConnection();

      try {
        // Get user and GitHub token
        const [users] = await connection.execute(
          `SELECT u.*, gt.access_token
           FROM users u
           LEFT JOIN github_tokens gt ON u.id = gt.user_id
           WHERE u.id = ?`,
          [userId]
        );

        if (users.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        if (!user.access_token) {
          return res.status(401).json({ error: 'GitHub token missing' });
        }

        // Initialize Octokit
        const octokit = new Octokit({
          auth: user.access_token
        });

        // Get GitHub username
        const { data: githubUser } = await octokit.users.getAuthenticated();

        // Step 1: Create GitHub repository
        // Sanitize project name: replace spaces and special chars with hyphens
        const sanitizedProjectName = projectName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-_]/g, '');

        let githubRepo;
        try {
          const { data } = await octokit.repos.createForAuthenticatedUser({
            name: sanitizedProjectName,
            description: description || '',
            private: visibility === 'private',
            auto_init: true // Initialize with README to create main branch
          });
          githubRepo = data;
        } catch (repoError) {
          if (repoError.message.includes('name already exists')) {
            return res.status(400).json({
              error: 'Repository name already exists',
              message: `A repository named "${sanitizedProjectName}" already exists on your GitHub account. Please choose a different project name or delete the existing repository.`
            });
          }
          throw repoError;
        }

        console.log('✅ Repository created:', githubRepo.name);

        // Wait longer for repo initialization - GitHub needs time to create the main branch
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify the main branch exists before pushing
        try {
          await octokit.git.getRef({
            owner: githubUser.login,
            repo: sanitizedProjectName,
            ref: 'heads/main'
          });
          console.log('✅ Main branch verified');
        } catch (branchError) {
          console.log('⚠️ Main branch not found, trying master branch...');
          // Some repos might use 'master' instead
          try {
            await octokit.git.getRef({
              owner: githubUser.login,
              repo: sanitizedProjectName,
              ref: 'heads/master'
            });
            console.log('✅ Master branch found');
          } catch (masterError) {
            throw new Error('Neither main nor master branch found. Repository might not be initialized yet.');
          }
        }

        // Step 2: Push files to repository
        const fileStructure = req.body.fileStructure ? JSON.parse(req.body.fileStructure) : {
          individualFiles: [],
          folders: []
        };

        // Prepare file data with relative paths
        const fileData = uploadedFiles.map((file) => {
          // Find the matching file in the structure to get its relative path
          let relativePath = file.originalname;
          
          // Check individual files
          const individualFile = fileStructure.individualFiles?.find(f => f.name === file.originalname);
          if (individualFile) {
            relativePath = individualFile.relativePath || file.originalname;
          } else {
            // Check in folders
            for (const folder of fileStructure.folders || []) {
              const folderFile = folder.files?.find(f => f.name === file.originalname);
              if (folderFile) {
                relativePath = folderFile.relativePath || file.originalname;
                break;
              }
            }
          }
          
          return {
            name: file.originalname,
            path: file.path,
            size: file.size,
            relativePath: relativePath
          };
        });

        console.log(`📋 Preparing to upload ${fileData.length} files`);
        console.log('File paths:', fileData.map(f => f.relativePath));

        await pushFilesToGitHub(
          octokit,
          githubUser.login,
          sanitizedProjectName,
          fileData,
          'Initial project files'
        );

        console.log('✅ Files pushed successfully');

        // Step 3: Save project to database with file structure
        console.log('📁 File structure:', fileStructure);

        const [insertResult] = await connection.execute(
          `INSERT INTO projects 
           (user_id, repo_id, repo_name, repo_url, description, visibility, file_paths, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            userId,
            githubRepo.id,
            sanitizedProjectName,
            githubRepo.html_url,
            description || '',
            visibility,
            JSON.stringify(fileStructure)
          ]
        );

        const projectId = insertResult.insertId;

        // Step 4: Clean up uploaded files from server
        await Promise.all(
          uploadedFiles.map(file => fs.unlink(file.path).catch(() => {}))
        );

        // Step 5: Return success response
        res.status(201).json({
          message: 'Project created successfully',
          project: {
            id: projectId,
            name: sanitizedProjectName,
            description: githubRepo.description,
            url: githubRepo.html_url,
            visibility,
            fileCount: uploadedFiles.length,
            createdAt: new Date().toISOString()
          },
          repo: {
            id: githubRepo.id,
            name: sanitizedProjectName,
            full_name: githubRepo.full_name,
            url: githubRepo.html_url,
            clone_url: githubRepo.clone_url
          }
        });

      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('createProjectRepo error:', error);
      
      // Clean up uploaded files on error
      if (req.files) {
        await Promise.all(
          req.files.map(file => fs.unlink(file.path).catch(() => {}))
        );
      }

      res.status(500).json({
        error: 'Failed to create project',
        message: error.message,
      });
    }
  });
};

// Get all projects for a user
exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      const [projects] = await connection.execute(
        `SELECT 
          id,
          repo_id,
          repo_name as name,
          repo_url as url,
          description,
          visibility,
          file_paths,
          has_changes,
          created_at,
          updated_at
         FROM projects
         WHERE user_id = ?
         ORDER BY updated_at DESC`,
        [userId]
      );

      res.json({
        projects: projects.map(p => {
          const fileStructure = p.file_paths ? JSON.parse(p.file_paths) : { individualFiles: [], folders: [] };
          
          // Calculate total file count from structure
          const individualFileCount = fileStructure.individualFiles?.length || 0;
          const folderFileCount = fileStructure.folders?.reduce((sum, folder) => sum + (folder.files?.length || 0), 0) || 0;
          const totalFileCount = individualFileCount + folderFileCount;
          
          return {
            id: p.id,
            name: p.name,
            url: p.url,
            description: p.description,
            visibility: p.visibility,
            fileCount: totalFileCount,
            updatedAt: p.updated_at,
            hasUnpushedChanges: p.has_changes === 1,
            file_paths: fileStructure
          };
        })
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('getUserProjects error:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
};

// Mark project as having changes
exports.markProjectChanges = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { hasChanges } = req.body;
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      await connection.execute(
        `UPDATE projects 
         SET has_changes = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [hasChanges ? 1 : 0, projectId, userId]
      );

      res.json({ message: 'Project updated successfully' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('markProjectChanges error:', error);
    res.status(500).json({
      error: 'Failed to update project',
      message: error.message
    });
  }
};

// Detect file changes
exports.detectFileChanges = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { currentFileStructure } = req.body; // File structure with folders and files
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      const [projects] = await connection.execute(
        'SELECT file_paths FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const storedStructure = JSON.parse(projects[0].file_paths);
      
      console.log(' Stored structure:', storedStructure);
      console.log(' Current structure:', currentFileStructure);

      // Check for changes by comparing the entire structure
      let hasChanges = false;
      const changeDetails = [];

      // Compare individual files
      const storedIndividual = storedStructure.individualFiles || [];
      const currentIndividual = currentFileStructure.individualFiles || [];

      if (storedIndividual.length !== currentIndividual.length) {
        hasChanges = true;
        changeDetails.push(`Individual files count changed: ${storedIndividual.length} → ${currentIndividual.length}`);
      }

      // Check each individual file
      currentIndividual.forEach(currentFile => {
        const storedFile = storedIndividual.find(f => f.name === currentFile.name);
        if (!storedFile) {
          hasChanges = true;
          changeDetails.push(`New file added: ${currentFile.name}`);
        } else if (storedFile.size !== currentFile.size || storedFile.lastModified !== currentFile.lastModified) {
          hasChanges = true;
          changeDetails.push(`File modified: ${currentFile.name}`);
        }
      });

      // Check for deleted individual files
      storedIndividual.forEach(storedFile => {
        if (!currentIndividual.find(f => f.name === storedFile.name)) {
          hasChanges = true;
          changeDetails.push(`File deleted: ${storedFile.name}`);
        }
      });

      // Compare folders
      const storedFolders = storedStructure.folders || [];
      const currentFolders = currentFileStructure.folders || [];

      if (storedFolders.length !== currentFolders.length) {
        hasChanges = true;
        changeDetails.push(`Folder count changed: ${storedFolders.length} → ${currentFolders.length}`);
      }

      // Check each folder and its files
      currentFolders.forEach(currentFolder => {
        const storedFolder = storedFolders.find(f => f.name === currentFolder.name);
        if (!storedFolder) {
          hasChanges = true;
          changeDetails.push(`New folder added: ${currentFolder.name}`);
        } else {
          // Compare files in folder
          if (storedFolder.files.length !== currentFolder.files.length) {
            hasChanges = true;
            changeDetails.push(`Files in folder "${currentFolder.name}" changed`);
          }
        }
      });

      console.log('Change details:', changeDetails);

      if (hasChanges) {
        await connection.execute(
          'UPDATE projects SET has_changes = 1, updated_at = NOW() WHERE id = ?',
          [projectId]
        );
      }

      res.json({ hasChanges, changeDetails });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('detectFileChanges error:', error);
    res.status(500).json({ error: 'Failed to detect changes' });
  }
};
// Push project changes to GitHub
// exports.pushProjectChanges = async (req, res) => {
//   try {
//     const { projectId } = req.params;
//     const userId = req.userId;

//     const connection = await pool.promise().getConnection();

//     try {
//       // Get project details
//       const [projects] = await connection.execute(
//         `SELECT p.*, u.id as user_id, gt.access_token
//          FROM projects p
//          JOIN users u ON p.user_id = u.id
//          LEFT JOIN github_tokens gt ON u.id = gt.user_id
//          WHERE p.id = ? AND p.user_id = ?`,
//         [projectId, userId]
//       );

//       if (projects.length === 0) {
//         return res.status(404).json({ error: 'Project not found' });
//       }

//       const project = projects[0];

//       if (!project.access_token) {
//         return res.status(401).json({ error: 'GitHub token missing' });
//       }

//       if (!project.has_changes) {
//         return res.status(400).json({ error: 'No changes to push' });
//       }

//       // Initialize Octokit
//       const octokit = new Octokit({
//         auth: project.access_token
//       });

//       // Get GitHub username
//       const { data: githubUser } = await octokit.users.getAuthenticated();

//       // TODO: Here you would implement the actual file upload logic
//       // For now, we'll just mark the changes as pushed
      
//       // Reset has_changes flag
//       await connection.execute(
//         'UPDATE projects SET has_changes = 0, updated_at = NOW() WHERE id = ?',
//         [projectId]
//       );

//       res.json({ 
//         message: 'Changes pushed successfully',
//         note: 'Full implementation requires re-uploading modified files'
//       });

//     } finally {
//       connection.release();
//     }
//   } catch (error) {
//     console.error('pushProjectChanges error:', error);
//     res.status(500).json({
//       error: 'Failed to push changes',
//       message: error.message
//     });
//   }
// };
// Push project changes to GitHub - COMPLETE IMPLEMENTATION
exports.pushProjectChanges = async (req, res) => {
  // Use multer middleware to handle file uploads
  upload.array('files', 100)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ 
        error: 'File upload error', 
        message: err.message 
      });
    }

    try {
      const { projectId } = req.params;
      const userId = req.userId;
      const uploadedFiles = req.files;

      if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const connection = await pool.promise().getConnection();

      try {
        // Get project details and stored file structure
        const [projects] = await connection.execute(
          `SELECT p.*, u.id as user_id, gt.access_token
           FROM projects p
           JOIN users u ON p.user_id = u.id
           LEFT JOIN github_tokens gt ON u.id = gt.user_id
           WHERE p.id = ? AND p.user_id = ?`,
          [projectId, userId]
        );

        if (projects.length === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }

        const project = projects[0];

        if (!project.access_token) {
          return res.status(401).json({ error: 'GitHub token missing' });
        }

        if (!project.has_changes) {
          return res.status(400).json({ error: 'No changes detected. Run "Check Changes" first.' });
        }

        // Initialize Octokit
        const octokit = new Octokit({
          auth: project.access_token
        });

        // Get GitHub username
        const { data: githubUser } = await octokit.users.getAuthenticated();

        // Parse file structures
        const storedStructure = JSON.parse(project.file_paths);
        const newFileStructure = req.body.fileStructure ? JSON.parse(req.body.fileStructure) : {
          individualFiles: [],
          folders: []
        };

        console.log(' Stored structure:', storedStructure);
        console.log(' New structure:', newFileStructure);

        // Determine which files are new/modified
        const filesToUpload = [];
        
        // Check individual files
        newFileStructure.individualFiles.forEach(newFile => {
          const storedFile = storedStructure.individualFiles?.find(f => f.name === newFile.name);
          
          if (!storedFile || 
              storedFile.size !== newFile.size || 
              storedFile.lastModified !== newFile.lastModified) {
            // File is new or modified
            const uploadedFile = uploadedFiles.find(f => f.originalname === newFile.name);
            if (uploadedFile) {
              filesToUpload.push({
                file: uploadedFile,
                relativePath: newFile.relativePath,
                isNew: !storedFile
              });
            }
          }
        });

        // Check files in folders
        newFileStructure.folders.forEach(newFolder => {
          const storedFolder = storedStructure.folders?.find(f => f.name === newFolder.name);
          
          newFolder.files.forEach(newFile => {
            const storedFile = storedFolder?.files?.find(f => f.name === newFile.name);
            
            if (!storedFile || 
                storedFile.size !== newFile.size || 
                storedFile.lastModified !== newFile.lastModified) {
              // File is new or modified
              const uploadedFile = uploadedFiles.find(f => f.originalname === newFile.name);
              if (uploadedFile) {
                filesToUpload.push({
                  file: uploadedFile,
                  relativePath: newFile.relativePath,
                  isNew: !storedFile
                });
              }
            }
          });
        });

        console.log(`Files to upload: ${filesToUpload.length}`);
        
        if (filesToUpload.length === 0) {
          return res.status(400).json({ error: 'No modified files found to push' });
        }

        // Prepare file data for GitHub
        const fileData = filesToUpload.map(({ file, relativePath }) => ({
          name: file.originalname,
          path: file.path,
          size: file.size,
          relativePath: relativePath
        }));

        // Push ONLY changed files to GitHub
        await pushFilesToGitHub(
          octokit,
          githubUser.login,
          project.repo_name,
          fileData,
          `Update: ${filesToUpload.length} file(s) modified`
        );

        console.log(' Changed files pushed successfully');

        // Update database with new file structure
        await connection.execute(
          `UPDATE projects 
           SET file_paths = ?, has_changes = 0, updated_at = NOW()
           WHERE id = ?`,
          [JSON.stringify(newFileStructure), projectId]
        );

        // Clean up uploaded files from server
        await Promise.all(
          uploadedFiles.map(file => fs.unlink(file.path).catch(() => {}))
        );

        res.json({ 
          message: 'Changes pushed successfully',
          filesUploaded: filesToUpload.length,
          details: filesToUpload.map(f => ({
            name: f.file.originalname,
            status: f.isNew ? 'new' : 'modified'
          }))
        });

      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('pushProjectChanges error:', error);
      
      // Clean up uploaded files on error
      if (req.files) {
        await Promise.all(
          req.files.map(file => fs.unlink(file.path).catch(() => {}))
        );
      }

      res.status(500).json({
        error: 'Failed to push changes',
        message: error.message
      });
    }
  });
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      // Get project details first
      const [projects] = await connection.execute(
        `SELECT p.*, gt.access_token
         FROM projects p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN github_tokens gt ON u.id = gt.user_id
         WHERE p.id = ? AND p.user_id = ?`,
        [projectId, userId]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projects[0];

      // Delete from GitHub if token exists
      if (project.access_token) {
        try {
          const octokit = new Octokit({
            auth: project.access_token
          });

          const { data: githubUser } = await octokit.users.getAuthenticated();

          await octokit.repos.delete({
            owner: githubUser.login,
            repo: project.repo_name
          });

          console.log(`✅ GitHub repository deleted: ${project.repo_name}`);
        } catch (githubError) {
          console.error('Error deleting GitHub repo:', githubError.message);
          // Continue with database deletion even if GitHub deletion fails
        }
      }

      // Delete from database
      await connection.execute(
        'DELETE FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      res.json({ message: 'Project deleted successfully' });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      message: error.message
    });
  }
};
//generate project link
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
      const shareLink = `${process.env.ORIGIN || 'http://localhost:3000'}/join/${shareToken}`;

      res.json({
        shareLink,
        shareToken,
        projectName: project.repo_name
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('generateShareLink error:', error);
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
      const fileStructure = JSON.parse(project.file_paths);

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
        fileCount: (fileStructure.individualFiles?.length || 0) + 
                   fileStructure.folders?.reduce((sum, f) => sum + (f.files?.length || 0), 0)
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('getProjectByToken error:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      message: error.message
    });
  }
};
exports.joinProject = async (req, res) => {
  try {
    const { shareToken, localPath } = req.body;
    const userId = req.userId;

    if (!shareToken || !localPath) {
      return res.status(400).json({ error: 'Share token and local path are required' });
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

      // Check if already a collaborator
      const [existing] = await connection.execute(
        'SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?',
        [project.id, userId]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'You are already a collaborator on this project' });
      }

      // Add as collaborator
      await connection.execute(
        `INSERT INTO project_collaborators (project_id, user_id, role, local_path)
         VALUES (?, ?, 'collaborator', ?)`,
        [project.id, userId, localPath]
      );

      await connection.commit();

      res.json({
        message: 'Successfully joined project',
        project: {
          id: project.id,
          name: project.repo_name,
          repoUrl: project.repo_url,
          localPath: localPath
        }
      });

    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('joinProject error:', error);
    res.status(500).json({
      error: 'Failed to join project',
      message: error.message
    });
  }
};
// Get user's collaborated projects
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
          p.file_paths,
          p.has_changes,
          p.updated_at,
          pc.role,
          pc.local_path,
          u.username as owner_username,
          u.avatar_url as owner_avatar
         FROM project_collaborators pc
         JOIN projects p ON pc.project_id = p.id
         JOIN users u ON p.user_id = u.id
         WHERE pc.user_id = ? AND p.user_id != ?
         ORDER BY pc.joined_at DESC`,
        [userId, userId]
      );

      const formattedProjects = projects.map(p => {
        const fileStructure = p.file_paths ? JSON.parse(p.file_paths) : { individualFiles: [], folders: [] };
        const totalFileCount = (fileStructure.individualFiles?.length || 0) + 
                               fileStructure.folders?.reduce((sum, f) => sum + (f.files?.length || 0), 0);

        return {
          id: p.id,
          name: p.name,
          url: p.url,
          description: p.description,
          visibility: p.visibility,
          fileCount: totalFileCount,
          updatedAt: p.updated_at,
          hasUnpushedChanges: p.has_changes === 1,
          role: p.role,
          localPath: p.local_path,
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
    console.error('getCollaboratedProjects error:', error);
    res.status(500).json({
      error: 'Failed to fetch collaborated projects',
      message: error.message
    });
  }
};



module.exports = {
  createProjectRepo: exports.createProjectRepo,
  getUserProjects: exports.getUserProjects,
  markProjectChanges: exports.markProjectChanges,
  detectFileChanges: exports.detectFileChanges,
  pushProjectChanges: exports.pushProjectChanges,
  deleteProject: exports.deleteProject,
  generateShareLink: exports.generateShareLink,
  getProjectByToken: exports.getProjectByToken,
  joinProject: exports.joinProject,
  getCollaboratedProjects: exports.getCollaboratedProjects
};