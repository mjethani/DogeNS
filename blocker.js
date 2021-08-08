/* Copyright (c) 2021 Manish Jethani */

'use strict';

let { EventEmitter } = require('events');
let https = require('https');

let { FastHostsLookup } = require('fast-hosts-lookup');

let { info } = require('./log.js');

function getListURL(name) {
  return `https://blocklistproject.github.io/Lists/alt-version/${name}-nl.txt`;
}

function readList(message) {
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

function downloadList(url, lookup) {
  info(`downloading block list ${url}`);

  return new Promise((resolve, reject) => {
    https.get(url, { lookup }, message => {
      if (message.statusCode !== 200)
        reject(`Download failed for block list ${url} with HTTP status code ${message.statusCode}.`);
      else
        resolve(readList(message));
    })
    .on('error', reject);
  });
}

function* parseList(content) {
  for (let line of content.split(/\n/g)) {
    line = line.trim();

    if (line === '' || line[0] === '#')
      continue;

    yield line;
  }
}

exports.Blocker = class Blocker extends EventEmitter {
  #lookup = new FastHostsLookup();

  #lists;
  #hosts;
  #exceptions;

  #resolver;

  constructor({ block: { lists, hosts, exceptions }, resolver }) {
    super();

    this.#lists = lists;
    this.#hosts = hosts;
    this.#exceptions = exceptions;

    this.#resolver = resolver;
  }

  async start() {
    let hostCount = 0;

    let dnsLookup = (hostname, options, callback) => {
      this.#resolver.resolve4(hostname, options, (error, [ address ]) => {
        callback(error, address, 4);
      });
    };

    for (let url of this.#lists.map(getListURL)) {
      for (let hostname of parseList(await downloadList(url, dnsLookup))) {
        this.#lookup.add(hostname);
        hostCount++;
      }
    }

    for (let hostname of this.#hosts) {
      this.#lookup.add(hostname);
      hostCount++;
    }

    info(`blocking ${hostCount} hosts`);

    for (let hostname of this.#exceptions)
      this.#lookup.addException(hostname);
  }

  shouldBlock(hostname) {
    return this.#lookup.has(hostname);
  }
};
