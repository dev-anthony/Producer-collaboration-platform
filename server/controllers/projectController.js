
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Octokit } = require('@octokit/rest');
const crypto = require('crypto')
const supabase = require('../config/supabase');

const projectEventClients = new Map();

const broadcastProjectUpdate = (project, sourceClientId = null) => {
  const eventProject = sourceClientId ? { ...project, source_client_id: sourceClientId } : project;
  let delivered = 0;
  for (const client of projectEventClients.values()) {
    if (!client.projectIds.has(String(project.id))) continue;
    try {
      client.response.write(`event: project-updated\ndata: ${JSON.stringify(eventProject)}\n\n`);
      delivered += 1;
    } catch (error) {
      console.warn(`[REALTIME] Could not deliver project ${project.id} update:`, error.message);
    }
  }
  console.log(`[REALTIME] Project ${project.id} update delivered to ${delivered} connected collaborator(s)`);
};
// ── Phase 4.2/4.4: use the single shared ProdCollab Octokit + fixed owner ──
// (replaces per-user Octokit built from github_tokens.access_token)
const { octokit: prodOctokit, GITHUB_OWNER } = require('../config/github');

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
  
  '.wav', '.flac', '.aiff', '.aif', '.aifc', '.w64', '.rf64', '.caf',
  '.dsd', '.dsf', '.dff', '.mqa',

  
  '.mp3', '.mp4', '.m4a', '.aac', '.ogg', '.oga', '.opus',
  '.wma', '.ape', '.ac3', '.dts', '.amr', '.au', '.snd',

  
  '.mpeg', '.mpg', '.avi', '.mov', '.flv', '.mkv', '.webm',
  '.mxf', '.m2v', '.m2ts', '.ts',

  
  '.midi', '.mid', '.smf', '.mxl', '.musicxml', '.xml', '.nwc',
  '.sib', '.mus', '.musx', '.mscz', '.mscx', '.capx',


  '.als', '.alp', '.adv', '.adg', '.asd',

 
  '.flp', '.fsc', '.fst', '.fnv',


  '.logicx', '.band', '.aup3',


  '.ptx', '.ptf', '.pts', '.pte', '.ptxt',
  '.sdii', '.sd2',

  
  '.cpr', '.npr', '.bak', '.vstpreset', '.fxb', '.fxp',

  
  '.bwproject', '.bwpreset', '.bwdevice', '.bwmodule', '.bwclip',

  
  '.song', '.multitrack', '.instrument', '.preset',


  '.rpp', '.rpp-bak', '.rtrack', '.rfx',

  
  '.reason', '.rns', '.rsb', '.rx2', '.rcy',

  
  '.ptxt', '.session',


  '.vst', '.vst3', '.au', '.aax', '.rtas', '.lv2',


  '.rex', '.rx2', '.rex2', '.acidwav', '.loop',
  '.sf2', '.sfz', '.exs', '.nki', '.nkx', '.nkm',
  '.kontakt', '.gig', '.dls',

  
  '.stem', '.stem.mp4', '.atmos', '.adm',

 
  '.omf', '.aaf', '.edl', '.xml', '.dawproject',

  
  '.txt', '.pdf', '.rtf',
];
    const fileName = file.originalname.toLowerCase();
    const ext = path.extname(fileName);
    
    // Skip hidden files and system files
    if (fileName.startsWith('.') || fileName.includes('/.git/') || fileName.includes('\\.git\\')) {
      console.log(' Skipping system/hidden file:', fileName);
      return cb(null, false);
    }
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      console.log(' Skipping unsupported file type:', fileName, ext);
      cb(null, false);
    }
  }
});

const fileToBase64 = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath);
  return fileBuffer.toString('base64');
};

const pushFilesToGitHub = async (octokit, owner, repo, files, message = 'Initial commit') => {
  try {
  
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    });

    const commitSha = refData.object.sha;

  
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: commitSha
    });

    const treeSha = commitData.tree.sha;

    const blobs = [];
    for (const file of files) {
      try {
        console.log(` Uploading: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        if (file.size > 100 * 1024 * 1024) {
          console.warn(` Skipping ${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
          continue;
        }

        const content = await fileToBase64(file.path);
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
      }
    }

    if (blobs.length === 0) {
      throw new Error('No files were successfully uploaded');
    }

    console.log(` Creating tree with ${blobs.length} files`);

  
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: treeSha,
      tree: blobs
    });

  
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [commitSha]
    });

   
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


exports.createProjectRepo = async (req, res) => {

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

     
      if (!projectName) {
        return res.status(400).json({ error: 'Project name is required' });
      }

      if (!['public', 'private'].includes(visibility)) {
        return res.status(400).json({ error: 'Invalid visibility value' });
      }

      const filesForUpload = uploadedFiles || [];

      try {
        const octokit = prodOctokit;

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
            auto_init: false
          });
          githubRepo = data;
        } catch (repoError) {
          if (repoError.message.includes('name already exists')) {
            return res.status(400).json({
              error: 'Repository name already exists',
              message: `A repository named "${sanitizedProjectName}" already exists on the ProdCollab account. Please choose a different project name.`
            });
          }
          throw repoError;
        }

        console.log(' Empty repository created:', githubRepo.name);

        const fileStructure = req.body.fileStructure ? JSON.parse(req.body.fileStructure) : {
          individualFiles: [],
          folders: []
        };

        const { data: inserted, error: insertError } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            repo_name: sanitizedProjectName,
            repo_url: githubRepo.html_url,
            description: description || '',
            visibility: visibility,
            file_paths: fileStructure 
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        const projectId = inserted.id;

        await Promise.all(
          filesForUpload.map(file => fs.unlink(file.path).catch(() => {}))
        );

        res.status(201).json({
          message: 'Project created successfully',
          project: {
            id: projectId,
            name: sanitizedProjectName,
            description: githubRepo.description,
            url: githubRepo.html_url,
            visibility,
            fileCount: filesForUpload.length,
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
      } catch (error) {
        console.error('createProjectRepo error:', error);
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
    } catch (outerError) {
      console.error('createProjectRepo outer error:', outerError);
      if (req.files) {
        await Promise.all(
          req.files.map(file => fs.unlink(file.path).catch(() => {}))
        );
      }
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create project', message: outerError.message });
      }
    }

  });
};
exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.userId;

    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, repo_name, repo_url, description, visibility, file_paths, has_changes, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json({
      projects: (projects || []).map(p => {
       
        const fileStructure = typeof p.file_paths === 'string'
          ? JSON.parse(p.file_paths)
          : (p.file_paths || { individualFiles: [], folders: [] });

        const individualFileCount = fileStructure.individualFiles?.length || 0;
        const folderFileCount = fileStructure.folders?.reduce((sum, folder) => sum + (folder.files?.length || 0), 0) || 0;
        const totalFileCount = individualFileCount + folderFileCount;

        return {
          id: p.id,
          name: p.repo_name,
          url: p.repo_url,
          description: p.description,
          visibility: p.visibility,
          fileCount: totalFileCount,
          updatedAt: p.updated_at,
          hasUnpushedChanges: p.has_changes === true || p.has_changes === 1,
          file_paths: fileStructure
        };
      })
    });
  } catch (error) {
    console.error('getUserProjects error:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
};


exports.markProjectChanges = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { hasChanges } = req.body;
    const userId = req.userId;

    const { error } = await supabase
      .from('projects')
      .update({ has_changes: !!hasChanges, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ message: 'Project updated successfully' });
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

    const { data: ownerRows } = await supabase
      .from('projects').select('id').eq('id', projectId).eq('user_id', userId);
    const { data: collabRows } = await supabase
      .from('project_collaborators').select('id').eq('project_id', projectId).eq('user_id', userId);

    if ((!ownerRows || ownerRows.length === 0) && (!collabRows || collabRows.length === 0)) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const { data: projectRow, error: fetchError } = await supabase
      .from('projects').select('file_paths').eq('id', projectId).single();

    if (fetchError || !projectRow) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const storedStructure = typeof projectRow.file_paths === 'string'
      ? JSON.parse(projectRow.file_paths)
      : (projectRow.file_paths || { individualFiles: [], folders: [] });

    let hasChanges = false;
    const changeDetails = [];

    const storedIndividual = storedStructure.individualFiles || [];
    const currentIndividual = currentFileStructure.individualFiles || [];

    if (storedIndividual.length !== currentIndividual.length) {
      hasChanges = true;
      changeDetails.push(`Individual files count changed: ${storedIndividual.length} → ${currentIndividual.length}`);
    }

    currentIndividual.forEach(currentFile => {
      const storedFile = storedIndividual.find(f => f.name === currentFile.name);
      if (!storedFile) {
        hasChanges = true;
        changeDetails.push(`New file added: ${currentFile.name}`);
      } else if (storedFile.size !== currentFile.size) {
        hasChanges = true;
        changeDetails.push(`File modified: ${currentFile.name}`);
      }
    });

    storedIndividual.forEach(storedFile => {
      if (!currentIndividual.find(f => f.name === storedFile.name)) {
        hasChanges = true;
        changeDetails.push(`File deleted: ${storedFile.name}`);
      }
    });

    const storedFolders = storedStructure.folders || [];
    const currentFolders = currentFileStructure.folders || [];

    if (storedFolders.length !== currentFolders.length) {
      hasChanges = true;
      changeDetails.push(`Folder count changed: ${storedFolders.length} → ${currentFolders.length}`);
    }

    currentFolders.forEach(currentFolder => {
      const storedFolder = storedFolders.find(f => f.name === currentFolder.name);
      if (!storedFolder) {
        hasChanges = true;
        changeDetails.push(`New folder added: ${currentFolder.name}`);
      } else {
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
          } else if (storedFile.size !== currentFile.size) {
            hasChanges = true;
            changeDetails.push(`File modified in folder "${currentFolder.name}": ${currentFile.name}`);
          }
        });

        storedFolderFiles.forEach(storedFile => {
          if (!currentFolderFiles.find(f => f.name === storedFile.name)) {
            hasChanges = true;
            changeDetails.push(`File deleted in folder "${currentFolder.name}": ${storedFile.name}`);
          }
        });
      }
    });

    storedFolders.forEach(storedFolder => {
      if (!currentFolders.find(f => f.name === storedFolder.name)) {
        hasChanges = true;
        changeDetails.push(`Folder deleted: ${storedFolder.name}`);
      }
    });

    await supabase
      .from('projects')
      .update({ has_changes: hasChanges, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    res.json({ hasChanges, changeDetails });
  } catch (error) {
    console.error('detectFileChanges error:', error);
    res.status(500).json({ error: 'Failed to detect changes', message: error.message });
  }
};
exports.pushProjectChanges = async (req, res) => {
  return res.status(410).json({
    error: 'Deprecated endpoint',
    message: 'Use the git-based push flow: POST /:projectId/record-push after client git push.'
  });
};

exports.deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

  
    const { data: ownerRows } = await supabase
      .from('projects').select('*').eq('id', projectId).eq('user_id', userId);
    const { data: collabRows } = await supabase
      .from('project_collaborators').select('*').eq('project_id', projectId).eq('user_id', userId);

    const isOwner = ownerRows && ownerRows.length > 0;
    const isCollab = collabRows && collabRows.length > 0;

    if (!isOwner && !isCollab) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (isOwner) {
      const project = ownerRows[0];

      try {
        await prodOctokit.repos.delete({
          owner: GITHUB_OWNER,
          repo: project.repo_name
        });
        console.log(`GitHub repository deleted: ${project.repo_name}`);
      } catch (githubError) {
        console.error('Error deleting GitHub repo:', githubError.message);
      }

      const { error: delError } = await supabase
        .from('projects').delete().eq('id', projectId);
      if (delError) throw delError;

      res.json({ message: 'Project deleted successfully', deletedBy: 'owner' });
    } else {
      
      const { error: leaveError } = await supabase
        .from('project_collaborators').delete()
        .eq('project_id', projectId).eq('user_id', userId);
      if (leaveError) throw leaveError;

      res.json({ message: 'Successfully left project', deletedBy: 'collaborator' });
    }
  } catch (error) {
    console.error('deleteProject error:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      message: error.message
    });
  }
};

exports.generateShareLink = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, repo_name, share_token')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    let shareToken = project.share_token;
    if (!shareToken) {
      shareToken = crypto.randomBytes(32).toString('hex');
      const { error: updateError } = await supabase
        .from('projects')
        .update({ share_token: shareToken })
        .eq('id', projectId);
      if (updateError) throw updateError;
    }

    const shareLink = `${process.env.ORIGIN || 'http://localhost:3000'}/join/${shareToken}`;

    res.json({
      shareLink,
      shareToken,
      projectName: project.repo_name
    });
  } catch (error) {
    console.error('generateShareLink error:', error);
    res.status(500).json({
      error: 'Failed to generate share link',
      message: error.message
    });
  }

};

exports.getProjectByToken = async (req, res) => {
  try {
    const { shareToken } = req.params;

    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('share_token', shareToken)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({ error: 'Invalid share link' });
    }

    const { data: owner } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', project.user_id)
      .single();

    const fileStructure = typeof project.file_paths === 'string'
      ? JSON.parse(project.file_paths)
      : (project.file_paths || { individualFiles: [], folders: [] });

    res.json({
      id: project.id,
      name: project.repo_name,
      description: project.description,
      visibility: project.visibility,
      repoUrl: project.repo_url,
      owner: {
        username: owner?.username,
        avatar: owner?.avatar_url
      },
      fileCount: (fileStructure.individualFiles?.length || 0) +
                 (fileStructure.folders?.reduce((sum, f) => sum + (f.files?.length || 0), 0) || 0)
    });
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

    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('share_token', shareToken)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({ error: 'Invalid share link' });
    }

    if (String(project.user_id) === String(userId)) {
      return res.status(409).json({
        error: 'You own this project already',
        code: 'PROJECT_OWNER_CANNOT_JOIN'
      });
    }

    const { data: existing } = await supabase
      .from('project_collaborators')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', userId);

    if (existing && existing.length > 0) {
      const { error: updateError } = await supabase
        .from('project_collaborators')
        .update({ local_path: localPath })
        .eq('project_id', project.id)
        .eq('user_id', userId);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: project.id,
          user_id: userId,
          role: 'collaborator',
          local_path: localPath
        });

      if (insertError) throw insertError;
    }

    res.json({
      message: 'Successfully joined project',
      project: {
        id: project.id,
        name: project.repo_name,
        repoUrl: project.repo_url,
        localPath: localPath
      }
    });
  } catch (error) {
    console.error('joinProject error:', error);
    res.status(500).json({
      error: 'Failed to join project',
      message: error.message
    });
  }
};

exports.getCollaboratedProjects = async (req, res) => {
  try {
    const userId = req.userId;

    const { data: collabs, error: collabError } = await supabase
      .from('project_collaborators')
      .select('project_id, role, local_path, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (collabError) throw collabError;

    if (!collabs || collabs.length === 0) {
      return res.json({ projects: [] });
    }

    const projectIds = collabs.map(c => c.project_id);
    const { data: projectRows, error: projError } = await supabase
      .from('projects')
      .select('id, repo_name, repo_url, description, visibility, file_paths, has_changes, updated_at, user_id')
      .in('id', projectIds);

    if (projError) throw projError;

    // Owners
    const ownerIds = [...new Set((projectRows || []).map(p => p.user_id))];
    const { data: owners } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', ownerIds.length ? ownerIds : ['00000000-0000-0000-0000-000000000000']);
    const ownerMap = {};
    (owners || []).forEach(o => { ownerMap[o.id] = o; });

    const projMap = {};
    (projectRows || []).forEach(p => { projMap[p.id] = p; });

    const formattedProjects = collabs
      .map(c => {
        const p = projMap[c.project_id];
        if (!p) return null;
        if (String(p.user_id) === String(userId)) return null;

        const fileStructure = typeof p.file_paths === 'string'
          ? JSON.parse(p.file_paths)
          : (p.file_paths || { individualFiles: [], folders: [] });
        const totalFileCount = (fileStructure.individualFiles?.length || 0) +
                               (fileStructure.folders?.reduce((sum, f) => sum + (f.files?.length || 0), 0) || 0);
        const owner = ownerMap[p.user_id] || {};

        return {
          id: p.id,
          name: p.repo_name,
          url: p.repo_url,
          description: p.description,
          visibility: p.visibility,
          fileCount: totalFileCount,
          updatedAt: p.updated_at,
          hasUnpushedChanges: p.has_changes === true || p.has_changes === 1,
          role: c.role,
          localPath: c.local_path,
          owner: { username: owner.username, avatar: owner.avatar_url },
          isCollaborator: true
        };
      })
      .filter(Boolean);

    res.json({ projects: formattedProjects });
  } catch (error) {
    console.error('getCollaboratedProjects error:', error);
    res.status(500).json({
      error: 'Failed to fetch collaborated projects',
      message: error.message
    });
  }

};

exports.cloneProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    
    const { data: ownerRows } = await supabase
      .from('projects').select('id').eq('id', projectId).eq('user_id', userId);
    const { data: collabRows } = await supabase
      .from('project_collaborators').select('id').eq('project_id', projectId).eq('user_id', userId);

    if ((!ownerRows || ownerRows.length === 0) && (!collabRows || collabRows.length === 0)) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const { data: project, error: fetchError } = await supabase
      .from('projects').select('*').eq('id', projectId).single();

    if (fetchError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    
    const octokit = prodOctokit;
    const repoOwner = GITHUB_OWNER;

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

    const items = Array.isArray(contents) ? contents : [contents];

    for (const item of items) {
      if (item.name.toLowerCase() === 'readme.md' && path === '') {
        console.log(` Skipping auto-generated README`);
        continue;
      }

      if (item.type === 'file') {
        try {
          let fileContent = null;
          
          
          if (item.size > 1048576) { 
            console.log(`Large file detected (${(item.size / 1024 / 1024).toFixed(2)}MB): ${item.path}`);
            console.log(`   SHA: ${item.sha}`);
            console.log(`   Using Git Blob API for: ${item.path}`);
            
            try {
            
              const blobResponse = await octokit.git.getBlob({
                owner,
                repo,
                file_sha: item.sha
              });
              
              console.log(`   Blob API full response:`, blobResponse);
              console.log(`   Response status:`, blobResponse.status);
              console.log(`   Blob data keys:`, Object.keys(blobResponse.data || {}));
              
              const blobData = blobResponse.data;
              
              
              if (!blobData || !blobData.content) {
                console.error(` Blob API returned no content for ${item.path}`);
                console.error('Full response:', blobResponse);
                
                
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
              
              fileContent = blobData.content.replace(/\n/g, ''); 
              console.log(`   Content length: ${fileContent.length} chars`);
              
            } catch (blobError) {
              console.error(` Blob API error for ${item.path}:`, blobError);
              console.error('Error details:', {
                message: blobError.message,
                status: blobError.status,
                response: blobError.response
              });
              
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
            const { data: fileData } = await octokit.repos.getContent({
              owner,
              repo,
              path: item.path,
              ref
            });

            if (!fileData.content) {
              console.warn(` No content for ${item.path}`);
              continue;
            }

            fileContent = fileData.content.replace(/\n/g, '');
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
          
          if (fileError.status === 403 || fileError.message.includes('too large')) {
            try {
              console.log(`   Retrying with Blob API: ${item.path}`);
              
              const { data: blobData } = await octokit.git.getBlob({
                owner,
                repo,
                file_sha: item.sha
              });
              
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

    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select('id, repo_name, repo_url, description, visibility, file_paths, has_changes, created_at, updated_at')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const fileStructure = typeof project.file_paths === 'string'
      ? JSON.parse(project.file_paths)
      : (project.file_paths || { individualFiles: [], folders: [] });

    res.json({
      id: project.id,
      name: project.repo_name,
      url: project.repo_url,
      description: project.description,
      visibility: project.visibility,
      file_paths: fileStructure,
      hasUnpushedChanges: project.has_changes === true || project.has_changes === 1,
      updatedAt: project.updated_at
    });
  } catch (error) {
    console.error('getProjectById error:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      message: error.message
    });
  }

};

exports.checkRemoteChanges = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { forceCheck } = req.query; 

    
    const { data: ownerRows } = await supabase
      .from('projects').select('id').eq('id', projectId).eq('user_id', userId);
    const { data: collabRows } = await supabase
      .from('project_collaborators').select('id').eq('project_id', projectId).eq('user_id', userId);

    if ((!ownerRows || ownerRows.length === 0) && (!collabRows || collabRows.length === 0)) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const { data: project, error: fetchError } = await supabase
      .from('projects').select('*').eq('id', projectId).single();

    if (fetchError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    
    const octokit = prodOctokit;
    const repoOwner = GITHUB_OWNER;

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

    if (forceCheck === 'true') {
      console.log('[CHECK] Force check enabled - treating as first pull');
      return res.json({
        hasChanges: true,
        message: 'Force pull enabled',
        latestCommit: commits[0].sha,
        latestCommitDate: latestCommitDate.toISOString()
      });
    }

    if (!lastPulledDate) {
      return res.json({
        hasChanges: true,
        message: 'First-time pull required',
        latestCommit: commits[0].sha,
        latestCommitDate: latestCommitDate.toISOString()
      });
    }

    const hasChanges = latestCommitDate > lastPulledDate;

    res.json({
      hasChanges,
      latestCommit: commits[0].sha,
      latestCommitDate: latestCommitDate.toISOString(),
      lastPulledDate: lastPulledDate.toISOString(),
      message: hasChanges ? 'New changes available' : 'Already up to date'
    });
  } catch (error) {
    console.error('checkRemoteChanges error:', error);
    res.status(500).json({
      error: 'Failed to check for changes',
      message: error.message
    });
  }
};

exports.pullChanges = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const { data: ownerRows } = await supabase
      .from('projects').select('id').eq('id', projectId).eq('user_id', userId);
    const { data: collabRows } = await supabase
      .from('project_collaborators').select('id').eq('project_id', projectId).eq('user_id', userId);

    if ((!ownerRows || ownerRows.length === 0) && (!collabRows || collabRows.length === 0)) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    const { data: project, error: fetchError } = await supabase
      .from('projects').select('*').eq('id', projectId).single();

    if (fetchError || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const octokit = prodOctokit;
    const repoOwner = GITHUB_OWNER;

    console.log(`[PULL] Fetching from ${repoOwner}/${project.repo_name}`);

    const { data: repoData } = await octokit.repos.get({
      owner: repoOwner,
      repo: project.repo_name
    });

    const defaultBranch = repoData.default_branch || 'main';

    const allFiles = await getAllRepoFiles(octokit, repoOwner, project.repo_name, '', defaultBranch);

    const filesWithCleanContent = allFiles
      .filter(file => {
        if (!file.content) return false;
        if (!file.path) return false;
        return true;
      })
      .map(file => ({
        path: file.path,
        name: file.name,
        size: file.size || 0,
        content: file.content.replace(/\n/g, ''),
        sha: file.sha,
        encoding: file.encoding || 'base64'
      }));

    if (filesWithCleanContent.length === 0) {
      return res.status(400).json({
        error: 'No valid files found',
        message: 'All files from GitHub are missing content'
      });
    }

    
    await supabase
      .from('projects')
      .update({ last_pulled_at: new Date().toISOString() })
      .eq('id', projectId);

    res.json({
      message: 'Files fetched successfully',
      changedFiles: filesWithCleanContent,
      totalFiles: allFiles.length,
      changedCount: filesWithCleanContent.length
    });
  } catch (error) {
    console.error('pullChanges error:', error);
    res.status(500).json({
      error: 'Failed to pull changes',
      message: error.message
    });
  }
};

const getProdCollabToken = async () => {
  const token = process.env.PRODCOLLAB_GITHUB_TOKEN;
  if (!token) {
    throw new Error('PRODCOLLAB_GITHUB_TOKEN not configured in environment');
  }
  return token;
};

exports.getGitCredentials = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, repo_name, repo_url')
      .eq('id', projectId)
      .single();
    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('username, email')
      .eq('id', req.userId)
      .single();
    if (profileError || !profile) {
      return res.status(401).json({ error: 'Could not resolve the signed-in user profile' });
    }
    const token = await getProdCollabToken();
    res.json({
      token,
      repoUrl: project.repo_url,
      repoName: project.repo_name,
      authorName: profile.username || profile.email,
      authorEmail: profile.email
    });
  } catch (error) {
    console.error('getGitCredentials error:', error);
    res.status(500).json({ error: 'Failed to get git credentials', message: error.message });
  }
};

exports.recordPush = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { fileCount, commitMessage } = req.body;
    const sourceClientId = req.get('x-prodcollab-client-id') || null;
    const { data: pusherProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('id', req.userId)
      .single();
    if (profileError || !pusherProfile) throw profileError || new Error('Pusher profile not found');
    console.log(`[PUSH] Recording project ${projectId} from user ${pusherProfile.id} (${pusherProfile.email}) client ${sourceClientId || '(unknown)'}`);
    // ── Phase 3.10: Supabase ──
    const pushedAt = new Date().toISOString();
    const lastPushedBy = pusherProfile.username || pusherProfile.email || 'A collaborator';
    const { data: updatedProject, error } = await supabase
      .from('projects')
      .update({
        has_changes: false,
        last_pushed_by: lastPushedBy,
        updated_at: pushedAt
      })
      .eq('id', projectId)
      .select('id, repo_name, last_pushed_by, updated_at')
      .single();
    if (error) throw error;
    broadcastProjectUpdate(updatedProject, sourceClientId);
    res.json({
      message: 'Push recorded',
      fileCount: fileCount || 0,
      commitMessage: commitMessage || null,
      project: updatedProject
    });
  } catch (error) {
    console.error('recordPush error:', error);
    res.status(500).json({ error: 'Failed to record push', message: error.message });
  }
};

exports.getPullInfo = async (req, res) => {
  try {
    const { projectId } = req.params;
 
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, repo_name, repo_url')
      .eq('id', projectId)
      .single();
    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const token = await getProdCollabToken();
    await supabase
      .from('projects')
      .update({ last_pulled_at: new Date().toISOString() })
      .eq('id', projectId);
    res.json({ token, repoUrl: project.repo_url, repoName: project.repo_name });
  } catch (error) {
    console.error('getPullInfo error:', error);
    res.status(500).json({ error: 'Failed to get pull info', message: error.message });
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
  getGitCredentials: exports.getGitCredentials,
  recordPush: exports.recordPush,
  getPullInfo: exports.getPullInfo,
};
