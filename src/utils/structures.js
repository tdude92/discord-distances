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

    async attempt(cmdObj, message, args) {
        // If a command is lockable (and the lock is active),
        // hold it until the unlock event is emitted.
        
        // args: Array
        // func: Function
        if (this._locked && cmdObj.lockable) {
            this.once('unlock', () => {
                return cmdObj.execute(message, args, this._socket); // Pass socket to communicate with backend
            });
        } else {
            return cmdObj.execute(message, args, this._socket); // Pass socket to communicate with backend
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