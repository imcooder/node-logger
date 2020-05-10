/**
 * @author imcooder@gmail.com
 */
/* jshint node:true */
/* jshint esversion:8 */
'use strict';
const duUtils = require('./utils');
const TimeContainer = require('./time_container');
const util = require('util');
const DEFAULT_VALUE = '-';
module.exports = class Tracer {
    constructor(name = 'dlp', logid = '', defaultList = {}) {
        this._logid = logid || duUtils.makeUUID(true);
        this._list = [];
        this._map = {};
        this._timeContainer = new TimeContainer();
        const NodeLogger = require('../index');
        this.logger = NodeLogger.getLogger(name);
        if (defaultList) {
            let arr = defaultList;
            if (util.isObject(defaultList) && !util.isArray(defaultList)) {
                arr = [];
                for (let key in defaultList) {
                    let value = defaultList[key];
                    value.key = key;
                    value.weight = value.weight || 0;
                    arr.push(value);
                }
                arr.sort((a, b) => {
                    return b.weight - a.weight;
                });
            }
            if (util.isArray(arr)) {
                arr.forEach(item => {
                    let obj = {
                        key: item.key || '',
                        default: item.default || DEFAULT_VALUE,
                        value: item.value || item.default || DEFAULT_VALUE
                    };
                    if (!obj.key) {
                        return;
                    }
                    if (!this._map[obj.key]) {
                        this._list.push(obj);
                    }
                    this._map[obj.key] = obj;
                });
            }
        }
    }
    static serilize(args) {
        let res = args.map((item) => {
            return duUtils.toString(item);
        });
        return res;
    }
    get logid() {
        return this._logid;
    }
    set logid(logid) {
        this._logid = logid;
    }
    _set(key, value) {
        let obj = this._map[key];
        if (!obj) {
            obj = {
                key: key,
                value: value || '-',
                default: '-'
            };
            this._list.push(obj);
            this._map[key] = obj;
        }
        obj.value = value;
    }
    _get(key) {
        return this._map[key];
    }
    debug(format, ...args) {
        if (!this.logger || 16 > this.logger.getIntLevel()) {
            return;
        }
        format = 'logid:%s ' + format;
        args = Tracer.serilize(args);
        args.unshift(this._logid);
        this.logger.debug(format, ...args);
    }
    info(format, ...args) {
        if (!this.logger || 4 > this.logger.getIntLevel()) {
            return;
        }
        format = 'logid:%s ' + format;
        args = Tracer.serilize(args);
        args.unshift(this._logid);
        this.logger.info(format, ...args);
    }
    warn(format, ...args) {
        if (!this.logger || 2 > this.logger.getIntLevel()) {
            return;
        }
        format = 'logid:%s ' + format;
        args = Tracer.serilize(args);
        args.unshift(this._logid);
        this.logger.warn(format, ...args);
    }
    error(format, ...args) {
        if (!this.logger || 1 > this.logger.getIntLevel()) {
            return;
        }
        format = 'logid:%s ' + format;
        args = Tracer.serilize(args);
        args.unshift(this._logid);
        this.logger.error(format, ...args);
    }
    start(label, isSeq = false) {
        return this._timeContainer.tcStart(label, isSeq);
    }
    tcStart(label, isSeq = false) {
        return this._timeContainer.tcStart(label, isSeq);
    }
    startSequenceTimer(label) {
        return this.tcStart(label, true);
    }
    end(label) {
        return this._timeContainer.tcEnd(label);
    }
    tcEnd(label) {
        return this._timeContainer.tcEnd(label);
    }
    stopSequenceTimer(label) {
        return this.tcEnd(label);
    }
    trace(tag, ...args) {
        if (!this.logger || 16 > this.logger.getIntLevel()) {
            return;
        }
        this.logger.debug("logid:%s [%s] %j", this._logid, tag, {
            args
        });
    }
    setName(name) {
        this._name = name;
    }
    _makeValue(key, value) {
        let v = value;
        if (v !== '') {
            return v;
        }
        let obj = this._get(key);
        if (obj && obj.default !== undefined) {
            return obj.default;
        }
        return DEFAULT_VALUE;
    }
    gather(key, value) {
        this._set(key, this._makeValue(key, value));
    }
    _join() {
        this._set('logid', this._logid);
        let timeRecords = this._timeContainer.getRecords();
        this._set('all_t', timeRecords.allTime.toFixed(3));
        this._set('self_t', timeRecords.selfTime.toFixed(3));
        for (let itemCost of timeRecords.itemCosts) {
            this._set(itemCost.label + '_t', itemCost.cost.toFixed(3));
        }
        let out = '';
        for (let i = 0; i < this._list.length; i++) {
            let item = this._list[i];
            let s = '';
            let value = item.value;
            if (util.isString(value)) {
                s = value;
            } else if (value instanceof Buffer) {
                s = value.toString();
            } else if (util.isObject(value)) {
                try {
                    s = JSON.stringify(value);
                } catch (error) {
                    s = '';
                }
            } else {
                try {
                    s = value.toString();
                } catch (error) {
                    s = '';
                }
            }
            if (!util.isString(s)) {
                s = s.toString();
            }
            s = s.replace(/\s+/g, '_');
            s = s.replace(/[\n ]/g, '');
            if (out) {
                out += ' ';
            }
            out += item.key + ':' + s;
        }
        return out;
    }
    dumps() {
        let out = this._join();
        this.logger.info(out);
    }
};
