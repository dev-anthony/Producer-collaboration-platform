import React, { useEffect, useState } from 'react';
import { X, Upload, FolderOpen, Music, Film, FileAudio, Folder } from 'lucide-react';
import Toast from '../components/Toast';
import ProjectAccessToggle from './ProjectAccessToggle';

function Modal({ toggleModal }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') toggleModal(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [toggleModal]);
  const [formData, setFormData] = useState({
    projectName: '',
    bpm: '',
    musicalKey: '',
    timeSignature: '4/4',
    sampleRate: '48000',
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
    setToast({
      type: 'info',
      message: 'This folder looks empty. Use "Select folder to sync" to link an empty folder.'
    });
    return;
  }

  addFiles(selectedFiles, true);

  const firstFile = selectedFiles[0];
  try {
    const absoluteFilePath = window.electronAPI?.getPathForFile?.(firstFile);
    if (absoluteFilePath) {
      const relParts = firstFile.webkitRelativePath.split('/');
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

const handleNativeFolderSelect = async () => {
  try {
    const folderPath = await window.electronAPI.selectFolder();
    if (!folderPath) return; // cancelled

    setLocalFolderPath(folderPath);

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
          
          file: null
        }));
        setFolders([{ name: folderName, files: rebuilt }]);
      } else {
        
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
                    if (type.startsWith('video/')) return <Film className="w-5 h-5 text-primary" />;
    return <FileAudio className="w-5 h-5 text-muted-foreground" />;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.projectName.trim()) {
      setToast({ type: 'info', message: 'Input project name please.' });
      return;
    }

    if (!formData.bpm || Number(formData.bpm) < 1 || Number(formData.bpm) > 400) {
      setToast({ type: 'info', message: 'Add the session BPM so collaborators can line up the audio.' });
      return;
    }

    const totalFiles = files.length + folders.reduce((acc, folder) => acc + folder.files.length, 0);
   
    if (totalFiles === 0 && !localFolderPath) {
      setToast({
        type: 'info',
        message: 'Please add files or select a folder to sync before creating the project.'
      });
      return;
    }

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
      apiFormData.append('description', JSON.stringify({
        bpm: Number(formData.bpm),
        key: formData.musicalKey || null,
        timeSignature: formData.timeSignature,
        sampleRate: Number(formData.sampleRate) || null
      }));
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

      setProgress(prev => [...prev, { step: 'Creating your shared project...', status: 'loading' }]);

      const response = await fetch('http://localhost:5000/api/projects/create', {
        method: 'POST',
        credentials: 'include', 
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

           
            try {
              setProgress(prev => [...prev, { step: 'Protecting the first project files...', status: 'loading' }]);
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
                if (!pushRes.success) throw new Error(pushRes.error || 'Initial backup failed');

                
                await fetch(`http://localhost:5000/api/projects/${projectId}/record-push`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ commitMessage: 'Initial project files' })
                });
              }
            } catch (pushErr) {
              console.error('[CREATE] Initial backup failed:', pushErr);
              setToast({ type: 'warning', message: 'Your project was created, but the first backup could not finish. Your local files are safe.' });
            }

            await window.electronAPI.startWatching(projectId, localFolderPath);
          } catch (err) {
            console.warn('Could not save folder path after create:', err);
           
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
          { step: 'Shared project created', status: 'success' },
          { step: 'First backup complete', status: 'success' },
          ...(localFolderPath
            ? [{ step: 'Local folder linked & watching started', status: 'success' }]
            : [])
        ]);

        setTimeout(() => {
          setToast({
            type: 'success',
            message: `Project "${formData.projectName}" is ready.`
          });
          toggleModal();
          window.dispatchEvent(new CustomEvent('prodcollab:projects-refresh'));
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
      <div className="absolute inset-0 bg-black/80" onClick={toggleModal} />

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden border border-border bg-card animate-scale-in shadow-[0_24px_80px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center gap-3">
             <div className="flex h-9 w-9 items-center justify-center bg-primary/10 text-primary"><Music className="h-5 w-5" /></div>
            <div>
               <h2 className="text-lg font-semibold text-foreground">Create a project</h2>
               <p className="text-xs text-muted-foreground">Connect a studio folder and start protecting your work.</p>
            </div>
          </div>
          <button onClick={toggleModal} className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-scrollbar overflow-y-auto p-5">
          <div className="grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
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
              className="w-full border border-border bg-input px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">Use the name you recognize in your studio.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Session details</label>
            <div className="grid grid-cols-2 gap-2 border border-border bg-background p-3">
              <label className="text-xs text-muted-foreground">BPM *<input required type="number" min="1" max="400" name="bpm" value={formData.bpm} onChange={handleInputChange} placeholder="140" className="mt-1 w-full border border-border bg-input px-2 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></label>
              <label className="text-xs text-muted-foreground">Key<input type="text" name="musicalKey" value={formData.musicalKey} onChange={handleInputChange} placeholder="G minor" className="mt-1 w-full border border-border bg-input px-2 py-2 text-sm text-foreground focus:border-primary focus:outline-none" /></label>
              <label className="text-xs text-muted-foreground">Time signature<select name="timeSignature" value={formData.timeSignature} onChange={handleInputChange} className="mt-1 w-full border border-border bg-input px-2 py-2 text-sm text-foreground focus:border-primary focus:outline-none"><option>4/4</option><option>3/4</option><option>6/8</option><option>2/4</option></select></label>
              <label className="text-xs text-muted-foreground">Sample rate<select name="sampleRate" value={formData.sampleRate} onChange={handleInputChange} className="mt-1 w-full border border-border bg-input px-2 py-2 text-sm text-foreground focus:border-primary focus:outline-none"><option value="44100">44.1 kHz</option><option value="48000">48 kHz</option><option value="88200">88.2 kHz</option><option value="96000">96 kHz</option></select></label>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">These details help collaborators line up audio in their DAW.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Who can access this project?</label>
            <ProjectAccessToggle value={formData.visibility} onChange={(visibility) => setFormData((current) => ({ ...current, visibility }))} />
          </div>
          </div>

          <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Project folder and files <span className="text-destructive">*</span>
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed p-5 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-border glass'
              }`}
            >
              <Upload className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
              <p className="mb-3 text-sm text-foreground">Drop files here or connect the full project folder.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <label className="inline-flex cursor-pointer items-center gap-2 bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/85">
                  <FileAudio className="w-4 h-4" />
                  Add files
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
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <FolderOpen className="w-4 h-4" />
                  Connect folder
                </button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">Audio, MIDI, DAW projects, stems, and exports.</p>
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
              <div className="history-scrollbar space-y-1.5 max-h-28 overflow-y-auto">
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center justify-between border border-border bg-background/50 p-2 transition-colors hover:border-primary/30">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Folder className="w-5 h-5 text-primary flex-shrink-0" />
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
              <div className="history-scrollbar space-y-1.5 max-h-28 overflow-y-auto">
                {files.map((fileData) => (
                  <div key={fileData.id} className="flex items-center justify-between border border-border bg-background/50 p-2 transition-colors hover:border-primary/30">
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
            <div className="border border-primary/30 bg-primary/5 p-3">
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
            <div className="border border-primary/30 bg-primary/5 p-2.5">
              <p className="text-primary text-sm">
                Total: {totalFiles} file{totalFiles !== 1 ? 's' : ''} ready to protect
              </p>
            </div>
          )}

          </div>
          </div>
          <div className="flex gap-3 border-t border-border px-5 py-3.5">
            <button type="button" onClick={toggleModal} className="flex-1 border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary/85 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  <Music className="w-5 h-5" />
                   Create project ({totalFiles} files)
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
