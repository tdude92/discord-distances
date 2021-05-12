const fs = require('fs');
const { exec } = require('child_process');
const Discord = require('discord.js');
const {Server} = require('socket.io');

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

// Setup Discord
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

    client.once('ready', () => {
        console.log('Discord Bot is ready to go!');
    });

    client.on('message', async message => {
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
            await lock.attempt(cmdObj, message, args, socket); // Pass socket to communicate with backend
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

    /* TODO delet
    lock.on('lock', () => {
        console.log('locked', lock.locked);
    }).on('unlock', () => {
        console.log('locked', lock.locked);
    });
    socket.emit('update_models');
    */
});

// Spawn child process and run backend server.
const backend = exec('python3 backend.py');

backend.stdout.on('data', (data) => {
    console.log(data.toString());
});

backend.stderr.on('data', (data) => {
    console.log(data.toString());
});

backend.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
});