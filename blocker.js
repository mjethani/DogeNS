/* Copyright (c) 2021 Manish Jethani */

'use strict';

let { EventEmitter } = require('events');

let { FastHostsLookup } = require('fast-hosts-lookup');

let { download } = require('./download.js');
let { info } = require('./log.js');

function getListURL(name) {
  return `https://blocklistproject.github.io/Lists/alt-version/${name}-nl.txt`;
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

  #resolver = null;

  constructor({ lists, hosts, exceptions }) {
    super();

    this.#lists = lists;
    this.#hosts = hosts;
    this.#exceptions = exceptions;
  }

  get resolver() {
    return this.#resolver;
  }

  set resolver(value = null) {
    this.#resolver = value;
  }

  async start() {
    let hostCount = 0;

    let dnsLookup = null;

    if (this.#resolver !== null) {
      dnsLookup = (hostname, options, callback) => {
        this.#resolver.resolve4(hostname, options, (error, [ address ]) => {
          callback(error, address, 4);
        });
      };
    }

    for (let url of this.#lists.map(getListURL)) {
      info(`downloading block list ${url}`);

      for (let hostname of parseList(await download(url, dnsLookup))) {
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
