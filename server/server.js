
// const express = require('express');
// const cors = require('cors');
// require('dotenv').config();
// const fetch = (...args) =>
//     import('node-fetch').then(({default: fetch}) => fetch(...args));
// const bodyParser = require('body-parser');

// const app = express();

// // Enable CORS for Electron app
// app.use(cors({
//   origin: [process.env.ORIGIN, 'http://127.0.0.1:3000'],
//   credentials: true
// }));

// app.use(bodyParser.json());

// const port = process.env.PORT || 5000;

// // Exchange code for access token
// app.get('/getAccessToken', async function (req, res) {
//   const code = req.query.code;
//   console.log('Received OAuth code:', code);
  
//   if (!code) {
//     return res.status(400).json({ error: 'No code provided' });
//   }
  
//   const params = `?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`;
  
//   try {
//     const response = await fetch("https://github.com/login/oauth/access_token" + params, {
//       method: "POST",
//       headers: {
//         "Accept": "application/json"
//       }
//     });
    
//     const data = await response.json();
//     console.log('GitHub token response:', data);
    
//     res.json(data);
//   } catch (error) {
//     console.error('Error exchanging code:', error);
//     res.status(500).json({ error: 'Failed to exchange code for token' });
//   }
// });

// // Get GitHub user data
// app.get("/getUserData", async function (req, res) {
//   const authHeader = req.get("Authorization");
//   console.log('Auth header:', authHeader);
  
//   if (!authHeader) {
//     return res.status(401).json({ error: 'No Authorization header' });
//   }
  
//   try {
//     const response = await fetch("https://api.github.com/user", {
//       method: "GET",
//       headers: {
//         "Authorization": authHeader,
//         "User-Agent": "Electron-App"
//       }
//     });
    
//     const data = await response.json();
//     console.log('GitHub user response:', data);
    
//     res.json(data);
//   } catch (error) {
//     console.error('Error fetching user:', error);
//     res.status(500).json({ error: 'Failed to fetch user data' });
//   }
// });

// app.listen(port, () => {
//   console.log(`✅ Backend server running on http://localhost:${port}`);
// });
// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const app = express();

// Enable CORS for Electron app
app.use(cors({
  origin: [process.env.ORIGIN || 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(bodyParser.json());

const port = process.env.PORT || 5000;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(port, () => {
  console.log(` Backend server running on http://localhost:${port}`);
});