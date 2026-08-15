
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // ── Phase 4.9 ──
// require('dotenv').config();
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser()) // ── Phase 4.9: parse httpOnly auth cookies ──

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:9000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:9000'
  ],
  credentials: true
}));


const port = process.env.PORT || 5000;

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

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