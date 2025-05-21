const express = require('express');
const { ethers } = require('ethers');

const app = express();
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Проверяет, хватит ли токенов для конкретной суммы
app.post('/check-tokens', async (req, res) => {
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
});

app.listen(3002, () => console.log('Balance Service:3002'));