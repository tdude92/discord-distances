const fs = require('fs');
const Discord = require('discord.js');
const io = require('socket.io-client');

const structs = require('./structures.js');

// Import config.json
let config;
try {
    config = require('./config.json');
} catch (e) {
    // Ensure config.json exists
    if (e.code == 'MODULE_NOT_FOUND') {
        console.error('Please run discord-distances/config.py first!');
    } else {
        console.error(e);
    }
    process.exit(1);
}

const client = new Discord.Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

client.once('ready', () => {
    console.log('Ready to go!');
});

client.on('message', message => {
    // Ignore messages from bots and without prefix
    if (!message.content.startsWith(config.PREFIX) || message.author.bot) {return;}

    // Parse message
    let args = message.content.slice(config.PREFIX.length)
                                .trim()
                                .split(' ')
                                .filter(x => x != ''); // In case there are multiple spaces between words.
    
    const command = args.shift();
    if (!client.commands.has(command)) {return;}

    try {
        // Attempt to execute the command
        let cmdObj = client.commands.get(command);

        if (cmdObj.admin && !config.ADMINS.includes(message.author.id)) {throw new structs.CmdError('Invalid permissions')}
        cmdObj.execute(message, args);
    } catch (e) {
        if (e instanceof structs.CmdError) {
            // Error is the user's fault
            console.log(`[${Date.now()}] Error from ${message.author.username} (${message.author}): ${message.content}`)
            message.channel.send(`Error executing commmand: ${e.errorMsg}.`)
        } else {
            // Error is the server's fault
            console.error(e);
            message.channel.send(`An internal server error occured :(`)
        }
    }
});

client.login(config.TOKEN);
