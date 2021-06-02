'use strict';

const fs = require('fs');

// Get bot command prefix
const prefix = require('../config.json').PREFIX;

// Load commands
let commands = new Map();
const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    if (file == 'help.js') {continue;}

    const command = require('./' + file);

    // Only add non-admin commands
    if (!command.admin) {
        commands.set(command.name, command);
    }
}

module.exports = {
    name: 'help',
    args: [
        'command [OPTIONAL]'
    ],
    desc: `Sends descriptions of non-admin commands. Type ${prefix} help to list all commands.`,
    lockable: false,
    admin: false,
    async execute(message, args) {
        if (args.length > 0) {
            // Detailed information about one command
            let cmdName = args[0];

            // Check if commands has command
            if (commands.has(cmdName)) {
                let cmdObj = commands.get(cmdName);
                let reply = 'COMMAND HELP\n-----------------\n';
                
                reply += `Command Name: ${cmdObj.name}\n`;
                reply += `Usage: ${prefix} ${cmdObj.name} `;
                cmdObj.args.forEach(arg => {reply += `<${arg}> `});
                reply += `\nDescription: ${cmdObj.desc}`;

                message.channel.send(reply);
            } else {
                message.channel.send(`Unknown command: ${cmdName}`);
            }
        } else {
            // General information about all commands
            let reply = `
DISCORD DISTANCES
-----------------
I'm a bot that can check how similarly two Discord users' texting styles are.
However, to do this, I'll need to record your texts and work with your data.
If you want to use my features and consent to having your messaging data logged, type ">dd allow".
            
COMMAND HELP
-----------------\n`;
            commands.forEach(cmdObj => {
                reply += `**${prefix} ${cmdObj.name}`;
                cmdObj.args.forEach(arg => {reply += ` <${arg}>`});
                reply += `**: ${cmdObj.desc}\n`;
            });
            message.channel.send(reply);
        }
    }
};

commands.set('help', module.exports);
