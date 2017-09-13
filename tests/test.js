const token = require('../index');
const path = require('path');
const config = {
    redis: 'redis://127.0.0.1:6379',
    logsDir: 'test-logs',
    configs: [
        {
            corpid: 'xxx',
            corpsecret: 'xxx',
            token_key: 'access_token_1',
            token_expires: 5,
            ticket_key: 'jsapi_ticket',
            ticket_expires: 7
        },
        {
            corpid: 'xxx',
            corpsecret: 'xxx',
            token_key: 'access_token_2',
            token_expires: 6
        },
        {
            corpid: 'xxx',
            corpsecret: 'xxx',
            token_key: 'access_token_3',
            token_expires: 7000
        },
        {
            corpid: 'xxx',
            corpsecret: 'xxx',
            token_key: 'access_token_4',
            token_expires: 7000
        }
    ]
}
token.init(config);