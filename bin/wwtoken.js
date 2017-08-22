#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const package = require('../package.json');
const token = require('../index');
const program = require('commander');

program
.version(package.version)
.option('-c, --config [config_file]', 'Specify a configuration file')
.parse(process.argv);

/**
 * 检测配置文件
 * @param file
 */
function lstatConfigFile(file) {
    try {
        const stat = fs.lstatSync(path.resolve(process.cwd(), file));
        return stat.isFile();
    } catch (e) {
        // ignore err.
    }
    return false;
}

/**
 * 触发配置
 * @param file
 */
function configAction(file) {
    file = file || 'wwtoken.config.js';
    const defaultNames = ['config.js', 'config.json', 'wwtoken.config.js', 'wwtoken.config.json', '.wwtokenrc'];
    for (const name of defaultNames) {
        if (!lstatConfigFile(name)) continue;
        file = name;
    }
    if (!file) return program.help();

    const absolute_path = path.resolve(process.cwd(), file);
    const config = require(absolute_path);
    token.fetch(config);
}

configAction(program.config);