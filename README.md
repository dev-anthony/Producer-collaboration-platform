# ProdCollab

> **GitHub for Music Producers** — Version control, real-time collaboration, and project management built specifically for DAW-based workflows.

---

## What is ProdCollab?

ProdCollab is a desktop application that brings software-style version control to music production. Built on Electron, it lets producers upload, manage, and collaborate on music projects — DAW sessions, audio stems, MIDI files, samples, and more — with full GitHub repository integration under the hood.

Whether you're sharing a session with a co-producer across the world or keeping a clean history of your own project iterations, ProdCollab gives you the infrastructure to work like a professional engineering team while staying firmly in the music production mindset.

---

## Key Features

### Version Control for Audio Projects
- Push project files (DAW sessions, stems, samples) directly to GitHub repositories without touching the command line
- Automatic change detection that compares your local folder against the last known project state — tracking new files, modified files, and deleted files across your entire folder structure
- Selective push: only modified or new files are uploaded on subsequent pushes, keeping commits clean and efficient
- Full pull support — fetch all remote files from GitHub and write them to your local project folder

### Multi-DAW File Support
ProdCollab supports files from virtually every major DAW and audio format including:
- **Ableton Live** (`.als`, `.alp`, `.adg`, `.asd`)
- **FL Studio** (`.flp`, `.fsc`, `.fst`)
- **Logic Pro / GarageBand** (`.logicx`, `.band`, `.aup3`)
- **Pro Tools** (`.ptx`, `.ptf`, `.pts`)
- **Cubase / Nuendo** (`.cpr`, `.npr`, `.vstpreset`, `.fxb`, `.fxp`)
- **Bitwig Studio** (`.bwproject`, `.bwpreset`)
- **Studio One** (`.song`, `.multitrack`)
- **Reaper** (`.rpp`, `.rpp-bak`)
- **Reason Studios** (`.reason`, `.rns`, `.rx2`)
- Lossless audio (`.wav`, `.flac`, `.aiff`, `.w64`, `.dsd`)
- Compressed audio (`.mp3`, `.aac`, `.ogg`, `.opus`)
- MIDI & notation (`.mid`, `.musicxml`, `.mscz`, `.sib`)
- Samples & instruments (`.sf2`, `.sfz`, `.nki`, `.kontakt`, `.gig`)
- Stems & mastering formats (`.stem`, `.stem.mp4`, `.atmos`)

### Real-Time File Watching
- Local folder watcher (powered by Chokidar) automatically monitors your project directory for any changes
- Intelligent filtering ignores `.git` internals, system files, temp files, and lock files so only meaningful changes trigger notifications
- Watchers persist across app restarts — your monitored folders are restored automatically on launch

### Collaboration & Access Control
- Share projects with collaborators via generated share links (token-based)
- Collaborators can join projects, browse files, and push changes to the shared repository
- Commit messages automatically attribute changes to the collaborating user (e.g. `Update by @username`)
- Collaborators can leave projects independently without affecting the owner's repository
- Owners can delete the project and its GitHub repository in one action

### GitHub Integration
- Full Octokit-powered GitHub API integration — repositories are created, managed, and updated programmatically
- Supports files up to 100MB per file via the GitHub Blob API with automatic fallback to download URLs for oversized content
- Repositories are auto-initialized with a `main` branch on creation
- Repository names are sanitized automatically (spaces → hyphens, special characters stripped)

### OAuth Authentication
- GitHub OAuth login flow with custom protocol handler (`prodcollab://`) for both development and packaged production builds
- Session management with secure token clearing on logout
- Persistent auth state across sessions

### Persistent Local Storage
- Project-to-folder mappings are stored locally using `electron-store` and survive app restarts
- Each project remembers its local folder path — no re-linking required after relaunching

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Electron 39 |
| Frontend Framework | React 19 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 3 |
| Bundler | Webpack via Electron Forge |
| HTTP Client | Axios |
| Icons | Lucide React |
| Backend Runtime | Node.js |
| Backend Framework | Express 5 |
| Database | MySQL (via `mysql2`) |
| GitHub API | Octokit REST |
| File Uploads | Multer |
| Auth | JWT + GitHub OAuth |
| File Watching | Chokidar |
| Local Storage | electron-store |
| Packaging | Electron Forge + Squirrel (Windows) |

---

## Installation

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or later
- [MySQL](https://www.mysql.com/) (running locally or via a cloud provider)
- A [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) with:
  - **Homepage URL:** `http://localhost:3000`
  - **Authorization callback URL:** `http://localhost:3000/auth/github/callback`

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ProdCollab.git
cd ProdCollab
```

---

### 2. Set Up the Server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
PORT=5000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=prodcollab

JWT_SECRET=your_jwt_secret

GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

ORIGIN=http://localhost:3000
```

Start the server:

```bash
npm run dev
```

---

### 3. Set Up the Frontend (Electron App)

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
SERVER_URL=http://localhost:5000
GITHUB_CLIENT_ID=your_github_oauth_client_id
```

Start the Electron app in development mode:

```bash
npm start
```

---

### 4. Database Setup

Run the following SQL to create the required tables in your MySQL database:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE github_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  access_token TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  repo_id BIGINT,
  repo_name VARCHAR(255),
  repo_url TEXT,
  description TEXT,
  visibility ENUM('public', 'private') DEFAULT 'private',
  file_paths JSON,
  has_changes TINYINT(1) DEFAULT 0,
  share_token VARCHAR(64),
  last_pulled_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE project_collaborators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('collaborator', 'admin') DEFAULT 'collaborator',
  local_path TEXT,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 5. Package for Production (Windows)

To build an installable `.exe`:

```bash
cd frontend
npm run make
```

The installer will be output to:

```
frontend/out/make/squirrel.windows/x64/ProdCollabSetup.exe
```

---

## Project Structure

```
ProdCollab/
├── frontend/               # Electron + React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # App pages (Dashboard, Projects, Collaboration, etc.)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # API utilities
│   │   └── preload.js      # Electron preload bridge
│   ├── forge.config.js     # Electron Forge config
│   └── package.json
│
└── server/                 # Express REST API
    ├── controllers/
    │   ├── authController.js
    │   └── projectController.js
    ├── routes/
    ├── middleware/
    ├── config/
    │   └── db.js
    └── server.js
```

---

## License

MIT © [dev-anthony](mailto:anthonyachibi@gmail.com)