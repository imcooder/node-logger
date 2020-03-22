# node-logger
node上日志输出库，目标是轻量 性能要优于log4js

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![David deps][david-image]][david-url]

[npm-image]: https://img.shields.io/npm/v/@imcooder/node-logger.svg
[npm-url]: https://npmjs.com/package/@imcooder/node-logger
[download-image]: https://img.shields.io/npm/dm/@imcooder/node-logger.svg
[download-url]: https://npmjs.com/package/@imcooder/node-logger
[david-image]: https://img.shields.io/david/imcooder/node-logger.svg
[david-url]: https://david-dm.org/imcooder/node-logger

# changelog
* 20200118
> * stream出现异常后 继续写入 会导致进入缓存 内存泄露， 修改方案：捕捉异常 关闭stream释放资源 同时锁定创建60s 防止连续创建导致异常
# 配置
## 配置说明
``` javascript
let config = {
    main: { // app名字 最终也落到日志格式中 以支持多个文件输出
        'log_file': path.join(logDir, './node.log'), // 日志文件名字， 不配置 则无文件日志输出
        "time_format": "%F %T.%L", // 日志行中时间格式
        "auto_rotate": true, // 日志文件自动切分 切分格式为文件名称后 .%Y%m%d%H
        "level": "INFO", // 大于等于该级别的才可以输出
        "console": true // 是否同时输出到console中
    }
    "replaceConsole": true // 系统console日志也按照该格式输出 但不落日志文件
};
```

time_format格式参考：https://github.com/samsonjs/strftime
* 日志级别
日志级别 从小到大依次为：DEBUG、TRACE、INFO、WARN、ERROR


## 使用方法
``` javascript
let nodeLogger = require('@baidu/node-logger');
const path = require('path');
let logDir = path.join(__dirname, '../log');
let config = {
    main: {
        'log_file': path.join(logDir, './node.log'),
        "time_format": "%F %T.%L",
        "auto_rotate": true,
        "level": "INFO",
        "console": true
    },
    trace: {
        "time_format": "%F %T.%L",
        'log_file': path.join(logDir, './trace.log'),
        "auto_rotate": true,
        "level": "debug",
        "console": true
    },
    "replaceConsole": true
};
nodeLogger.configure(config);

let logger = nodeLogger.getLogger('main');

logger.debug('debug');
logger.trace('trace');
logger.info('info');
logger.notice('notice');
logger.log('log');
logger.warn('warn');
logger.error('error');
logger.fatal('fatal');
logger.debug('logid:%s main:%s config:%j', i, { a: 1 }, config);

```
