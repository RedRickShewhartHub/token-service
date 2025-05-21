require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(express.json());

const PUBLIC_KEY = fs.readFileSync('./secrets/website-public-key.pem', 'utf8');
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// JWT Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, PUBLIC_KEY, { algorithms: ['ES256'] }, (err) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    next();
  });
};

// Проверка баланса токенов
app.post('/check-tokens', authenticateJWT, async (req, res) => {
  try {
    const { senderWallet, tokenContract, amount } = req.body;

    const contract = new ethers.Contract(tokenContract, [
      'function balanceOf(address) view returns (uint256)'
    ], provider);

    const balance = await contract.balanceOf(senderWallet);
    const required = ethers.parseUnits(amount, 18);

    res.json({
      hasEnoughTokens: balance >= required,
      currentBalance: ethers.formatEther(balance),
      requiredAmount: amount
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Balance Service running on port ${PORT}`));