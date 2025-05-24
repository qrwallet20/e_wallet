const axios = require('axios');

const bankList  = async () => {
    let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://payment.xpress-wallet.com/api/v1/transfer/banks',
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
}

const bankdetails  = async () => {

    const {} = req.body;

    let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://payment.xpress-wallet.com/api/v1/transfer/account/details?sortCode=REPLACE ME&accountNumber=REPLACE ME',
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

}

export {bankList, bankdetails}