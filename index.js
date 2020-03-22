/**
 * @author imcooder@gmail.com
 */
/* jshint node:true */
/* jshint esversion:8 */
'use strict';

var Logger = require('./lib/logger');
let loggerCache = {
};

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
    }
};

module.exports = NodeLogger;
