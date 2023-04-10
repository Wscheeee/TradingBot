
/**
 * A simple logger class for logging messages with different logging levels.
 */

/**
 * @callback 
 * @typedef {(cbIndex:number,msg:string)=>any} LogCallback
 */

/**
 * @typedef {"debug"|"info"|"warn"|"error"|"critical"} LogLevel_Types
 * @typedef {"DEBUG"|"INFO","WARN","ERROR","CRITICAL"} LogLevelLabel_Types
 * @typedef {{[key in LogLevel_Types]:{
 *    label: LogLevelLabel_Types,
 *    color: string,
 *    callbacks: LogCallback[]
 * }}} LoggerLevelsObject_Interface
 */

/**
 * @typedef {{
 *    app_name:string
 * }} LoggerClassSettings_Interface
 */
module.exports.Logger = class Logger {
    /**
   * @type {LoggerLevelsObject_Interface}
   */
    #levels = {
        debug: { 
            label: "DEBUG", 
            color: "\x1b[38;2;102;153;255m" ,
            callbacks:[]
        },
        info: { 
            label: "INFO", 
            color: "\x1b[38;2;0;255;0m",
            callbacks:[]
        },
        warn: { 
            label: "WARN", 
            color: "\x1b[38;2;255;204;0m",
            callbacks:[] 
        },
        error: { 
            label: "ERROR", 
            color: "\x1b[38;2;255;51;51m",
            callbacks:[]
        },
        critical: { 
            label: "CRITICAL", 
            color: "\x1b[38;2;255;0;255m",
            callbacks:[]
        }
    };
    /**
   * @type {LoggerClassSettings_Interface}
   */
    #settings;
    /**
  * Create a new Logger instance with default log levels and colors.
  * @constructor
  * @param {LoggerClassSettings_Interface} settings
  */
    constructor(settings) {
        // Define default log levels and colors

        this.#settings = settings;
    }

    // SETTERS
    /**
  * 
  * @param {LogLevel_Types} level 
  * @param {LogCallback} cb 
  */
    addLogCallback(level,cb){
        this.#levels[level]?this.#levels[level].callbacks.push(cb):null;
    }


    /**
  * Log a message with the DEBUG level.
  * @param {string} message - The message to log.
  * @param {string} [color] - The color to use for the message (optional).
  */
    debug(message, color = this.#levels.debug.color) {
        this.#log(message, "debug", color);
    }

    /**
  * Log a message with the INFO level.
  * @param {string} message - The message to log.
  * @param {string} [color] - The color to use for the message (optional).
  */
    info(message, color = this.#levels.info.color) {
        this.#log(message, "info", color);
    }

    /**
  * Log a message with the WARN level.
  * @param {string} message - The message to log.
  * @param {string} [color] - The color to use for the message (optional).
  */
    warn(message, color = this.#levels.warn.color) {
        this.#log(message, "warn", color);
    }

    /**
  * Log a message with the ERROR level.
  * @param {string} message - The message to log.
  * @param {string} [color] - The color to use for the message (optional).
  */
    error(message, color = this.#levels.error.color) {
        this.#log(message, "error", color);
    }

    /**
  * Log a message with the CRITICAL level.
  * @param {string} message - The message to log.
  * @param {string} [color] - The color to use for the message (optional).
  */
    critical(message, color = this.#levels.critical.color) {
        this.#log(message, "critical", color);
    }

    /**
  * Log a message with a specified log level and color.
  * @param {string} message - The message to log.
  * @param {LogLevel_Types} level - The log level to use (must be one of the keys in the `levels` object).
  * @param {string} [color] - The color to use for the message (optional).
  */
    #log(message, level, color) {
        let callbacks = this.#levels[level]?this.#levels[level].callbacks:[];

        const timestamp = new Date().toISOString();
        const levelLabel = this.#levels[level].label;
        const colorCode = color ||this.#levels[level].color;
        const fullMessage = `[${timestamp}] (${this.#settings.app_name}) ${levelLabel}: ${message}`;
        console.log(`[${timestamp}] (${this.#settings.app_name}) ${levelLabel}: ${colorCode}${message}\x1b[0m`);
        callbacks.forEach((cb,i)=>{
            cb(i,fullMessage);
        });
    }
};




