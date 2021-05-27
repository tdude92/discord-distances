// TODO
'use strict';
const Discord = require('discord.js');
const fsPromises = require('fs/promises');
const utils = require('../utils/utils.js');

module.exports = {
    name: 'server',
    args: [],
    desc: 'Displays a scatter plot of the whitelisted users in this server.',
    lockable: true,
    admin: false,
    async execute(message, args, socket) {
        const guild = message.guild;
        let plotImgPath = `${guild.id}.jpg`;
        if (!(await fsPromises.readdir('./cache/figs/')).includes(`${guild.id}.jpg`)) {
            // Scatter plot for guild doesn't already exist
            const guildMembers = await guild.members.fetch();

            // Grab list of users in guild
            const users = (await fsPromises.readdir('./cache/models/'))
                        .map(file => file.substring(0, file.length - 3))
                        .filter(uid => guildMembers.has(uid));
            
            const nonce = utils.getNonce();
            plotImgPath = await new Promise((res, rej) => {
                socket.once(nonce, () => {
                    res(`${guild.id}.jpg`);
                });
            });

            socket.emit('scatter', {nonce: nonce, users: users, guild: guild});
        }

        let reply = new Discord.MessageEmbed
                    .setColor('#2e8b57')
                    .attachFiles([plotImgPathl])
                    .setAuthor(`${message.author.tag}`, message.author.displayAvatarURL())
                    .setThumbnail(guild.iconURL())
                    .setImage(`./cache/figs/${guild.id}.jpg`);
        message.channel.send(reply);
    }
};