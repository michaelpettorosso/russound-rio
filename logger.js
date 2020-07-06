class Logger {
    _logDebug = false;

    constructor(debug = false) {
        this._logDebug = debug
    }

    log = (msg, ...optionalParams) => { console.log(msg, ...optionalParams) };
    info = (msg, ...optionalParams) => { console.log('[INFO]', msg, ...optionalParams) };
    debug = (msg, ...optionalParams) => { if (this._logDebug) console.log('[DEBUG]', msg, ...optionalParams) };
    error = (msg, ...optionalParams) => { console.log('[ERROR]', msg, ...optionalParams) };
}

module.exports = Logger;
