'use strict';

const crypto = require('crypto');
const {EventEmitter} = require('events');

module.exports = {
    getNonce() {
        return crypto.randomBytes(16).toString('base64');
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
    }
};