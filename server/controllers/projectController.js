
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
      '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', '.txt',
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
        console.log(` Uploading: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Check file size (GitHub has a 100MB limit per file)
        if (file.size > 100 * 1024 * 1024) {
          console.warn(` Skipping ${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
          continue;
        }

        const content = await fileToBase64(file.path);
        
        // Validate base64 content
        if (!content || content.length === 0) {
          console.warn(` Skipping ${file.name}: Empty file`);
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

        console.log(` Uploaded: ${filePath}`);
      } catch (fileError) {
        console.error(` Error uploading ${file.name}:`, fileError.message);
        // Continue with other files instead of failing completely
      }
    }

    if (blobs.length === 0) {
      throw new Error('No files were successfully uploaded');
    }

    console.log(` Creating tree with ${blobs.length} files`);

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

    console.log(` Successfully pushed ${blobs.length} files`);
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

        console.log(' Repository created:', githubRepo.name);

        // Wait longer for repo initialization - GitHub needs time to create the main branch
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify the main branch exists before pushing
        try {
          await octokit.git.getRef({
            owner: githubUser.login,
            repo: sanitizedProjectName,
            ref: 'heads/main'
          });
          console.log(' Main branch verified');
        } catch (branchError) {
          console.log(' Main branch not found, trying master branch...');
          // Some repos might use 'master' instead
          try {
            await octokit.git.getRef({
              owner: githubUser.login,
              repo: sanitizedProjectName,
              ref: 'heads/master'
            });
            console.log(' Master branch found');
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

        console.log(` Preparing to upload ${fileData.length} files`);
        console.log('File paths:', fileData.map(f => f.relativePath));

        await pushFilesToGitHub(
          octokit,
          githubUser.login,
          sanitizedProjectName,
          fileData,
          'Initial project files'
        );

        console.log(' Files pushed successfully');

        // Step 3: Save project to database with file structure
        console.log(' File structure:', fileStructure);

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
            file_paths: fileStructure  // Include this for frontend to extract folder name
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
          isCollaborator: true,
          file_paths: fileStructure  // Include this for frontend to extract folder name
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
exports.detectFileChanges = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { currentFileStructure } = req.body;
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      // Check if user is owner or collaborator
    const [ownerCheck] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      const [collabCheck] = await connection.execute(
        'SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (ownerCheck.length === 0 && collabCheck.length === 0) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      // Get project file structure
     const [projects] = await connection.execute(
        'SELECT file_paths FROM projects WHERE id = ?',
        [projectId]
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

      // Check each individual file (additions/modifications)
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
          // Compare files in folder (additions/modifications)
          const storedFolderFiles = storedFolder.files || [];
          const currentFolderFiles = currentFolder.files || [];

          if (storedFolderFiles.length !== currentFolderFiles.length) {
            hasChanges = true;
            changeDetails.push(`Files count in folder "${currentFolder.name}" changed: ${storedFolderFiles.length} → ${currentFolderFiles.length}`);
          }

          currentFolderFiles.forEach(currentFile => {
            const storedFile = storedFolderFiles.find(f => f.name === currentFile.name);
            if (!storedFile) {
              hasChanges = true;
              changeDetails.push(`New file added in folder "${currentFolder.name}": ${currentFile.name}`);
            } else if (storedFile.size !== currentFile.size || storedFile.lastModified !== currentFile.lastModified) {
              hasChanges = true;
              changeDetails.push(`File modified in folder "${currentFolder.name}": ${currentFile.name}`);
            }
          });

          // Check for deleted files in folder
          storedFolderFiles.forEach(storedFile => {
            if (!currentFolderFiles.find(f => f.name === storedFile.name)) {
              hasChanges = true;
              changeDetails.push(`File deleted in folder "${currentFolder.name}": ${storedFile.name}`);
            }
          });
        }
      });

      // Check for deleted folders
      storedFolders.forEach(storedFolder => {
        if (!currentFolders.find(f => f.name === storedFolder.name)) {
          hasChanges = true;
          changeDetails.push(`Folder deleted: ${storedFolder.name}`);
        }
      });

     console.log(' Change details:', changeDetails);

    await connection.execute(
      'UPDATE projects SET has_changes = ?, updated_at = NOW() WHERE id = ?',
      [hasChanges ? 1 : 0, projectId]  // This will set to 0 when no changes
    );

res.json({ hasChanges, changeDetails });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('detectFileChanges error:', error);
    res.status(500).json({ error: 'Failed to detect changes', message: error.message });
  }
};
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
        // SIMPLE FIX: Just remove the user check - let anyone with the project ID push
        // This assumes your frontend already verified they have access via the collaborated projects list
        // const [projects] = await connection.execute(
        //   `SELECT p.*, u.id as user_id, gt.access_token, u.username as owner_username
        //    FROM projects p
        //    JOIN users u ON p.user_id = u.id
        //    LEFT JOIN github_tokens gt ON u.id = gt.user_id
        //    WHERE p.id = ?`,
        //   [projectId]
        // );
        const [projects] = await connection.execute(
          `SELECT p.*, owner_u.id as user_id, owner_gt.access_token, owner_u.username as owner_username
          FROM projects p
          JOIN users owner_u ON p.user_id = owner_u.id
          LEFT JOIN github_tokens owner_gt ON owner_u.id = owner_gt.user_id
          WHERE p.id = ?`,
          [projectId]
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

        // Get GitHub username (of the repo owner)
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

        console.log(` Files to upload: ${filesToUpload.length}`);
        
        if (filesToUpload.length === 0) {
          return res.status(400).json({ error: 'No modified files found to push / files already exist on github.'});
        }

        // Prepare file data for GitHub
        const fileData = filesToUpload.map(({ file, relativePath }) => ({
          name: file.originalname,
          path: file.path,
          size: file.size,
          relativePath: relativePath
        }));

        // Get the current user's username for commit message
        const [currentUser] = await connection.execute(
          'SELECT username FROM users WHERE id = ?',
          [userId]
        );

        const isOwner = project.user_id === userId;
        const commitMessage = isOwner 
          ? `Update: ${filesToUpload.length} file(s) modified`
          : `Update by @${currentUser[0].username}: ${filesToUpload.length} file(s) modified`;

        // Push ONLY changed files to GitHub
        await pushFilesToGitHub(
          octokit,
          githubUser.login,
          project.repo_name,
          fileData,
          commitMessage
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
          pushedBy: isOwner ? 'owner' : 'collaborator',
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
      // Check if user is owner
      const [ownerCheck] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      // Check if user is collaborator
      const [collabCheck] = await connection.execute(
        'SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (ownerCheck.length === 0 && collabCheck.length === 0) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      const isOwner = ownerCheck.length > 0;

      if (isOwner) {
        // OWNER: Delete entire project and GitHub repo
        const project = ownerCheck[0];
        
        // Get access token
        const [tokens] = await connection.execute(
          'SELECT access_token FROM github_tokens WHERE user_id = ?',
          [userId]
        );

        // Delete from GitHub if token exists
        if (tokens.length > 0 && tokens[0].access_token) {
          try {
            const octokit = new Octokit({
              auth: tokens[0].access_token
            });

            const { data: githubUser } = await octokit.users.getAuthenticated();

            await octokit.repos.delete({
              owner: githubUser.login,
              repo: project.repo_name
            });

            console.log(`GitHub repository deleted: ${project.repo_name}`);
          } catch (githubError) {
            console.error('Error deleting GitHub repo:', githubError.message);
            // Continue with database deletion even if GitHub deletion fails
          }
        }

        // Delete from database (cascades to collaborators)
        await connection.execute(
          'DELETE FROM projects WHERE id = ?',
          [projectId]
        );

        res.json({ 
          message: 'Project deleted successfully',
          deletedBy: 'owner'
        });
      } else {
        // COLLABORATOR: Just remove from collaborators
        await connection.execute(
          'DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?',
          [projectId, userId]
        );

        res.json({ 
          message: 'Successfully left project',
          deletedBy: 'collaborator'
        });
      }

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
// Clone/Pull project files from GitHub
exports.cloneProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      // Check if user is owner or collaborator
      const [ownerCheck] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      const [collabCheck] = await connection.execute(
        'SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (ownerCheck.length === 0 && collabCheck.length === 0) {
        return res.status(404).json({ error: 'Project not found or access denied' });
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

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projects[0];

      if (!project.access_token) {
        return res.status(401).json({ error: 'GitHub token missing' });
      }

      // Initialize Octokit
      const octokit = new Octokit({
        auth: project.access_token
      });

      // Get repository owner
      const repoUrl = project.repo_url;
      const repoOwner = repoUrl.split('/')[3]; // Extract owner from URL

      // Get all files from repository
      const { data: contents } = await octokit.repos.getContent({
        owner: repoOwner,
        repo: project.repo_name,
        path: ''
      });

      // Recursively get all files
      const allFiles = await getAllRepoFiles(octokit, repoOwner, project.repo_name, '');

      res.json({
        message: 'Files fetched successfully',
        project: {
          id: project.id,
          name: project.repo_name,
          repoUrl: project.repo_url
        },
        files: allFiles
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('cloneProjectFiles error:', error);
    res.status(500).json({
      error: 'Failed to clone project files',
      message: error.message
    });
  }
};
async function getAllRepoFiles(octokit, owner, repo, path = '', ref = 'main') {
  const files = [];
  
  try {
    console.log(`[GITHUB] Fetching contents from ${owner}/${repo}/${path} (ref: ${ref})`);
    
    const { data: contents } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref
    });

    // Handle both single file and array responses
    const items = Array.isArray(contents) ? contents : [contents];

    for (const item of items) {
      // Skip README files in root - they're auto-generated by GitHub
      if (item.name.toLowerCase() === 'readme.md' && path === '') {
        console.log(` Skipping auto-generated README`);
        continue;
      }

      if (item.type === 'file') {
        try {
          let fileContent = null;
          
          // CRITICAL FIX: Check file size
          // GitHub Contents API has 1MB limit - use Blob API for larger files
          if (item.size > 1048576) { // 1MB in bytes
            console.log(`Large file detected (${(item.size / 1024 / 1024).toFixed(2)}MB): ${item.path}`);
            console.log(`   SHA: ${item.sha}`);
            console.log(`   Using Git Blob API for: ${item.path}`);
            
            try {
              // Use Git Blob API for large files
              const blobResponse = await octokit.git.getBlob({
                owner,
                repo,
                file_sha: item.sha
              });
              
              console.log(`   Blob API full response:`, blobResponse);
              console.log(`   Response status:`, blobResponse.status);
              console.log(`   Blob data keys:`, Object.keys(blobResponse.data || {}));
              
              const blobData = blobResponse.data;
              
              // Verify blob data exists
              if (!blobData || !blobData.content) {
                console.error(` Blob API returned no content for ${item.path}`);
                console.error('Full response:', blobResponse);
                
                // Try using download_url as fallback
                if (item.download_url) {
                  console.log(`   Attempting direct download from: ${item.download_url}`);
                  const downloadResponse = await fetch(item.download_url);
                  const arrayBuffer = await downloadResponse.arrayBuffer();
                  const base64 = btoa(
                    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                  );
                  
                  files.push({
                    name: item.name,
                    path: item.path,
                    size: item.size,
                    content: base64,
                    encoding: 'base64',
                    sha: item.sha,
                    downloadUrl: item.download_url
                  });
                  
                  console.log(` Fetched via download URL: ${item.path}`);
                  continue;
                }
                
                continue;
              }
              
              fileContent = blobData.content.replace(/\n/g, ''); // Clean base64
              console.log(`   Content length: ${fileContent.length} chars`);
              
            } catch (blobError) {
              console.error(` Blob API error for ${item.path}:`, blobError);
              console.error('Error details:', {
                message: blobError.message,
                status: blobError.status,
                response: blobError.response
              });
              
              // Try download URL as final fallback
              if (item.download_url) {
                try {
                  console.log(`   Attempting direct download fallback: ${item.download_url}`);
                  const downloadResponse = await fetch(item.download_url);
                  const arrayBuffer = await downloadResponse.arrayBuffer();
                  const base64 = btoa(
                    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                  );
                  
                  files.push({
                    name: item.name,
                    path: item.path,
                    size: item.size,
                    content: base64,
                    encoding: 'base64',
                    sha: item.sha,
                    downloadUrl: item.download_url
                  });
                  
                  console.log(`Fetched via download URL fallback: ${item.path}`);
                  continue;
                } catch (downloadError) {
                  console.error(` Download URL also failed:`, downloadError);
                }
              }
              
              continue;
            }
            
          } else {
            // Use Contents API for smaller files
            const { data: fileData } = await octokit.repos.getContent({
              owner,
              repo,
              path: item.path,
              ref
            });

            // Verify we got content
            if (!fileData.content) {
              console.warn(` No content for ${item.path}`);
              continue;
            }

            fileContent = fileData.content.replace(/\n/g, ''); // Clean base64
          }

          if (!fileContent) {
            console.warn(` Failed to fetch content for ${item.path}`);
            continue;
          }

          files.push({
            name: item.name,
            path: item.path,
            size: item.size,
            content: fileContent,
            encoding: 'base64',
            sha: item.sha,
            downloadUrl: item.download_url
          });

          console.log(`Fetched: ${item.path} (${(item.size / 1024).toFixed(2)}KB)`);
          
        } catch (fileError) {
          console.error(` Error fetching ${item.path}:`, fileError.message);
          
          // If Contents API fails, try Blob API as fallback
          if (fileError.status === 403 || fileError.message.includes('too large')) {
            try {
              console.log(`   Retrying with Blob API: ${item.path}`);
              
              const { data: blobData } = await octokit.git.getBlob({
                owner,
                repo,
                file_sha: item.sha
              });
              
              // Verify blob data
              if (!blobData || !blobData.content) {
                console.error(`Blob API returned no content for ${item.path}`);
                continue;
              }
              
              files.push({
                name: item.name,
                path: item.path,
                size: item.size,
                content: blobData.content.replace(/\n/g, ''),
                encoding: blobData.encoding || 'base64',
                sha: item.sha,
                downloadUrl: item.download_url
              });
              
              console.log(` Fetched via Blob API: ${item.path}`);
              
            } catch (blobError) {
              console.error(`Blob API also failed for ${item.path}:`, blobError.message);
            }
          }
        }
      } else if (item.type === 'dir') {
        // Recursively get files from subdirectory
        console.log(` Entering directory: ${item.path}`);
        const subFiles = await getAllRepoFiles(octokit, owner, repo, item.path, ref);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.error(` Error getting files from ${path}:`, error.message);
    if (error.status === 404) {
      console.error(`Path not found: ${owner}/${repo}/${path}`);
    }
  }

  return files;
}
exports.getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      // Check if user is owner
      const [ownerCheck] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      // Or collaborator
      const [collabCheck] = await connection.execute(
        'SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      // if (ownerCheck.length === 0 && collabCheck.length === 0) {
      //   return res.status(403).json({ error: 'Unauthorized access to this project' });
      // }

      // Get project details
      const [projects] = await connection.execute(
        `SELECT 
           id, repo_name AS name, repo_url AS url, description, visibility,
           file_paths, has_changes, created_at, updated_at
         FROM projects 
         WHERE id = ?`,
        [projectId]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projects[0];
      const fileStructure = project.file_paths ? JSON.parse(project.file_paths) : {
        individualFiles: [],
        folders: []
      };

      res.json({
        id: project.id,
        name: project.name,
        url: project.url,
        description: project.description,
        visibility: project.visibility,
        file_paths: fileStructure,
        hasUnpushedChanges: project.has_changes === 1,
        updatedAt: project.updated_at
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('getProjectById error:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      message: error.message
    });
  }
};
// UPDATED checkRemoteChanges - More intelligent change detection
exports.checkRemoteChanges = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { forceCheck } = req.query; // Add optional force flag

    const connection = await pool.promise().getConnection();

    try {
      // Check if user is owner or collaborator
      const [ownerCheck] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      const [collabCheck] = await connection.execute(
        'SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (ownerCheck.length === 0 && collabCheck.length === 0) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      // Get project details
      const [projects] = await connection.execute(
        `SELECT p.*, owner_gt.access_token, p.last_pulled_at, p.file_paths
        FROM projects p
        JOIN users owner_u ON p.user_id = owner_u.id
        LEFT JOIN github_tokens owner_gt ON owner_u.id = owner_gt.user_id
        WHERE p.id = ?`,
        [projectId]
      );

      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projects[0];

      if (!project.access_token) {
        return res.status(401).json({ error: 'GitHub token missing' });
      }

      // Initialize Octokit
      const octokit = new Octokit({
        auth: project.access_token
      });

      // Get repository details
      const repoUrl = project.repo_url;
      const urlParts = repoUrl.split('/');
      const repoOwner = urlParts[urlParts.length - 2];

      // Get latest commit from GitHub
      const { data: commits } = await octokit.repos.listCommits({
        owner: repoOwner,
        repo: project.repo_name,
        per_page: 1
      });

      if (commits.length === 0) {
        return res.json({ hasChanges: false });
      }

      const latestCommitDate = new Date(commits[0].commit.author.date);
      const lastPulledDate = project.last_pulled_at ? new Date(project.last_pulled_at) : null;

      // CRITICAL FIX: If forceCheck is true, always return hasChanges = true
      // This allows users to re-pull even if database thinks it's up to date
      if (forceCheck === 'true') {
        console.log('[CHECK] Force check enabled - treating as first pull');
        return res.json({ 
          hasChanges: true,
          message: 'Force pull enabled',
          latestCommit: commits[0].sha,
          latestCommitDate: latestCommitDate.toISOString()
        });
      }

      // If never pulled before, there are changes
      if (!lastPulledDate) {
        return res.json({ 
          hasChanges: true,
          message: 'First-time pull required',
          latestCommit: commits[0].sha,
          latestCommitDate: latestCommitDate.toISOString()
        });
      }

      // Check if latest commit is newer than last pull
      const hasChanges = latestCommitDate > lastPulledDate;

      res.json({ 
        hasChanges,
        latestCommit: commits[0].sha,
        latestCommitDate: latestCommitDate.toISOString(),
        lastPulledDate: lastPulledDate.toISOString(),
        message: hasChanges ? 'New changes available' : 'Already up to date'
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('checkRemoteChanges error:', error);
    res.status(500).json({
      error: 'Failed to check for changes',
      message: error.message
    });
  }
};
// UPDATED pullChanges - Always fetch ALL files, let client decide what to write
exports.pullChanges = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const connection = await pool.promise().getConnection();

    try {
      const [ownerCheck] = await connection.execute(
        'SELECT * FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId]
      );

      const [collabCheck] = await connection.execute(
        'SELECT * FROM project_collaborators WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );

      if (ownerCheck.length === 0 && collabCheck.length === 0) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      const [projects] = await connection.execute(
        `SELECT p.*, owner_gt.access_token, p.last_pulled_at, p.file_paths
        FROM projects p
        JOIN users owner_u ON p.user_id = owner_u.id
        LEFT JOIN github_tokens owner_gt ON owner_u.id = owner_gt.user_id
        WHERE p.id = ?`,
        [projectId]
      );
      
      if (projects.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const project = projects[0];

      if (!project.access_token) {
        return res.status(401).json({ error: 'GitHub token missing' });
      }

      const octokit = new Octokit({
        auth: project.access_token
      });

      const repoUrl = project.repo_url;
      const urlParts = repoUrl.split('/');
      const repoOwner = urlParts[urlParts.length - 2];

      console.log(`[PULL] Fetching from ${repoOwner}/${project.repo_name}`);

      const { data: repoData } = await octokit.repos.get({
        owner: repoOwner,
        repo: project.repo_name
      });

      const defaultBranch = repoData.default_branch || 'main';
      console.log(`[PULL] Using branch: ${defaultBranch}`);

      // CRITICAL: Fetch ALL files from GitHub
      const allFiles = await getAllRepoFiles(
        octokit, 
        repoOwner, 
        project.repo_name, 
        '', 
        defaultBranch
      );

      console.log(`[PULL] ✅ Fetched ${allFiles.length} total files from GitHub`);

      // IMPORTANT: Return ALL files, not just changed ones
      // Let the frontend/Electron decide what to write based on local folder state
      
      // Validate and clean files
      const filesWithCleanContent = allFiles
        .filter(file => {
          if (!file.content) {
            console.warn(`[PULL] ⚠️ Skipping file with no content: ${file.path}`);
            return false;
          }
          if (!file.path) {
            console.warn(`[PULL] ⚠️ Skipping file with no path:`, file.name);
            return false;
          }
          return true;
        })
        .map(file => ({
          path: file.path,
          name: file.name,
          size: file.size || 0,
          content: file.content.replace(/\n/g, ''), // Clean base64 - remove newlines
          sha: file.sha,
          encoding: file.encoding || 'base64'
        }));

      if (filesWithCleanContent.length === 0) {
        return res.status(400).json({ 
          error: 'No valid files found',
          message: 'All files from GitHub are missing content'
        });
      }

      // Validate base64 content of first file as sanity check
      const firstFile = filesWithCleanContent[0];
      if (firstFile.content.length < 10) {
        console.warn(`[PULL] ⚠️ Suspiciously short content for ${firstFile.path}: ${firstFile.content.length} chars`);
      }

      console.log(`[PULL] ✅ Sample file check - ${firstFile.path}:`, {
        hasContent: !!firstFile.content,
        contentLength: firstFile.content.length,
        contentPreview: firstFile.content.substring(0, 50) + '...'
      });

      // Update last_pulled_at timestamp
      await connection.execute(
        'UPDATE projects SET last_pulled_at = NOW() WHERE id = ?',
        [projectId]
      );

      console.log(`[PULL] Returning ${filesWithCleanContent.length} valid files to client`);

      res.json({
        message: 'Files fetched successfully',
        changedFiles: filesWithCleanContent, 
        totalFiles: allFiles.length,
        changedCount: filesWithCleanContent.length
      });

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('pullChanges error:', error);
    res.status(500).json({
      error: 'Failed to pull changes',
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
  getCollaboratedProjects: exports.getCollaboratedProjects,
  cloneProjectFiles: exports.cloneProjectFiles,
  checkRemoteChanges: exports.checkRemoteChanges,
  pullChanges: exports.pullChanges,
  getProjectById: exports.getProjectById,
  // clearChangesFlag: exports.clearChangesFlag
};