'use strict';

const {EventEmitter} = require('events');
const utils = require('../utils/utils.js');

module.exports = {
    name: 'testlock',
    args: ['seconds'],
    desc: 'Activates lock for a specified number of seconds.',
    lockable: false,
    admin: true,
    async execute(message, args, socket) {
        let nonce = utils.getNonce();

        socket.emit('lock', args[0], nonce);

        // Handles timeouts, deactivates lock in event of error, etc.
        utils.onTimeout(socket, nonce, Number(args[0])*1000 + 10000, () => {
            socket.emit('unlock');
        });
    }
};