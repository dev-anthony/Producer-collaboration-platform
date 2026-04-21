
const express = require('express');
const cors = require('cors');
// require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
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