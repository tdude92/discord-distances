'use strict';

const crypto = require('crypto');

module.exports = {
    getNonce: function() {
        return crypto.randomBytes(16).toString('base64');
    }
};