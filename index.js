/*
 * @Author: yinfxs
 * @Date: 2017-08-26 14:13:01
 * @Last Modified by: yinfxs
 * @Last Modified time: 2018-07-12 15:47:53
 */

const path = require('path');
const qs = require('qs');
const fsx = require('fs-extra');
const winston = require('winston');
const fetch = require('node-fetch');
const Redis = require('ioredis');
const moment = require('moment');
moment.locale('zh-cn');

const app = {};
const errcaches_token = {}, errcaches_ticket = {};
module.exports = app;

const config_json = {
    redis: 'redis://127.0.0.1:6379',
    logsDir: path.resolve(process.cwd(), 'wwtoken-logs'),
    configs: [
        {
            corpid: null,
            corpsecret: null,
            token_key: 'wwtoken_access_tokenA',
            token_expires: 7000,
            ticket_key: 'wwtoken_jsapi_ticketA',
            ticket_expires: 7000
        },
        {
            corpid: null,
            corpsecret: null,
            token_key: 'wwtoken_access_tokenB',
            token_expires: 7000,
            ticket_key: 'wwtoken_jsapi_ticketB',
            ticket_expires: 7000
        }
    ]
}

const TOKEN_URL = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken';
const TICKET_URL = 'https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket';
const FORMAT = 'YYYY-MM-DD HH:mm:ss';


var logger = null, redis = null, tasks = {};

/**
 * 初始化配置
 * @param object
 */
app.init = (object) => {
    if (typeof object !== 'object') throw new Error(`Configuration exception: The configuration format is incorrect`);
    logger = initLogs(object);
    redis = initRedis(object);
    initTasks(object).then((result) => {
        tasks = result;
        if (!tasks || Object.keys(tasks).length === 0) throw new Error(`Configuration exception: The configuration format is incorrect`);
        Object.assign(config_json, object);
    });
};

/**
 * 初始化日志配置
 * @param config
 */
function initLogs(config) {
    config.logsDir = config.logsDir || 'wwtoken-logs';
    config.logsDir = path.resolve(process.cwd(), config.logsDir);
    fsx.ensureDirSync(config.logsDir);

    return winston.createLogger({
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
}

/**
 * 初始化Redis配置
 * @param config
 */
function initRedis(config) {
    config.redis = process.env.REDIS_URL || config.redis || 'redis://127.0.0.1:6379';
    return new Redis(config.redis);
}


/**
 * 初始化任务配置
 * @param config
 */
async function initTasks(config) {
    const { configs } = config;
    const result = {};
    if (!Array.isArray(configs) || configs.length === 0) {
        logger.error(`Task initialization exception: The 'configs' parameter can not be empty`);
        return result;
    }
    if (!redis) {
        logger.error(`Task initialization exception: Redis is not configured properly`);
        return result;
    }
    for (const item of configs) {
        if (typeof item !== 'object') continue;
        const { corpid, corpsecret, token_key, ticket_key } = item;
        if (!corpid || !corpsecret) continue;

        // 设置令牌key
        if (!token_key) continue;
        async function token_cb() {
            const token = await app.fetchToken(corpid, corpsecret, token_key);
            if (!token || !token.access_token) return;
            await app.updateRedis(token_key, token.access_token, item.token_expires);
        }
        item.token_expires = item.token_expires || 7000;
        setTimeout(token_cb, 2000);
        result[token_key] = setInterval(token_cb, item.token_expires * 1000 - 600 * 1000);
        logger.info(`√ Task '${token_key}/${item.token_expires}s' is registered successfully`);
        // 设置票据key
        if (!ticket_key) continue;
        async function ticket_cb() {
            const access_token = await redis.get(token_key);
            const ticketObj = await app.fetchTicket(access_token, ticket_key);
            if (!ticketObj || !ticketObj.ticket) return;
            await app.updateRedis(ticket_key, ticketObj.ticket, item.ticket_expires);
        }
        item.ticket_expires = item.ticket_expires || 7000;
        setTimeout(ticket_cb, 8000);
        result[ticket_key] = setInterval(ticket_cb, item.ticket_expires * 1000 - 600 * 1000);
        logger.info(`√ Task '${ticket_key}/${item.ticket_expires}s' is registered successfully`);
    }
    return result;
}

/**
 * 获取企业号令牌
 * @returns {Promise.<{}>}
 */
app.fetchToken = async (corpid, corpsecret, name) => {
    logger.info('Getting the latest token...');
    if (!corpid || !corpsecret) {
        logger.error(`Configuration error: 'corpid' and 'corpsecret' can not be empty`);
        return;
    }
    const key = `${corpid}|${corpsecret}|${name}`;
    errcaches_token[key] = errcaches_token[key] || 0;
    try {
        const url = `${TOKEN_URL}?${qs.stringify({ corpid, corpsecret })}`;
        const res = await fetch(url);
        const data = await res.json() || {};
        const { expires_in, access_token } = data;
        if (!expires_in || !access_token || (typeof expires_in !== 'number')) {
            logger.error(`Get${name ? ` '${name}' ` : ' '}token failed: ${JSON.stringify(data, null, 0)}`);
            return onTokenError({
                key,
                errcaches_token,
                corpid,
                corpsecret,
                name
            });
        } else {
            logger.info(`${moment().format(FORMAT)} => Get${name ? ` '${name}' ` : ' '}token successful! \n Request: ${url} \n Reponse: ${JSON.stringify(data, null, 2)} \n #########################################################`);
            errcaches_token[key] = 0;
            return data;
        }
    } catch (e) {
        logger.error(`Get${name ? ` '${name}' ` : ' '}token failed: ${e}`);
        return onTokenError({
            key,
            errcaches_token,
            corpid,
            corpsecret,
            name
        });
    }
};

/**
 * 获取JSSDK票据
 * @returns {Promise.<{}>}
 */
app.fetchTicket = async (access_token, name) => {
    logger.info('Getting a new ticket...');
    if (!access_token) {
        logger.error(`Configuration error: 'access_token' can not be empty`);
        return;
    }
    const key = `${access_token}|${name}`;
    errcaches_ticket[key] = errcaches_ticket[key] || 0;
    try {
        const url = `${TICKET_URL}?${qs.stringify({ access_token })}`;
        const res = await fetch(url);
        const data = await res.json() || {};
        const { expires_in, ticket } = data;
        if (!expires_in || !ticket || (typeof expires_in !== 'number')) {
            logger.error(`Get${name ? ` '${name}' ` : ' '}ticket failed: ${JSON.stringify(data, null, 0)}`);
            return onTicketError({
                key,
                errcaches_ticket,
                access_token,
                name
            });
        } else {
            logger.info(`${moment().format(FORMAT)} => Get${name ? ` '${name}' ` : ' '}ticket successful! \n Request: ${url} \n Reponse: ${JSON.stringify(data, null, 2)} \n #########################################################`);
            errcaches_ticket[key] = 0;
            return data;
        }
    } catch (e) {
        logger.error(`Get${name ? ` '${name}' ` : ' '}ticket failed: ${e}`);
        return onTicketError({
            key,
            errcaches_ticket,
            access_token,
            name
        });
    }
};

/**
 * 获取token异常时的处理
 * @param {*} param
 */
function onTokenError({ corpid, corpsecret, name, key, errcaches_token }) {
    errcaches_token[key]++;
    if (errcaches_token[key] <= 100) {
        return app.fetchToken(corpid, corpsecret, name);
    }else{
        logger.error(`Get${name ? ` '${name}' ` : ' '}token failed more than 100 times, please check the configuration.`);
    }
}

/**
 * 获取ticket异常时的处理
 * @param {*} param
 */
function onTicketError({ access_token, name, key, errcaches_ticket }) {
    errcaches_ticket[key]++;
    if (errcaches_ticket[key] <= 100) {
        return app.fetchTicket(access_token, name);
    }else{
        logger.error(`Get${name ? ` '${name}' ` : ' '}ticket failed more than 100 times, please check the configuration.`);
    }
}

/**
 * 更新Redis
 * @param data
 * @returns {Promise.<void>}
 */
app.updateRedis = async (key, value, ms) => {
    if (!redis) return logger.error(`Update value to redis failure: Redis is not configured successfully`);
    if (!key || !value || typeof ms !== 'number' || Number.isNaN(ms)) return logger.error(`Update value to redis failure: Parameter exception(key=${key}), value=${value}, ms=${ms}`);
    try {
        await redis.pipeline().del(key).set(key, value, 'EX', ms).exec();
    } catch (e) {
        logger.error(`Update value to redis failure: ${e}`);
    }
};
