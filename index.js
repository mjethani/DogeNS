/* Copyright (c) 2021 Manish Jethani */

'use strict';

let { Resolver } = require('dns');

let { version, homepage } = require('./package.json');
let { doge } = require('./assets.json');

let { parseArgs } = require('./args.js');
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

function getConfig() {
  let config = require('./config.json');
  let args = parseArgs(process.argv.slice(2));

  let bind = config.bind;

  let upstream = args.options.get('--upstream') || config.upstream;
  if (typeof upstream === 'string') {
    let [ host, port = 53 ] = upstream.split(':');
    upstream = { host, port: +port };
  }

  let block = config.block;

  return ({ bind, upstream, block });
}

let main = exports.main = async function main() {
  printDoge();

  let { bind, upstream, block: { lists, hosts, exceptions } } = getConfig();

  let resolver = new Resolver();
  resolver.setServers([ `${upstream.host}:${upstream.port}` ]);

  let blocker = new Blocker({ block: { lists, hosts, exceptions }, resolver });
  await blocker.start();

  let dns = new DNS({ net: { bind, upstream }, blocker });

  dns.on('error', () => {
    process.exit(1);
  });

  await dns.start();
};

if (require.main === module)
  main();
