require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const app = express();

app.use(express.json());

// Загрузка ключей из Docker Secrets
const privateKey = fs.readFileSync('/run/secrets/jwt-private-key', 'utf8');
const PUBLIC_KEY = fs.readFileSync('/run/secrets/jwt-public-key', 'utf8');

// Генерация JWT-токена
app.post('/login', (req, res) => {
  const { apiKey } = req.body;

  // Проверка API-ключа (заглушка для тестов)
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Создание токена (действителен 1 час)
  const token = jwt.sign(
    { iss: 'auth-service', exp: Math.floor(Date.now() / 1000) + 3600 },
    privateKey,
    { algorithm: 'ES256' }
  );

  res.json({ token });
});

// Проверка токена (для внутреннего использования)
app.post('/validate', (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, PUBLIC_KEY, { algorithms: ['ES256'] });
    res.json({ valid: true, decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));