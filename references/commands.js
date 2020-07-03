const constants = require('./constants.js');

const _controllerCommandPrefix = (controllerId = 1) => {
    return `C[${controllerId}]`;
}

const _zoneCommandPrefix = (controllerId, zoneId) => {
    return `${_controllerCommandPrefix(controllerId)}.Z[${zoneId}]`;
}

const _sourceCommandPrefix = (sourceId) => {
    return `S[${sourceId}]`;
}

const _commandValue = (command, value) => {
    return `${command ? `.${command.toLowerCase()}${value ? `=\"${value}\"` : ''}` : ''}`
}
const _zoneCommand = (controllerId, zoneId, command, value) => {
    return `${_zoneCommandPrefix(controllerId, zoneId)}${_commandValue(command, value)}`
};

const _sourceCommand = (sourceId, command, value) => {
    return `${_sourceCommandPrefix(sourceId)}${_commandValue(command, value)}`;
};

const systemVersionCommand = () => {
    return constants.SYSTEM.VERSION;
};

const getSystemStatusCommand = () => {
    return `${constants.GET.command} ${constants.SYSTEM.SYSTEM_STATUS}`;
};

const getControllerCommand = (controllerId, command) => {
    return `${constants.GET.command} ${_controllerCommandPrefix(controllerId)}${_commandValue(command)}`;
};

const _getAllCommands = (object, callback) => {
    var commands = []
    Object.keys(object).forEach(key => {
        commands.push(callback(object[key]));
    });
    return commands.join(',');
}


const getAllControllerCommands = (controllerId) => {
    const callback = (value) => {
        return `${_controllerCommandPrefix(controllerId)}${_commandValue(value)}`
    }
    return `${constants.GET.command} ${_getAllCommands(constants.CONTROLLER, callback)}`
};

const eventZoneCommand = (controllerId, zoneId, event, data1, data2) => {
    return `${constants.EVENT.command} ${_zoneCommandPrefix(controllerId, zoneId)}!${event}${data1 ? ` ${data1}` : ''}${data2 ? ` ${data2}` : ''}`
};


const getZoneCommand = (controllerId, zoneId, command) => {
    return `${constants.GET.command} ${_zoneCommand(controllerId, zoneId, command)}`
};

//Get all the Zone settings
const getAllZoneCommands = (controllerId, zoneId) => {
    const callback = (value) => {
        return _zoneCommand(controllerId, zoneId, value)
    }
    return `${constants.GET.command} ${_getAllCommands(constants.CONTROLLER, callback)}`
};

//Make a command request to all 'zones'
const getZonesCommand = (controllerId, command, zones = 6) => {
    var commands = []
    for (let index = 0; index < zones; index++) {
        commands.push(_zoneCommand(controllerId, index + 1, command));
    }
    return `${constants.GET.command} ${commands.join(', ')}`
};

const setZoneCommand = (controllerId, zoneId, command, value) => {
    return `${constants.SET.command} ${_zoneCommand(controllerId, zoneId, command, value)}`
};

//Get all the Source settings
const getAllSourceCommands = (sourceId) => {
    const callback = (value) => {
        return _sourceCommand(sourceId, value);
    }
    return `${constants.GET.command} ${_getAllCommands(constants.GET.SOURCE, callback)}`
};

const _getOnOff = (turnOn) => {
    return ` ${turnOn ? constants.WATCH.ON : constants.WATCH.OFF}`;
}

const getSourceCommand = (sourceId, command) => {
    return `${constants.GET.command} ${_sourceCommand(sourceId, command)}`
};

const getSourcesCommand = (command, sources = 6) => {
    var commands = []
    for (let index = 0; index < sources; index++) {
        commands.push(_sourceCommand(index + 1, command));
    }
    return `${constants.GET.command} ${commands.join(', ')}`
};

const _watchCommand = (command, turnOn) => {
    return `${constants.WATCH.command} ${command}${_getOnOff(turnOn)}`
};

const watchSystemCommand = (turnOn) => {
    return _watchCommand(constants.WATCH.SYSTEM, turnOn)
};

const watchZoneCommand = (controllerId, zoneId, turnOn) => {
    return _watchCommand(_zoneCommand(this.controllerId, zoneId), turnOn);
}

const watchSourceCommand = (sourceId, turnOn) => {
    return _watchCommand(_sourceCommand(sourceId), turnOn);
}

module.exports = {
    watchSystemCommand,
    watchZoneCommand,
    watchSourceCommand,
    getSystemStatusCommand,
    systemVersionCommand,
    getAllControllerCommands,
    getAllZoneCommands,
    getAllSourceCommands,
    getControllerCommand,
    getZonesCommand,
    getSourcesCommand,
    eventZoneCommand,
    getZoneCommand,
    getSourceCommand,
    setZoneCommand,
}