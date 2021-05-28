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
            // Signal for backend to generate scatterplot
            const nonce = utils.getNonce();
            plotImgPath = await new Promise((res, rej) => {
                socket.once(nonce, (e) => {
                    if (e) rej(e);
                    res(`${guild.id}.jpg`);
                });

                socket.emit('scatter', nonce, guild.id);
            });
        }

        let reply = new Discord.MessageEmbed()
                    .setColor('#2e8b57')
                    .attachFiles([`./cache/figs/${plotImgPath}`])
                    .setAuthor(`${message.author.tag}`, message.author.displayAvatarURL())
                    .setTitle(`Guild Plot for **${guild.name}**`)
                    .setThumbnail(guild.iconURL())
                    .setImage(`attachment://${guild.id}.jpg`);
        message.channel.send(reply);
    }
};