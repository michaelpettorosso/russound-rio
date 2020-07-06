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
const async = require('async');
const EventEmitter = require('events');
const net = require('net');
const Constants = require('./references/constants');
const Commands = require('./references/commands');
const Logger = require('./logger');
const Controller = require('./controller');


const enums = {
    EMIT: Constants.EMIT,
    EVENT: Constants.EVENT,
    EVENT_KEY_PRESS: Constants.EVENT_KEY_PRESS,
    EVENT_KEY_RELEASE: Constants.EVENT_KEY_RELEASE,
    EVENT_KEY_HOLD: Constants.EVENT_KEY_HOLD,
    ZONE: Constants.GET.ZONE,
    SOURCE: Constants.GET.SOURCE,
    STATUS: Constants.STATUS,
    INVALID: Constants.INVALID
}

class RIO extends EventEmitter {
    _config = null;
    _logger = null;
    watchSocket = null;
    sourceState = [];
    zoneState = [];
    watchedItems = {};
    commandQueue = null;
    controllers = [];

    constructor(config, logger) {
        super();
        this._config = config;
        this._logger = logger;
        if (!logger) {
            this.logger = new Logger(this._getConfig('debug') === true);
        }
        this.controllers.push(new Controller(this._getControllerConfig()));
        this.commandQueue = async.queue((data, callback) => this.processCommandQueue(data, callback));
    }
    static enums = {
        EMIT: enums.EMIT,
        ZONE: enums.ZONE,
        SOURCE: enums.SOURCE,
        STATUS: enums.STATUS,
        INVALID: enums.INVALID
    }

    _regCommandResponse = /(?:(?:S\[(?<sourceId>\d)+\])|(?:C\[(?<controllerId>\d+)\].Z\[(?<zoneId>\d+)\]))\.(?<variable>\S+)=\"(?<value>.*)\"/;
    _regControllerResponse = /(?:C\[(?<controllerId>\d+)\])\.(?<variable>\S+)=\"(?<value>.*)\"/;

    _getController = (controllerId = 1) => {
        if (this.controllers && this.controllers.length > 0)
            return this.controllers.find(controller => Number(controller.controllerId) === Number(controllerId));
        else return null;
    }

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

    get defaultController() {
        return this._getController();
    };

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
                responses.push({ type: Constants.RESPONSE.SUCCESS, value: null })
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

        var cmd = Commands.getZoneCommand(this.defaultController.controllerId, zoneId, command);
        return this.commandPromise(cmd)
    }

    _setZoneCommand = async (zoneId, command, value) => {
        var cmd = Commands.setZoneCommand(this.defaultController.controllerId, zoneId, command, value);
        return this.commandPromise(cmd);
    }

    storeCachedSourceVariable = (sourceId, variable, value) => {
        //Stores the current known value of a source variable into the cache. 
        var sourceState = this.retrieveCachedSourceVariable(sourceId, variable)
        if (!sourceState) {
            sourceState = { id: sourceId };
            this.sourceState.push(sourceState);
        }
        sourceState[variable.toLowerCase()] = value
    }

    retrieveCachedSourceVariable = (sourceId, variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        return this.sourceState.find(s => s.id === sourceId && s.hasOwnProperty(variable.toLowerCase()));
    }
    retrieveCachedSourcesVariable = (variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        return this.sourceState.filter(s => s.hasOwnProperty(variable.toLowerCase()));
    }


    storeCachedZoneVariable = (zoneId, variable, value) => {
        //Stores the current known value of a zone variable into the cache. Calls any zone callbacks.
        var zoneState = this.retrieveCachedZoneVariable(zoneId, variable)
        if (!zoneState) {
            zoneState = { id: zoneId };
            this.zoneState.push(zoneState);
        }
        zoneState[variable.toLowerCase()] = value;
    }

    retrieveCachedZoneVariable = (zoneId, variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        return this.zoneState.find(z => z.id === zoneId && z.hasOwnProperty(variable.toLowerCase()));;
    }

    retrieveCachedZonesVariable = (variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        return this.zoneState.filter(z => z.hasOwnProperty(variable.toLowerCase()));
    }

    _sendZoneEvent = async (zoneId, eventId, data1, data2) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = Commands.eventZoneCommand(this.defaultController.controllerId, zoneId, eventId, data1, data2);
        return this.commandPromise(cmd);
    }

    _sendZoneKeyReleaseEvent = async (zoneId, keycode) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = Commands.eventZoneCommand(this.defaultController.controllerId, zoneId, enums.EVENT_KEY_RELEASE.command, keycode);
        return this.commandPromise(cmd);
    }

    _sendZoneKeyHoldEvent = async (zoneId, keycode) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = Commands.eventZoneCommand(this.defaultController.controllerId, zoneId, enums.EVENT_KEY_HOLD.command, keycode, 150);

        //var cmd = Commands.eventZoneCommand(this.defaultController.controllerId, zoneId, enums.EVENT_KEY_HOLD.command, keycode, 150);
        return this.commandPromise(cmd);
    }

    _watch = async (watchItem, watchCmd, turnOn) => {
        return new Promise((resolve, reject) => {
            var watchedItem = this.watchedItems[watchItem]
            if (turnOn && !watchedItem || !turnOn && watchedItem) {
                this.commandPromise(watchCmd).then(response => {
                    this.watchedItems[watchItem] = turnOn
                    resolve(Constants.RESPONSE.SYSTEM);
                })
                    .catch(err => {
                        reject(`${Constants.RESPONSE.ERROR} ${err}`)
                    })
            }
            else
                resolve(Constants.RESPONSE.SYSTEM);
        });
    }

    watch = {
        system: async (turnOn = true) => {
            var watchCmd = Commands.watchSystemCommand(turnOn);
            var watchItem = Constants.WATCH.SYSTEM;
            return this._watch(watchItem, watchCmd, turnOn);
        },

        zone: async (zoneId, turnOn = true) => {
            var watchCmd = Commands.watchZoneCommand(this.defaultController.controllerId, zoneId, turnOn);
            var watchItem = `zone${zoneId}`;
            return this._watch(watchItem, watchCmd, turnOn);
        },
        source: async (sourceId, turnOn = true) => {
            var watchCmd = Commands.watchSourceCommand(sourceId, turnOn);
            var watchItem = `source${sourceId}`;
            return this._watch(watchItem, watchCmd, turnOn);
        },

        allZones: async (turnOn = true) => {
            return new Promise((resolve, reject) => {
                for (let index = 0; index < this.defaultController.zones; index++) {
                    this.watch.zone(index + 1, turnOn).then(() => {
                        if (index + 1 === this.defaultController.zones) {
                            resolve(Constants.RESPONSE.SYSTEM)
                        }
                    }).catch(err => {
                        reject(`${Constants.RESPONSE.ERROR} ${err}`)
                    })
                }
            });

        },

        allSources: async (turnOn = true) => {
            return new Promise((resolve, reject) => {
                for (let index = 0; index < this.defaultController.sources; index++) {
                    this.watch.source(index + 1, turnOn).then(() => {
                        if (index + 1 === this.defaultController.sources)
                            resolve(Constants.RESPONSE.SYSTEM);
                        return
                    }).catch(err => {
                        reject(`${Constants.RESPONSE.ERROR} ${err}`);
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
            return this._sendZoneKeyHoldEvent(zoneId, enums.EVENT_KEY_RELEASE.MUTE, turnOn ? enums.STATUS.ON : enums.STATUS.OFF);
        },

        zoneKeypress: async (zoneId, keycode) => {
            return this._sendZoneKeyReleaseEvent(zoneId, keycode);
        }
    }
    get = {
        systemVersion: async () => {
            // Get the System RIO Version
            var cmd = Commands.systemVersionCommand();
            return this.commandPromise(cmd);
        },

        systemStatus: async () => {
            // Get the System Status
            var cmd = Commands.getSystemStatusCommand();
            return this.commandPromise(cmd);
        },

        allControllerCommands: async () => {
            // Get the System Status
            var cmd = Commands.getAllControllerCommands();
            return this.commandPromise(cmd);
        },

        allZoneCommands: async (zoneId) => {
            var cmd = Commands.getAllZoneCommands(this.defaultController.controllerId, zoneId);
            return this.commandPromise(cmd);
        },

        allSourceCommands: async (sourceId) => {
            var cmd = Commands.getAllSourceCommands(sourceId);
            return this.commandPromise(cmd);
        },
        zoneNames: async () => {
            var cmd = Commands.getZonesCommand(this.defaultController.controllerId, enums.ZONE.NAME, this.defaultController.zones);
            return this.commandPromise(cmd)
        },

        zoneName: async (zoneId) => {
            // Get the current value of a zone name
            var cmd = Commands.getZoneCommand(this.defaultController.controllerId, zoneId, enums.ZONE.NAME);
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
            var cmd = Commands.getSourcesCommand(command, sources);
            return this.commandPromise(cmd);
        },
        sourceCommand: async (sourceId, command) => {
            // Get the current value of a source variable.
            var cmd = Commands.getSourceCommand(sourceId, command);
            return this.commandPromise(cmd);
        },

        sourceNames: async () => {
            // Get the current value of a source names.
            return this.get.sourcesCommand(enums.SOURCE.NAME, this.defaultController.sources);
        },
        sourceName: async (sourceId) => {
            // Get the current value of a source name.
            return this.get.sourceCommand(sourceId, enums.SOURCE.NAME);
        },

        cachedZoneNames: (callback) => {
            var zoneNames = this.retrieveCachedZonesVariable(enums.ZONE.NAME)
            if (zoneNames && zoneNames.length >= this.defaultController.zones)
                callback(zoneNames);
        },

        cachedSourceNames: (callback) => {
            var sourceNames = this.retrieveCachedSourcesVariable(enums.SOURCE.NAME)
            if (sourceNames && sourceNames.length >= this.defaultController.sources)
                callback(sourceNames);
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
                if (!this.defaultController.ip) {
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
                        if (response.type === Constants.RESPONSE.ERROR) {
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
                var host = this.defaultController.ip;
                var port = this.defaultController.port;

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
        this.logDebug(`EVENT > ${command}`, ...args)
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
            this._event(enums.EMIT.ZONE, Number(controllerId), Number(zoneId), variable, value)
            if (variable === enums.ZONE.NAME) {
                //Send complete list of zones 
                this.get.cachedZoneNames((zoneNames) => {
                    this.defaultController.setSystemZones(zoneNames);
                })
            }
        },
        source: (sourceId, variable, value) => {
            this._event(enums.EMIT.SOURCE, Number(sourceId), variable, value)
            if (variable === enums.SOURCE.NAME) {
                //Send complete list of sources
                this.get.cachedSourceNames((sourceNames) => {
                    this.defaultController.setSystemSources(sourceNames);
                })
            }
        },

        controller: (controllerId, variable, value) => {
            var controller = this._getController(controllerId)
            if (controller) { controller.setControllerSettings(controller.controllerId, variable, value); }
            this._event(enums.EMIT.CONTROLLER, Number(controllerId), variable, value)
        },
        system: (variable, value) => {
            if (this.controllers && this.controllers.length > 0)
                this.controllers.forEach(controller => { controller.setControllerSettings(controller.controllerId, variable, value) });
            this._event(enums.EMIT.SYSTEM, variable, value)
        }
    }

    _logMessage(message) {
        return (this.defaultController.name ? `[${this.defaultController.name}] ` : "") + message;;
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
