'use strict';

const crypto = require('crypto');
const {EventEmitter} = require('events');

module.exports = {
    getNonce() {
        return crypto.randomBytes(32).toString('base64');
    },
    getHourMilliseconds(datetime) {
        // Returns number of ms passed in the current hour
        return datetime.getMinutes()*60*1000 + datetime.getSeconds()*1000 + datetime.getMilliseconds();
    },
    onTimeout(emitter, event, ms, timeoutCallback) {
        // If emitter does not emit event in ms milliseconds,
        // timeoutCallback will be called.
        let timer = new EventEmitter();

        timer.once('timeout', timeoutCallback);
        emitter.once(event, () => {
            timer.removeListener('timeout', timeoutCallback);
        });

        setTimeout(() => {
            timer.emit('timeout');
        }, ms);
    },
    formatMsg(msg) {
        // Splits punctuation from words in a discord message, stripping all whitespace
        // 'hello, world!' --> ['hello', ',', 'world', '!']
        let specialChars = '!@#$%^&*(<)-=_+`~[]{}\\|;:\'",<.>/?—';
        let split = msg.trim().split(' ');
        let parsed = [];
        for (let chunk of split) {
            // Check if chunks have any special characters and separate them
    
            // Exceptions
            if (chunk[0] == '<' && '@#:'.includes(chunk[1]) ||
                chunk == '@everyone' || chunk == '@here') {
                // Mentions, channels, emotes
                // @everyone, @here
                parsed.push(chunk);
                continue;
            }
    
            while (chunk.length > 0 && specialChars.includes(chunk[0])) {
                // Edge case: special char is first char
                parsed.push(chunk[0]);
                chunk = chunk.substring(1);
            }
    
            let slow = 0;
            for (let fast = 1; fast < chunk.length; ++fast) {
                if (specialChars.includes(chunk[fast])) {
                    parsed.push(chunk.substring(slow, fast)); // Split off word before special char
                    parsed.push(chunk[fast]); // Push special char to parsed
                    slow = ++fast;
                }
            }
    
            if (slow < chunk.length) parsed.push(chunk.substring(slow)); // Push last section to parsed
        }
        return parsed.join(' ');
    },
    progressBar(min, max, width, val) {
        const cellWidth = (max - min) / width;
        const nCells = Math.floor((val - min) / cellWidth);
        return `\`\`\`[${'#'.repeat(nCells)}${'—'.repeat(width - nCells)}]  ${val}\`\`\``;
    }
};