require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { ethers } = require('ethers');
const axios = require('axios');

const app = express();
app.use(express.json());

// Конфигурация
const {
  RPC_URL,
  TOKEN_ADDRESS,
  WALLET_ADDRESS,
  VAULT_ADDR = 'http://vault:8200',
  VAULT_TOKEN = 'root'
} = process.env;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const PUBLIC_KEY = fs.readFileSync('./secrets/website-public-key.pem', 'utf8');

// JWT Auth Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, PUBLIC_KEY, { algorithms: ['ES256'] }, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token', details: err.message });
    req.user = user;
    next();
  });
};

// Подпись через Vault
async function signWithVault(unsignedTx) {
  const response = await axios.post(
    `${VAULT_ADDR}/v1/secrets/eth/sign`,
    { unsignedTx },
    { headers: { 'X-Vault-Token': VAULT_TOKEN } }
  );
  if (!response.data.signedTx) throw new Error('Vault returned empty signed transaction');
  return response.data.signedTx;
}

// Эндпоинт /transfer
app.post('/transfer', authenticateJWT, async (req, res) => {
  try {
    const { userAddress, amount } = req.body;

    // Проверка газа
    const gasCheck = await axios.post('http://gas-service:3001/check-tx-gas', {
      senderWallet: WALLET_ADDRESS,
      tokenContract: TOKEN_ADDRESS,
      amount
    });

    if (!gasCheck.data.hasEnoughEth) {
      return res.status(400).json({ 
        error: 'Insufficient ETH for gas',
        required: gasCheck.data.requiredGas,
        available: gasCheck.data.currentBalance
      });
    }

    // Проверка баланса
    const balanceCheck = await axios.post('http://balance-service:3000/check-tokens', {
      senderWallet: WALLET_ADDRESS,
      tokenContract: TOKEN_ADDRESS,
      amount
    });

    if (!balanceCheck.data.hasEnoughTokens) {
      return res.status(400).json({
        error: 'Insufficient token balance',
        required: amount,
        available: balanceCheck.data.currentBalance
      });
    }

    // Подготовка транзакции
    const contract = new ethers.Contract(TOKEN_ADDRESS, [
      'function transfer(address, uint256) returns (bool)'
    ], provider);

    const unsignedTx = {
      to: TOKEN_ADDRESS,
      data: contract.interface.encodeFunctionData('transfer', [
        userAddress,
        ethers.parseUnits(amount, 18)
      ]),
      gasLimit: await contract.transfer.estimateGas(userAddress, ethers.parseUnits(amount, 18)),
      gasPrice: await provider.getGasPrice(),
      nonce: await provider.getTransactionCount(WALLET_ADDRESS)
    };

    const signedTx = await signWithVault(unsignedTx);
    const txResponse = await provider.sendTransaction(signedTx);
    res.json({ success: true, txHash: txResponse.hash });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Transfer Service running on port ${PORT}`));