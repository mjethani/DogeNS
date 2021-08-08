/* Copyright (c) 2021 Manish Jethani */

'use strict';

let { Resolver } = require('dns');

let { doge } = require('./assets.json');
let { version, homepage } = require('./package.json');

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
  let { options } = parseArgs(process.argv.slice(2));

  let bind = options.get('--bind') || config.bind;
  if (typeof bind === 'string') {
    let [ address, port = 53 ] = bind.split(':');
    bind = { address, port: +port };
  }

  let upstream = options.get('--upstream') || config.upstream;
  if (typeof upstream === 'string') {
    let [ address, port = 53 ] = upstream.split(':');
    upstream = { address, port: +port };
  }

  let lists = options.get('--block-lists') || config.block.lists;
  if (typeof lists === 'string')
    lists = lists.split(',');

  lists = lists.map(list => list.trim());

  let hosts = options.get('--block-hosts') || config.block.hosts;
  if (typeof hosts === 'string')
    hosts = hosts.split(',');

  hosts = hosts.map(host => host.trim());

  let exceptions = options.get('--block-exceptions') || config.block.exceptions;
  if (typeof exceptions === 'string')
    exceptions = exceptions.split(',');

  exceptions = exceptions.map(exception => exception.trim());

  return ({ bind, upstream, block: { lists, hosts, exceptions } });
}

async function startServer() {
  let { bind, upstream, block: { lists, hosts, exceptions } } = getConfig();

  let resolver = new Resolver();
  resolver.setServers([ `${upstream.address}:${upstream.port}` ]);

  let blocker = new Blocker({ lists, hosts, exceptions });
  blocker.resolver = resolver;
  await blocker.start();

  let dns = new DNS({ bind, upstream });

  dns.blocker = blocker;

  dns.on('error', () => {
    process.exit(1);
  });

  await dns.start();
}

let main = exports.main = async function main() {
  printDoge();

  await startServer();
};

if (require.main === module)
  main();
