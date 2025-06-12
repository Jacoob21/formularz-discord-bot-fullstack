const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

const DB_FILE = 'db.json';

// Endpoint do zapisywania formularza
app.post('/formularz', (req, res) => {
  const id = Date.now().toString();
  const data = req.body;

  let db = {};
  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE));
    } catch {
      db = {};
    }
  }

  db[id] = data;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

  res.json({ success: true, id });
});

// Endpoint do pobierania formularza po ID
app.get('/formularz/:id', (req, res) => {
  const id = req.params.id;
  if (!fs.existsSync(DB_FILE)) return res.status(404).send('Not found');

  let db;
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE));
  } catch {
    return res.status(500).send('Database error');
  }

  if (!db[id]) return res.status(404).send('Not found');

  res.json(db[id]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));

