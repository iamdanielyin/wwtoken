const token = require('../index');
const path = require('path');
const config = {
    redis: 'redis://127.0.0.1:6379',
    logsDir: 'test-logs',
    configs: [
        {
            corpid: 'wxab1d81062855a83f',
            corpsecret: 'L9HIQbaMYxCwKaPV-PwKhCylo6nE8sojH9rMjIi1wp2WA3vP5Akhf_nYMunIhVT6',
            token_key: 'k11_access_token',
            token_expires: 5,
            ticket_key: 'k11_jsapi_ticket',
            ticket_expires: 7
        },
        {
            corpid: 'wxab1d81062855a83f',
            corpsecret: 'W3tDJ97wR93a2fKw3fv5BpQrMF_qFm8MgOSWbldCF4k',
            token_key: 'k11_access_token_central',
            token_expires: 6
        },
        {
            corpid: 'wxab1d81062855a83f',
            corpsecret: '9qAON_9w9auuW-uPKnXdVmrLIe-cv8FYyadUeyipCiQ',
            token_key: 'k11_access_token_myscust',
            token_expires: 7000
        },
        {
            corpid: 'wxab1d81062855a83f',
            corpsecret: '2h0vxBxriyEHnX85PNkYvTxINvwHhCjzx68xwQ6Q2B0',
            token_key: 'k11_access_token_tour',
            token_expires: 7000
        }
    ]
}
token.init(config);