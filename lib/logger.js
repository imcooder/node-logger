/**
 * @author imcooder@gmail.com
 */
/* jshint node:true */
/* jshint esversion:8 */
'use strict';

var fs = require('fs');
let path = require('path');
let colors = require('colors');
let mkdirp = require('mkdirp');
const os = require('os');
const eol = os.EOL;

const utils = require('./utils');
const util = require('util');
const value = {
    DEBUG: 16,
    INFO: 4,
    WARN: 2,
    ERROR: 1
};
var LOGFILE_CACHE = {};

var FILE_STREAM_ID = 0;

const encoding = 'utf8';
// 创建失败后 锁定1分钟后才重建
const LOCK_TIME = 60000;

// debug模式下应用日志等级对应的颜色
var COLORS = {
    1: 'red',
    2: 'yellow',
    4: 'grey',
    8: 'cyan',
    16: 'blue'
};
const originalConsoleFunctions = {
    log: console.log,
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error
};
function consoleOutput(intLevel, ...args) {
    const color = COLORS[intLevel] || COLORS[value.ERROR];
    let content = '';
    try {
        content = util.format(...args);
    } catch (error) {
        content = '';
    }
    if (intLevel === value.ERROR) {
        originalConsoleFunctions.error(content);
    } else if (intLevel === value.WARN) {
        originalConsoleFunctions.warn(content);
    } else if (intLevel === value.INFO) {
        originalConsoleFunctions.log(content);
    } else {
        originalConsoleFunctions.log(content);
    }
}
//日志等级
var LEVELS = {
    1: 'ERROR',
    2: 'WARN',
    4: 'INFO',
    8: 'TRACE',
    16: 'DEBUG'
};

var LEVELS_REVERSE = {};
var levels_int2str = {};
for (var num in LEVELS) {
    LEVELS_REVERSE[LEVELS[num]] = parseInt(num, 10);
    levels_int2str[num] = LEVELS[num];
}
//获取字符串标识对应的日志等级，没有返回-1
function getLogLevelInt(level) {
    return LEVELS_REVERSE[level] || -1;
}

module.exports = class Logger {
    constructor(app, opts) {
        this.app = app;
        let log_file;
        if (opts && opts.log_file) {
            log_file = opts.log_file;
        }
        if (opts.level) {
            opts.level = String(opts.level).toUpperCase();
            opts.intLevel = getLogLevelInt(opts.level);
        }
        this.opts = Object.assign({
            'console': false,
            'intLevel': value.DEBUG,
            'auto_rotate': 1,
            'log_file': log_file
        }, opts);

        // 设置drain时 buffer size
        if (!this.opts['max_buffer_size']) {
            // 1K
            this.opts['max_buffer_size'] = 1000;
        }
        if (!this.opts['high_water_mark']) {
            // 1M
            //1M, default in node= 16384, 16K
            this.opts['high_water_mark'] = 1024 * 1024;
        }
    }
    getIntLevel() {
        return this.opts.intLevel;
    }
    static getOriginalConsoleFunctions() {
        return originalConsoleFunctions;
    }
    getLogCache() {
        let keys = Object.keys(LOGFILE_CACHE);
        let obj = {};
        for (let key of keys) {
            obj[key] = {};
            let items = LOGFILE_CACHE[key];
            let subKeys = Object.keys(items);
            for (let subKey of subKeys) {
                obj[key][subKey] = {};
                let subItem = items[subKey];
                if (!subItem) {
                    continue;
                }
                obj[key][subKey].createFileLockTime = subItem.createFileLockTime;
                obj[key][subKey].abandon = subItem.abandon;
                obj[key][subKey].perabandon = subItem.perabandon;
                obj[key][subKey].bufferSize = subItem.buffer.length;
                if (subItem.lastWrite) {
                    obj[key][subKey].lastWrite = subItem.lastWrite;
                }
                if (subItem.stream) {
                    let stream = subItem.stream;
                    obj[key][subKey].evopened = stream.custStatus.fd || -1;
                    obj[key][subKey].evfinished = stream.custStatus.finished || false;
                    obj[key][subKey].evpaused = stream.custStatus.paused;

                    obj[key][subKey].stream = true;
                    obj[key][subKey].state = {};
                    let stateKeys = Object.keys(stream._writableState);
                    for (let stateKey of stateKeys) {
                        if (stateKey !== 'bufferedRequest' && stateKey !== 'lastBufferedRequest' &&
                            stateKey !== 'corkedRequestsFree') {
                            obj[key][subKey].state[stateKey] = stream._writableState[stateKey];
                        }
                    }
                }
                if (subItem.error) {
                    let error = subItem.error;
                    obj[key][subKey].error = error.message + '|' + error.stack;
                }
                if (subItem.errorw) {
                    let error = subItem.errorw;
                    obj[key][subKey].errorw = error.message + '|' + error.stack;
                }
            }
        }
        return obj;
    }
    shutdown() {
        const logFileType = this._getFileType() || '';
        let fdCache = LOGFILE_CACHE[logFileType];
        if (fdCache) {
            for (let oldFile in fdCache) {
                if (fdCache[oldFile] && fdCache[oldFile].stream) {
                    this._freeStream(fdCache[oldFile].stream);
                }
                delete fdCache[oldFile];
            }
        }
        return Promise.resolve();
    }
    fatal(...args) {
        return this.log.call(this, 'FATAL', ...args);
    }
    error(...args) {
        return this._log.call(this, 'ERROR', ...args);
    }
    warning(...args) {
        return this._log.call(this, 'WARN', ...args);
    }
    warn(...args) {
        return this._log.call(this, 'WARN', ...args);
    }
    notice(...args) {
        return this._log.call(this, 'INFO', ...args);
    }
    log(...args) {
        return this._log.call(this, 'INFO', ...args);
    }
    info(...args) {
        return this._log.call(this, 'INFO', ...args);
    }
    trace(...args) {
        return this._log.call(this, 'TRACE', ...args);
    }
    debug(...args) {
        return this._log.call(this, 'DEBUG', ...args);
    }

    _log(level, ...args) {
        level = String(level).toUpperCase();
        var intLevel = getLogLevelInt(level);
        if (intLevel < 0) {
            return false;
        }
        this._writeLog(intLevel, ...args);
    }
    _getFileType() {
        const logFileType = this.opts.log_file;
        return logFileType;
    }

    _now() {
        return new Date();
    }

    //获取日志文件地址。注意访问日志与应用日志的差异
    getLogFile(intLevel) {
        return this.opts.log_file;
    }

    _writeLog(intLevel, ...args) {
        let self = this;
        //日志等级高于配置则不输出日志
        if (intLevel < 0 || intLevel > this.opts.intLevel) {
            return false;
        }
        let date = new Date();
        let task = {
            now: date,
            level: intLevel
        };
        let time = '';
        let content = '';
        let app = this.app;
        let levelStr = levels_int2str[intLevel];
        if (this.opts.time_format) {
            time = utils.strftime(date, this.opts.time_format);
        }
        try {
            content = util.format(...args);
        } catch (error) {
            content = '';
        }
        task.content = `[${time}] [${levelStr}] ${app} - `;
        task.content += content;

        if (this.opts.console) {
            this._writeConsoleLog(task);
        }
        this._writeFileLog(task);
    }
    _writeConsoleLog(task) {
        const level = task.level;
        let now = task.now;
        var color = COLORS[task.level];
        var _str = task.content;
        if (level === value.ERROR) {
            originalConsoleFunctions.error(_str[color]);
        } else if (level === value.WARN) {
            originalConsoleFunctions.warn(_str[color]);
        } else {
            originalConsoleFunctions.log(_str[color]);
        }
    }

    _freeStream(stream) {
        if (!stream) {
            return;
        }
        try {
            stream.end();
        }
        catch (e) { }
    }

    _freeStreamCache(cacheItem, stream, locktime) {
        this._freeStream(stream);
        if (this._isStreamSame(cacheItem.stream, stream)) {
            delete cacheItem.stream;
            if (locktime) {
                cacheItem.createFileLockTime = locktime;
            }
        }
    }

    _createLogFileStream(logFile) {
        var pathname = path.dirname(logFile);
        if (!fs.existsSync(pathname)) {
            mkdirp.sync(pathname);
        }
        let stream = fs.createWriteStream(logFile, {
            'flags': 'a',
            'highWaterMark': this.opts['high_water_mark']
        });
        if (!stream) {
            originalConsoleFunctions.error('create failed');
            return null;
        }
        FILE_STREAM_ID += 1;
        stream.custStatus = {
            fd: -1,
            paused: false,
            finished: false,
            id: FILE_STREAM_ID
        };
        return stream
    }

    _isStreamSame(sa, sb) {
        if (sa && sb) {
            return sa.custStatus.id === sb.custStatus.id;
        }
        return false;
    }

    _storeToBuffer(cacheItem, stream, content, needfree = true) {
        let size = cacheItem.buffer.length;
        if (size < this.opts['max_buffer_size']) {
            cacheItem.buffer.push(content);
            return true;
        }

        // 是否需要lock1分钟
        if (needfree) {
            this._freeStreamCache(cacheItem, stream, LOCK_TIME + this._now().getTime());
        }
        cacheItem.abandon += 1;
        cacheItem.perabandon += 1;
        return false;
    }

    _writeBufferToStream(cacheItem, stream) {
        stream.custStatus.paused = false;
        if (!this._isStreamSame(cacheItem.stream, stream)) {
            return false;
        }
        let paused = false;
        while (cacheItem.buffer.length > 0) {
            let msg = cacheItem.buffer.shift();
            if (this._writeToStream(cacheItem, stream, msg)) {
                paused = true;
                break;
            }
        }
        return paused;
    }

    _writeToStream(cacheItem, stream, content) {
        cacheItem.perabandon = 0;
        let paused = !stream.write(content + eol, encoding, error => {
            if (error) {
                originalConsoleFunctions.error(error);
                cacheItem.errorw = error;
            }
        });
        stream.custStatus.paused = paused;
        if (paused) {
            stream.once('drain', () => {
                this._writeBufferToStream(cacheItem, stream);
            });
        }
        return paused;
    }

    _writeFileLog(task) {
        let content = task.content;
        let now = task.now;
        // 日志文件名称
        if (!this.opts.log_file) {
            return;
        }
        let logFileType = this._getFileType();
        let logFile = this.opts.log_file;
        // 是否按小时自动切分
        if (this.opts.auto_rotate) {
            logFile = logFileType + '.' + utils.strftime(now, '%Y%m%d%H');
        }
        if (!LOGFILE_CACHE[logFileType]) {
            LOGFILE_CACHE[logFileType] = {};
        }
        let stream = null;
        let cacheItem = null;
        // 获取此类文件的FD缓存
        let fdCache = LOGFILE_CACHE[logFileType];
        if (!fdCache[logFile] || !fdCache[logFile].stream) {
            // 关闭老的日志流
            for (let oldFile in fdCache) {
                if (oldFile === logFile) {
                    continue;
                }
                if (fdCache[oldFile] && fdCache[oldFile].stream) {
                    this._freeStream(fdCache[oldFile].stream);
                }
                delete fdCache[oldFile];
            }
            cacheItem = {};
            if (fdCache[logFile]) {
                cacheItem = fdCache[logFile];
            } else {
                fdCache[logFile] = cacheItem = {
                    createFileLockTime: 0,
                    buffer: [],
                    abandon: 0,
                    perabandon: 0
                };
            }
            if (this._now().getTime() - cacheItem.createFileLockTime > 0) {
                // originalConsoleFunctions.log('try create');
                cacheItem.stream = stream = this._createLogFileStream(logFile);
                if (stream) {
                    stream.on('error', error => {
                        originalConsoleFunctions.error('error:%s', error.stack);
                        // 只有是错误，用于统计，先不区分是哪个stream实例
                        cacheItem.error = error;
                        this._freeStreamCache(cacheItem, stream, LOCK_TIME + this._now().getTime());
                    });
                    stream.on('open', (fd) => {
                        stream.custStatus.fd = fd;
                    });
                    stream.on('finish', () => {
                        stream.custStatus.finished = true;
                    });
                    // 新创建的流, 先尝试写入缓存
                    this._writeBufferToStream(cacheItem, stream);
                }
            } else {
                // originalConsoleFunctions.log('lock create');
            }
        } else {
            cacheItem = fdCache[logFile];
            stream = cacheItem.stream;
        }

        if (stream && stream.writable) {
            if (stream.custStatus.paused) {
                // 如果流暂停, 则缓存
                this._storeToBuffer(cacheItem, stream, content);
            } else {
                this._writeToStream(cacheItem, stream, content);
            }
        } else {
            this._storeToBuffer(cacheItem, stream, content, false);
        }
    }
};
