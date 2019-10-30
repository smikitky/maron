#!/usr/bin/env node

require = require('esm')(module, { cjs: false });
module.exports = require('./src/main.js');
