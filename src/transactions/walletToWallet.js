import axios from "axios";

const axios = require('axios');
let data = {
	"amount": 200,
	"fromCustomerId": "aa4e9eea-d7a5-4ac2-a211-dc6d59b0c050",
	"toCustomerId": "a2c40f33-489c-480f-9d24-e2742502b85f"
}

let config = {
  method: 'post',
maxBodyLength: Infinity,
  url: 'https://payment.xpress-wallet.com/api/v1/transfer/wallet',
  headers: { 
    'X-Access-Token': '', 
    'X-Refresh-Token': ''
  },
  data : data
};

axios(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});