const structs = require('../structures.js');

// TODO: Docs
module.exports = {
    name: 'errortest',
    args: [],
    desc: 'Throws an error for debugging purposes',
    lockable: false,
    admin: true,
    async execute(message, args) {
        message.channel.send('ouch');
        console.log(`[${Date.now()}] Errortest from ${message.author.username} (${message.author})`);
        throw new structs.CmdError('DebugError');
    }
};