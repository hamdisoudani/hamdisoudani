const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mock GitHub API endpoints
app.get('/user/hamdisoudani', (req, res) => {
  res.json({
    login: 'hamdisoudani',
    name: 'Hamdi Soudani',
    bio: 'Full-Stack Developer & AI Agent Specialist',
    public_repos: 15,
    followers: 42,
    following: 28,
    avatar_url: '/assets/avatar-placeholder.png',
    html_url: 'https://github.com/hamdisoudani',
    blog: '',
    location: '',
    email: 'hamdisoudani.freelancer@gmail.com',
    hireable: true,
    created_at: '2020-01-01T00:00:00Z'
  });
});

// Mock GitHub Readme Stats
app.get('/api/top-langs', (req, res) => {
  res.json({
    TypeScript: 35,
    JavaScript: 25,
    Python: 20,
    Java: 10,
    Go: 5,
    Other: 5
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalCommits: 127,
    totalPRs: 42,
    totalIssues: 18,
    contributedTo: 8
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files for development
app.use('/assets', express.static('assets'));

app.listen(PORT, () => {
  console.log(`GitHub API Mock Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});