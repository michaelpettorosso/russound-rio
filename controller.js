const EventEmitter = require('events');
const Constants = require('./references/constants');

const enums = {
    EMIT: Constants.EMIT,
    INVALID: Constants.INVALID,
    CONTROLLER: Constants.CONTROLLER,
    SYSTEM: Constants.SYSTEM
}

class Controller extends EventEmitter {
    controllerId = 1;
    name = 'Russound';
    sources = 6;
    zones = 6;
    zoneArray = [];
    sourceArray = [];
    ip = null;
    port = 9621;
    _systemZoneNames = null;
    _systemSourceNames = null;
    _configuredZones = null;
    _configuredSources = null;

    _mac_address = null;
    _system_version = null;

    constructor(config) {
        super();
        if (config) {
            this.controllerId = config.controller || 1;
            if (Array.isArray(config.sources) && config.sources.length > 0) {
                this.sourceArray = config.sources;
                this.sources = 6;
            }
            else
                this.sources = config.sources || 6;
            //Check for new mapped zone config
            if (Array.isArray(config.zones) && config.zones.length > 0) {
                this.zoneArray = config.zones;
                this.zones = 6;
            }
            else
                this.zones = config.zones || 6;
            this.ip = config.ip;
            this.port = config.port || 9621;
            this.name = config.name || 'Russound';
        }
    }

    configureZoneAndSources = () => {
        const configureZone = (zone, sources) => {
            var zoneName = zone.name;
            if (this.zoneArray && this.zoneArray.length > 0) {
                var mappedZone = null;
                mappedZone = this.zoneArray.find(z => z.name === zoneName);
                if (mappedZone) {
                    zone.name = zoneName;
                    zone.display_name = mappedZone.display_name || zoneName;
                    zone.enable = mappedZone.enable !== false;
                    if (mappedZone.sources) {
                        zone.sources = mappedZone.sources.map(source => { return sources.find(s => s.name === source) }).filter(Boolean);
                    }
                    else
                        zone.sources = sources;
                }
            }
            else {
                zone.enable = true;
                zone.display_name = zoneName;
                zone.sources = sources;
            }

            return zone.enable === true && zone.sources ? zone : null;
        }
        const configureSource = (source) => {
            var sourceName = source.name;
            if (sourceName === enums.INVALID.SOURCE_NAME) return null;
            if (this.sourceArray && this.sourceArray.length > 0) {
                var mappedSource = null;
                mappedSource = this.sourceArray.find(s => s.name === sourceName);
                if (mappedSource) {
                    source.name = sourceName;
                    source.display_name = mappedSource.display_name || sourceName
                    source.enable = mappedSource.enable !== false;
                }
                else return null;
            }
            else {
                source.enable = true;
                source.display_name = sourceName;
            }
            return source.enable === true ? source : null;
        }
        if (this.configuredZones)
            return this.configuredZones;
        else if (!this.configuredSources && this.systemSources) {
            this._configuredSources = this.systemSources.map(source => {
                return configureSource(source);
            }).filter(Boolean);
            this.emit(enums.EMIT.CONFIGURED_SOURCES, this.controllerId)
        }
        else if (this.configuredSources && this.systemZones) {
            this._configuredZones = this.systemZones.map(zone => {
                return configureZone(zone, this.configuredSources);
            }).filter(Boolean);
            return
        }
        else
            return null;
    }

    setControllerSettings = (controllerId, variable, value) => {
        if (controllerId === this.controllerId) {
            if (variable === enums.SYSTEM.VERSION)
                this._system_version = value;
            else if (variable === enums.CONTROLLER.MAC_ADDRESS)
                this._mac_address = value;
        }
    }

    setSystemZones = (zones) => {
        this._systemZoneNames = zones;
        if (this.configureZoneAndSources()) {
            this.emit(enums.EMIT.CONFIGURED_ZONES, this.controllerId)
        }
    }

    setSystemSources = (sources) => {
        this._systemSourceNames = sources;
        if (this.configureZoneAndSources()) {
            this.emit(enums.EMIT.CONFIGURED_ZONES, this.controllerId)
        }
    }

    get systemZones() { return this._systemZoneNames; }
    get configuredZones() { return this._configuredZones; }
    get systemSources() { return this._systemSourceNames }
    get configuredSources() { return this._configuredSources; }

    get systemVersion() { return this._system_version; }
    get macAddress() { return this._mac_address; }

}

module.exports = Controller;