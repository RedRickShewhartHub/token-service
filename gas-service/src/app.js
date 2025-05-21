const express = require('express');
const { ethers } = require('ethers');

const app = express();
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Проверяет, хватит ли ETH для отправки конкретной суммы токенов
app.post('/check-tx-gas', async (req, res) => {
  const { senderWallet, tokenContract, amount } = req.body;

  // 1. Получаем текущий газ
  const gasPrice = await provider.getGasPrice();

  // 2. Оцениваем газ для transfer()
  const contract = new ethers.Contract(tokenContract, [
    'function transfer(address, uint256) returns (bool)'
  ], provider);

  const gasLimit = await contract.transfer.estimateGas(
    senderWallet,
    ethers.parseUnits(amount, 18)
  );

  // 3. Считаем стоимость газа
  const gasCost = gasPrice * gasLimit;

  // 4. Проверяем баланс ETH
  const ethBalance = await provider.getBalance(senderWallet);
  const hasEnoughEth = ethBalance >= gasCost;

  res.json({
    hasEnoughEth,
    requiredGas: ethers.formatEther(gasCost),
    currentBalance: ethers.formatEther(ethBalance)
  });
});

app.listen(3001, () => console.log('Gas Service:3001'));