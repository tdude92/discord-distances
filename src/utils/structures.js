'use strict';

const EventEmitter = require('events');


class CmdError extends Error {
    constructor(msg) {
        super();
        this.errorMsg = msg;
    }
}


// Mutex class to control read/write access to discord-distances/imgcache/
class Lock extends EventEmitter {
    constructor(socket) {
        super();
        this._socket = socket; // Socket descriptor to backend.py
        this._locked = false;

        this._socket.on('unlock', () => {
            this.unlock();
        }).on('lock', () => {
            this.lock();
        });
    }

    async attempt(func, args) {
        // If lock is active, call the function on unlock
        // Otherwise, just call the function
        if (this._locked) {
            this.once('unlock', () => {
                return func(...args);
            });
        } else {
            return func(...args);
        }
    }

    async attemptCmd(func, args, message) {
        // Same as attempt but assumes func is a cmdObj.execute
        // And notifies command caller that the bot is currently locked
        if (this._locked) {
            this.once('unlock', () => {
                return func(...args);
            });
            message.channel.send('Currently performing heavy computations. Will serve result shortly :)');
        } else {
            return func(...args);
        }
    }

    async lock() {
        this._locked = true;
        this.emit('lock');
        console.log("[MUTEX] Locked");
    }

    async unlock() {
        this._locked = false;
        this.emit('unlock');
        console.log("[MUTEX] Unlocked");
    }

    get locked() {
        return this._locked;
    }
}


module.exports = {
    CmdError: CmdError,
    Lock: Lock
};