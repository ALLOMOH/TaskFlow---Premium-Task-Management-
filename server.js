const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('./utils/db');

// In production, use dotenv
const JWT_SECRET = 'dev_secret_key'; // For signed cookies if needed, or just secure IDs
const PORT = 3000;
const AUTH_COOKIE = 'taskflow_auth';

// --- Mailer Configuration ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'allomohangealex@gmail.com',
        pass: 'Sauraki1999' // Note: If 2FA is on, use an App Password here
    }
});

const app = express();

// Temporary in-memory OTP store: { email: { code, expires } }
const otps = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '.')));

// --- Helper Middlewares ---
function requireAuth(req, res, next) {
    const userId = req.cookies[AUTH_COOKIE];
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = userId;
    next();
}

// --- Serve Frontend ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Auth Routes ---

app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const user = await db.createUser(username, password);
        
        // Auto-login after signup
        res.cookie(AUTH_COOKIE, user.id, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        res.json({ user });
    } catch (error) {
        if (error.message === 'Username already exists') {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.authenticateUser(username, password);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Removed isVerified check as requested
        
        res.cookie(AUTH_COOKIE, user.id, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Google Auth Routes (Mocked for Structure) ---
app.get('/auth/google', (req, res) => {
    // In real app, redirect to: https://accounts.google.com/o/oauth2/v2/auth?...
    // Here we just simulate a redirect to our own callback
    const mockState = 'mock_google_flow';
    res.redirect(`/auth/google/callback?code=mock_code&state=${mockState}`);
});

app.get('/auth/google/callback', async (req, res) => {
    // In real app, exchange code for tokens, then get user profile.
    // Mock Profile:
    const mockProfile = {
        id: 'google_123456',
        email: 'user@gmail.com'
    };

    // 1. Try to find by Google ID
    let user = await db.findUserByGoogleId(mockProfile.id);
    
    // 2. If not found, try to create or merge
    if (!user) {
        try {
            user = await db.createUser(mockProfile.email, null, mockProfile.id);
        } catch (e) {
             // User exists with this email?
             user = await db.findUserByEmail(mockProfile.email);
             if (user) {
                 // Merge: In real app we'd update their googleId here.
                 // For now, just log them in.
             } else {
                 return res.redirect('/?error=creation_failed');
             }
        }
    }

    res.cookie(AUTH_COOKIE, user.id, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.redirect('/'); // Back to app
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie(AUTH_COOKIE);
    res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({ id: req.userId });
});

app.delete('/api/auth/me', requireAuth, async (req, res) => {
    // ... existing delete logic
    try {
        await db.deleteUser(req.userId);
        res.clearCookie(AUTH_COOKIE);
        res.json({ message: 'Account deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// --- Task Routes ---
// ... (Keep existing task routes)
app.get('/api/tasks', requireAuth, async (req, res) => {
    try {
        const tasks = await db.getUserTasks(req.userId);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

app.post('/api/tasks', requireAuth, async (req, res) => {
    try {
        const tasks = req.body;
        if (!Array.isArray(tasks)) {
            return res.status(400).json({ error: 'Tasks must be an array' });
        }
        await db.saveUserTasks(req.userId, tasks);
        res.json({ message: 'Saved' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save tasks' });
    }
});

// Initialize DB and Start Server
db.init().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
});
