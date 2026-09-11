const path = require('path');
const express = require('express');
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
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/profiles', (req, res) => {
  const profiles = db.prepare('SELECT * FROM profiles ORDER BY id DESC').all()
    .map(profile => ({ ...profile, skills: JSON.parse(profile.skills) }));
  res.json(profiles);
});

app.post('/api/profiles', (req, res) => {
  const { name, role, skills, contact, bio = '' } = req.body;
  if (!name || !role || !Array.isArray(skills) || !contact) {
    return res.status(400).json({ error: 'Please complete all required profile fields.' });
  }
  const result = db.prepare(
    'INSERT INTO profiles (name, role, skills, contact, bio) VALUES (?, ?, ?, ?, ?)'
  ).run(name.trim(), role.trim(), JSON.stringify(skills), contact.trim(), bio.trim());
  res.status(201).json({ id: result.lastInsertRowid });
});

app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY id DESC').all()
    .map(project => ({ ...project, skills: JSON.parse(project.skills), desc: project.description }));
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
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
