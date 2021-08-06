/* Copyright (c) 2021 Manish Jethani */

'use strict';

let { version, homepage } = require('./package.json');
let { doge } = require('./assets.json');

function printDoge() {
  console.log(`${Buffer.from(doge, 'base64')}`);

  console.log();
  console.log('Such DNS. Wow.');
  console.log();
  console.log(`v${version}`);
  console.log();
  console.log(`${homepage}`);
  console.log();
}

async function main() {
  printDoge();
}

if (require.main === module)
  main();
