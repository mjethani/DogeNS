/* Copyright (c) 2021 Manish Jethani */

'use strict';

let { EventEmitter } = require('events');
let dgram = require('dgram');

let { upstream } = require('./config.json');

let { info } = require('./log.js');

exports.DNS = class DNS extends EventEmitter {
  async start() {
    let resolver = {
      host: upstream.host,
      port: upstream.port || 53
    };

    info(`using resolver ${resolver.host}:${resolver.port}`);

    let lookup = new Map();
    let resolvedCount = 0;

    return new Promise((resolve, reject) => {
      let server = dgram.createSocket('udp4');
      let client = dgram.createSocket('udp4');

      server.on('error', error => {
        console.error('server error:', error);

        this.emit('error');
      });

      client.on('error', error => {
        console.error('client error:', error);

        this.emit('error');
      });

      server.on('message', (message, { address, port }) => {
        let id = message.readUInt16BE();

        info(`received ID ${id} (${message.length} bytes) from ${address}:${port}`);

        lookup.set(id, { address, port });

        client.send(message, resolver.port, resolver.host);
      });

      client.on('message', message => {
        let id = message.readUInt16BE();

        let { address, port } = lookup.get(id) || {};
        if (typeof address === 'undefined')
          return;

        lookup.delete(id);

        info(`sending ID ${id} (${message.length} bytes) to ${address}:${port}`);

        server.send(message, port, address);

        resolvedCount++;
      });

      server.on('listening', () => {
        let { address, port } = server.address();

        info(`server listening ${address}:${port}`);

        resolve();
      });

      server.bind(53);
    });
  }
};
