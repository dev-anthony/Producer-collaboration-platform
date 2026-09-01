
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const http = require('http');
const { WebSocketServer } = require('ws');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const supabase = require('./config/supabase');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const app = express();
const server = http.createServer(app);
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser()) 

// app.use(cors({
//   origin: [
//     'http://localhost:3000',
//     'http://localhost:9000',
//     'http://127.0.0.1:3000',
//     'http://127.0.0.1:9000'
//   ],
//   credentials: true
// }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:9000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:9000'
    ];
    if (!origin || origin === 'null' || allowed.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));


const port = process.env.PORT || 5000;

const authAttempts = new Map();
const authRateLimit = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (authAttempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 10) {
    return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' });
  }
  recent.push(now);
  authAttempts.set(key, recent);
  next();
};

app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/signup', authRateLimit);
app.use('/api/auth/forgot-password', authRateLimit);
app.use('/api/auth/reset-password', authRateLimit);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

app.get('/health', (req, res) => {
  res.setHeader('x-prodcollab-realtime', 'websocket');
  res.json({ status: 'ok', message: 'Server is running' });
});

const realtimeClients = new Map();
const parseCookies = (header = '') => Object.fromEntries(
  header.split(';').map((part) => part.trim().split('='))
    .filter(([key, value]) => key && value)
    .map(([key, value]) => [key, decodeURIComponent(value)])
);

const realtimeWss = new WebSocketServer({ noServer: true });
realtimeWss.on('connection', async (socket, request, context) => {
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });
  const clientId = `${context.userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const client = { clientId, userId: context.userId, projectIds: new Set(), socket };
  realtimeClients.set(clientId, client);
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from('projects').select('id').eq('user_id', context.userId),
    supabase.from('project_collaborators').select('project_id').eq('user_id', context.userId),
  ]);
  client.projectIds = new Set([
    ...(owned || []).map(({ id }) => String(id)),
    ...(memberships || []).map(({ project_id }) => String(project_id)),
  ]);
  console.log(`[REALTIME-WS] Connected user ${context.userId} for projects: ${[...client.projectIds].join(', ') || '(none)'}`);
  socket.send(JSON.stringify({ type: 'ready', projectIds: [...client.projectIds] }));
  socket.on('close', () => {
    realtimeClients.delete(clientId);
    console.log(`[REALTIME-WS] Disconnected client ${clientId}`);
  });
});

const realtimeHeartbeat = setInterval(() => {
  for (const socket of realtimeWss.clients) {
    if (socket.isAlive === false) {
      socket.terminate();
      continue;
    }
    socket.isAlive = false;
    socket.ping();
  }
}, 30000);
server.on('close', () => clearInterval(realtimeHeartbeat));

server.on('upgrade', async (request, socket, head) => {
  if (request.url !== '/realtime') {
    socket.destroy();
    return;
  }
  try {
    // In development the Electron renderer is served from the webpack dev
    // server (its port can vary, e.g. 9000/9001), so accept any localhost
    // origin. Production locks this down to the real app origin.
    // const origin = request.headers.origin || '';
    // const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    // if (process.env.NODE_ENV !== 'production' && origin && !isLocalOrigin) {
    //   throw new Error('Origin not allowed');
    // }
        const origin = request.headers.origin || '';
    const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isPackagedRendererOrigin = !origin || origin === 'null' || origin === 'file://';
    if (!isLocalOrigin && !isPackagedRendererOrigin) {
      throw new Error('Origin not allowed');
    }
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies.prodcollab_token;
    if (!token) throw new Error('Missing session cookie');
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) throw new Error('Invalid session');
    realtimeWss.handleUpgrade(request, socket, head, (ws) => {
      realtimeWss.emit('connection', ws, request, { userId: data.user.id });
    });
  } catch (error) {
    console.warn('[REALTIME-WS] Rejected connection:', error.message);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
});

app.locals.broadcastProjectUpdate = (project, sourceClientId = null) => {
  let delivered = 0;
  const eventProject = sourceClientId ? { ...project, source_client_id: sourceClientId } : project;
  const payload = JSON.stringify({ type: 'project-updated', project: eventProject });
  for (const client of realtimeClients.values()) {
    if (!client.projectIds.has(String(project.id)) || client.socket.readyState !== 1) continue;
    client.socket.send(payload);
    delivered += 1;
  }
  console.log(`[REALTIME-WS] Project ${project.id} delivered to ${delivered} client(s)`);
};

supabase
  .channel('project-updates-server')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, (payload) => {
    app.locals.broadcastProjectUpdate(payload.new);
  })
  .subscribe((status) => console.log(`[REALTIME-WS] Supabase bridge: ${status}`));

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

server.listen(port, () => {
  console.log(` Backend server running on http://localhost:${port}`);
});
