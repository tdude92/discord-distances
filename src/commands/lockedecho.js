// TODO: Docs
module.exports = {
    name: 'lockedecho',
    args: [],
    desc: 'Echoes a user. Affected by mutex for debugging purposes.',
    lockable: true,
    admin: true,
    async execute(message, args) {
        message.channel.send(args.join(' '));
        console.log(`[${Date.now()}] Echoed ${message.author.username} (${message.author})`)
    }
};