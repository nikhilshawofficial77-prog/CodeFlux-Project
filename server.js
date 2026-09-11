const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

const app = express();
const db = new Database(path.join(__dirname, 'skillsync.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    skills TEXT NOT NULL,
    contact TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    skills TEXT NOT NULL,
    contact TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
}));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Please sign in first.' });
  next();
}

function validateAccount(username, password) {
  if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username || '')) return 'Username must be 3–30 characters and use only letters, numbers, dots, hyphens, or underscores.';
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

app.get('/', (req, res) => res.redirect(req.session.user ? '/app' : '/login'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/app', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/signup', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const error = validateAccount(username, req.body.password);
  if (error) return res.status(400).json({ error });
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
    req.session.user = { id: result.lastInsertRowid, username };
    res.status(201).json({ user: req.session.user });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'That username is already taken.' });
    res.status(500).json({ error: 'Could not create the account.' });
  }
});

app.post('/api/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  req.session.user = { id: user.id, username: user.username };
  res.json({ user: req.session.user });
});

app.get('/api/me', (req, res) => res.status(req.session.user ? 200 : 401).json({ user: req.session.user || null }));
app.post('/api/logout', (req, res) => req.session.destroy(() => res.clearCookie('connect.sid').json({ message: 'Logged out.' })));

app.use((req, res, next) => {
  if (req.path === '/index.html' && !req.session.user) return res.redirect('/login');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/api/profiles', requireAuth, (req, res) => {
  const profiles = db.prepare('SELECT * FROM profiles ORDER BY id DESC').all()
    .map(profile => ({ ...profile, skills: JSON.parse(profile.skills) }));
  res.json(profiles);
});

app.post('/api/profiles', requireAuth, (req, res) => {
  const { name, role, skills, contact, bio = '' } = req.body;
  if (!name || !role || !Array.isArray(skills) || !contact) {
    return res.status(400).json({ error: 'Please complete all required profile fields.' });
  }
  const result = db.prepare(
    'INSERT INTO profiles (name, role, skills, contact, bio) VALUES (?, ?, ?, ?, ?)'
  ).run(name.trim(), role.trim(), JSON.stringify(skills), contact.trim(), bio.trim());
  res.status(201).json({ id: result.lastInsertRowid });
});

app.get('/api/projects', requireAuth, (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY id DESC').all()
    .map(project => ({ ...project, skills: JSON.parse(project.skills), desc: project.description }));
  res.json(projects);
});

app.post('/api/projects', requireAuth, (req, res) => {
  const { title, skills, contact, desc = '' } = req.body;
  if (!title || !Array.isArray(skills) || !contact) {
    return res.status(400).json({ error: 'Please complete all required project fields.' });
  }
  const result = db.prepare(
    'INSERT INTO projects (title, skills, contact, description) VALUES (?, ?, ?, ?)'
  ).run(title.trim(), JSON.stringify(skills), contact.trim(), desc.trim());
  res.status(201).json({ id: result.lastInsertRowid });
});

app.listen(3000, () => console.log('Open http://localhost:3000'));
