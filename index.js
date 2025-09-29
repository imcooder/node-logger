/**
 * @author imcooder@gmail.com
 */
/* jshint node:true */
/* jshint esversion:8 */
'use strict';

var Logger = require('./lib/logger');
const LogCleaner = require('./lib/cleaner');
let loggerCache = {
};

// Create global cleaner instance
let logCleaner = null;

const defaultConfig = {
    console: {
        time_format: '%F %T.%L',
        level: "DEBUG",
        console: true
    }
};

let config = {};
let enabled = true;
var NodeLogger = {
    configure: function (conf) {
        config = Object.assign({}, defaultConfig, conf);
        if (config.replaceConsole) {
            NodeLogger.replaceConsole();
        }

        // Start automatic log cleanup service
        if (!logCleaner) {
            logCleaner = new LogCleaner();
        }
        logCleaner.start(config);
    },
    getLogger: function (app) {
        if (loggerCache[app]) {
            return loggerCache[app];
        }
        let conf;
        if (!config[app]) {
            console.error(`invalid logger type:${app}`);
            app = 'console';
            conf = defaultConfig.console;
        } else {
            conf = config[app];
        }
        if (!conf) {
            console.error('invalid logger conf');
            return;
        }
        let loggerObj = new Logger(app, conf);
        loggerCache[app] = loggerObj;
        return loggerObj;
    },
    replaceConsole: function () {
        let loggerObj;
        function replaceWith(fn) {
            return function () {
                fn.apply(loggerObj, arguments);
            };
        }
        loggerObj = NodeLogger.getLogger("console");
        ['log', 'debug', 'info', 'warn', 'error'].forEach(item => {
            loggerObj = NodeLogger.getLogger("console");
            console[item] = replaceWith(item === 'log' ? loggerObj.info : loggerObj[item]);
        });
    },
    restoreConsole: function () {
        let originalConsoleFunctions = Logger.getOriginalConsoleFunctions();
        ['log', 'debug', 'info', 'warn', 'error'].forEach(item => {
            console[item] = originalConsoleFunctions[item];
        });
    },
    create: (name = 'dlp', logid = '', defaultList = {}) => {
        const Tracer = require('./lib/tracer');
        return new Tracer(name, logid, defaultList);
    },
    shutdown() {
        enabled = false;

        // Stop automatic cleanup service
        if (logCleaner) {
            logCleaner.stop();
        }

        let exitPromises = [];
        for (const name in loggerCache) {
            let loggerItem = loggerCache[name];
            if (!loggerItem || typeof loggerItem.shutdown !== 'function') {
                continue;
            }
            exitPromises.push(loggerItem.shutdown());
        }
        if (!exitPromises.length) {
            return;
        }
        return Promise.all(exitPromises);
    },

    // Manually execute cleanup once (for testing)
    async cleanupNow() {
        if (logCleaner) {
            await logCleaner.cleanupNow();
        }
    }
};

module.exports = NodeLogger;
