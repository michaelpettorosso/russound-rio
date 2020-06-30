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
const nconf = require('nconf');
nconf.file({ file: './config.json' });
const net = require('net');

class RIO extends EventEmitter {
    #config = null;
    #log = null;
    #zoneCommandSocket = null;
    #zoneWatchSocket = null;
    #sourceState = [];
    #zoneState = [];
    #watchedZones = [];
    #watchedSources = [];
    #commandQueue = null;
    constructor(config, log) {
        super();
        this.#config = config;
        this.#log = log;
        this.#commandQueue = async.queue((data, callback) => this.#processCommandQueue(data, callback));
    }

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

    #writeCommand = (command) => {
        if (!this.#zoneCommandSocket || !this.#zoneCommandSocket.writable) {
            this.#log.info('Russound RIO not connected.');
            return;
        }
        if (!command || command.length == 0) return;
        this.#log.debug(`TX > ${command}`);
        this.#zoneCommandSocket.write(`${command}\r`);
    }

    #sendCommand = async (data, timeout = 10000) => {
        return new Promise((resolve, reject) => {
            let timer;

            this.#zoneCommandSocket.once('data', (response) => {
                clearTimeout(timer);
                resolve(response);
            });

            this.#writeCommand(data);

            timer = setTimeout(() => {
                reject(new Error("timeout waiting for msg"));
                clearTimeout(timer);
                this.#zoneCommandSocket.removeListener('data', responseHandler);
            }, timeout);
        });
    }

    #readCommandResponses = (data) => {
        if (data.length === 0) return [];
        var events = data.toString().split('\r\n');
        var responses = [];
        events.forEach(response => {
            responses.push({ type: response.substring(0, 1), value: response.substring(2) })
            this.#log.debug(`RX < ${response}`);
        });
        return responses;
    }


    #readCommandResponse = (data) => {
        var responses = this.#readCommandResponses(data);
        if (responses.length > 0)
            return responses[0];
        else
            return null;
    }

    #processCommandQueue = (data, callback) => {
        this.#sendCommand(data).then(commandResponse => {
            var response = this.#readCommandResponse(commandResponse);
            if (response) {
                this.#log.debug(response);

                if (response.type === 'E') {
                    this.#log.error('** ERROR **' + response.value);
                    callback(null, response.value);
                }
                else {
                    callback(response.value);
                }
            }
            else {
                this.#log.error('** ERROR ** Sending Command');
                callback(null, '** ERROR ** Sending Command');
            }
        }).catch((err) => {
            this.emit('error', '** ERROR ** Sending Command' + err);
        });

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

    #getVariableValue = (variable, value) => {
        return `${variable ? `.${variable.toLowerCase()}` : ''}${value ? `=\"${value}\"` : ''}`
    }

    #getZoneCommand = (zoneId, variable, value, controller = 1) => {
        return `C[${controller}].Z[${zoneId}]${this.#getVariableValue(variable, value)}`
    }

    #getSourceCommand = (sourceId, variable, value) => {
        return `S[${sourceId}]${this.#getVariableValue(variable, value)}`
    }

    #getZonesVariable = async (zones, variable) => {
        var zonesVariable = []
        for (let index = 0; index < zones; index++)
            zonesVariable.push(`${this.#getZoneCommand(index + 1, variable)}`);

        var cmd = `GET ${zonesVariable.join(', ')}`;
        return this.#commandPromise(cmd)
    }

    #getZoneVariable = async (zoneId, variable) => {
        var cmd = `GET ${this.#getZoneCommand(zoneId, variable)}`;
        return this.#commandPromise(cmd)
    }

    #getZoneNames = async (zones) => {
        return this.#getZonesVariable(zones, 'name');
    }

    #getZoneName = async (zoneId) => {
        // Get the current value of a zone name
        return this.#getZoneVariable(zoneId, 'name');
    }
    getZones = async () => {
        return new Promise((resolve, reject) => {
            var controller = this.#getControllerConfig();
            if (controller) {
                this.#getZoneNames(controller.zones).then(response => {
                    var zones = [];
                    var responseValues = response.split(',');
                    responseValues.forEach(value => {
                        var values = this.#processResponseValue(value);
                        if (values && values.value)
                            zones.push({ id: values.zoneId, name: values.value });
                    })
                    resolve(zones);
                });
            }
            else
                reject(null);
        });
    }

    getSources = async () => {
        return new Promise((resolve, reject) => {
            var controller = this.#getControllerConfig();

            if (controller) {
                this.#getSourceNames(controller.sources).then(response => {
                    var sources = [];
                    var responseValues = response.split(',');
                    responseValues.forEach(value => {
                        var values = this.#processResponseValue(value);
                        if (values && values.value !== 'N/A')
                            sources.push({ id: values.sourceId, name: values.value });
                    })
                    resolve(sources);
                });
            }
            else
                reject(null);
        });
    }

    #getSourcesVariable = async (sources, variable) => {
        // Get the current value of a source variables.
        var sourcesVariable = []

        for (let index = 0; index < sources; index++)
            sourcesVariable.push(this.#getSourceCommand(index + 1, variable));
        var cmd = `GET ${sourcesVariable.join(', ')}`
        return this.#commandPromise(cmd);
    }

    #getSourceVariable = async (sourceId, variable) => {
        // Get the current value of a source variable.
        var cmd = `GET ${this.#getSourceCommand(sourceId, variable)}`;
        return this.#commandPromise(cmd);
    }

    #getSourceNames = async (sources) => {
        // Get the current value of a source names.
        return this.#getSourcesVariable(sources, 'name');
    }

    #getSourceName = async (sourceId) => {
        // Get the current value of a source name.
        return this.#getSourceVariable(sourceId, 'name');
    }

    #setZoneVariable = async (zoneId, variable, value) => {
        var cmd = `SET ${this.#getZoneCommand(zoneId, variable, value)}`;
        return this.#commandPromise(cmd);
    }

    #setSourceVariable = async (sourceId, variable, value) => {
        var cmd = `SET ${this.#getSourceCommand(sourceId, variable, value)}`;
        return this.#commandPromise(cmd);
    }

    #storeCachedZoneVariable = (zoneId, variable, value) => {
        //Stores the current known value of a zone variable into the cache. Calls any zone callbacks.
        var zoneState = { id: zoneId };
        zoneState[variable.toLowerCase()] = value;
        this.#zoneState.push(zoneState)
        this.#log.debug(`Zone Cache store ${this.#getZoneCommand(zoneId, variable, value)}`);
    }
    #storeCachedSourceVariable = (sourceId, variable, value) => {
        //Stores the current known value of a source variable into the cache. 
        var sourceState = { id: sourceId };
        sourceState[variable.toLowerCase()] = value
        this.#sourceState.push(sourceState)
        this.#log.debug(`Source Cache store ${this.#getSourceCommand(sourceId, variable, value)}`);
    }
    #retrieveCachedSourceVariable = (sourceId, variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        var ss = this.#sourceState.find(s => s.id === sourceId && s.hasOwnProperty(variable));
        if (ss)
            this.#log.debug(`Source Cache retrieve ${this.#getSourceCommand(sourceId, variable, ss[variable])}`);
        return ss
    }

    #retrieveCachedZoneVariable = (zoneId, variable) => {
        //Retrieves the cache state of the named variable for a particular source.
        var zs = this.#zoneState.find(z => z.id === zoneId && z.hasOwnProperty(variable));;
        if (zs)
            this.#log.debug(`Zone Cache retrieve ${this.#getZoneCommand(zoneId, variable, zs[variable])}`);
        return zs;
    }

    getVersion = async () => {
        // Get the System RIO Version
        var cmd = `VERSION`;
        return this.#commandPromise(cmd);
    }

    getSystemStatus = async () => {
        // Get the System Status
        var cmd = `GET System.status`;
        return this.#commandPromise(cmd);
    }

    #sendZoneEvent = async (zoneId, eventId, data1, data2) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = `EVENT ${this.#getZoneCommand(zoneId)}!${eventId}${data1 ? ` ${data1}` : ''}${data2 ? ` ${data2}` : ''} `;
        return this.#commandPromise(cmd);
    }

    #sendZoneKeyPressEvent = async (zoneId, keycode) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        var cmd = `EVENT ${this.#getZoneCommand(zoneId)}!KeyRelease ${keycode}`;
        return this.#commandPromise(cmd);
    }

    #getOnOff = (turnOn) => {
        return ` ${turnOn ? "ON" : "OFF"}`;
    }
    #watchZone = (zoneId, turnOn) => {
        this.#watchedZones.push(zoneId);
        this.#zoneWatchSocket.write(`WATCH ${this.#getZoneCommand(zoneId)}${this.#getOnOff(turnOn)}\r`);
    }

    watchZone = (zoneId, turnOn) => {
        this.#watchZone(zoneId, turnOn);
    }

    #watchSource = (sourceId, turnOn) => {
        this.#watchedSources.push(sourceId);
        this.#zoneWatchSocket.write(`WATCH ${this.#getSourceCommand(sourceId)}${this.#getOnOff(turnOn)}\r`);
    }

    watchSource = (sourceId, turnOn) => {
        this.#watchSource(sourceId, turnOn);
    }
    #watchSystem = (turnOn) => {
        this.#zoneWatchSocket.write(`WATCH System${this.#getOnOff(turnOn)}\r`);
    }

    watchSystem = (turnOn) => {
        this.#watchSystem(turnOn);
    }

    volumeZone = async (zoneId, level) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneEvent(zoneId, 'KeyPress', 'Volume', level);
    }
    volumeZoneUpDown = async (zoneId, up) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneEvent(zoneId, 'KeyPress', up ? 'VolumeUp' : 'VolumeDown');
    }

    powerZone = async (zoneId, turnOn) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneEvent(zoneId, turnOn ? 'ZoneOn' : 'ZoneOff');
    }

    selectZoneSource = async (zoneId, sourceId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneEvent(zoneId, 'SelectSource', sourceId);
    }

    muteToggleZone = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneKeyPressEvent(zoneId, 'Mute');
    }

    keypressZone = async (zoneId, keycode) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#sendZoneKeyPressEvent(zoneId, keycode);
    }

    getZoneSource = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'currentSource');
    }
    getZoneVolume = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'volume');
    }
    getZoneBass = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'bass');
    }
    getZoneTreble = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'treble');
    }
    getZoneBalance = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'balance');
    }
    getZoneLoudness = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'loudness');
    }
    getZoneTurnOnVolume = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'turnOnVolume');
    }
    getZoneDoNotDisturb = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'doNotDisturb');
    }
    getZonePartyMode = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'partyMode');
    }
    getZoneStatus = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'status');
    }
    getZoneMute = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'mute');
    }
    getZoneSharedSource = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'sharedSource');
    }
    getZoneLastError = async (zoneId) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return this.#getZoneVariable(zoneId, 'lastError');
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
            if (values.sourceId && values.variable === 'name') {
                this.#storeCachedSourceVariable(values.sourceId, values.variable, values.value)
            }
            else if (values.zoneId && values.variable === 'name') {
                this.#storeCachedZoneVariable(values.zoneId, values.variable, values.value);
            }

            return result.groups;
        }
        return null
    }

    #controllerEvents = (host, port) => {


        if (!(this.#zoneWatchSocket && this.#zoneWatchSocket.writable)) {
            this.#zoneWatchSocket = new net.Socket();

            // If the connection ends, usually due to a reboot or power loss.
            this.#zoneWatchSocket.on('end', () => {
                this.#log("Connection to Controller has been lost");
            });

            // Add a 'close' event handler for the client socket
            this.#zoneWatchSocket.on('close', () => {
            });
            this.#zoneWatchSocket.on('data', (data) => {
                var responses = this.#readCommandResponses(data);

                responses.forEach(response => {
                    if (!response) {
                        // Skip if we are a blank line.
                    }
                    else if (response.type === 'E') {
                        // An error generated.
                        this.emit('error', event);
                    }
                    else if (response.value === '') {
                        // Skip if we have a blank value.
                    }
                    else if (response.type === 'S') {
                        this.#log.info(event);
                    }
                    else {
                        let values = this.#processResponseValue(response.value);
                        if (values) {

                            if (values.zoneId)
                                if (values.variable === 'status')
                                    this.emit(`power - ${values.zoneId} `, values.zoneId, values.value);
                                else if (values.variable === 'mute')
                                    this.emit(`muting - ${values.zoneId} `, values.zoneId, values.value);
                                else if (values.variable === 'currentSource')
                                    this.emit(`input - ${values.zoneId} `, values.zoneId, values.value);
                                else if (values.variable === 'volume')
                                    this.emit(`volume - ${values.zoneId} `, values.zoneId, values.value);
                                else {
                                    //console.log('Data Groups', result.groups, response)
                                }
                        }
                        else
                            this.#log.debug('No Match', response)
                    }
                });
            });
            try {
                this.#zoneWatchSocket.connect(port, host, () => {
                })

            } catch (error) {

            }
        }
    }

    connect = () => {
        return new Promise((resolve, reject) => {
            try {
                var controllerConfig = this.#getControllerConfig();
                if (!controllerConfig.ip) {
                    this.#log.error('** NOTICE ** rio ipaddress not set in config file!');
                    reject();
                    return
                }

                if (this.#zoneCommandSocket && this.#zoneCommandSocket.writable) {
                    resolve();
                    return;
                };

                var host = controllerConfig.ip;
                var port = controllerConfig.port || 9621;
                this.#zoneCommandSocket = new net.Socket();

                // Add a 'close' event handler for the client socket
                this.#zoneCommandSocket.on('close', () => {
                    this.emit('close');
                    this.closeQueue;
                });
                this.#zoneCommandSocket.connect(port, host, () => {

                    this.emit('connect', { host, port });
                    this.#log.info(`Russound RIO connected to: ${host}: ${port} `);
                    // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client
                    resolve({ host, port });
                    this.#controllerEvents(host, port);
                });



            } catch (error) {
                reject(error);
            }

        });
    }


}
module.exports = RIO;
