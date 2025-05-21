const axios = require('axios');

module.exports = {
  callGasService: async () => {
    const { data } = await axios.get('http://gas-service:3001/gas');
    return data;
  },
  callBalanceService: async (address, amount) => {
    const { data } = await axios.get(`http://balance-service:3002/balance/${address}`);
    return parseFloat(data.balance) >= parseFloat(amount);
  }
};