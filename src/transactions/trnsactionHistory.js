const axios = require('axios');

let config = {
  method: 'get',
maxBodyLength: Infinity,
  url: 'https://payment.xpress-wallet.com/api/v1/wallet/transactions?customerId="REPLACE THIS!!!!"&page=1',
  headers: { 
    'X-Access-Token': '', 
    'X-Refresh-Token': ''
  }
};

axios(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});
