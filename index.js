/**
 * 主模块
 * Created by yinfxs on 2017/5/19.
 */

const Redis = require('ioredis');
const pkgconf = require('./package.json').config || {};
const qs = require('qs');
const fetch = require('node-fetch');
const config = Object.assign({
    tokenKey: 'unexpired_qytoken_access_token',
    redis: 'redis://127.0.0.1:6379',
    ms: 7000
}, pkgconf);
const redis = new Redis(config.redis);
const URL = 'https://qyapi.weixin.qq.com/cgi-bin/gettoken';
const app = {};
module.exports = app;

/**
 * 根据配置获取企业号令牌
 * @returns {Promise.<{}>}
 */
app.fetch = async () => {
    console.log('从接口获取最新令牌......');
    const { corpid, corpsecret } = config;
    if (!corpid || !corpsecret) return console.error('corpid和corpsecret参数配置异常');
    const result = {};
    try {
        const res = await fetch(`${URL}?${qs.stringify({ corpid, corpsecret })}`, { method: 'GET' });
        const data = await res.json() || {};
        console.log(`成功：${JSON.stringify(data, null, 0)}`);
        config.data = data;
        const { expires_in, access_token } = data;
        if (!expires_in || !access_token || (typeof expires_in !== 'number')) return console.error(`令牌接口数据异常：${JSON.stringify(data, null, 0)}`);
        config.ms = config.ms || expires_in - 200;
        config.ms = config.ms < 400 ? 400 : config.ms; //避免令牌更新频率过快
        if (!config.task) app.task(data);
        app.redis(data);

        Object.assign(result, data);
    } catch (e) {
        console.error(`获取令牌接口异常：${e}`);
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
        await redis.pipeline().del(config.tokenKey).set(config.tokenKey, access_token, 'EX', config.ms).exec();
    } catch (e) {
        console.error(`更新令牌到Redis异常：${e}`);
    }
};

app.fetch();
