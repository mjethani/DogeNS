/* Copyright (c) 2021 Manish Jethani */

'use strict';

let dgram = require('dgram');
let { EventEmitter } = require('events');

let dnsPacket = require('dns-packet');

let { upstream } = require('./config.json');

let { info } = require('./log.js');

exports.DNS = class DNS extends EventEmitter {
  #blocker;

  #check = message => {
    let packet = dnsPacket.decode(message);
    if (packet.type === 'query') {
      let [ question ] = packet.questions;

      if (question.class === 'IN' &&
          (question.type === 'A' || question.type === 'AAAA') &&
          this.#blocker.shouldBlock(question.name)) {

        info(`should block name '${question.name}' for ${question.type} query`);

        let answer = {
          name: question.name,
          type: question.type,
          class: question.class,
          data: question.type === 'A' ? '0.0.0.0' : '::',
          ttl: 300
        };

        return dnsPacket.encode({
          type: 'response',
          id: packet.id,
          flags: dnsPacket.RECURSION_DESIRED | dnsPacket.RECURSION_AVAILABLE,
          questions: [ question ],
          answers: [ answer ]
        });
      }
    }

    return null;
  }

  constructor({ blocker }) {
    super();

    this.#blocker = blocker;
  }

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

        let response = this.#check(message);
        if (response !== null) {
          info(`sending ID ${id} (${response.length} bytes) to ${address}:${port}`);

          server.send(response, port, address);

          resolvedCount++;

        } else {
          lookup.set(id, { address, port });

          client.send(message, resolver.port, resolver.host);
        }
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
