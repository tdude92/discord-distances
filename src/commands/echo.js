'use strict';

module.exports = {
    name: 'echo',
    args: ['text'],
    desc: 'Repeats whatever the user types after the command.',
    lockable: false,
    admin: false,
    async execute(message, args) {
        message.channel.send(args.join(' '));
        console.log(`[${Date.now()}] Echoed ${message.author.username} (${message.author})`);
    }
};