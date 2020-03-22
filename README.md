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

# 使用
## 安装
npm install @imcooder/node-logger --save

## 配置
### 配置说明
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


### 使用方法
* 配置
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

```

* 普通日志输出，每次都会执行输出

``` javascript
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

* 多次收集 最后输出 适用于一条请求一条访问日志

``` javascript
let tracer = nodeLogger.create('main', '_1111_'); // 参数1 对应日志配置 参数2： logid
tracer.debug('test_tracer');
tracer.gather('request', {}); // 收集
tracer.gather('response', {}); // 收集

tracer.dumps(); // 最终info级别输出

// 也可以使用其他日志输出函数 这样就不用再次输入logid了  这样每次调用都会输出

tracer.debug('test debug');
tracer.log('log');
tracer.warn('warn');
tracer.error('error');
tracer.fatal('fatal');

```


