-- backend/schema.sql (script SQL para criação das tabelas)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playerName TEXT,
  score INTEGER,
  time INTEGER,
  userId INTEGER,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
);