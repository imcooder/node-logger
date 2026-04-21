# logger-node

A lightweight, high-performance Node.js logging library designed to be more efficient than log4js.

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![David deps][david-image]][david-url]

[npm-image]: https://img.shields.io/npm/v/@imcooder/node-logger.svg
[npm-url]: https://npmjs.com/package/@imcooder/node-logger
[download-image]: https://img.shields.io/npm/dm/@imcooder/node-logger.svg
[download-url]: https://npmjs.com/package/@imcooder/node-logger
[david-image]: https://img.shields.io/david/imcooder/logger-node.svg
[david-url]: https://david-dm.org/imcooder/logger-node

## Features

- **High Performance**: Optimized for better performance than log4js
- **Lightweight**: Minimal dependencies and overhead
- **Auto Rotation**: Hourly log file rotation (format: `filename.YYYYMMDDHH`)
- **Multi-level Logging**: DEBUG, TRACE, INFO, WARN, ERROR levels
- **Dual Output**: Independent console and file logging
- **Request Tracing**: Built-in request lifecycle logging with unique IDs
- **Auto Cleanup**: Automatic old log file cleanup with configurable TTL
- **Console Replacement**: Optional interception of standard console calls
- **Async Operations**: Non-blocking file operations for better performance

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## Installation

```bash
npm install @imcooder/node-logger --save
```

## Configuration

### Configuration Options

```javascript
let config = {
    main: { // Logger name, used in log format and supports multiple file outputs
        'log_file': path.join(logDir, './node.log'), // Log file path, no file output if not configured
        "time_format": "%F %T.%L", // Time format in log lines
        "auto_rotate": true, // Auto-rotate log files, format: filename.YYYYMMDDHH
        "level": "INFO", // Minimum log level to output
        "console": true, // Whether to output to console simultaneously
        "ttl_hour": 72, // NEW: Log file TTL in hours, auto-cleanup old files (optional)
        "max_buffer_size": 1000, // Buffer size when stream is draining (default: 1000)
        "high_water_mark": 1048576 // Stream high water mark in bytes (default: 1MB)
    },
    trace: { // Secondary logger for trace/debug information
        'log_file': path.join(logDir, './trace.log'),
        "time_format": "%F %T.%L",
        "auto_rotate": true,
        "level": "DEBUG",
        "console": false, // Trace logs only to file, not console
        "ttl_hour": 24 // Keep trace logs for 1 day only
    },
    "replaceConsole": true // System console logs follow this format but don't write to file
};
```

**Time Format Reference**: https://github.com/samsonjs/strftime

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `log_file` | string | - | Path to log file. If not set, no file output |
| `time_format` | string | `%F %T.%L` | Time format in log lines |
| `auto_rotate` | boolean | `true` | Enable hourly log file rotation |
| `level` | string | `DEBUG` | Minimum log level (DEBUG/TRACE/INFO/WARN/ERROR) |
| `console` | boolean | `false` | Output to console simultaneously |
| `ttl_hour` | number | `72` | **NEW**: Auto-cleanup files older than N hours (0 = disabled) |
| `max_buffer_size` | number | `1000` | Buffer size when stream is draining |
| `high_water_mark` | number | `1048576` | Stream high water mark in bytes (1MB) |
| `replaceConsole` | boolean | `false` | Global: Replace system console with formatted output |

### Log Levels

Log levels in ascending order: **DEBUG** → **TRACE** → **INFO** → **WARN** → **ERROR**

### 🆕 Auto Cleanup Feature

The `ttl_hour` configuration enables automatic cleanup of old rotated log files:

#### How It Works
- **Purpose**: Prevents disk space issues from accumulating log files
- **Mechanism**: Automatically deletes log files older than specified hours based on file modification time
- **Schedule**: First cleanup 1 minute after startup, then every 30 minutes
- **Requirements**: Must be used with `auto_rotate: true`
- **File Pattern**: Only processes files matching `filename.YYYYMMDDHH` format
- **Async Operations**: Uses non-blocking file operations for better performance

#### Configuration Examples

```javascript
// Different TTL for different loggers
{
    main: {
        'log_file': './logs/app.log',
        'auto_rotate': true,
        'ttl_hour': 168  // Keep main logs for 1 week (7 × 24 hours)
    },
    error: {
        'log_file': './logs/error.log',
        'auto_rotate': true,
        'ttl_hour': 720  // Keep error logs for 1 month (30 × 24 hours)
    },
    debug: {
        'log_file': './logs/debug.log',
        'auto_rotate': true,
        'ttl_hour': 24   // Keep debug logs for 1 day only
    }
}
```

#### Cleanup Behavior
- **Default**: `ttl_hour: 72` → Delete files older than 72 hours (3 days)
- `ttl_hour: 0` → **Disable cleanup** (no automatic cleanup)
- `ttl_hour: 24` → Delete files older than 24 hours
- Files not matching rotation pattern are **ignored** (safe)
- Service starts automatically when `nodeLogger.configure()` is called
- Service stops automatically when `nodeLogger.shutdown()` is called


## Usage

### Basic Setup

```javascript
const nodeLogger = require('@imcooder/node-logger');
const path = require('path');

const logDir = path.join(__dirname, '../log');

const config = {
    main: {
        'log_file': path.join(logDir, './node.log'),
        "time_format": "%F %T.%L",
        "auto_rotate": true,
        "level": "INFO",
        "console": true,
        "ttl_hour": 72  // Keep logs for 3 days
    },
    trace: {
        "time_format": "%F %T.%L",
        'log_file': path.join(logDir, './trace.log'),
        "auto_rotate": true,
        "level": "DEBUG",
        "console": false,
        "ttl_hour": 24  // Keep trace logs for 1 day
    },
    "replaceConsole": true
};

nodeLogger.configure(config);
```

### Standard Logging

Direct logging output for each call:

```javascript
const logger = nodeLogger.getLogger('main');

logger.debug('debug message');
logger.trace('trace message');
logger.info('info message');
logger.notice('notice message');
logger.log('log message');
logger.warn('warning message');
logger.error('error message');
logger.fatal('fatal error');

// Formatted logging with placeholders
logger.info('User %s performed action: %s', userId, actionName);
logger.debug('Request data: %j', requestData);
```

### Request Tracing

Collect multiple log entries and output once - ideal for request/response logging:

```javascript
// Create tracer with logger name and unique request ID
const tracer = nodeLogger.create('main', 'req_12345');

tracer.debug('Processing request');
tracer.gather('request', { url: '/api/users', method: 'GET' });
tracer.gather('response', { status: 200, duration: '45ms' });

// Output all collected data at INFO level
tracer.dumps();

// Direct logging (outputs immediately, no collection)
tracer.debug('Additional debug info');
tracer.error('Request failed');
```

### Manual Cleanup

For testing or manual cleanup operations:

```javascript
// Manually trigger cleanup once
await nodeLogger.cleanupNow();

// Graceful shutdown (stops cleanup service)
await nodeLogger.shutdown();
```


