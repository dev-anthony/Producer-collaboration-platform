import React, { useState } from 'react';
import { X, Upload, FolderOpen, Github, Music, Film, FileAudio, Folder } from 'lucide-react';
import Toast from '../components/Toast';

function Modal({ toggleModal }) {
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    visibility: 'private'
  });

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState([]);
  const [showProgress, setShowProgress] = useState(false);
  const [toast, setToast] = useState(null);
  const [localFolderPath, setLocalFolderPath] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles, false);
  };

const handleFolderSelect = (e) => {
  const selectedFiles = Array.from(e.target.files);

  if (selectedFiles.length === 0) {
    // Empty folder via the browser input can't yield a path — guide the user to
    // the native "Select folder" button instead of blocking them.
    setToast({
      type: 'info',
      message: 'This folder looks empty. Use "Select folder to sync" to link an empty folder.'
    });
    return;
  }

  addFiles(selectedFiles, true);

  // Resolve the real absolute root folder path via webUtils (file.path removed in Electron 32+)
  const firstFile = selectedFiles[0];
  try {
    const absoluteFilePath = window.electronAPI?.getPathForFile?.(firstFile);
    if (absoluteFilePath) {
      const relParts = firstFile.webkitRelativePath.split('/'); // e.g. ["MyFolder","sub","song.wav"]
      const sep = absoluteFilePath.includes('\\') ? '\\' : '/';
      const absParts = absoluteFilePath.split(/[\\/]/);
      const rootParts = absParts.slice(0, absParts.length - relParts.length + 1);
      const rootPath = rootParts.join(sep);
      setLocalFolderPath(rootPath);
    } else {
      console.warn('Could not resolve absolute path for selected folder');
    }
  } catch (err) {
    console.warn('getPathForFile failed:', err);
  }
};

// Native Electron folder picker — works for ANY folder, empty or not.
// Captures the absolute path and (if present) loads existing files into the
// upload/metadata list.
const handleNativeFolderSelect = async () => {
  try {
    const folderPath = await window.electronAPI.selectFolder();
    if (!folderPath) return; // cancelled

    setLocalFolderPath(folderPath);

    // Load any existing files so they're part of the initial project (optional).
    try {
      const scan = await window.electronAPI.readFolderFiles(folderPath);
      const scanned = Array.isArray(scan) ? scan : (scan?.files || []);
      const folderName = folderPath.split(/[\\/]/).filter(Boolean).pop() || 'folder';

      if (scanned.length > 0) {
        const rebuilt = scanned.map(f => ({
          name: f.name,
          size: f.size,
          lastModified: f.lastModified,
          relativePath: `${folderName}/${f.relativePath || f.name}`,
          // File bytes are pushed by the client via git; server upload no longer needed.
          file: null
        }));
        setFolders([{ name: folderName, files: rebuilt }]);
      } else {
        // Empty folder is fine — repo starts empty, files sync when added later.
        setFolders([]);
        setToast({ type: 'info', message: `Empty folder linked. Files will sync once you add them to "${folderName}".` });
      }
    } catch (err) {
      console.warn('[CREATE] Could not read folder contents:', err);
    }
  } catch (err) {
    console.error('[CREATE] Native folder selection failed:', err);
  }
};

  const addFiles = (newFiles, isFolder) => {
    const filteredFiles = newFiles.filter(file => {
      const name = file.name.toLowerCase();
      const path = file.webkitRelativePath || file.name;

      if (name.startsWith('.')) return false;
      if (path.includes('/.git/') || path.includes('\\.git\\')) return false;

      const systemFiles = ['thumbs.db', 'desktop.ini', '.ds_store'];
      if (systemFiles.includes(name)) return false;

      const allowedExtensions = [
        '.wav', '.mp3', '.mp4', '.flac', '.aiff', '.ogg', '.txt',
        '.m4a', '.mpeg', '.avi', '.mov', '.flv', '.midi', '.mid'
      ];
      const ext = name.substring(name.lastIndexOf('.')).toLowerCase();

      if (!allowedExtensions.includes(ext)) return false;
      return true;
    });

    if (filteredFiles.length === 0) {
      setToast({
        type: 'info',
        message: 'No valid media files found. Please select audio/video files.'
      });
      return;
    }

    const filesWithMetadata = filteredFiles.map(file => {
      const relativePath = file.webkitRelativePath || file.name;
      const folderPath = isFolder ? relativePath.split('/').slice(0, -1).join('/') : '';

      return {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        relativePath: relativePath,
        folderPath: folderPath,
        isFromFolder: isFolder,
        lastModified: new Date(file.lastModified).toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      };
    });

    if (isFolder) {
      const folderGroups = {};
      filesWithMetadata.forEach(file => {
        if (!folderGroups[file.folderPath]) folderGroups[file.folderPath] = [];
        folderGroups[file.folderPath].push(file);
      });

      const newFolders = Object.keys(folderGroups).map(folderPath => ({
        name: folderPath,
        files: folderGroups[folderPath],
        fileCount: folderGroups[folderPath].length,
        id: Math.random().toString(36).substr(2, 9)
      }));

      setFolders(prev => [...prev, ...newFolders]);
    } else {
      setFiles(prev => [...prev, ...filesWithMetadata]);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedItems = Array.from(e.dataTransfer.items);

    droppedItems.forEach(item => {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        if (entry.isDirectory) {
          readDirectory(entry);
        } else {
          item.getAsFile() && addFiles([item.getAsFile()], false);
        }
      }
    });
  };

  const readDirectory = (directoryEntry) => {
    const reader = directoryEntry.createReader();
    reader.readEntries((entries) => {
      const files = [];
      entries.forEach(entry => {
        if (entry.isFile) {
          entry.file(file => {
            files.push(file);
            if (files.length === entries.length) addFiles(files, true);
          });
        }
      });
    });
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));
  const removeFolder = (id) => setFolders(prev => prev.filter(f => f.id !== id));

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-primary" />;
    if (type.startsWith('video/')) return <Film className="w-5 h-5 text-secondary" />;
    return <FileAudio className="w-5 h-5 text-muted-foreground" />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.projectName.trim()) {
      setToast({ type: 'info', message: 'Input project name please.' });
      return;
    }

    const totalFiles = files.length + folders.reduce((acc, folder) => acc + folder.files.length, 0);
    // Allow empty folders: a project can be created with no files as long as a
    // sync folder is chosen (repo starts empty, files sync when added later).
    if (totalFiles === 0 && !localFolderPath) {
      setToast({
        type: 'info',
        message: 'Please add files or select a folder to sync before creating the project.'
      });
      return;
    }

    // Validate before creating the GitHub repo / Supabase project row. This
    // prevents an orphaned project when the chosen folder is already linked.
    if (localFolderPath && window.electronAPI?.validateFolderLink) {
      const validation = await window.electronAPI.validateFolderLink(localFolderPath, null);
      if (!validation.valid) {
        setToast({
          type: 'error',
          message: validation.error === 'FOLDER_ALREADY_LINKED'
            ? 'That folder is already linked to another project. Each project needs its own folder.'
            : 'The selected folder cannot be linked.'
        });
        return;
      }
    }

    setIsSubmitting(true);
    setShowProgress(true);
    setProgress([{ step: 'Preparing files...', status: 'loading' }]);

    try {
      const apiFormData = new FormData();
      apiFormData.append('projectName', formData.projectName);
      apiFormData.append('description', formData.description);
      apiFormData.append('visibility', formData.visibility);

      const fileStructure = {
        individualFiles: files.map(f => ({
          name: f.name, size: f.size, lastModified: f.lastModified, relativePath: f.relativePath
        })),
        folders: folders.map(folder => ({
          name: folder.name,
          files: folder.files.map(f => ({
            name: f.name, size: f.size, lastModified: f.lastModified, relativePath: f.relativePath
          }))
        }))
      };

      apiFormData.append('fileStructure', JSON.stringify(fileStructure));

      files.forEach((fileData) => {
        if (fileData.file) apiFormData.append('files', fileData.file);
      });
      folders.forEach(folder => {
        folder.files.forEach(fileData => {
          if (fileData.file) apiFormData.append('files', fileData.file);
        });
      });

      setProgress(prev => [...prev, { step: 'Creating GitHub repository...', status: 'loading' }]);

      const response = await fetch('http://localhost:5000/api/projects/create', {
        method: 'POST',
        credentials: 'include', // ── Phase 4.15: cookie-based session ──
        body: apiFormData
      });

      const data = await response.json();

      if (response.ok) {
        const projectId = data.project?.id ?? data.id ?? data.projectId;

        if (projectId && localFolderPath) {
          try {
            await window.electronAPI.saveFolderPath(projectId, localFolderPath);
            // Phase 6.6: create standard stems/ and exports/ subfolders
            if (window.electronAPI?.setupProjectFolder) {
              await window.electronAPI.setupProjectFolder(localFolderPath);
            }

            // ── Fix (repo divergence): the server now creates an EMPTY repo.
            // Do the very first commit + push from the client so local and remote
            // share one history (no README divergence on later pushes).
            try {
              setProgress(prev => [...prev, { step: 'Pushing initial files to GitHub...', status: 'loading' }]);
              const credRes = await fetch(`http://localhost:5000/api/projects/${projectId}/git-credentials`, {
                credentials: 'include'
              });
              const creds = await credRes.json();
              if (credRes.ok) {
                const initRes = await window.electronAPI.initGit({
                  folderPath: localFolderPath,
                  repoUrl: creds.repoUrl,
                  token: creds.token
                });
                if (!initRes.success) throw new Error(initRes.error || 'Git init failed');

                const pushRes = await window.electronAPI.gitPush({
                  folderPath: localFolderPath,
                   message: 'Initial project files',
                   username: creds.authorName || 'ProdCollab',
                   email: creds.authorEmail,
                  repoUrl: creds.repoUrl,
                  token: creds.token
                });
                if (!pushRes.success) throw new Error(pushRes.error || 'Initial push failed');

                // Tell the server the push happened (clears has_changes)
                await fetch(`http://localhost:5000/api/projects/${projectId}/record-push`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ commitMessage: 'Initial project files' })
                });
              }
            } catch (pushErr) {
              console.error('[CREATE] Initial push failed:', pushErr);
              setToast({ type: 'warning', message: `Project created, but initial push failed: ${pushErr.message}` });
            }

            await window.electronAPI.startWatching(projectId, localFolderPath);
          } catch (err) {
            console.warn('Could not save folder path after create:', err);
            // Surface the "folder already linked to another project" guard to the user
            if (String(err.message).includes('FOLDER_ALREADY_LINKED')) {
              setToast({
                type: 'error',
                message: 'That folder is already linked to another project. Each project needs its own folder.'
              });
            }
          }
        }

        setProgress(prev => [
          ...prev,
          { step: 'Repository created successfully!', status: 'success' },
          { step: 'Files uploaded to GitHub!', status: 'success' },
          ...(localFolderPath
            ? [{ step: 'Local folder linked & watching started', status: 'success' }]
            : [])
        ]);

        setTimeout(() => {
          setToast({
            type: 'success',
            message: `Project "${formData.projectName}" created successfully on GitHub!`
          });
          toggleModal();
          window.location.reload();
        }, 1500);
      } else {
        setProgress(prev => [...prev, { step: ` Error: ${data.message || data.error}`, status: 'error' }]);
        setTimeout(() => {
          setToast({ type: 'error', message: `Error: ${data.error || 'Failed to create project'}` });
          setIsSubmitting(false);
          setShowProgress(false);
          setProgress([]);
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setProgress(prev => [...prev, { step: ' Failed to create project', status: 'error' }]);
      setTimeout(() => {
        setToast({ type: 'error', message: 'Failed to create project. Please try again.' });
        setIsSubmitting(false);
        setShowProgress(false);
        setProgress([]);
      }, 2000);
    }
  };

  const totalFiles = files.length + folders.reduce((acc, folder) => acc + folder.files.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {toast && (
        <Toast message={toast.message} type={toast.type} duration={5000} onClose={() => setToast(null)} />
      )}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={toggleModal} />

      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-strong rounded-2xl animate-scale-in border border-border">
        <div className="sticky top-0 glass-strong border-b border-border px-6 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg glow-primary">
              <Github className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Create New Project</h2>
              <p className="text-sm text-muted-foreground">Create a GitHub repository for your project</p>
            </div>
          </div>
          <button onClick={toggleModal} className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Project Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleInputChange}
              placeholder="my-awesome-beat"
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
            <p className="text-xs text-muted-foreground mt-1">This will be your GitHub repository name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your project..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-input border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Repository Visibility</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="visibility" value="private" checked={formData.visibility === 'private'} onChange={handleInputChange} className="w-4 h-4 text-primary focus:ring-primary" />
                <span className="text-foreground">Private</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="visibility" value="public" checked={formData.visibility === 'public'} onChange={handleInputChange} className="w-4 h-4 text-primary focus:ring-primary" />
                <span className="text-foreground">Public</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Upload Files & Folders <span className="text-destructive">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging ? 'border-primary bg-primary/10' : 'border-border glass'
              }`}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground mb-4">Drag and drop files or folders here, or</p>
              <div className="flex gap-3 justify-center">
                <label className="inline-flex items-center gap-2 bg-primary hover:bg-primary/80 text-primary-foreground px-4 py-2 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95">
                  <FileAudio className="w-5 h-5" />
                  Browse Files
                  <input
                    type="file"
                    multiple
                    accept=".wav,.mp3,.mp4,.flac,.aiff,.ogg,.m4a,.mpeg,.avi,.mov,.flv,.midi,.mid"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleNativeFolderSelect}
                  className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <FolderOpen className="w-5 h-5" />
                  Select Folder to Sync
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Supported: WAV, MP3, MP4, FLAC, AIFF, OGG, M4A, MPEG, AVI, MOV, FLV, MIDI
              </p>
              {localFolderPath && (
                <p className="text-xs text-primary mt-2 flex items-center justify-center gap-1">
                  <Folder className="w-3.5 h-3.5" /> Syncing with: {localFolderPath}
                </p>
              )}
            </div>
          </div>

          {folders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Selected Folders ({folders.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {folders.map((folder) => (
                  <div key={folder.id} className="glass rounded-lg p-3 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Folder className="w-5 h-5 text-secondary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{folder.name}</p>
                        <p className="text-muted-foreground text-xs">{folder.fileCount} files</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeFolder(folder.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-2 flex-shrink-0">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Individual Files ({files.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((fileData) => (
                  <div key={fileData.id} className="glass rounded-lg p-3 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getFileIcon(fileData.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">{fileData.name}</p>
                        <p className="text-muted-foreground text-xs">{formatFileSize(fileData.size)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeFile(fileData.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-2 flex-shrink-0">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showProgress && (
            <div className="glass rounded-lg p-4 border border-primary/30">
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Project...
              </h3>
              <div className="space-y-2">
                {progress.map((item, index) => (
                  <div key={index} className={`text-sm flex items-center gap-2 ${
                    item.status === 'success' ? 'text-green-400' :
                    item.status === 'error' ? 'text-destructive' : 'text-foreground'
                  }`}>
                    {item.status === 'loading' && <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>}
                    {item.step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalFiles > 0 && (
            <div className="glass border border-primary/30 rounded-lg p-3">
              <p className="text-primary text-sm">
                Total: {totalFiles} file{totalFiles !== 1 ? 's' : ''} ready to upload
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={toggleModal} className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent/80 text-accent-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-border">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <Github className="w-5 h-5" />
                  Create Project ({totalFiles} files)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
