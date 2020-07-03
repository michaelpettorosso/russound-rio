import nconf from 'nconf';
import pkg from 'russound-rio';
const { RIO, Logger } = pkg;
const logger = new Logger(true);
const App = () => {
    nconf.file('./config.json');
    var config = nconf.get('rio');
    var rio = new RIO(config, logger);

    const eventDebug = (response) => {
        logger.debug('eventDebug: ', response);
    }

    const eventError = (response) => {
        logger.error('eventError: ', response);
    }

    const eventConnect = (response) => {
        logger.debug('eventConnect: ', response);
    }

    const eventClose = (response) => {
        logger.debug('eventClose: ', response);
    }

    const eventZone = (controllerId, zoneId, variable, value) => {
        logger.debug('Zone Event', `Controller=${controllerId}`, `Zone=${zoneId}`, `${variable}=${value}`)
    }

    const eventSource = (sourceId, variable, value) => {
        logger.debug('Source Event', `Source=${sourceId}`, `${variable}=${value}`)

    }

    var savedZones = null;
    var savedSources = null;

    const eventZones = (controllerId, zones) => {
        if (!savedZones) {
            logger.debug('Zones Event', controllerId, zones)
            savedZones = zones;
        }
    }

    const eventSources = (controllerId, sources) => {
        if (!savedSources) {
            logger.debug('Sources Event', controllerId, sources)
            savedSources = sources;
        }

    }

    const eventSystem = (variable, value) => {
        logger.debug('System Event', variable, value)
    }
    const eventController = (controllerId, variable, value) => {
        logger.debug('Controller Event', controllerId, variable, value)
    }

    rio.on(RIO.enums.EMIT.DEBUG, eventDebug.bind(this));
    rio.on(RIO.enums.EMIT.ERROR, eventError.bind(this));
    rio.on(RIO.enums.EMIT.CONNECT, eventConnect.bind(this));
    rio.on(RIO.enums.EMIT.CLOSE, eventClose.bind(this));

    rio.on(RIO.enums.EMIT.SYSTEM, eventSystem.bind(this));
    rio.on(RIO.enums.EMIT.CONTROLLER, eventController.bind(this));
    rio.on(RIO.enums.EMIT.ZONE, eventZone.bind(this));
    rio.on(RIO.enums.EMIT.SOURCE, eventSource.bind(this));
    rio.on(RIO.enums.EMIT.ZONES, eventZones.bind(this));
    rio.on(RIO.enums.EMIT.SOURCES, eventSources.bind(this));

    rio.connect().then(() => {
        const doAsync = async () => {
            await rio.get.systemStatus();
            await rio.get.systemVersion();
            await rio.get.allControllerCommands();
            await rio.get.zoneNames();
            await rio.get.sourceNames();
            //await rio.get.watch.system();
            await rio.watch.allZones();
            //await rio.watch.allSources();
        };
        doAsync();
    }).catch((err) => {
        logger.error(err);
    })
}

App();



