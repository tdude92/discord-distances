const { time } = require('console');
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
        let timer = new EventEmitter();
        let timeoutCallback = () => {
            socket.emit('unlock');
        };

        timer.once(nonce, timeoutCallback);
        socket.once(nonce, () => {
            timer.removeListener(nonce, timeoutCallback);
        });

        setTimeout(() => {
            timer.emit(nonce);
        }, Number(args[0])*1000 + 10000);
    }
};