/**
 *  Russound RIO Node.js 
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

var async = require("async");
var nconf = require('nconf');
nconf.file({ file: './config.json' });
var logger = function (str, obj) {
    mod = 'rio';
    console.log("[%s] [%s] %s", new Date().toISOString(), mod, str);
}

var net = require('net');

const regResponse = /(?:(?:S\[(?<source>\d)+\])|(?:C\[(?<controller>\d+)\].Z\[(?<zone>\d+)\]))\.(?<variable>\S+)=\"(?<value>.*)\"/;

var rio = new rio();
rio.init();


function rio() {

    var _self = this;
    _self.device = null;
    _self._source_state = [];
    _self._zone_state = [];
    _self._watched_zones = {};
    _self._watched_sources = {};
    // _self._zone_callbacks = [];
    // _self._source_callbacks = [];

    _self._cmd_queue = async.queue((data, callback) => {
        const sendCommand = (data, timeout = 10000) => {
            const write = (cmd) => {
                if (!_self.device || !_self.device.writable) {
                    logger('rio not connected.');
                    return;
                }

                if (!cmd || cmd.length == 0) { return; }
                logger(`TX > ${cmd}`);
                _self.device.write(cmd + '\r');
            }

            return new Promise((resolve, reject) => {
                let timer;

                const responseHandler = (message) => {
                    // resolve promise with the value we got
                    resolve(message);
                    clearTimeout(timer);
                }
                _self.device.once('data', responseHandler);
                write(data);

                // set timeout so if a response is not received within a 
                // reasonable amount of time, the promise will reject
                timer = setTimeout(() => {
                    reject(new Error("timeout waiting for msg"));
                    _self.device.removeListener('data', responseHandler);
                }, timeout);

            });
        }
        const read = (data) => {
            if (data.length == 0) { return; }
            var resp = data.toString().replace(/(\r?\n|\r)/gm, '');
            logger(`RX < ${resp}`);
            return { status: resp.substring(0, 1), value: resp.substring(2) };
        }

        sendCommand(data).then(value => {
            var resp = read(value);

            if (resp && resp.status)
                if (resp.status === 'E') {
                    logger('** ERROR **' + resp.value);
                    callback(null, resp.value);
                }
                else {
                    let result = regResponse.exec(resp.value);
                    if (result && result.groups) {
                        var sourceId = result.groups.source;
                        var zoneId = result.groups.zone;
                        if (sourceId && result.groups.variable === 'name') {
                            storeCachedSourceVariable(sourceId, result.groups.variable, result.groups.value)
                        }
                        else if (zoneId && result.groups.variable === 'name') {
                            storeCachedZoneVariable(zoneId, result.groups.variable, result.groups.value);
                        }
                    }
                    callback(resp.value);
                }
            else {
                logger('** ERROR ** Sending Command');
                callback(null, '** ERROR ** Sending Command');

            }
        });

    });


    this.command = (cmd, callback) => {
        _self._cmd_queue.push(cmd, callback);
    }



    const getZone = (zoneId, controller = 1) => {
        return { zone: zoneId, controller, device: `C[${controller}].Z[${zoneId}]` }
    }

    const getZoneVariable = (id, variable) => {
        return new Promise((resolve, reject) => {
            // Retrieve the current value of a zone variable.If the variable is not found in the local cache then the value is requested from the controller.
            var zone = getZone(id)

            _self.command(`GET ${zone.device}.${variable.toLowerCase()}`, (result, err) => {
                if (!err)
                    resolve(result);
                else
                    reject(err);
            });
        });


    }

    const getControllerConfig = (controller = 1) => {
        if (nconf.get('rio:controllerConfig')) {
            var controllerConfig = nconf.get('rio:controllerConfig');
            var controllers = controllerConfig.controllers;
            if (controllers && controller > 0 && controllers.length > controller - 1) {
                return controllers[controller - 1]
            }
        }
        return null;
    }
    this.getSourceName = async (source_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getSourceVariable(source_id, 'name');
    }
    this.getZoneName = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'name');
    }
    this.getZones = () => {
        return new Promise((resolve, reject) => {
            var controller = getControllerConfig();

            if (controller) {
                var zones = [];
                for (let i = 0; i < controller.zones; i++) {
                    var zv = retrieveCachedZoneVariable(i + 1, 'name');
                    if (!zv) {
                        _self.getZoneName(i + 1).then(value => {
                            if (value) {
                                let result = regResponse.exec(value);
                                if (result && result.groups && result.groups.value)
                                    zones.push({ zone: result.groups.zone, name: result.groups.value });
                            }
                            if (i + 1 === controller.zones) {
                                resolve(zones);
                            }

                        });
                    }
                    else {
                        zones.push(zv);
                        if (i + 1 === controller.zones) {
                            resolve(zones);
                        }
                    }
                }
            }
            else
                reject(null);
        });
    }

    this.getSources = () => {
        return new Promise((resolve, reject) => {
            var controller = getControllerConfig();

            if (controller) {
                var sources = [];
                for (let i = 0; i < controller.sources; i++) {
                    var sv = retrieveCachedSourceVariable(i + 1, 'name')
                    if (!sv)
                        _self.getSourceName(i + 1).then(value => {
                            if (value) {
                                let result = regResponse.exec(value);
                                if (result && result.groups && result.groups.value && result.groups.value !== 'N/A')
                                    sources.push({ source: result.groups.source, name: result.groups.value });
                            }
                            if (i + 1 === controller.sources) {
                                resolve(sources);
                            }

                        });
                    else {
                        sources.push(sv);
                        if (i + 1 === controller.sources) {
                            resolve(sources);
                        }
                    }

                };
            }
            else
                reject(null);
        });
    }

    const getSourceVariable = async (source_id, variable) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return new Promise((resolve, reject) => {
            _self.command(`GET S[${source_id}].${variable}`, (result, err) => {
                if (!err)
                    resolve(result);
                else
                    reject(err);
            });
        });
    }

    const setZoneVariable = async (zone_id, variable, value) => {
        return new Promise((resolve, reject) => {
            //Change the value of a zone variable.
            var zone = getZone(zone_id);

            _self.command(`SET ${zone.device}.${variable}=\"${value}\"`, (result, err) => {
                if (!err) {
                    resolve(result);
                }
                else
                    reject(err);
            });
        });
    }

    const setSourceVariable = async (source_id, variable, value) => {
        return new Promise((resolve, reject) => {
            //Change the value of a source variable.
            _self.command(`SET S[${source_id}].${variable}=\"${value}\"`, (result, err) => {
                if (!err) {
                    resolve(result);
                }
                else
                    reject(err);
            });
        });
    }

    const storeCachedZoneVariable = (zone_id, name, value) => {

        //Stores the current known value of a zone variable into the cache. Calls any zone callbacks.
        var zone_state = { zone: zone_id };
        var name = name.toLowerCase();
        zone_state[name] = value;
        _self._zone_state.push(zone_state)
        var zone = getZone(zone_id);
        logger(`Zone Cache store ${zone.device}.${name} = ${value}`);
        //for callback in self._zone_callbacks:
        //    callback(zone_id, name, value)
    }
    const storeCachedSourceVariable = (source_id, name, value) => {

        //Stores the current known value of a source variable into the cache. Calls any source callbacks.

        var source_state = { source: source_id };
        var name = name.toLowerCase();
        source_state[name] = value
        _self._source_state.push(source_state)
        logger(`Source Cache store S[${source_id}].${name} = ${value}`);

        //for callback in self._source_callbacks:
        //    callback(source_id, name, value)
    }
    const retrieveCachedSourceVariable = (source_id, name) => {
        //Retrieves the cache state of the named variable for a particular source. If the variable has not been cached then the UncachedVariable exception is raised.

        var ss = _self._source_state.find(s => s.source === source_id.toString() && s.hasOwnProperty(name));
        if (ss)
            logger(`Source Cache retrieve S[${source_id}].${name}=\"${ss[name]}\"`);
        return ss
    }

    const retrieveCachedZoneVariable = (zone_id, name) => {
        //Retrieves the cache state of the named variable for a particular source. If the variable has not been cached then the UncachedVariable exception is raised.
        var zs = _self._zone_state.find(z => z.zone === zone_id.toString() && z.hasOwnProperty(name));;
        if (zs) {
            var zone = getZone(zone_id);
            logger(`Zone Cache retrieve ${zone.device}].${name}=\"${zs[name]}\"`);
        }
        return zs;
    }

    this.getSystemStatus = async () => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return new Promise((resolve, reject) => {
            _self.command(`GET System.status`, (result, err) => {
                if (!err)
                    resolve(result);
                else
                    reject(err);
            });
        });
    }


    this.getZoneSource = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'currentSource');
    }
    this.getZoneVolume = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'volume');
    }
    this.getZoneBass = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'bass');
    }
    this.getZoneTreble = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'treble');
    }
    this.getZoneBalance = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'balance');
    }
    this.getZoneLoudness = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'loudness');
    }
    this.getZoneTurnOnVolume = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'turnOnVolume');
    }
    this.getZoneDoNotDisturb = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'doNotDisturb');
    }
    this.getZonePartyMode = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'partyMode');
    }
    this.getZoneStatus = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'status');
    }
    this.getZoneMute = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'mute');
    }
    this.getZoneSharedSource = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'sharedSource');
    }
    this.getZoneLastError = async (zone_id) => {
        // Get the current value of a source variable. If the variable is not in the cache it will be retrieved from the controller.
        return getZoneVariable(zone_id, 'lastError');
    }

    this.init = () => {

        if (!nconf.get('rio:ipaddress')) {
            logger('** NOTICE ** rio ipaddress not set in config file!');
            return;
        }

        if (_self.device && _self.device.writable) { return };


        var HOST = nconf.get('rio:ipaddress');
        var PORT = process.env.PORT || 9621;

        _self.device = new net.Socket();
        _self.device.connect(PORT, HOST, () => {
            logger('CONNECTED TO: ' + HOST + ':' + PORT);
            // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client

            var Promises = [];
            Promises.push(_self.getSystemStatus())
            Promises.push(_self.getSources());
            Promises.push(_self.getZones());
            Promises.push(_self.getZoneStatus(1));
            Promises.push(_self.getZoneSource(1));
            Promises.push(_self.getZoneVolume(1));
            Promises.push(_self.getZoneMute(1))
            Promise.all(Promises).then((values) => {
                console.log(values);
                console.log(_self._zone_state, _self._source_state)
                Promises = []
                Promises.push(_self.getSources());
                Promises.push(_self.getZones());
                Promise.all(Promises).then((values) => {
                    console.log(values);
                    console.log(_self._zone_state, _self._source_state)
                });
            });
        });

        // Add a 'close' event handler for the client socket
        _self.device.on('close', function () {
            _self.queue.kill();
        });

    }
}
