// SUPER DUPER SUPER JANKY LMAO

'use strict';

const fs = require('fs');
const https = require('https');

function getAvatars(client) {
    return Promise.all(fs.readdirSync('./cache/models/').map(async file => {
        // Download avatar if not exists
        let uid = file.substring(0, file.length - 3); // Remove .kv file extension
        let u = await client.users.fetch(uid);
        let avatarUrl = u.displayAvatarURL();
        return new Promise((resolve, reject) => {
            let avatarFile = fs.createWriteStream(`./cache/avatars/${uid}.jpg`);
            let req = https.get(avatarUrl, (res) => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error('Error ' + res.statusCode));
                }

                res.on('data', (chunk) => {
                    avatarFile.write(chunk);
                });

                res.on('end', () => {
                    avatarFile.end();
                    resolve(true);
                });
            });

            req.on('error', (err) => {
                reject(err);
            })

            req.end();
        });
    }));
}

module.exports = {
    name: 'update',
    args: [],
    desc: 'Updates distances between users.',
    lockable: true,
    admin: true,
    async execute(message, args, socket, client, lock) {
        socket.once('finish_update', async () => {
            // No nonce needed bc program ensures only one update is running at a time
            await getAvatars(client);
            await lock.unlock();
        });

        socket.emit('update');
    }
};