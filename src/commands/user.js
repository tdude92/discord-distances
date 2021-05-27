// TODO
'use strict';
const Discord = require('discord.js');
const utils = require('../utils/utils.js');
const fsPromises = require('fs/promises');


function getClosest(distances, max = 5) {
    let out = '';
    for (let i = 0; i < distances.length && i < max; ++i) {
        out += `${i + 1}. ${distances[i][0]} ${utils.progressBar(0.05, 1, 20, distances[i][1].toFixed(4))}\n`
    }
    return out;
}
function getFarthest(distances, max = 5) {
    let reversedDistances = [...distances].sort((a, b) => b[1] - a[1]);
    return getClosest(reversedDistances, max = max);
}


module.exports = {
    name: 'user',
    args: ['@user [OPTIONAL]'],
    desc: 'Displays closest users to you in terms of texting style. Optionally mention another user to check their similarities.',
    lockable: true,
    admin: false,
    async execute(message, args) {
        let distances;
        try {
            distances = await fsPromises.readFile('./cache/distances.json');
            distances = JSON.parse(distances);
        } catch (e) {
            // No data currently
            if (e.code == 'MODULE_NOT_FOUND') {
                console.log(`${message.author.username} (${message.author.id}) requested user info. No data currently.`);
                message.channel.send('Data unavailable. Try again in a couple hours.')
                return;
            } else {
                console.log(`${message.author.username} (${message.author.id}) requested user info. Error.`);
                throw e;
            }
        }

        let uid = null;
        if (args.length > 0) {
            // Check other user
            if (args[0].substring(0, 2) == '<@' && args[0][args[0].length - 1] == '>') {
                uid = args[0].substring(2, args[0].length - 1);
            }
            if (args[0].substring(0, 3) == '<@!' && args[0][args[0].length - 1] == '>') {
                uid = args[0].substring(3, args[0].length - 1);
            }
        } else {
            // Check self
            uid = message.author.id;
        }

        console.log(`${message.author.username} (${message.author.id}) requested user info on ${uid}`);
        if (!distances.hasOwnProperty(uid)) {
            message.channel.send('Unknown user.')
            return;
        } else {
            let userDistances = [];

            Object.keys(distances[uid]).forEach(key => {
                userDistances.push([key, distances[uid][key]]);
            });

            userDistances = userDistances
                            .sort((a, b) => a[1] - b[1])
                            .map(pair => {
                                return [`<@!${pair[0]}>`, pair[1]];
                            });

            // Display top 5 closest users
            let reply = new Discord.MessageEmbed()
                        .setColor('#2e8b57')
                        .attachFiles([`./cache/avatars/${uid}.jpg`])
                        .setAuthor(`${message.author.tag}`, message.author.displayAvatarURL())
                        .setThumbnail(`attachment://${uid}.jpg`)
                        .addField('\u200B', '\u200B')
                        .addField('Nearest', getClosest(userDistances))
                        .addField('\u200B', '\u200B')
                        .addField('Farthest', getFarthest(userDistances))
                        .addField('\u200B', 'https://github.com/tdude92/discord-distances');
            
            message.channel.send(reply);
        }
    }
};