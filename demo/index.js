import nconf from 'nconf';
import pkg from 'russound-rio';
const { RIO, logger, EMIT } = pkg;

const App = () => {
    nconf.file('./config.json');
    var config = nconf.get('rio');
    logger.setDebug(true);
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
        logger.debug('Zone Event', controllerId, zoneId, variable, value)
    }

    const eventSource = (sourceId, variable, value) => {
        logger.debug('Source Event', sourceId, variable, value)

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



    rio.on('debug', eventDebug.bind(this));
    rio.on('error', eventError.bind(this));
    rio.on('connect', eventConnect.bind(this));
    rio.on('close', eventClose.bind(this));

    rio.on(EMIT.SYSTEM, eventSystem.bind(this));
    rio.on(EMIT.CONTROLLER, eventController.bind(this));
    rio.on(EMIT.ZONE, eventZone.bind(this));
    rio.on(EMIT.SOURCE, eventSource.bind(this));
    rio.on(EMIT.ZONES, eventZones.bind(this));
    rio.on(EMIT.SOURCES, eventSources.bind(this));

    rio.connect().then(() => {
        const doAsync = async () => {
            await rio.getSystemStatus();
            await rio.getVersion();
            await rio.getControllerCommands();
            await rio.getZones();
            await rio.getSources();
            //await rio.watchSystem();
            await rio.watchZones();
            //await rio.watchSources();
        };
        doAsync();
    }).catch((err) => {
        logger.error(err);
    })




}

App();



