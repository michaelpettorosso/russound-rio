const SYSTEM = {
    VERSION: 'VERSION',
    SYSTEM_STATUS: 'System.status'
};

const CONTROLLER = {
    IP_ADDRESS: 'ipAddress',
    MAC_ADDRESS: 'macAddress'
};

const SET = {
    command: 'SET',
    ZONE: {
        BASS: 'bass',
        TREBLE: 'treble',
        BALANCE: 'balance',
        LOUDNESS: 'loudness',
        TURN_ON_VOLUME: 'turnOnVolume'
    }
};

const GET = {
    command: 'GET',
    ZONE: {
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
    },
    SOURCE: {
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
};

const ADJUST = {
    command: 'ADJUST',
    ZONE: {
        BASS: 'bass',
        TREBLE: 'treble',
        BALANCE: 'balance',
        TURN_ON_VOLUME: 'turnOnVolume'
    }
};

const EVENT_KEY_PRESS = {
    command: 'KeyPress',
    VOLUME: 'Volume',
    VOLUME_UP: 'VolumeUp',
    VOLUME_DOWN: 'VolumeDown'
};

const EVENT_KEY_RELEASE = {
    command: 'KeyRelease',
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
};

const EVENT_KEY_HOLD = {
    command: 'KeyHold',
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
const EVENT_MM = {
    MM_INIT: 'MMInit',
    MM_SELECT_ITEM: 'MMSelectItem',
    MM_NEXT_ITEMS: 'MMNextItems',
    MM_PREV_ITEMS: 'MMPrevItems',
    MM_PREV_SCREEN: 'MMPrevScreen',
    MM_CURSOR_NEXT: 'MMCursorNext',
    MM_CURSOR_PREV: 'MMCursorPrev',
    MM_LETTER_UP: 'MMLetterUp',
    MM_LETTER_DOWN: 'MMLetterDown'
};

const EVENT = {
    command: 'EVENT',
    SELECT_SOURCE: 'SelectSource',
    ZONE_ON: 'ZoneOn',
    ZONE_OFF: 'ZoneOff',
    ALL_ON: 'AllOn',
    ALL_OFF: 'AllOff',
    PARTY_MODE: 'PartyMode',
    DO_NOT_DISTURB: 'DoNotDisturb'
};

const STATUS = {
    ON: 'ON',
    OFF: 'OFF'
};

const WATCH = {
    command: 'WATCH',
    ON: 'ON',
    OFF: 'OFF',
    EXPIRES_IN: 'EXPIRESIN',
    SYSTEM: 'System',
};

const EMIT = {
    SYSTEM: 'SYSTEM',
    CONTROLLER: 'CONTROLLER',
    ZONE: 'ZONE',
    SOURCE: 'SOURCE',
    ZONES: 'ZONES',
    SOURCES: 'SOURCES',
    CONFIGURED_ZONES: 'CONFIGURED_ZONES',
    CONFIGURED_SOURCES: 'CONFIGURED_SOURCES',
    DEBUG: 'debug',
    ERROR: 'error',
    CONNECT: 'connect',
    CLOSE: 'close'

}

const INVALID = {
    SOURCE_NAME: 'N/A'
}

const RESPONSE = {
    ERROR: 'E',
    SUCCESS: 'S',
    NOTIFICATION: 'N',
};

module.exports = {
    SYSTEM,
    CONTROLLER,
    SET,
    GET,
    ADJUST,
    EVENT,
    EVENT_KEY_PRESS,
    EVENT_KEY_RELEASE,
    EVENT_KEY_HOLD,
    STATUS,
    INVALID,
    WATCH,
    EMIT,
    RESPONSE
}