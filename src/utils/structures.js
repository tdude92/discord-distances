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

        this._socket.on('unlock', (e) => {
            if (e) {console.error(e);}
            this.unlock();
        }).on('lock', (e) => {
            if (e) {console.error(e);}
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