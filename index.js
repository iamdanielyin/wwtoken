/**
 * 主模块
 * Created by yinfxs on 2017/5/19.
 */

const path = require('path');
const qs = require('qs');
const fsx = require('fs-extra');
const winston = require('winston');
const fetch = require('node-fetch');
const Redis = require('ioredis');
const config = {
    url: 'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
    corpid: null,
    corpsecret: null,
    key: 'wwtoken_access_token',
    redis: 'redis://127.0.0.1:6379',
    logsDir: path.resolve(process.cwd(), 'wwtoken-logs'),
    ms: 7000
};

const app = {};
module.exports = app;

var redis = null;
var logger = null;

/**
 * 初始化配置
 * @param object
 */
app.config = (object) => {
    if (typeof object !== 'object') return config;
    if (object.logsDir) object.logsDir = path.resolve(process.cwd(), object.logsDir);
    Object.assign(config, object);

    fsx.ensureDirSync(config.logsDir);
    redis = new Redis(config.redis);
    logger = logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({ level: 'info' }),
            new (winston.transports.File)({
                name: 'info-file',
                filename: path.resolve(config.logsDir, 'info.log'),
                level: 'info',
                maxsize: 31457280,
                maxFiles: 5
            }),
            new (winston.transports.File)({
                name: 'error-file',
                filename: path.resolve(config.logsDir, 'error.log'),
                level: 'error',
                maxsize: 31457280,
                maxFiles: 5
            })
        ]
    });
};

/**
 * 根据配置获取企业号令牌
 * @returns {Promise.<{}>}
 */
app.fetch = async (object) => {
    if (object) app.config(object);
    logger.log('Getting the latest token...');
    const { corpid, corpsecret } = config;
    if (!corpid || !corpsecret) {
        logger.error(`Configuration error: 'corpid' and 'corpsecret' can not be empty`);
        return setTimeout(process.exit, 500);
    }
    const result = {};
    try {
        const res = await fetch(`${config.url}?${qs.stringify({ corpid, corpsecret })}`, { method: 'GET' });
        const data = await res.json() || {};
        config.data = data;
        const { expires_in, access_token } = data;
        if (!expires_in || !access_token || (typeof expires_in !== 'number')) {
            logger.error(`Get token failed: ${JSON.stringify(data, null, 0)}`);
            return setTimeout(process.exit, 500);
        } else {
            logger.info(`Get token successful: ${JSON.stringify(data, null, 0)}`);
        }
        config.ms = config.ms || expires_in - 200;
        config.ms = config.ms < 400 ? 400 : config.ms; //避免令牌更新频率过快
        if (!config.task) app.task(data);
        app.redis(data);

        Object.assign(result, data);
    } catch (e) {
        logger.error(`Get token failed: ${e}`);
        return setTimeout(process.exit, 500);
    }
    return result;
};

/**
 * 注册令牌自动更新任务
 * @param expires_in
 * @param access_token
 */
app.task = ({ expires_in, access_token }) => {
    if (config.task || !config.ms) return;
    config.task = setInterval(app.fetch, config.ms * 1000);
};

/**
 * 更新令牌到Redis
 * @param data
 * @returns {Promise.<void>}
 */
app.redis = async ({ access_token }) => {
    if (!redis || !access_token || !config.ms) return;
    try {
        await redis.pipeline().del(config.key).set(config.key, access_token, 'EX', config.ms).exec();
    } catch (e) {
        logger.error(`Update token to redis failure: ${e}`);
        return setTimeout(process.exit, 500);
    }
};