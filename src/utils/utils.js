'use strict';

const crypto = require('crypto');

module.exports = {
    getNonce: function() {
        return crypto.randomBytes(16).toString('base64');
    },
    getHourMilliseconds(datetime) {
        // Returns number of ms passed in the current hour
        return datetime.getMinutes()*60*1000 + datetime.getSeconds()*1000 + datetime.getMilliseconds();
    }
};