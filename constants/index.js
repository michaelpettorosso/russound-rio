const systemCommands = {
    VERSION: 'VERSION',
    SYSTEM_STATUS: 'System.status'
}

const controllerCommands = {
    IP_ADDRESS: 'ipAddress',
    MAC_ADDRESS: 'macAddress'
}

const adjustZoneConstants = {
    BASS: 'bass',
    TREBLE: 'treble',
    BALANCE: 'balance',
    TURN_ON_VOLUME: 'turnOnVolume'
}

const getZoneConstants = {
    NAME: 'name',
    CURRENT_SOURCE: 'currentSource',
    VOLUME: 'volume',
    BASS: 'bass',
    TREBLE: 'treble',
    BALANCE: 'balance',
    LOUDNESS: 'loudness',
    TURN_ON_VOLUME: 'turnOnVolume',
    DO_NO_DISTURB: 'doNotDisturb',
    PARTY_MODE: 'partyMode',
    STATUS: 'status',
    MUTE: 'mute',
    SHARED_SOURCE: 'sharedSource',
    LAST_ERROR: 'lastError'
}

const setZoneConstants = {
    BASS: 'bass',
    TREBLE: 'treble',
    BALANCE: 'balance',
    LOUDNESS: 'loudness',
    TURN_ON_VOLUME: 'turnOnVolume'
}

const getSourceConstants = {
    NAME: 'name',
    TYPE: 'type',
    COMPOSER_NAME: 'composerName',
    CHANNEL: 'channel',
    COVER_ART_URL: 'coverArtURL',
    CHANNEL_NAME: 'channelName',
    GENRE: 'genre',
    ARTIST_NAME: 'artistName',
    ALBUM_NAME: 'albumName',
    PLAYLIST_NAME: 'playlistName',
    SONG_NAME: 'songName',
    PROGRAM_SERVICE_NAME: 'programServiceName',
    RADIO_TEXT: 'radioText',
    RADIO_TEXT_2: 'radioText2',
    RADIO_TEXT_3: 'radioText3',
    RADIO_TEXT_4: 'radioText4',
    SHUFFLE_MODE: 'shuffleMode',
    MODE: 'mode'
}

const eventKeypressCommands = {
    VOLUME: 'Volume',
    VOLUME_UP: 'VolumeUp',
    VOLUME_DOWN: 'VolumeDown'
}

const eventKeyReleaseCommands = {
    DIGIT_ZERO: 'DigitZero',
    DIGIT_ONE: 'DigitOne',
    DIGIT_TWO: 'DigitTwo',
    DIGIT_THREE: 'DigitThree',
    DIGIT_FOUR: 'DigitFour',
    DIGIT_FIVE: 'DigitFive',
    DIGIT_SIX: 'DigitSix',
    DIGIT_SEVEN: 'DigitSeven',
    DIGIT_EIGHT: 'DigitEight',
    DIGIT_NINE: 'DigitNine',
    PREVIOUS: 'Previous',
    NEXT: 'Next',
    CHANNEL_UP: 'ChannelUp',
    CHANNEL_DOWN: 'ChannelDown',
    NEXT_SOURCE: 'NextSource',
    POWER: 'Power',
    STOP: 'Stop',
    PAUSE: 'Pause',
    FAVORITE_1: 'Favorite1',
    FAVORITE_2: 'Favorite2',
    PLAY: 'Play',
    SELECT_SOURCE: 'SelectSource',
    ENTER: 'Enter',
    LAST: 'Last',
    SLEEP: 'Sleep',
    GUIDE: 'Guide',
    EXIT: 'Exit',
    MENU_LEFT: 'MenuLeft',
    MENU_RIGHT: 'MenuRight',
    MENU_UP: 'MenuUp',
    MENU_DOWN: 'MenuDown',
    SELECT: 'Select',
    INFO: 'Info',
    MENU: 'Menu',
    RECORD: 'Record',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown',
    DISC: 'Disc',
    MUTE: 'Mute'
}
const eventKeyHoldCommands = {
    DIGIT_ZERO: 'DigitZero',
    DIGIT_ONE: 'DigitOne',
    DIGIT_TWO: 'DigitTwo',
    DIGIT_THREE: 'DigitThree',
    DIGIT_FOUR: 'DigitFour',
    DIGIT_FIVE: 'DigitFive',
    DIGIT_SIX: 'DigitSix',
    DIGIT_SEVEN: 'DigitSeven',
    DIGIT_EIGHT: 'DigitEight',
    DIGIT_NINE: 'DigitNine',
    PREVIOUS: 'Previous',
    NEXT: 'Next',
    CHANNEL_UP: 'ChannelUp',
    CHANNEL_DOWN: 'ChannelDown',
    POWER: 'Power',
    STOP: 'Stop',
    PAUSE: 'Pause',
    FAVORITE_1: 'Favorite1',
    FAVORITE_2: 'Favorite2',
    PLAY: 'Play',
    MUTE: 'Mute',
    ENTER: 'Enter',
    LAST: 'Last',
    SLEEP: 'Sleep',
    GUIDE: 'Guide',
    EXIT: 'Exit',
    MENU_LEFT: 'MenuLeft',
    MENU_RIGHT: 'MenuRight',
    MENU_UP: 'MenuUp',
    MENU_DOWN: 'MenuDown',
    SELECT: 'Select',
    INFO: 'Info',
    MENU: 'Menu',
    RECORD: 'Record',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown',
    DISC: 'Disc'
}
const eventMMCommands = {
    MM_INIT: 'MMInit',
    MM_SELECT_ITEM: 'MMSelectItem',
    MM_NEXT_ITEMS: 'MMNextItems',
    MM_PREV_ITEMS: 'MMPrevItems',
    MM_PREV_SCREEN: 'MMPrevScreen',
    MM_CURSOR_NEXT: 'MMCursorNext',
    MM_CURSOR_PREV: 'MMCursorPrev',
    MM_LETTER_UP: 'MMLetterUp',
    MM_LETTER_DOWN: 'MMLetterDown'
}

const eventCommands = {
    command: 'EVENT',
    EVENT: {
        SELECT_SOURCE: 'SelectSource',
        ZONE_ON: 'ZoneOn',
        ZONE_OFF: 'ZoneOff',
        ALL_ON: 'AllOn',
        ALL_OFF: 'AllOff',
        KEYPRESS: 'KeyPress',
        KEY_RELEASE: 'KeyRelease',
        KEY_HOLD: 'KeyHold',
        PARTY_MODE: 'PartyMode',
        DO_NOT_DISTURB: 'DoNotDisturb',
        KEYPRESS_COMMANDS: eventKeypressCommands,
        KEY_RELEASE_COMMANDS: eventKeyReleaseCommands,
        KEY_HOLD_COMMANDS: eventKeyHoldCommands,
        MM: eventMMCommands
    }
}
const getCommands = {
    command: 'GET',
    ZONE: getZoneConstants,
    SOURCE: getSourceConstants,
}

const setCommands = {
    command: 'SET',
    ZONE: setZoneConstants
}

const adjustCommands = {
    command: 'ADJUST',
    ZONE: adjustZoneConstants
}


const watchCommands = {
    command: 'WATCH',
    ON: 'ON',
    OFF: 'OFF',
    EXPIRES_IN: 'EXPIRESIN',
    SYSTEM: 'System',
    EMIT: {
        SYSTEM: 'SYSTEM',
        CONTROLLER: 'CONTROLLER',
        ZONE: `ZONE`,
        SOURCE: `SOURCE`,
        ZONES: `ZONES`,
        SOURCES: `SOURCES`,
    }
}

const responseCodes = {
    ERROR: 'E',
    SUCCESS: 'S',
    NOTIFICATION: 'N',
}

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
    return SYSTEM.VERSION;
};

const getSystemStatusCommand = () => {
    return `${GET.command} ${SYSTEM.SYSTEM_STATUS}`;
};

const getControllerCommand = (controllerId, command) => {
    return `${GET.command} ${controllerCommandPrefix(controllerId)}${getCommandValue(command)}`;
};

const getControllerCommands = (controllerId) => {
    var commands = []
    Object.keys(CONTROLLER).forEach(key => {
        commands.push(`${controllerCommandPrefix(controllerId)}${getCommandValue(CONTROLLER[key])}`);
        // key: the name of the object key
        // index: the ordinal position of the key within the object 
    });
    return `${GET.command} ${commands.join(',')}`
};

const getEventZoneCommand = (controllerId, zoneId, event, data1, data2) => {
    return `${EVENT.command} ${zoneCommandPrefix(controllerId, zoneId)}!${event}${data1 ? ` ${data1}` : ''}${data2 ? ` ${data2}` : ''}`
};

const getZoneCommand = (controllerId, zoneId, command) => {
    return `${GET.command} ${zoneCommand(controllerId, zoneId, command)}`
};

const getZoneCommands = (controllerId, zoneId) => {
    var commands = []
    Object.keys(GET.ZONE).forEach(key => {
        commands.push(zoneCommand(controllerId, zoneId, GET.ZONE[key]));
        // key: the name of the object key
        // index: the ordinal position of the key within the object 
    });
    return `${GET.command} ${commands.join(',')}`
};


const getZonesCommand = (controllerId, zones, command) => {

    var commands = []
    for (let index = 0; index < zones; index++) {
        commands.push(zoneCommand(controllerId, index + 1, command));
    }
    return `${GET.command} ${commands.join(', ')}`
};

const setZoneCommand = (controllerId, zoneId, command, value) => {
    return `${SET.command} ${zoneCommand(controllerId, zoneId, command, value)}`
};



const getSourceCommands = (sourceId, command) => {
    var commands = []
    Object.keys(GET.SOURCE).forEach(key => {
        commands.push(sourceCommand(sourceId, GET.SOURCE[key]));
    });
    return `${GET.command} ${commands.join(', ')}`
};

const getSourceCommand = (sourceId, command) => {
    return `${GET.command} ${sourceCommand(sourceId, command)}`
};

const getSourcesCommand = (sources, command) => {
    var commands = []
    for (let index = 0; index < sources; index++) {
        commands.push(sourceCommand(index + 1, command));
    }
    return `${GET.command} ${commands.join(', ')}`
};
const SYSTEM = systemCommands
const CONTROLLER = controllerCommands
const SET = setCommands
const GET = getCommands
const ADJUST = adjustCommands;
const EVENT = eventCommands;
const WATCH = watchCommands;
const RESPONSE = responseCodes;


module.exports = {
    SYSTEM,
    CONTROLLER,
    SET,
    GET,
    ADJUST,
    EVENT,
    WATCH,
    RESPONSE,
    getSourcesCommand,
    getSourceCommand,
    getSourceCommands,
    setZoneCommand,
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