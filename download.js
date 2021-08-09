/* Copyright (c) 2021 Manish Jethani */

'use strict';

let https = require('https');

function read(message) {
  return new Promise(resolve => {
    let content = '';

    message.setEncoding('utf8');

    message.on('data', chunk => {
      content += chunk;
    });

    message.on('end', () => {
      resolve(content);
    });
  });
}

exports.download = function download(url, lookup) {
  return new Promise((resolve, reject) => {
    https.get(url, { lookup }, message => {
      if (message.statusCode !== 200)
        reject(new Error(`Download failed for ${url} with HTTP status code ${message.statusCode}.`));
      else
        resolve(read(message));
    })
    .on('error', reject);
  });
};
