/**
 *  Russound RIO.js 
 *
 *  Author: michael@pettorosso.com
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 *
 *  Based on python code from russound-rio
 * 
 *      https://pypi.org/project/russound-rio/
 *  
 *  Supported Commands:
 *   Zone On/Off state
 *   Source selected -1
 *   Volume level (0 - 50, 0 = 0 Displayed ... 50 = 100 Displayed)
 *   Bass level (0 = -10 ... 10 = Flat ... 20 = +10)
 *   Treble level (0 = -10 ... 10 = Flat ... 20 = +10)
 *   Loudness (0 = OFF, 1 = ON )
 *   Balance level (0 = More Left ... 10 = Center ... 20 = More Right)
 *   System On state (0 = All Zones Off, 1 = Any Zone is On)
 *   Shared Source (0 = Not Shared 1 = Shared with another Zone)
 *   Party Mode state (0 = OFF, 1 = ON, 2 = Master)*
 *   Do Not Disturb state (0 = OFF, 1 = ON )*
*/
//*** Config
//  {
//     "mca-series": true,
//     "controllers": [
//         {
//           "name": 
//           "ip": "192.168.1.250",
//           "controller": 1,
//           "zones": 6,
//           "sources": 6
//         }
//       ]
//     }
//   }
const constants = require('./references/constants.js');
const commands = require('./references/commands.js');
const async = require('async');
const EventEmitter = require('events');
const net = require('net');

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

class Controller {
    controllerId = 1;
    name = 'Russound';
    sources = 6;
    zones = 6;
    ip = null;
    port = 9621;
    constructor(config) {
        if (config) {
            this.controllerId = config.controller || 1;
            this.sources = config.sources || 6;
            this.zones = config.zones || 6;
            this.ip = config.ip;
            this.port = config.port || 9621;
            this.name = config.name || 'Russound';
        }

    }
}

const enums = {
    EMIT: constants.EMIT,
    EVENT: constants.EVENT,
    EVENT_KEY_PRESS: constants.EVENT_KEY_PRESS,
    EVENT_KEY_RELEASE: constants.EVENT_KEY_RELEASE,
    EVENT_KEY_HOLD: constants.EVENT_KEY_HOLD,
    ZONE: constants.GET.ZONE,
    SOURCE: constants.GET.SOURCE,
}



class RIO extends EventEmitter {
    _config = null;
    _logger = null;
    watchSocket = null;
    sourceState = [];
    zoneState = [];
    watchedItems = {};
    commandQueue = null;
    _controller = null;

    constructor(config, logger) {
        super();
        this._config = config;
        this._logger = logger;
        if (!logger) {
            this.logger = new Logger(this._getConfig('debug') === true)
        }
        this._controller = new Controller(this._getControllerConfig());
        this.commandQueue = async.queue((data, callback) => this.processCommandQueue(data, callback));
    }
    static enums = {
        EMIT: enums.EMIT,
        ZONE: enums.ZONE,
        SOURCE: enums.SOURCE
    }

    _regCommandResponse = /(?:(?:S\[(?<sourceId>\d)+\])|(?:C\[(?<controllerId>\d+)\].Z\[(?<zoneId>\d+)\]))\.(?<variable>\S+)=\"(?<value>.*)\"/;
    _regControllerResponse = /(?:C\[(?<controllerId>\d+)\])\.(?<variable>\S+)=\"(?<value>.*)\"/;

    _getConfig = (node) => {
        if (this._config) {
            if (node)
                return this._config[node];
            else
                return this._config;
        }
        else return null;
    }

    _getControllerConfig = (controller = 1) => {
        var controllers = this._getConfig('controllers');

        if (controllers && controller > 0 && controllers.length > controller - 1) {
            return controllers[controller - 1]
        }
        return null;
    }

    writeCommand = (command) => {
        if (!command || command.length == 0) return false;
        if (!this.watchSocket || !this.watchSocket.writable) return null;
        this.logDebug(`TX > ${command}`);
        this.watchSocket.write(`${command}\r`);
        return true;
    }

    _incompleteData = null;

    readCommandResponses = (data) => {
        if (data.length === 0 && !this._incompleteData) return [];

        var events = data.toString().split('\r\n');

        if (this._incompleteData) {
            this.logDebug(`Incomplete data processed '${this._incompleteData}' + '${events[0]}'`);
            events[0] = this.incompleteData + events[0];
            this._incompleteData = null;
        }
        if (!data.toString().endsWith('\r\n')) {
            this._incompleteData = events.pop();
            this.logDebug(`Incomplete data detected '${this._incompleteData}'`);
        }

        var responses = [];
        events.forEach(response => {
            if (response === 'true')
                responses.push({ type: constants.RESPONSE.SUCCESS, value: null })
            else
                var type = response.substring(0, 1);

            var commands = (response.substring(2).split(','))
            commands.forEach(value => {
                if (value !== '')
                    responses.push({ type, value })
            })
        });

        return responses;
    }

    processCommandQueue = (data, callback) => {
        var cmd = this.writeCommand(data);
        if (cmd === true)
            callback(true);
        else {
            var errMsg = 'Russound RIO not connected.';
            if (cmd === false)
                errMsg = 'No command specified';
            this.logDebug(errMsg);
            callback(null, errMsg);
        }
    }

    _command = (cmd, callback) => {
        this.commandQueue.push(cmd, callback);
    }

    commandPromise = async (cmd) => {
        return new Promise((resolve, reject) => {
            this._command(cmd, (response, err) => {
                if (err)
                    reject(err);
                else
                    resolve(response);
            });
        });
    }

    _getZoneCommand = async (zoneId, command) => {

        var cmd = commands.getZoneCommand(this._controller.controllerId, zoneId, command);
        return this.commandPromise(cmd)
    }

    _setZoneCommand = async (zoneId, command, value) => {
        var cmd = commands.setZoneCommand(this._controller.controllerId, zoneId, command, value);
        return this.commandPromise(cmd);
    }

    storeCachedZoneVariable = (zoneId, variable, value) => {
        //Stores the current known value of a zone variable into the cache. Calls any zone callbacks.
        var zoneState = this.retrieveCachedZoneVariable(zoneId, variable)
        if (!zoneState) {
            zoneState = { id: zoneId };
            this.zoneState.push(zoneState)
        }
        zoneState[variable.toLowerCase()] = value;
    }
    storeCachedSourceVariable = (sourceId, variable, value) => {
        //Stores the current known value of a source variable into the cache. 
        var sourceState = this.retrieveCachedSourceVariable(sourceId, variable)
        if (!sourceState) {
            sourceState = { id: sourceId };
            this.sourceState.push(sourceState)
        }
        sourceState[variable.toLowerCase()] = value
    }
    retrieveCachedSourceVariable = (sourceId, variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        return this.sourceState.find(s => s.id === sourceId && s.hasOwnProperty(variable.toLowerCase()));
    }

    retrieveCachedZoneVariable = (zoneId, variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        return this.zoneState.find(z => z.id === zoneId && z.hasOwnProperty(variable.toLowerCase()));;
    }

    _sendZoneEvent = async (zoneId, eventId, data1, data2) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = commands.eventZoneCommand(this._controller.controllerId, zoneId, eventId, data1, data2);
        return this.commandPromise(cmd);
    }

    _sendZoneKeyReleaseEvent = async (zoneId, keycode) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = commands.eventZoneCommand(this._controller.controllerId, zoneId, enums.EVENT_KEY_RELEASE.command, keycode);
        return this.commandPromise(cmd);
    }

    _sendZoneKeyHoldEvent = async (zoneId, keycode) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = commands.eventZoneCommand(this._controller.controllerId, zoneId, enums.EVENT_KEY_HOLD.command, keycode, 150);
        return this.commandPromise(cmd);
    }

    _watch = async (watchItem, watchCmd, turnOn) => {
        return new Promise((resolve, reject) => {
            var watchedItem = this.watchedItems[watchItem]
            if (turnOn && !watchedItem || !turnOn && watchedItem) {
                this.commandPromise(watchCmd).then(response => {
                    this.watchedItems[watchItem] = turnOn
                    resolve(constants.RESPONSE.SYSTEM);
                })
                    .catch(err => {
                        reject(`${constants.RESPONSE.ERROR} ${err}`)
                    })
            }
            else
                resolve(constants.RESPONSE.SYSTEM);
        });
    }

    watch = {
        system: async (turnOn = true) => {
            var watchCmd = commands.watchSystemCommand(turnOn);
            var watchItem = constants.WATCH.SYSTEM;
            return this._watch(watchItem, watchCmd, turnOn);
        },

        zone: async (zoneId, turnOn = true) => {
            var watchCmd = commands.watchZoneCommand(this._controller.controllerId, zoneId, turnOn);
            var watchItem = `zone${zoneId}`;
            return this._watch(watchItem, watchCmd, turnOn);
        },
        source: async (sourceId, turnOn = true) => {
            var watchCmd = commands.watchSourceCommand(sourceId, turnOn);
            var watchItem = `source${sourceId}`;
            return this._watch(watchItem, watchCmd, turnOn);
        },

        allZones: async (turnOn = true) => {
            return new Promise((resolve, reject) => {
                for (let index = 0; index < this._controller.zones; index++) {
                    this.watch.zone(index + 1, turnOn).then(() => {
                        if (index + 1 === this._controller.zones) {
                            resolve(constants.RESPONSE.SYSTEM)
                        }
                    }).catch(err => {
                        reject(`${constants.RESPONSE.ERROR} ${err}`)
                    })
                }
            });

        },

        allSources: async (turnOn = true) => {
            return new Promise((resolve, reject) => {
                for (let index = 0; index < this._controller.sources; index++) {
                    this.watch.source(index + 1, turnOn).then(() => {
                        if (index + 1 === this._controller.sources)
                            resolve(constants.RESPONSE.SYSTEM);
                        return
                    }).catch(err => {
                        reject(`${constants.RESPONSE.ERROR} ${err}`);
                        return;
                    })
                }
            });
        }
    }
    set = {
        zoneVolume: async (zoneId, level) => {
            return this._sendZoneEvent(zoneId, enums.EVENT_KEY_PRESS.command, enums.EVENT_KEY_PRESS.VOLUME, level);
        },
        zoneVolumeUpDown: async (zoneId, up) => {
            return this._sendZoneEvent(zoneId, enums.EVENT_KEY_PRESS.command, up ? enums.EVENT_KEY_PRESS.VOLUME_UP : enums.EVENT_KEY_PRESS.VOLUME_DOWN);
        },

        zoneStatus: async (zoneId, turnOn) => {
            return this._sendZoneEvent(zoneId, turnOn ? enums.EVENT.ZONE_ON : enums.EVENT.ZONE_OFF);
        },

        zoneSource: async (zoneId, sourceId) => {
            return this._sendZoneEvent(zoneId, enums.EVENT.SELECT_SOURCE, sourceId);
        },

        zoneMute: async (zoneId, turnOn = true) => {
            return this._sendZoneKeyHoldEvent(zoneId, enums.EVENT_KEY_RELEASE.MUTE, turnOn ? "ON" : "OFF");
        },

        zoneKeypress: async (zoneId, keycode) => {
            return this._sendZoneKeyReleaseEvent(zoneId, keycode);
        }
    }
    get = {
        systemVersion: async () => {
            // Get the System RIO Version
            var cmd = commands.systemVersionCommand();
            return this.commandPromise(cmd);
        },

        systemStatus: async () => {
            // Get the System Status
            var cmd = commands.getSystemStatusCommand();
            return this.commandPromise(cmd);
        },

        allControllerCommands: async () => {
            // Get the System Status
            var cmd = commands.getAllControllerCommands();
            return this.commandPromise(cmd);
        },

        allZoneCommands: async (zoneId) => {
            var cmd = commands.getAllZoneCommands(this._controller.controllerId, zoneId);
            return this.commandPromise(cmd);
        },

        allSourceCommands: async (sourceId) => {
            var cmd = commands.getAllSourceCommands(sourceId);
            return this.commandPromise(cmd);
        },
        zoneNames: async (zones = 6) => {
            var cmd = commands.getZonesCommand(this._controller.controllerId, enums.ZONE.NAME, zones);
            return this.commandPromise(cmd)
        },

        zoneName: async (zoneId) => {
            // Get the current value of a zone name
            var cmd = commands.getZoneCommand(this._controller.controllerId, zoneId, enums.ZONE.NAME);
            return this.commandPromise(cmd)
        },



        zoneSource: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.CURRENT_SOURCE);
        },
        zoneVolume: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.VOLUME);
        },
        zoneBass: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.BASS);
        },
        zoneTreble: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.TREBLE);
        },
        zoneBalance: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.BALANCE);
        },
        zoneLoudness: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.LOUDNESS);
        },
        zoneTurnOnVolume: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.TURN_ON_VOLUME);
        },
        zoneDoNotDisturb: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.DO_NO_DISTURB);
        },
        zonePartyMode: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.PARTY_MODE);
        },
        zoneStatus: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.STATUS);
        },
        zoneMute: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.MUTE);
        },
        zoneSharedSource: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.SHARED_SOURCE);
        },
        zoneLastError: async (zoneId) => {
            // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
            return this._getZoneCommand(zoneId, enums.ZONE.LAST_ERROR);
        },


        sourcesCommand: async (command, sources = 6) => {
            // Get the current value of a source variables.
            var cmd = commands.getSourcesCommand(command, sources);
            return this.commandPromise(cmd);
        },

        sourceCommand: async (sourceId, command) => {
            // Get the current value of a source variable.
            var cmd = commands.getSourceCommand(sourceId, command);
            return this.commandPromise(cmd);
        },

        sourceNames: async (sources = 6) => {
            // Get the current value of a source names.
            return this.get.sourcesCommand(constants.GET.SOURCE.NAME, sources);
        },

        sourceName: async (sourceId) => {
            // Get the current value of a source name.
            return this.get.sourceCommand(sourceId, constants.GET.SOURCE.NAME);
        },

        cachedZones: (callback) => {
            if (this.zoneState.length === this._controller.zones)
                callback(this.zoneState);
        },

        cachedSources: (callback) => {
            if (this.sourceState.length === this._controller.sources)
                callback(this.sourceState);
        },

    }
    closeQueue = () => {
        this.commandQueue.kill()
    }

    _processResponseValue = (value) => {
        if (!value) return null;

        let result = this._regCommandResponse.exec(value);
        if (result && result.groups) {
            var values = result.groups;
            if (values.variable === enums.ZONE.NAME)
                if (values.sourceId) {
                    this.storeCachedSourceVariable(values.sourceId, values.variable, values.value)
                }
                else if (values.zoneId) {
                    this.storeCachedZoneVariable(values.zoneId, values.variable, values.value);
                }

            return result.groups;
        }
        return null
    }

    connect = () => {
        return new Promise((resolve, reject) => {
            try {
                if (!this._controller.ip) {
                    this.logError('** ERROR ** RIO Controller IP Address not set in config file!');
                    reject();
                    return
                }

                if (this.watchSocket && this.watchSocket.writable) {
                    resolve();
                    return;
                };

                this.watchSocket = new net.Socket();

                // Add a 'close' event handler for the client socket
                this.watchSocket.on('close', () => {
                    this.event.close();
                    this.closeQueue;
                });

                this.watchSocket.on('data', (data) => {
                    var responses = this.readCommandResponses(data);

                    responses.forEach(response => {
                        if (response.type === constants.RESPONSE.ERROR) {
                            // An error generated.
                            this.event.error(response.value);
                        }
                        else {
                            let values = this._processResponseValue(response.value);
                            if (values) {
                                if (values.zoneId)
                                    this.event.zone(values.controllerId, values.zoneId, values.variable, values.value);
                                else if (values.sourceId)
                                    this.event.source(values.sourceId, values.variable, values.value)
                                else
                                    this.logDebug('No Zone or Source', response)
                            }
                            else {
                                let result = this._regControllerResponse.exec(response.value);
                                if (result && result.groups)
                                    this.event.controller(result.groups.controllerId, result.groups.variable, result.groups.value)
                                else {
                                    var keyValue = response.value.split('=');
                                    this.event.system(keyValue[0], keyValue[1])
                                }
                            }
                        }
                    });
                });
                var host = this._controller.ip;
                var port = this._controller.port;

                this.watchSocket.connect(port, host, () => {
                    this.event.connect(host, port);
                    resolve({ host, port });
                    this.logInfo(`Russound RIO connected to: ${host}: ${port}`);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    _event(command, ...args) {
        this.logDebug(`Event ${command}`, ...args)
        this.emit(command, ...args);
    }

    event = {
        connect: (host, port) => {
            this._event(enums.EMIT.CONNECT, { host, port });
        },
        close: () => {
            this._event(enums.EMIT.CLOSE);
        },

        error: (err) => {
            this._event(enums.EMIT.ERROR, err);
        },
        zone: (controllerId, zoneId, variable, value) => {
            this._event(enums.EMIT.ZONE, controllerId, zoneId, variable, value)
            if (variable === 'name') {
                //Send complete list of zones 
                if (this.zoneState.length === this._controller.zones) {
                    this._event(enums.EMIT.ZONES, controllerId, this.zoneState);
                }
            }
        },
        source: (sourceId, variable, value) => {
            this._event(enums.EMIT.SOURCE, sourceId, variable, value)
            if (variable === 'name') {
                //Send complete list of sources 
                if (this.sourceState.length === this._controller.sources) {
                    this._event(enums.EMIT.SOURCES, this._controller.controllerId, this.sourceState);
                }
            }
        },
        controller: (controllerId, variable, value) => {
            this._event(enums.EMIT.CONTROLLER, controllerId, variable, value)
        },
        system: (variable, value) => {
            this._event(enums.EMIT.SYSTEM, variable, value)
        }
    }

    _logMessage(message) {
        return (this._controller.name ? `[${this._controller.name}] ` : "") + message;;
    }

    logInfo(message, ...args) {
        if (this._logger)
            this._logger.info(this._logMessage(message), ...args);
        else
            console.log('[Info]' + this._logMessage(message), ...args)
    }

    logDebug(message, ...args) {
        if (this._logger)
            this._logger.debug(this._logMessage(message), ...args);
        else
            console.log('[Debug]' + this._logMessage(message), ...args)
    }

    logError(message, ...args) {
        if (this._logger)
            this._logger.error(this._logMessage(message), ...args);
        else
            console.log('[Error]' + this._logMessage(message), ...args)
    }
}

module.exports = {
    Logger,
    RIO
};
