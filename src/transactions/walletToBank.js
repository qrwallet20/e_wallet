import axios from "axios";

const axios = require('axios');
let data = {
    "amount": amount,
    "sortCode": sortCode,
    "narration": narration,
    "accountNumber": accountNumber,
    "accountName": accountName,
    "customerId": customerId,
    "metadata": {
        "even-more": "Other data",
        "additional-data": "some more data"
    }
}

let config = {
  method: 'post',
maxBodyLength: Infinity,
  url: 'https://payment.xpress-wallet.com/api/v1/transfer/bank/customer',
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


// {
// 	"amount": 1000,
//     // "reference": "38bDlOwxUmrDv3yzP46mZyiEaZWpYVcxMHLd",
// 	"sortCode": "000013",
//     "narration": "Customer transfer",
// 	"accountNumber": "0167421242",
//     "accountName": "Emmanuel Obagunwa",
//     "customerId": "6e7b8096-bf89-496a-badd-1ed5acf17280",
//     "metadata": {"key": "value"}
// }