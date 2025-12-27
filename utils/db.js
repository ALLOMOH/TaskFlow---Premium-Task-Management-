// ... imports
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Helper: Ensure directory exists
async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Helper: Read JSON safely
async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

// Helper: Write JSON safely
async function writeJSON(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// --- Public API ---

async function init() {
    await ensureDir(DATA_DIR);
    const users = await readJSON(USERS_FILE);
    if (!users) {
        await writeJSON(USERS_FILE, []);
    }
}

async function createUser(username, password, googleId = null) {
    const users = await readJSON(USERS_FILE) || [];
    
    if (users.find(u => u.username === username)) {
        throw new Error('Username already exists');
    }

    const newUser = {
        id: crypto.randomUUID(),
        username,
        googleId,
        isVerified: googleId ? true : false, // Google users are verified by default
        createdAt: new Date().toISOString()
    };

    if (password) {
        newUser.password = crypto.createHash('sha256').update(password).digest('hex');
    }

    users.push(newUser);
    await writeJSON(USERS_FILE, users);
    
    // Create user's data file
    const userFile = path.join(DATA_DIR, `${newUser.id}.json`);
    await writeJSON(userFile, []);

    return newUser;
}

async function verifyUser(username) {
    const users = await readJSON(USERS_FILE) || [];
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return false;

    users[userIndex].isVerified = true;
    await writeJSON(USERS_FILE, users);
    return true;
}

async function authenticateUser(username, password) {
    const users = await readJSON(USERS_FILE) || [];
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    const user = users.find(u => u.username === username && u.password === hashedPassword);
    if (!user) return null;
    
    return { id: user.id, username: user.username, isVerified: user.isVerified };
}

async function findUserByGoogleId(googleId) {
    const users = await readJSON(USERS_FILE) || [];
    return users.find(u => u.googleId === googleId);
}

async function findUserByEmail(email) {
    const users = await readJSON(USERS_FILE) || [];
    return users.find(u => u.username === email);
}

// ... rest of the file (deleteUser, getUserTasks, etc.)

async function deleteUser(userId) {
    let users = await readJSON(USERS_FILE) || [];
    users = users.filter(u => u.id !== userId);
    await writeJSON(USERS_FILE, users);
    
    const userFile = path.join(DATA_DIR, `${userId}.json`);
    try {
        await fs.unlink(userFile);
    } catch (e) {
        // Ignore if file doesn't exist
    }
}

async function getUserTasks(userId) {
    const userFile = path.join(DATA_DIR, `${userId}.json`);
    const tasks = await readJSON(userFile);
    return tasks || [];
}

async function saveUserTasks(userId, tasks) {
    const userFile = path.join(DATA_DIR, `${userId}.json`);
    await writeJSON(userFile, tasks);
}

async function getAdminStats() {
    const users = await readJSON(USERS_FILE) || [];
    return {
        totalUsers: users.length,
        verifiedUsers: users.filter(u => u.isVerified).length
    };
}

module.exports = {
    init,
    createUser,
    verifyUser,
    authenticateUser,
    findUserByGoogleId,
    findUserByEmail,
// ... existing exports
    deleteUser,
    getUserTasks,
    saveUserTasks,
    getAdminStats
};
