require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const app = express();
app.use(express.json());

// --- Конфиг ---
const {
  RPC_URL,
  TOKEN_ADDRESS,
  WALLET_ADDRESS,
  VAULT_ADDR,
  VAULT_TOKEN,
  GAS_SERVICE_URL = 'http://gas-service:3001',
  BALANCE_SERVICE_URL = 'http://balance-service:3002'
} = process.env;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const JWT_PUBLIC_KEY = fs.readFileSync('/run/secrets/jwt-public-key');

// --- Валидация JWT ---
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing JWT' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_PUBLIC_KEY, { algorithms: ['ES256'] }, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid JWT' });
    req.user = user;
    next();
  });
};

// --- Подпись через Vault ---
async function signWithVault(unsignedTx) {
  const response = await axios.post(
    `${VAULT_ADDR}/v1/secrets/eth/sign`,
    { unsignedTx },
    { headers: { 'X-Vault-Token': VAULT_TOKEN } }
  );
  return response.data.signedTx;
}

// --- Проверка газа ---
async function checkTransactionGas(amount) {
  const { data } = await axios.post(`${GAS_SERVICE_URL}/check-tx-gas`, {
    senderWallet: WALLET_ADDRESS,
    tokenContract: TOKEN_ADDRESS,
    amount
  });
  return data;
}

// --- Проверка токенов ---
async function checkTokenBalance(amount) {
  const { data } = await axios.post(`${BALANCE_SERVICE_URL}/check-tokens`, {
    senderWallet: WALLET_ADDRESS,
    tokenContract: TOKEN_ADDRESS,
    amount
  });
  return data;
}

// --- Отправка транзакции ---
async function sendTransfer(userAddress, amount) {
  const contract = new ethers.Contract(TOKEN_ADDRESS, [
    'function transfer(address, uint256) returns (bool)'
  ], provider);

  const gasLimit = await contract.transfer.estimateGas(
    userAddress,
    ethers.parseUnits(amount, 18)
  );

  const gasPrice = await provider.getGasPrice();

  const unsignedTx = {
    to: TOKEN_ADDRESS,
    data: contract.interface.encodeFunctionData('transfer', [
      userAddress,
      ethers.parseUnits(amount, 18)
    ]),
    gasLimit,
    gasPrice,
    nonce: await provider.getTransactionCount(WALLET_ADDRESS)
  };

  const signedTx = await signWithVault(unsignedTx);
  const txResponse = await provider.broadcastTransaction(signedTx);
  return txResponse.hash;
}

// --- Эндпоинт /transfer ---
app.post('/transfer', authenticateJWT, async (req, res) => {
  try {
    const { userAddress, amount } = req.body;

    // 1. Проверка газа
    const gasCheck = await checkTransactionGas(amount);
    if (!gasCheck.hasEnoughEth) {
      return res.status(400).json({
        error: `Not enough ETH for gas. Required: ${gasCheck.requiredGas} ETH, Available: ${gasCheck.currentBalance} ETH`
      });
    }

    // 2. Проверка токенов
    const balanceCheck = await checkTokenBalance(amount);
    if (!balanceCheck.hasEnoughTokens) {
      return res.status(400).json({
        error: `Not enough tokens. Required: ${amount}, Available: ${balanceCheck.currentBalance}`
      });
    }

    // 3. Отправка
    const txHash = await sendTransfer(userAddress, amount);
    res.json({ success: true, txHash });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Health Check ---
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Transfer Service running on port ${PORT}`));