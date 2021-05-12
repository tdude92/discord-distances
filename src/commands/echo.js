// TODO: Docs
module.exports = {
    name: 'echo',
    args: [],
    desc: 'Echoes a user',
    lockable: false,
    admin: true,
    async execute(message, args) {
        message.channel.send(args.join(' '));
        console.log(`[${Date.now()}] Echoed ${message.author.username} (${message.author})`);
    }
};