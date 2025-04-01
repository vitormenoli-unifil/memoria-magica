// backend/index.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa conexão com banco de dados SQLite
const DB_PATH = path.join(__dirname, 'memoria.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Banco de dados conectado em', DB_PATH);
  }
});

// Habilita suporte a foreign keys no SQLite
db.run('PRAGMA foreign_keys = ON');

// Criação das tabelas (se não existirem)
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerName TEXT,
      score INTEGER,
      time INTEGER,
      userId INTEGER,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
});

// Chave secreta para JWT (em produção, manter em variável de ambiente)
const JWT_SECRET = 'chave-secreta-jwt';

// ROTAS DA API

// Registro de novo usuário (opcional)
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
  }
  // Verifica se já existe usuário com o mesmo nome
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro no servidor.' });
    }
    if (row) {
      return res.status(409).json({ error: 'Nome de usuário já existe.' });
    }
    // Gera hash da senha e insere novo usuário
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao gerar hash da senha.' });
      }
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], function(err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erro ao registrar usuário.' });
        }
        return res.status(201).json({ message: 'Usuário criado com sucesso.' });
      });
    });
  });
});

// Autenticação de usuário (login) – opcional
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
  }
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro no servidor.' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    // Compara a senha informada com o hash salvo
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro no servidor.' });
      }
      if (!match) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }
      // Gera um token JWT válido por 1 hora
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
      return res.json({ token });
    });
  });
});

// Salva uma nova pontuação de jogo
app.post('/api/scores', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let userId = null;
  let playerName = null;
  
  if (bearerToken) {
    // Se houver token JWT, verifica e obtém dados do usuário
    try {
      const decoded = jwt.verify(bearerToken, JWT_SECRET);
      userId = decoded.id;
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido.' });
    }
  }
  
  const { name, score, time } = req.body;
  if (!bearerToken) {
    // Caso não haja token (jogador não autenticado), exige um nome no corpo da requisição
    if (!name) {
      return res.status(400).json({ error: 'Nome do jogador é obrigatório.' });
    }
    playerName = name;
  } else {
    // Caso haja um usuário autenticado, podemos usar o nome de usuário do banco
    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, row) => {
      if (err || !row) {
        return res.status(400).json({ error: 'Usuário não encontrado.' });
      }
      playerName = row.username;
      insertScore(); // insere a pontuação após obter o nome do usuário
    });
    return; // Importante: sai da função principal, a resposta será enviada dentro de insertScore()
  }
  
  // Função auxiliar para inserir a pontuação no banco e enviar resposta
  function insertScore() {
    if (score === undefined || time === undefined) {
      return res.status(400).json({ error: 'Pontuação e tempo são obrigatórios.' });
    }
    const sql = 'INSERT INTO scores (playerName, score, time, userId) VALUES (?, ?, ?, ?)';
    db.run(sql, [playerName, score, time, userId], function(err) {
      if (err) {
        console.error('Erro ao salvar pontuação:', err);
        return res.status(500).json({ error: 'Erro ao salvar pontuação.' });
      }
      return res.status(201).json({ message: 'Pontuação salva com sucesso.' });
    });
  }
  
  // Se não havia token (jogador convidado), insere diretamente
  if (!bearerToken) {
    insertScore();
  }
});

// Retorna o ranking de melhores pontuações
app.get('/api/scores', (req, res) => {
  const sql = `
    SELECT s.id,
           COALESCE(u.username, s.playerName) AS name,
           s.score,
           s.time
    FROM scores s
    LEFT JOIN users u ON u.id = s.userId
    ORDER BY s.score DESC, s.time ASC
    LIMIT 10
  `;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Erro ao obter ranking:', err);
      return res.status(500).json({ error: 'Erro ao obter ranking.' });
    }
    return res.json(rows);
  });
});

// Inicia o servidor backend
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend executando na porta ${PORT}.`);
});