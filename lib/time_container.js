/**
 * @file: new tc logger for new dcs struct
 * @author: imcooder@gmail.com 
 */
/* jshint node:true */
/* jshint esversion:8 */
/* eslint-disable fecs-camelcase */
/* eslint-disable fecs-no-require */
'use strict';
const util = require('util');
/**
 * time consuming status
 */
var TimeConsumingLoggerStatus = {
    Pause: 0,
    Start: 1,
    End: 2
};
/**
 *  class TimeConsumingLogger
 */
module.exports = class TimeContainer {
    constructor(logid) {
        // this is used for counting time as for a request
        this._tcTimes = new Map();
        // this is used for noraml time count, it will be not included in time cousuming
        this._extraTimers = new Map();
        // general info, will print when finish
        this._info = new Map();
        // extra info, will not print when finish
        this._extra = {};
        this._status = {
            startDateTime: Date.now(),
            startProcessTime: TimeContainer.now(),
            isFinalWritten: false
        };
        this.setLogid('logid', logid);
    }
    static now() {
        let [s, ns] = process.hrtime();
        let t = s * 1000 + Number.parseFloat(ns / 1000000);
        return t;
    }
    // ------------------------------------------------------------------- //
    tcStart(label, isSeq = false) {
        return this._timeStart(label, this._tcTimes, isSeq);
    }
    tcEnd(label) {
        return this._timeEnd(label, this._tcTimes);
    }
    tcPause(label) {
        return this._timePause(label, this._tcTimes);
    }
    tcResume(label, isSeq = false) {
        return this._timeResume(label, this._tcTimes, isSeq);
    }
    tcStartOnce(label) {
        if (this._getTcItem(label, this._tcTimes)) {
            return false;
        }
        return this.tcStart(label, false);
    }
    tcEndOnce(label) {
        return this._timeEnd(label, this._tcTimes);
    }
    extraStart(label, isSeq = false) {
        return this._timeStart(label, this._extraTimers, isSeq);
    }
    extraEnd(label) {
        return this._timeEnd(label, this._extraTimers);
    }
    extraStartOnce(label, isSeq = false) {
        if (this._getTcItem(label, this._extraTimers)) {
            return false;
        }
        return this._timeStart(label, this._extraTimers, isSeq);
    }
    extraEndOnce(label) {
        return this._timeEnd(label, this._extraTimers);
    }
    _timeStart(label, times, isSeq = false, status = TimeConsumingLoggerStatus.Start) {
        let item = this._getTcItemTryToCreateIfNotExist(label, times, isSeq);
        if (!item) {
            return undefined;
        }
        if (item.status !== TimeConsumingLoggerStatus.Pause) {
            return undefined;
        }
        this._addFirstToTimeInterval(item, TimeContainer.now());
        item.status = status;
        return item.label;
    }
    _timeEnd(label, times, status = TimeConsumingLoggerStatus.End) {
        let item = this._getTcItem(label, times);
        if (!item) {
            return false;
        }
        if (item.status !== TimeConsumingLoggerStatus.Start) {
            return false;
        }
        this._addLastToTimeInterval(item, TimeContainer.now());
        item.status = status;
        return true;
    }
    _timePause(label, times) {
        return this._timeEnd(label, times, TimeConsumingLoggerStatus.Pause);
    }
    _timeResume(label, times, isSeq = false) {
        return this._timeStart(label, times, isSeq, TimeConsumingLoggerStatus.Start);
    }
    // --------------------------------- //
    _createTcTimeItem(tag) {
        let timeItem = {
            index: 0,
            status: TimeConsumingLoggerStatus.Pause,
            label: tag,
            content: []
        };
        return timeItem;
    }
    _getTcItemTryToCreateIfNotExist(label, times, isSeq = false) {
        let tag = label;
        let rstItem;
        if (times.has(label)) {
            let timeItem = times.get(label);
            let count = 5;
            while (count >= 0) {
                timeItem.index++;
                count--;
                tag = label + '_' + timeItem.index;
                if (!times.has(tag)) {
                    rstItem = this._createTcTimeItem(tag);
                    times.set(tag, rstItem);
                    break;
                }
            }
        } else {
            if (isSeq) {
                let index = 1;
                tag = label + '_' + index;
                let tmpRstItem = this._createTcTimeItem(label);
                tmpRstItem.index = index;
                times.set(label, tmpRstItem);
                rstItem = this._createTcTimeItem(tag);
            } else {
                rstItem = this._createTcTimeItem(tag);
            }
            times.set(tag, rstItem);
        }
        return rstItem;
    }
    _getTcItem(label, times) {
        return times.get(label);
    }
    // --------------------------------- //
    _addFirstToTimeInterval(item, timeObj) {
        let rst = 0;
        let length = item.content.length;
        if (length === 0) {
            item.content.push([timeObj]);
            return rst;
        }
        let lastTimeGroup = item.content[length - 1];
        if (lastTimeGroup.length < 2) {
            lastTimeGroup.push(timeObj);
            rst = 1;
        }
        item.content.push([timeObj]);
        return rst;
    }
    _addLastToTimeInterval(item, timeObj) {
        let rst = 1;
        let length = item.content.length;
        if (length === 0) {
            return rst;
        }
        let lastTimeGroup = item.content[length - 1];
        if (lastTimeGroup.length === 1) {
            lastTimeGroup.push(timeObj);
            rst = 0;
        }
        return rst;
    }
    // ------------------------------------------------------------------- //
    getStatus() {
        return this._status;
    }
    setInfo(key, value, order = 1, once = false) {
        if (once) {
            if (this._info.has(key)) {
                return false;
            }
        }
        this._info.set(key, {
            order: order,
            key: key,
            value: value
        });
        return true;
    }
    getInfo(key) {
        let container = this._info.get(key);
        return container && container.value;
    }
    getExtra() {
        return this._extra;
    }
    getExtraInfo(key) {
        return this._extra[key];
    }
    setExtraInfo(key, value, once = false) {
        if (once) {
            if (this._extra[key]) {
                return false;
            }
        }
        this._extra[key] = value;
        return true;
    }
    _getAllInfoAsString() {
        let strBuffers = this._getAllInfoAsArr();
        return strBuffers.join(' ');
    }
    _getAllInfoAsArr() {
        let buffers = [];
        let keys = this._info.keys();
        for (let key of keys) {
            buffers.push(this._info.get(key));
        }
        buffers.sort((a, b) => {
            let order = a.order - b.order;
            if (order !== 0) {
                return order;
            }
            order = a.key < b.key ? -1 : 1;
            return order;
        });
        let strBuffers = [];
        for (let item of buffers) {
            strBuffers.push(item.key + ':' + this._toStringWithNoBlank(item.value));
        }
        return strBuffers;
    }
    _toStringWithNoBlank(obj) {
        let str = '';
        if (util.isString(obj)) {
            str = obj;
        } else if (obj instanceof Buffer) {
            try {
                str = obj.toString();
            } catch (error) {
                str = '';
            }
        } else if (util.isObject(obj) || util.isArray(obj)) {
            try {
                str = JSON.stringify(obj);
            } catch (error) {
                console.error('json stringify failed:', obj);
            }
        } else if (obj === undefined || obj === null) {
            str = '';
        } else {
            try {
                str = obj.toString();
            } catch (error) {
                console.error('json stringify failed:', obj);
            }
        }
        str = str.replace(/\s+/g, '');
        return str;
    }
    setLogid(key, value) {
        this.setInfo(key, value, 0);
    }
    // ------------------------------------------------------------------- //
    _calculateTc() {
        return this._doCalculateTimeConsuming(this._tcTimes, this._status.startProcessTime, TimeContainer.now());
    }
    _calculateExtra() {
        return this._doCalculateTimeConsuming(this._extraTimers, this._status.startProcessTime, TimeContainer.now());
    }
    _doCalculateTimeConsuming(times, startTime, endTime) {
        let intervals = [];
        let itemCosts = [];
        let errors = {};
        let allTime = 0;
        let selfTime = 0;
        let keys = times.keys();
        for (let key of keys) {
            let tcItem = times.get(key);
            let tcItemCost = 0;
            for (let timeGroup of tcItem.content) {
                if (timeGroup.length === 2) {
                    let st1 = timeGroup[0];
                    let st2 = timeGroup[1];
                    tcItemCost += (st2 - st1);
                    intervals.push([st1, st2]);
                } else if (timeGroup.length === 1) {
                    let st1 = timeGroup[0];
                    let st2 = endTime;
                    tcItemCost += (st2 - st1);
                    intervals.push([st1, st2]);
                } else {
                    if (!errors[key]) {
                        errors[key] = {
                            status: tcItem.status,
                            index: tcItem.index,
                            label: tcItem.label,
                            content: []
                        };
                    }
                    errors[key].content.push(timeGroup);
                }
            }
            if (tcItem.content.length > 0) {
                itemCosts.push({
                    label: tcItem.label,
                    cost: tcItemCost
                });
            }
        }
        let ans = this._mergeTimeInterval(intervals);
        allTime = endTime - startTime;
        selfTime = allTime;
        for (let interval of ans) {
            selfTime -= (interval[1] - interval[0]);
        }
        return {
            allTime: allTime,
            selfTime: selfTime,
            itemCosts: itemCosts,
            errors: errors,
            startTime: startTime,
            endTime: endTime
        };
    }
    _mergeTimeInterval(ranges) {
        if (!(ranges && ranges.length)) {
            return [];
        }
        var stack = [];
        ranges.sort((a, b) => {
            return a[0] - b[0];
        });
        let current = ranges[0];
        ranges.slice(1).forEach((item) => {
            if (current[0] <= item[0] && item[0] <= current[1]) {
                current = [
                    Math.min(current[0], item[0]),
                    Math.max(current[1], item[1])
                ];
            } else {
                stack.push(current);
                current = item;
            }
        });
        stack.push(current);
        return stack;
    }
    _convertTimeConsumingResultToArr(buffers, result) {
        buffers.push('#######');
        buffers.push('all_t:' + result.allTime);
        buffers.push('self_t' + result.selfTime);
        for (let itemCost of result.itemCosts) {
            buffers.push(itemCost.label + '_t:' + itemCost.cost);
        }
        return buffers;
    }
    getRecords() {
        return this._calculateTc();
    }
    // ------------------------------------------------------------------- //
    release() { }
};