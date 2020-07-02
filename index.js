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

var logDebug = false;
const EMIT = constants.EMIT;
const EVENT = constants.EVENT;
const EVENT_KEY_RELEASE = constants.EVENT_KEY_RELEASE;
const ZONE = constants.GET.ZONE;
const SOURCE = constants.GET.SOURCE;

const logger = {
    setDebug: (debug) => { logDebug = debug },
    log: (msg, ...optionalParams) => { console.log(msg, ...optionalParams) },
    info: (msg, ...optionalParams) => { console.log('[INFO]', msg, ...optionalParams) },
    debug: (msg, ...optionalParams) => { if (logDebug) console.log('[DEBUG]', msg, ...optionalParams) },
    error: (msg, ...optionalParams) => { console.log('[ERROR]', msg, ...optionalParams) },
}
class RIO extends EventEmitter {

    #getConfig = (node) => {
        if (this.#config) {
            if (node)
                return this.#config[node];
            else
                return this.#config;
        }

    }

    #getControllerConfig = (controller = 1) => {
        if (this.#getConfig('controllers')) {
            var controllers = this.#getConfig('controllers');
            if (controllers && controller > 0 && controllers.length > controller - 1) {
                return controllers[controller - 1]
            }
        }
        return null;
    }


    #config = null;
    #log = null;
    #watchSocket = null;
    #sourceState = [];
    #zoneState = [];
    #watchedItems = {};
    #commandQueue = null;
    name = 1;
    controllerId = 1;
    sources = 6;
    zones = 6;
    ip = null;
    port = 9621;

    constructor(config, log) {
        super();
        this.#config = config;

        if (config) {
            var controller = this.#getControllerConfig();
            if (controller) {
                this.controllerId = controller.controller || 1;
                this.sources = controller.sources || 6;
                this.zones = controller.zones || 6;
                this.ip = controller.ip;
                this.port = controller.port || 9621;
                this.name = controller.name || 'Russound';
            }
        }
        this.#log = log;
        this.#commandQueue = async.queue((data, callback) => this.#processCommandQueue(data, callback));
    }

    #writeCommand = (command) => {
        if (!command || command.length == 0) return false;
        if (!this.#watchSocket || !this.#watchSocket.writable) return null;
        this.#log.debug(`TX > ${command}`);
        this.#watchSocket.write(`${command}\r`);
        return true;
    }

    incompleteData = null;

    #readCommandResponses = (data) => {
        if (data.length === 0 && !this.incompleteData) return [];

        var events = data.toString().split('\r\n');

        if (this.incompleteData) {
            this.#log.debug(`Incomplete data processed '${this.incompleteData}' + '${events[0]}'`);
            events[0] = this.incompleteData + events[0];
            this.incompleteData = null;
        }
        if (!data.toString().endsWith('\r\n')) {
            this.incompleteData = events.pop();
            this.#log.debug(`Incomplete data detected '${this.incompleteData}'`);
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

    #processCommandQueue = (data, callback) => {
        var cmd = this.#writeCommand(data);
        if (cmd === true)
            callback(true);
        else {
            var errMsg = 'Russound RIO not connected.';
            if (cmd === false)
                errMsg = 'No command specified';
            this.#log.debug(errMsg);
            callback(null, errMsg);
        }
    }

    #command = (cmd, callback) => {
        this.#commandQueue.push(cmd, callback);
    }

    #commandPromise = async (cmd) => {
        return new Promise((resolve, reject) => {
            this.#command(cmd, (response, err) => {
                if (err)
                    reject(err);
                else
                    resolve(response);
            });
        });
    }

    #getZoneVariable = async (zoneId, variable) => {

        var cmd = commands.getZoneCommand(this.controllerId, zoneId, variable);
        return this.#commandPromise(cmd)
    }

    #getZoneNames = async (zones) => {
        var cmd = commands.getZonesCommand(this.controllerId, zones, constants.GET.ZONE.NAME);
        return this.#commandPromise(cmd)
    }

    #getZoneName = async (zoneId) => {
        // Get the current value of a zone name
        var cmd = commands.getZoneCommand(this.controllerId, zoneId, constants.GET.ZONE.NAME);
        return this.#commandPromise(cmd)
    }

    getCachedZones = (callback) => {
        if (this.#zoneState.length === this.zones)
            callback(this.#zoneState);
    }

    getCachedSources = (callback) => {
        if (this.#sourceState.length === this.sources)
            callback(this.#sourceState);
    }

    getZones = async () => {
        return this.#getZoneNames(this.zones);
    }

    getSources = async () => {
        return this.#getSourceNames(this.sources);
    }

    #getSourcesVariable = async (sources, variable) => {
        // Get the current value of a source variables.
        var cmd = commands.getSourcesCommand(sources, variable);
        return this.#commandPromise(cmd);
    }

    #getSourceVariable = async (sourceId, variable) => {
        // Get the current value of a source variable.
        var cmd = commands.getSourceCommand(sourceId, variable);
        return this.#commandPromise(cmd);
    }

    #getSourceNames = async (sources) => {
        // Get the current value of a source names.
        return this.#getSourcesVariable(sources, constants.GET.SOURCE.NAME);
    }

    #getSourceName = async (sourceId) => {
        // Get the current value of a source name.
        return this.#getSourceVariable(sourceId, constants.GET.SOURCE.NAME);
    }

    #setZoneVariable = async (zoneId, variable, value) => {
        var cmd = commands.setZoneCommand(this.controllerId, zoneId, variable, value);
        return this.#commandPromise(cmd);
    }

    #storeCachedZoneVariable = (zoneId, variable, value) => {
        //Stores the current known value of a zone variable into the cache. Calls any zone callbacks.
        var zoneState = this.#retrieveCachedZoneVariable(zoneId, variable)
        if (!zoneState) {
            zoneState = { id: zoneId };
            this.#zoneState.push(zoneState)
        }
        zoneState[variable.toLowerCase()] = value;
    }
    #storeCachedSourceVariable = (sourceId, variable, value) => {
        //Stores the current known value of a source variable into the cache. 
        var sourceState = this.#retrieveCachedSourceVariable(sourceId, variable)
        if (!sourceState) {
            sourceState = { id: sourceId };
            this.#sourceState.push(sourceState)
        }
        sourceState[variable.toLowerCase()] = value
    }
    #retrieveCachedSourceVariable = (sourceId, variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        return this.#sourceState.find(s => s.id === sourceId && s.hasOwnProperty(variable.toLowerCase()));
    }

    #retrieveCachedZoneVariable = (zoneId, variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        return this.#zoneState.find(z => z.id === zoneId && z.hasOwnProperty(variable.toLowerCase()));;
    }

    getVersion = async () => {
        // Get the System RIO Version
        var cmd = commands.getSystemVersionCommand();
        return this.#commandPromise(cmd);
    }

    getSystemStatus = async () => {
        // Get the System Status
        var cmd = commands.getSystemStatusCommand();
        return this.#commandPromise(cmd);
    }

    getControllerCommands = async () => {
        // Get the System Status
        var cmd = commands.getControllerCommands();
        return this.#commandPromise(cmd);
    }

    #sendZoneEvent = async (zoneId, eventId, data1, data2) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = commands.getEventZoneCommand(this.controllerId, zoneId, eventId, data1, data2);
        return this.#commandPromise(cmd);
    }

    #sendZoneKeyReleaseEvent = async (zoneId, keycode) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = commands.getEventZoneCommand(this.controllerId, zoneId, EVENT_KEY_RELEASE.command, keycode);
        return this.#commandPromise(cmd);
    }

    #watch = async (watchItem, watchCmd, turnOn) => {
        return new Promise((resolve, reject) => {
            var watchedItem = this.#watchedItems[watchItem]
            if (turnOn && !watchedItem || !turnOn && watchedItem) {
                this.#commandPromise(watchCmd).then(response => {
                    this.#watchedItems[watchItem] = turnOn
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
    watchSystem = async (turnOn = true) => {
        var watchCmd = commands.getWatchSystemCommand(turnOn);
        var watchItem = constants.WATCH.SYSTEM;
        return this.#watch(watchItem, watchCmd, turnOn);
    }

    watchZone = async (zoneId, turnOn = true) => {
        var watchCmd = commands.getWatchZoneCommand(this.controllerId, zoneId, turnOn);
        var watchItem = `zone${zoneId}`;
        return this.#watch(watchItem, watchCmd, turnOn);
    }
    watchSource = async (sourceId, turnOn = true) => {
        var watchCmd = commands.getWatchSourceCommand(sourceId, turnOn);
        var watchItem = `source${sourceId}`;
        return this.#watch(watchItem, watchCmd, turnOn);
    }

    watchZones = async (turnOn = true) => {
        return new Promise((resolve, reject) => {
            for (let index = 0; index < this.zones; index++) {
                this.watchZone(index + 1, turnOn).then(() => {
                    if (index + 1 === this.zones) {
                        resolve(constants.RESPONSE.SYSTEM)
                    }
                }).catch(err => {
                    reject(`${constants.RESPONSE.ERROR} ${err}`)
                })
            }
        });

    }


    watchSources = async (turnOn = true) => {
        return new Promise((resolve, reject) => {
            for (let index = 0; index < this.sources; index++) {
                this.watchSource(index + 1, turnOn).then(() => {
                    if (index + 1 === this.sources)
                        resolve(constants.RESPONSE.SYSTEM);
                    return
                }).catch(err => {
                    reject(`${constants.RESPONSE.ERROR} ${err}`);
                    return;
                })
            }
        });
    }

    volumeZone = async (zoneId, level) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneEvent(zoneId, constants.EVENT_KEY_PRESS.command, constants.EVENT_KEY_PRESS.VOLUME, level);
    }
    volumeZoneUpDown = async (zoneId, up) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneEvent(zoneId, constants.EVENT_KEY_PRESS.command, up ? constants.EVENT_KEY_PRESS.VOLUME_UP : constants.EVENT_KEY_PRESS.VOLUME_DOWN);
    }

    powerZone = async (zoneId, turnOn) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneEvent(zoneId, turnOn ? EVENT.ZONE_ON : constants.EVENT.ZONE_OFF);
    }

    selectZoneSource = async (zoneId, sourceId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneEvent(zoneId, EVENT.SELECT_SOURCE, sourceId);
    }

    muteToggleZone = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneKeyReleaseEvent(zoneId, EVENT_KEY_RELEASE.MUTE);
    }

    keypressZone = async (zoneId, keycode) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneKeyReleaseEvent(zoneId, keycode);
    }

    getZoneCommands = async (zoneId) => {
        var cmd = commands.getZoneCommands(this.controllerId, zoneId);
        return this.#commandPromise(cmd);
    }

    getSourceCommands = async (sourceId) => {
        var cmd = commands.getSourceCommands(sourceId);
        return this.#commandPromise(cmd);
    }

    getZoneSource = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.CURRENT_SOURCE);
    }
    getZoneVolume = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.VOLUME);
    }
    getZoneBass = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.BASS);
    }
    getZoneTreble = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.TREBLE);
    }
    getZoneBalance = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.BALANCE);
    }
    getZoneLoudness = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.LOUDNESS);
    }
    getZoneTurnOnVolume = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.TURN_ON_VOLUME);
    }
    getZoneDoNotDisturb = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.DO_NO_DISTURB);
    }
    getZonePartyMode = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.PARTY_MODE);
    }
    getZoneStatus = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.STATUS);
    }
    getZoneMute = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.MUTE);
    }
    getZoneSharedSource = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.SHARED_SOURCE);
    }
    getZoneLastError = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, constants.GET.ZONE.LAST_ERROR);
    }
    closeQueue = () => {
        this.#commandQueue.kill()
    }

    #processResponseValue = (value) => {
        if (!value) return null;
        const regResponse = /(?:(?:S\[(?<sourceId>\d)+\])|(?:C\[(?<controllerId>\d+)\].Z\[(?<zoneId>\d+)\]))\.(?<variable>\S+)=\"(?<value>.*)\"/;

        let result = regResponse.exec(value);
        if (result && result.groups) {
            var values = result.groups;
            if (values.variable === constants.GET.ZONE.NAME)
                if (values.sourceId) {
                    this.#storeCachedSourceVariable(values.sourceId, values.variable, values.value)
                }
                else if (values.zoneId) {
                    this.#storeCachedZoneVariable(values.zoneId, values.variable, values.value);
                }

            return result.groups;
        }
        return null
    }
    #eventZone = (controllerId, zoneId, variable, value) => {
        if (variable === 'name') {
            if (this.#zoneState.length === this.zones)
                this.emit(constants.EMIT.ZONES, controllerId, this.#zoneState);
        }
    }
    #eventSource = (sourceId, variable, value) => {
        if (variable === 'name') {
            if (this.#sourceState.length === this.sources)
                this.emit(constants.EMIT.SOURCES, this.controllerId, this.#sourceState);
        }
    }

    connect = () => {
        return new Promise((resolve, reject) => {
            try {
                if (!this.ip) {
                    this.#log.error('** ERROR ** RIO Controller IP Address not set in config file!');
                    reject();
                    return
                }

                if (this.#watchSocket && this.#watchSocket.writable) {
                    resolve();
                    return;
                };

                this.on(EMIT.ZONE, this.#eventZone.bind(this));
                this.on(EMIT.SOURCE, this.#eventSource.bind(this));

                this.#watchSocket = new net.Socket();

                // Add a 'close' event handler for the client socket
                this.#watchSocket.on('close', () => {
                    this.emit('close');
                    this.closeQueue;
                });

                this.#watchSocket.on('data', (data) => {
                    var responses = this.#readCommandResponses(data);

                    responses.forEach(response => {
                        if (response.type === constants.RESPONSE.ERROR) {
                            // An error generated.
                            this.emit('error', response.value);
                        }
                        else {
                            let values = this.#processResponseValue(response.value);
                            if (values) {
                                if (values.zoneId)
                                    this.emit(`${EMIT.ZONE}`, values.controllerId, values.zoneId, values.variable, values.value);
                                else if (values.sourceId)
                                    this.emit(`${EMIT.SOURCE}`, values.sourceId, values.variable, values.value)
                                else
                                    this.#log.debug('No Zone or Source', response)
                            }
                            else {
                                const regResponse = /(?:C\[(?<controllerId>\d+)\])\.(?<variable>\S+)=\"(?<value>.*)\"/;
                                let result = regResponse.exec(response.value);
                                if (result && result.groups)
                                    this.emit(`${EMIT.CONTROLLER}`, result.groups.controllerId, result.groups.variable, result.groups.value)
                                else {
                                    var keyValue = response.value.split('=');
                                    this.emit(`${EMIT.SYSTEM}`, keyValue[0], keyValue[1])
                                }
                            }
                        }
                    });
                });
                var host = this.ip;
                var port = this.port;

                this.#watchSocket.connect(port, host, () => {

                    this.emit('connect', { host, port });
                    this.#log.info(`Russound RIO connected to: ${host}: ${port} `);
                    // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client
                    resolve({ host, port });
                });



            } catch (error) {
                reject(error);
            }

        });
    }


}

module.exports = {
    enums: {
        EMIT,
        ZONE,
        SOURCE
    },
    logger,
    RIO
};
