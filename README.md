# ProdCollab

ProdCollab is a desktop collaboration app for music producers.

It lets producers work on DAW sessions, stems, samples, MIDI, presets, exports, and other project files together without manually copying folders back and forth or learning Git.

The simple idea is:

> Each producer works in their own local project folder. ProdCollab safely sends local work to the shared project and brings other producers' work back down.

---

## What Producers Can Do

- Create a shared music project.
- Choose a folder on the computer for that project.
- Share the project with another producer.
- Join someone else's project with a share link.
- See when a collaborator pushes new work.
- Receive an in-app notification.
- Receive a Windows desktop notification, even when the app is minimized.
- See an `Update available` badge on the project card.
- Pull the latest remote work into the already-linked local folder.
- Push new and edited local files without re-uploading unchanged files.
- Keep local deletions from being pushed accidentally.
- Detect duplicate audio or project files by their actual contents, not just their names.
- Review version history.
- Restore an older version safely.
- Review local files that conflict with incoming remote files.

ProdCollab is designed for producers who want collaboration to feel like working in a studio, not managing a software repository.

---

## The Basic Idea

There are three places involved:

1. **Your local folder**

   This is the folder you open in FL Studio, Ableton, Logic, Pro Tools, or another program.

2. **The shared online project**

   This is the shared project stored in GitHub behind the scenes. Producers do not need to use GitHub directly.

3. **ProdCollab's project record**

   This stores account information, project membership, share links, project status, and who last pushed.

Your audio files are transferred through the project's Git repository. Account, project, and collaboration information is stored through Supabase.

---

## Creating A Project

When you create a project:

1. Sign in with your email, password, and username.
2. Select `Create Project`.
3. Enter the project name and details.
4. Choose a local folder.
5. ProdCollab creates the project online.
6. ProdCollab links the selected folder to that project.
7. The `stems` and `exports` folders are created when needed.
8. The first project files are placed into the shared project.
9. ProdCollab starts watching the folder for local changes.

The selected folder is remembered. You should not need to select it again after restarting the app.

---

## Joining A Project

The owner generates a share link and sends it to you.

When you join:

1. Paste the share link.
2. Choose your own local folder.
3. ProdCollab checks the link.
4. Your account is added as a collaborator.
5. The shared project is brought into your chosen folder.
6. Your folder is linked to your account and project.
7. The folder watcher starts.

Each producer should use a different local folder. The owner and collaborator should never point the same project at the same physical folder on one computer.

---

## Local Changes

ProdCollab watches the linked folder in the background.

When you add a file or edit a file:

- The project card shows that local changes are waiting.
- The change belongs only to the account that owns that folder.
- Other accounts do not see a local-change badge from your computer.
- ProdCollab waits for a quiet period before automatic push.
- You can also push immediately.

When you delete a file locally:

- ProdCollab tells you that the file was deleted locally.
- It does not automatically push the deletion.
- It does not mark the shared project as waiting to push.
- It does not remove the file from the other producer's project.

This is intentional. A local deletion may be an accidental cleanup or a file that another producer still needs.

---

## Pushing Changes

When you push, ProdCollab:

1. Checks the linked folder.
2. Finds local additions and edited files.
3. Leaves local deletions out of the push.
4. Protects unresolved conflict files.
5. Checks for duplicate file contents.
6. Stages only the files that need to be sent.
7. Creates a version record with your username and email.
8. Sends only new Git data that the online project does not already have.
9. Records the push for realtime notifications.
10. Notifies other connected collaborators.

Unchanged files are not uploaded again.

If several local files changed before you push, those local changes may be included in the same push. That is expected because they are all still unsynced local work.

### Push Progress

The app shows a small activity strip instead of refreshing the page.

Typical stages are:

- Checking local changes
- Staging changed files
- Creating commit
- Uploading changes
- Push complete

---

## Duplicate Files

ProdCollab compares file contents, not only filenames.

For example, these two files may have different names but contain exactly the same audio:

```text
vibration.mp3
vibration copy.mp3
```

ProdCollab blocks the second copy from being pushed and explains that the content already exists.

A renamed file is also checked against the current project history so a rename does not silently create a second copy online.

---

## Realtime Updates

Realtime updates use an authenticated WebSocket connection.

There is no application polling for project notifications.

When a producer pushes:

1. Git sends the file changes to the shared project.
2. ProdCollab records the push and the actual pushing username.
3. The server sends a WebSocket update to connected project members.
4. The other producer sees an in-app notification.
5. Windows can show a desktop notification beside the screen.
6. The project card shows `Update available`.

The pushing window ignores its own update. Other connected windows receive it.

The app reconnects automatically if the WebSocket connection is interrupted.

Realtime requires the app process to still be running. A fully quit application cannot receive a live notification.

---

## Pulling Changes

When another producer pushes, you can select the pull button on the project card.

ProdCollab:

1. Finds your already-linked local folder.
2. Uses that folder instead of opening a new folder picker.
3. Downloads only remote data your folder does not already have.
4. Applies only the latest remote changes.
5. Pauses the watcher while files are being updated.
6. Restarts the watcher after the update is complete.
7. Does not mark pulled files as your local changes.
8. Does not ask you to push the files that were just pulled.
9. Clears the `Update available` badge.

Pull progress appears in the activity strip:

- Checking remote changes
- Downloading latest changes
- Applying latest changes
- Pull complete

---

## Conflicting Local Files

A conflict can happen when you have a local file that was never pushed, while another producer adds a file with the same path online.

ProdCollab will not silently overwrite your local work.

If the local and remote files are identical:

- The remote copy is used.
- The duplicate local copy is removed.

If they are different:

- The remote version keeps the original filename.
- Your local version is preserved with a name such as:

```text
EMOTIONAL BREEZE (local conflict 2026-08-18...).wav
```

The preserved copy is protected from pushes until you choose what to do.

### Conflict Choices

**Use remote**

Keep the shared online version and remove the local conflict copy.

**Keep both**

Keep the online file and approve your local conflict copy as a new separate file for a future push.

**Use local**

Use your local version as the version at the original shared filename. It becomes an intentional local edit that can be pushed.

Until you choose an action, the conflict copy cannot be pushed accidentally.

---

## Version History

Every successful Git commit creates a version entry.

Open `View version history` on a project card to see:

- Who made the change
- When it happened
- The commit message
- Which files changed
- A restore button

The displayed author comes from the Git commit itself.

New commits use the authenticated account profile returned by the server. The current user is shown as `You` when the commit email matches the signed-in account.

### Restoring A Version

Restoring an old version is deliberately safe:

1. ProdCollab checks that you have no uncommitted local changes.
2. It places the selected old version into the working folder.
3. It creates a new restore commit on the main branch.
4. It does not leave the project in a detached or confusing state.
5. You can review the restored files.
6. You can push the restore if you want collaborators to receive it.

Older commits created before the correct identity flow was added keep the author that was stored at the time. They are not rewritten silently.

---

## Notifications And Automatic Pull

Settings includes an automatic pull option.

When enabled, a realtime push notification can trigger a pull into the already-linked local folder.

When automatic pull is disabled:

- You still receive the notification.
- You still see `Update available`.
- You choose when to pull.

When automatic pull is enabled:

- The notification appears.
- The latest remote changes are pulled automatically when the folder is available.
- The watcher ignores those remote-applied files.
- The update badge is cleared after a successful pull.

---

## Development Two-Account Mode

When running the Electron app in development mode, ProdCollab opens:

- `DEV ACCOUNT A`
- `DEV ACCOUNT B`

Each development window has its own:

- Login session
- Cookies
- Local storage
- Realtime client identity
- Folder mappings
- File watchers
- Automatic push timers

This exists only to test collaboration on one computer. It is not the production user experience.

For a realistic test:

- Log Account A into one account.
- Log Account B into another account.
- Use separate local folders.
- Push from one window.
- Watch the other window receive the notification.
- Pull from the other window.
- Confirm the pulled files do not become local pending changes.

---

## Supported Project Files

ProdCollab is intended for common producer files, including:

- DAW sessions such as FL Studio, Ableton, Logic, Pro Tools, Cubase, Bitwig, Studio One, Reaper, and Reason files.
- WAV, FLAC, AIFF, MP3, AAC, OGG, OPUS, and other audio formats.
- MIDI and notation files.
- Samples, presets, instruments, and plugin-related files.
- Stems, exports, project folders, and supporting text or metadata files.

Large audio projects can take longer to transfer because the files themselves must travel to the shared project. The activity strip shows what is happening.

---

## Account And Project Safety

- Passwords are handled by Supabase Auth.
- Session cookies are httpOnly.
- Access sessions can refresh through the refresh cookie.
- The GitHub token belongs to the shared ProdCollab repository account, not individual producers.
- Git errors are logged for diagnosis, but technical Git output is kept out of normal user messages.
- Conflict files are protected until the producer decides what to do.
- Local deletions are not automatically shared.
- Each account keeps its own local folder mapping.

---

## Running ProdCollab For Development

### Requirements

- Node.js 18 or newer.
- A Supabase project with the required tables and Auth enabled.
- A GitHub repository account/token for the shared repositories.
- Git installed and available on the computer.

### Start The Backend

```bash
cd server
npm install
npm run dev
```

The backend runs at:

```text
http://localhost:5000
```

### Start The Desktop App

In another terminal:

```bash
cd frontend
npm install
npm start
```

If the backend is already running, the Electron app reuses it instead of starting a second backend.

### Environment Variables

Keep secrets in ignored `.env` files. Do not commit them.

The server needs values for:

```env
PORT=5000
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_ANON_KEY=
PRODCOLLAB_GITHUB_TOKEN=
```

The frontend development configuration uses the local backend at `http://localhost:5000`.

### Build A Windows Installer

```bash
cd frontend
npm run make
```

The installer is created under:

```text
frontend/out/make/squirrel.windows/
```

---

## Testing Checklist

### Accounts

- Log into Account A.
- Log into Account B.
- Confirm the two windows stay logged into different accounts.

### Create And Join

- Create a project from Account A.
- Select a local folder.
- Generate a share link.
- Join from Account B.
- Select a different local folder.

### Push And Realtime

- Add or edit a file in Account A’s folder.
- Confirm only Account A shows local pending changes.
- Push from Account A.
- Confirm Account B receives the in-app notification.
- Confirm Account B receives the Windows notification.
- Confirm Account B sees `Update available`.

### Pull

- Pull from Account B.
- Confirm the existing linked folder is used.
- Confirm the activity strip shows progress.
- Confirm the page does not refresh.
- Confirm pulled files do not show as local changes.
- Confirm the Push button is not enabled because of the pull.

### Conflicts

- Create a local untracked file.
- Add a different file with the same path remotely.
- Pull the project.
- Confirm the local copy is preserved.
- Confirm the conflict panel appears.
- Test `Use remote`, `Keep both`, and `Use local`.

### Version History

- Open `View version history`.
- Confirm author, time, message, and changed files appear.
- Make a local change and push it.
- Confirm the new history entry uses the correct account.
- Restore an older version.
- Confirm a new restore commit is created.
- Push the restore and confirm the other account receives it.

---

## Current Boundaries

- Windows desktop notifications require ProdCollab to still be running. A fully quit app cannot receive live events.
- Existing old commits keep their original Git author metadata.
- The development two-window mode is test infrastructure and can be removed later without removing the collaboration model.
- Supabase Realtime publication for the `projects` table must remain enabled for the server-side database bridge.
- GitHub and network transfer speed depends on file size, connection quality, and GitHub availability.

---

## Project Structure

```text
ProdCollab/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProjectCard.jsx
│   │   │   ├── VersionHistory.jsx
│   │   │   └── ...
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── preload.js
│   ├── forge.config.js
│   └── package.json
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   ├── migrations/
│   ├── server.js
│   └── package.json
├── logs.txt
├── todo.txt
└── README.md
```

---

ProdCollab is built so producers can focus on making music while the app handles the difficult parts of sharing, syncing, history, and collaboration safely.
