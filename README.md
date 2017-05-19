# 永不过期的企业号令牌

本模块只干一件事，即将企业号令牌缓存到Redis中，并保证每次从Redis中获取的都是有效的企业号令牌。

### 下载项目

先将项目代码`clone`到本地（或你想自动更新的服务器）：

```bash
git clone https://github.com/yinfxs/unexpired-qytoken.git
cd ./unexpired-qytoken
npm install
```

>Tips：如果你能看懂代码中的调用逻辑，你也可以直接将本模块合并到你的项目中。

## 模块配置

在启动本模块前，需要在`package.json`中进行相关配置，以下是所有参数的含义描述：

* corpid：CorpID
* corpsecret：CorpSecret
* tokenKey：令牌数据缓存在Redis的键
* redis：Redis的连接地址，按照`ioredis`的规范指定配置即可
* ms：令牌自动刷新的间隔秒数，可选参数，目前企业号令牌过期时间为7200秒，默认7000秒获取一次接口并刷新缓存

### 启动模块

在模块根目录下执行：

```bash
npm start
```

这种启动方式，会让模块在前台运行，但是更多时候，我们可能需要让该模块长期在后台运行，这里可以直接利用`pm2`工具实现。

1. 首先全局安装`pm2`工具：

```bash
npm i pm2 -g
```

2. 然后用进入模块根目录下，执行启动命令：

```bash
pm2 start -n unexpired-qytoken index.js
```

### 使用令牌

每次使用令牌时，直接通过上面设置的`tokenKey`从Redis中获取即可，获取的值即为访问令牌数据。

### 传送门

* [PM2工具](https://www.npmjs.com/package/pm2)
* [ioredis](https://www.npmjs.com/package/ioredis)
* [Redis](https://redis.io/)
* [企业号开发者接口文档](http://qydev.weixin.qq.com/wiki/index.php)
* [企业号AccessToken](http://qydev.weixin.qq.com/wiki/index.php?title=AccessToken)
* [企业号主动调用](http://qydev.weixin.qq.com/wiki/index.php?title=主动调用)