/* Copyright (c) 2021 Manish Jethani */

'use strict';

let dgram = require('dgram');
let { EventEmitter } = require('events');

let dnsPacket = require('dns-packet');

let { info } = require('./log.js');

exports.DNS = class DNS extends EventEmitter {
  #bind;
  #upstream;

  #blocker = null;

  #check = message => {
    if (this.#blocker === null)
      return null;

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
          ttl: 86400
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

  constructor({ bind, upstream }) {
    super();

    this.#bind = bind;
    this.#upstream = upstream;
  }

  get blocker() {
    return this.#blocker;
  }

  set blocker(value = null) {
    this.#blocker = value;
  }

  async start() {
    info(`using resolver ${this.#upstream.address}:${this.#upstream.port}`);

    let lookup = new Map();
    let resolvedCount = 0;

    return new Promise(resolve => {
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
        try {
          let id = message.readUInt16BE();

          info(`received ID ${id} (${message.length} bytes) from ${address}:${port}`);

          let response = this.#check(message);
          if (response !== null) {
            info(`sending ID ${id} (${response.length} bytes) to ${address}:${port}`);

            server.send(response, port, address);

            resolvedCount++;

          } else {
            lookup.set(id, { address, port });

            client.send(message, this.#upstream.port, this.#upstream.address);
          }

        } catch (error) {
          console.error('server message error:', error);

          this.emit('error');
        }
      });

      client.on('message', message => {
        try {
          let id = message.readUInt16BE();

          let { address, port } = lookup.get(id) || {};
          if (typeof address === 'undefined')
            return;

          lookup.delete(id);

          info(`sending ID ${id} (${message.length} bytes) to ${address}:${port}`);

          server.send(message, port, address);

          resolvedCount++;

        } catch (error) {
          console.error('client message error:', error);

          this.emit('error');
        }
      });

      server.on('listening', () => {
        let { address, port } = server.address();

        info(`server listening ${address}:${port}`);

        resolve();
      });

      server.bind(this.#bind.port, this.#bind.address);
    });
  }
};
