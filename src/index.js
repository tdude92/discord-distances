'use strict';

const fs = require('fs');
const {exec} = require('child_process');
const Discord = require('discord.js');
const {Server} = require('socket.io');
const utils = require('./utils/utils.js');

const structs = require('./utils/structures.js');

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

// Create data/ if not exists
if (!fs.existsSync('./data/')) {
    fs.mkdirSync('./data/');
}

// Set up Discord
const client = new Discord.Client();
client.commands = new Discord.Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}


// Setup socketio connection with backend.py
const io = new Server(config.PORT);
console.log(`Listening for backend connection to localhost:${config.PORT}`);
io.on('connection', (socket) => {
    console.log('Connected to Python backend.');

    socket.on('disconnect', () => {
        console.log('Lost connection to Python backend.');
        process.exit(1);
    });

    // Create mutex
    let lock = new structs.Lock(socket);

    // discord.js client event handlers
    client.once('ready', () => {
        console.log('Discord Bot is ready to go!');
    });

    client.on('message', async message => {
        // Ignore messages from bots
        if (message.author.bot) {return;}

        // Collect message that is not a command
        if (!message.content.startsWith(config.PREFIX)) {
            let msgs = message.content.trim()
                                      .split('\n')
                                      .filter(x => x != ''); // Split multiline messages into msgs

            msgs.forEach(msg => {
                fs.appendFile(`./data/${message.author.id}`, msg + '\n', err => {
                    if (err) throw err;
                    console.log(`Logged message from ${message.author.username} (${message.author})`);
                });
            });
            return;
        }

        // Parse message
        let args = message.content.slice(config.PREFIX.length)
                                  .trim()
                                  .split(' ')
                                  .filter(x => x != ''); // In case there are multiple spaces between words.
        
        const command = args.shift();

        // Command is unknown
        if (!client.commands.has(command)) {
            message.channel.send(`Unknown Command: ${message.content}\nType "${config.PREFIX} help" for a list of commands.`);
            return;
        }

        try {
            let cmdObj = client.commands.get(command);

            // Throw CmdError if a non-admin tries to invoke an admin command
            if (cmdObj.admin && !config.ADMINS.includes(message.author.id)) {throw new structs.CmdError('Invalid permissions')}
            
            // Execute the command
            // If lock is active, lockable commands will wait for unlock
            await lock.attempt(cmdObj, message, args);
            await message.react('👍');
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
    
    // TODO: send "NO DATA TO SERVE!" if models have not been updated yet.
    // Update models on startup and queue future updates with setInterval
    socket.emit('update');
    
    let time = new Date();
    setTimeout(() => {
        setInterval(() => {
            socket.emit('update');
        }, config.UPDATE_INTERVAL*60*60*1000);
    }, (config.UPDATE_INTERVAL - (time.getHours()%config.UPDATE_INTERVAL || config.UPDATE_INTERVAL))*60*60*1000 + utils.getHourMilliseconds(time));
    // The 10km long line above computes the number of milliseconds between current time and next update.
    // Updates occur every config.UPDATE_INTERVAL hours after 00:00 the day index.js is run.
});

// Spawn child process and run backend server.
const backend = exec('python3 backend.py');

backend.stdout.on('data', (data) => {
    console.log(data.toString());
});

backend.stderr.on('data', (data) => {
    console.log(data.toString());
    process.exit(1);
});

backend.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
});
