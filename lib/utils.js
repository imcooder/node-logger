/**
 * @author imcooder@gmail.com
 */
/* jshint node:true */
/* jshint esversion:8 */
'use strict';
const strftime = require('fast-strftime');
const util = require('util');
let utils = {
    //yyyy-MM-dd hh:mm:ss.S
    //yyyy-M-d h:m:s.S
    formatDate: function (date, fmt) {
        if (!util.isDate(date)) {
            return "";
        }
        var o = {
            "M+": date.getMonth() + 1, //月份
            "d+": date.getDate(), //日
            "h+": date.getHours(), //小时
            "m+": date.getMinutes(), //分
            "s+": date.getSeconds(), //秒
            "q+": Math.floor((date.getMonth() + 3) / 3), //季度
            "S": date.getMilliseconds() //毫秒
        };
        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        }
        for (var k in o) {
            if (new RegExp("(" + k + ")").test(fmt)) {
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            }
        }
        return fmt;
    },
    strftime: function (date, format) {
        return strftime(format, date);
    },
    microtime: function (get_as_float) {
        //  discuss at: http://phpjs.org/functions/microtime/
        // original by: Paulo Freitas
        //   example 1: timeStamp = microtime(true);
        //   example 1: timeStamp > 1000000000 && timeStamp < 2000000000
        //   returns 1: true

        var now = new Date()
            .getTime() / 1000;
        var s = parseInt(now, 10);

        return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;
    },
    gettimeofday: function (return_float) {
        //  discuss at: http://phpjs.org/functions/gettimeofday/
        // original by: Brett Zamir (http://brett-zamir.me)
        // original by: Josh Fraser (http://onlineaspect.com/2007/06/08/auto-detect-a-time-zone-with-javascript/)
        //    parts by: Breaking Par Consulting Inc (http://www.breakingpar.com/bkp/home.nsf/0/87256B280015193F87256CFB006C45F7)
        //  revised by: Theriault
        //   example 1: gettimeofday();
        //   returns 1: {sec: 12, usec: 153000, minuteswest: -480, dsttime: 0}
        //   example 2: gettimeofday(true);
        //   returns 2: 1238748978.49

        var t = new Date(),
            y = 0;

        if (return_float) {
            return t.getTime() / 1000;
        }

        // Store current year.
        y = t.getFullYear();
        return {
            //sec: t.getUTCSeconds(),
            sec: parseInt(t / 1000),
            usec: t.getMilliseconds(),
            minuteswest: t.getTimezoneOffset(),
            // Compare Jan 1 minus Jan 1 UTC to Jul 1 minus Jul 1 UTC to see if DST is observed.
            dsttime: 0 + (((new Date(y, 0)) - Date.UTC(y, 0)) !== ((new Date(y, 6)) - Date.UTC(y, 6)))
        };
    },
    toString: function (obj) {
        var str = '';
        if (util.isString(obj)) {
            str = obj;
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
        return str;
    },
    makeUUID: function (trim) {
        var uuidV4 = require('uuid/v4');
        var id = uuidV4();
        if (trim) {
            id = id.replace(/[-]/g, '');
        }
        return id;
    }
};

module.exports = utils;
