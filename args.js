/* Copyright (c) 2021 Manish Jethani */

exports.parseArgs = function parseArgs(args) {
  let options = new Map();

  for (let arg of args) {
    if (arg.startsWith('--')) {
      let [ name, value = null ] = arg.split('=');
      options.set(name, value);
    }
  }

  return ({ options });
};
