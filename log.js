/* Copyright (c) 2021 Manish Jethani */

'use strict';

exports.info = function info(...args) {
  console.info(`[${(new Date()).toISOString()}]`, ...args);
};
