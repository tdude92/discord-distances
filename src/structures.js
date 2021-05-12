class CmdError extends Error {
    constructor(msg) {
        super();
        this.errorMsg = msg;
    }
}

module.exports = {
    CmdError: CmdError
};