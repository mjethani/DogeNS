/* Copyright (c) 2021 Manish Jethani */

'use strict';

let { version, homepage } = require('./package.json');
let { doge } = require('./assets.json');

let { Blocker } = require('./blocker.js');
let { DNS } = require('./dns.js');

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

  let blocker = new Blocker();
  await blocker.start();

  let dns = new DNS();

  dns.on('error', () => {
    process.exit(1);
  });

  await dns.start();
}

if (require.main === module)
  main();
