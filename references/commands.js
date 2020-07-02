const constants = require('./constants.js');

const controllerCommandPrefix = (controllerId = 1) => {
    return `C[${controllerId}]`;
}

const zoneCommandPrefix = (controllerId, zoneId) => {
    return `${controllerCommandPrefix(controllerId)}.Z[${zoneId}]`;
}

const sourceCommandPrefix = (sourceId) => {
    return `S[${sourceId}]`;
}

const getCommandValue = (command, value) => {
    return `${command ? `.${command.toLowerCase()}${value ? `=\"${value}\"` : ''}` : ''}`
}
const zoneCommand = (controllerId, zoneId, command, value) => {
    return `${zoneCommandPrefix(controllerId, zoneId)}${getCommandValue(command, value)}`
};

const sourceCommand = (sourceId, command, value) => {
    return `${sourceCommandPrefix(sourceId)}${getCommandValue(command, value)}`;
};

const getSystemVersionCommand = () => {
    return constants.SYSTEM.VERSION;
};

const getSystemStatusCommand = () => {
    return `${constants.GET.command} ${constants.SYSTEM.SYSTEM_STATUS}`;
};

const getControllerCommand = (controllerId, command) => {
    return `${constants.GET.command} ${controllerCommandPrefix(controllerId)}${getCommandValue(command)}`;
};

const getObjectCommands = (object, callback) => {
    var commands = []
    Object.keys(object).forEach(key => {
        commands.push(callback(object[key]));
    });
    return commands.join(',');
}


const getControllerCommands = (controllerId) => {
    const callback = (value) => {
        return `${controllerCommandPrefix(controllerId)}${getCommandValue(value)}`
    }
    return `${constants.GET.command} ${getObjectCommands(constants.CONTROLLER, callback)}`
};

const getEventZoneCommand = (controllerId, zoneId, event, data1, data2) => {
    return `${constants.EVENT.command} ${zoneCommandPrefix(controllerId, zoneId)}!${event}${data1 ? ` ${data1}` : ''}${data2 ? ` ${data2}` : ''}`
};

const getZoneCommand = (controllerId, zoneId, command) => {
    return `${constants.GET.command} ${zoneCommand(controllerId, zoneId, command)}`
};

const getZoneCommands = (controllerId, zoneId) => {
    const callback = (value) => {
        return zoneCommand(controllerId, zoneId, value)
    }
    return `${constants.GET.command} ${getObjectCommands(constants.CONTROLLER, callback)}`
};

const getZonesCommand = (controllerId, zones, command) => {
    var commands = []
    for (let index = 0; index < zones; index++) {
        commands.push(zoneCommand(controllerId, index + 1, command));
    }
    return `${constants.GET.command} ${commands.join(', ')}`
};

const setZoneCommand = (controllerId, zoneId, command, value) => {
    return `${constants.SET.command} ${zoneCommand(controllerId, zoneId, command, value)}`
};

const getSourceCommands = (sourceId) => {
    const callback = (value) => {
        return sourceCommand(sourceId, value);
    }
    return `${constants.GET.command} ${getObjectCommands(constants.GET.SOURCE, callback)}`
};

const getOnOff = (turnOn) => {
    return ` ${turnOn ? constants.WATCH.ON : constants.WATCH.OFF}`;
}

const getSourceCommand = (sourceId, command) => {
    return `${constants.GET.command} ${sourceCommand(sourceId, command)}`
};

const getSourcesCommand = (sources, command) => {
    var commands = []
    for (let index = 0; index < sources; index++) {
        commands.push(sourceCommand(index + 1, command));
    }
    return `${constants.GET.command} ${commands.join(', ')}`
};

const getWatchCommand = (command, turnOn) => {
    return `${constants.WATCH.command} ${command}${getOnOff(turnOn)}`
};

const getWatchSystemCommand = (turnOn) => {
    return getWatchCommand(constants.WATCH.SYSTEM, turnOn)
};
const getWatchZoneCommand = (controllerId, zoneId, turnOn) => {
    return getWatchCommand(zoneCommand(this.controllerId, zoneId), turnOn);
}

const getWatchSourceCommand = (sourceId, turnOn) => {
    return getWatchCommand(sourceCommand(sourceId), turnOn);
}

module.exports = {
    getOnOff,
    getWatchSystemCommand,
    getWatchZoneCommand,
    getWatchSourceCommand,
    getSourcesCommand,
    getSourceCommand,
    getSourceCommands,
    setZoneCommand,
    getZoneCommand,
    getZonesCommand,
    getZoneCommands,
    getEventZoneCommand,
    getControllerCommands,
    getControllerCommand,
    getSystemStatusCommand,
    getSystemVersionCommand,
    zoneCommand,
    sourceCommand,
}