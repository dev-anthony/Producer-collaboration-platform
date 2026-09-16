// Pushing a take reuses the exact sequence the rest of ProdCollab already
// uses to back a project up: get the project's Git credentials, make sure
// the linked folder is wired to its repo, commit, push, then tell the
// server the push happened. This is not a parallel pipeline — it is the
// same one the project card's own Push button runs, called from here after
// the take has already been moved into the project's takes/ folder, so a
// take gets backed up exactly the way every other file in the project does.
// It backs up to the project's own repository regardless of whether anyone
// else has been added as a collaborator — a solo producer's takes are
// backed up the same as anyone else's.

const API_BASE = 'http://localhost:5000';

// Mirrors ensureFolderPath in Projects.jsx: reuse the linked folder, or ask
// the producer to choose one if this project has never been opened locally.
export async function ensureProjectFolder(projectId) {
  if (!window.electronAPI?.getFolderPath) throw new Error('FOLDER_SELECTION_NOT_AVAILABLE');
  const existing = await window.electronAPI.getFolderPath(projectId);
  if (existing) return existing;
  if (!window.electronAPI?.selectFolder) throw new Error('FOLDER_SELECTION_NOT_AVAILABLE');
  const selected = await window.electronAPI.selectFolder();
  if (!selected) throw new Error('FOLDER_SELECTION_CANCELLED');
  await window.electronAPI.saveFolderPath(projectId, selected);
  await window.electronAPI.startWatching(projectId, selected);
  return selected;
}

export async function pushTakeToProject({ projectId, folderPath }) {
  const credRes = await fetch(`${API_BASE}/api/projects/${projectId}/git-credentials`, { credentials: 'include' });
  const creds = await credRes.json();
  if (!credRes.ok) throw new Error(creds.error || creds.message || 'Could not verify access to this project.');

  const initRes = await window.electronAPI.initGit({ folderPath, repoUrl: creds.repoUrl, token: creds.token });
  if (!initRes.success) throw new Error(initRes.error || 'Could not prepare the project folder for backup.');

  const message = `Take backed up by ${creds.authorName || 'ProdCollab'}`;
  const pushRes = await window.electronAPI.gitPush({
    folderPath,
    message,
    username: creds.authorName,
    email: creds.authorEmail,
    repoUrl: creds.repoUrl,
    token: creds.token,
  });
  if (!pushRes.success) throw new Error(pushRes.code || 'PUSH_FAILED');

  if (pushRes.pushed && !pushRes.nothingToCommit) {
    const recordRes = await fetch(`${API_BASE}/api/projects/${projectId}/record-push`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-prodcollab-client-id': window.localStorage.getItem('prodcollab_realtime_client_id') || '',
      },
      body: JSON.stringify({
        commitMessage: message,
        pushed: true,
        commitSha: pushRes.commitSha,
        fileCount: pushRes.filesStaged || 0,
      }),
    });
    if (!recordRes.ok) {
      console.error('[RR-PUSH] Take was pushed, but collaborator notification failed:', await recordRes.text());
    }
  }

  // Every other project view (the card, the dashboard) learns about a fresh
  // push through this same event — a take pushed from the studio should
  // show up there exactly the same way a normal push does.
  window.dispatchEvent(new CustomEvent('prodcollab:remote-project-refresh', { detail: { id: projectId } }));
  window.dispatchEvent(new CustomEvent('prodcollab:local-synced', { detail: { id: projectId } }));

  return pushRes;
}
