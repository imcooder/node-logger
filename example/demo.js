/**
 * @author imcooder@gmail.com
 */
/* jshint node:true */
/* jshint esversion:8 */
'use strict';

let nodeLogger = require('../index');
const path = require('path');
let logDir = path.join(__dirname, '../log');

let config = {
    main: {
        'log_file': path.join(logDir, './node.log'),
        time_format: '%F %T.%L', // https://github.com/samsonjs/strftime
        "auto_rotate": true,
        "console": true,
        "level": "DEBUG"
    },
    trace: {
        time_format: '%F %T.%L',
        'log_file': path.join(logDir, './trace.log'),
        "auto_rotate": true,
        "console": true,
        "level": "debug"
    },
    "replaceConsole": true
};
function initLog() {
    nodeLogger.configure(config);
}

initLog();
async function wait(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
};

const max = 10000000000;
let logger = nodeLogger.getLogger('main');
let traceFileLog = nodeLogger.getLogger('trace');
traceFileLog.debug('traceFileLog');

logger.debug('debug');
logger.trace('trace');
logger.info('info');
logger.notice('notice');
logger.log('log');
logger.warn('warn');
logger.error('error');
logger.fatal('fatal');

console.info('replaceConsole test:info');
console.log('replaceConsole test:log');
console.warn('replaceConsole test:warn');
console.error('replaceConsole test:error');


let tracer = nodeLogger.create('main', '_1111_');
tracer.debug('test_tracer');
tracer.dumps();
async function run() {
    for (let i = 0; i < max; i++) {
        await wait(30000);
        logger.debug('logid:%s main:%s config:%j', i, { a: 1 }, config);
    }
}
run();

