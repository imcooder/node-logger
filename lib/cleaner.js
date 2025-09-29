/**
 * Automatic log cleanup module
 * @author imcooder@gmail.com
 */
'use strict';

const fs = require('fs').promises;
const path = require('path');

class LogCleaner {
    constructor() {
        this.config = null;
        this.timers = [];
        this.isRunning = false;
    }

    /**
     * Start the automatic cleanup service
     * @param {Object} config Log configuration
     */
    start(config) {
        if (this.isRunning) {
            return;
        }

        this.config = config;
        this.isRunning = true;

        // Execute first cleanup after 1 minute
        const firstTimer = setTimeout(async () => {
            await this._performCleanup();

            // Then execute every 30 minutes
            const intervalTimer = setInterval(async () => {
                await this._performCleanup();
            }, 30 * 60 * 1000); // 30 minutes

            this.timers.push(intervalTimer);
        }, 60 * 1000); // 1 minute

        this.timers.push(firstTimer);
        console.log('Log cleaner started: first cleanup in 1 minute, then every 30 minutes');
    }

    /**
     * Stop the automatic cleanup service
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        this.timers.forEach(timer => {
            clearTimeout(timer);
            clearInterval(timer);
        });
        this.timers = [];
        this.isRunning = false;
        console.log('Log cleaner stopped');
    }

    /**
     * Execute cleanup operations
     */
    async _performCleanup() {
        if (!this.config) {
            return;
        }

        console.log(`[${new Date().toISOString()}] Starting log cleanup...`);

        // Iterate through all logger configurations, using Promise.allSettled for parallel processing
        const cleanupPromises = Object.keys(this.config).map(async loggerName => {
            const loggerConfig = this.config[loggerName];

            // Skip non-logger configuration items
            if (typeof loggerConfig !== 'object' || !loggerConfig.log_file) {
                return;
            }

            return this._cleanLoggerFiles(loggerName, loggerConfig);
        });

        await Promise.allSettled(cleanupPromises);
        console.log(`[${new Date().toISOString()}] Log cleanup completed`);
    }

    /**
     * Clean log files for specified logger
     * @param {string} loggerName Logger name
     * @param {Object} config Logger configuration
     */
    async _cleanLoggerFiles(loggerName, config) {
        // Check if cleanup is needed (must have ttl_hour config and auto_rotate enabled)
        if (!config.ttl_hour || config.ttl_hour <= 0 || !config.auto_rotate) {
            return;
        }

        const logFile = config.log_file;
        const ttlHours = config.ttl_hour;

        try {
            const baseDir = path.dirname(logFile);
            const baseName = path.basename(logFile);

            // Asynchronously check if directory exists
            try {
                await fs.access(baseDir);
            } catch {
                return; // Directory does not exist, skip
            }

            const cutoffTime = new Date().getTime() - (ttlHours * 60 * 60 * 1000);

            // Asynchronously read directory file list
            const files = await fs.readdir(baseDir);
            let cleanedCount = 0;
            console.log(files);
            // Process file cleanup in parallel
            const cleanupPromises = files.map(async file => {
                // Check if file matches log rotation format: baseName.YYYYMMDDHH
                if (!this._isRotatedLogFile(baseName, file)) {
                    return;
                }

                const filePath = path.join(baseDir, file);

                try {
                    // Asynchronously get file stats
                    const stats = await fs.stat(filePath);
                    if (stats.mtime.getTime() < cutoffTime) {
                        // Asynchronously delete file
                        await fs.unlink(filePath);
                        cleanedCount++;
                        console.log(`  Cleaned: ${file} (${loggerName})`);
                    }
                } catch (err) {
                    console.error(`  Error cleaning ${file}:`, err.message);
                }
            });

            // Wait for all file operations to complete
            await Promise.allSettled(cleanupPromises);

            if (cleanedCount > 0) {
                console.log(`  Logger '${loggerName}': cleaned ${cleanedCount} old log files (ttl=${ttlHours}h)`);
            }

        } catch (err) {
            console.error(`Error cleaning logs for '${loggerName}':`, err.message);
        }
    }

    /**
     * Check if file matches rotated log file format
     * @param {string} baseName Base filename
     * @param {string} fileName Filename to check
     * @returns {boolean} Whether it matches the format
     */
    _isRotatedLogFile(baseName, fileName) {
        // Check format: baseName.YYYYMMDDHH
        const pattern = new RegExp(`^${this._escapeRegex(baseName)}\\.\\d{10}$`);
        return pattern.test(fileName);
    }

    /**
     * Escape regex special characters
     * @param {string} string String to escape
     * @returns {string} Escaped string
     */
    _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Manually execute cleanup once (for testing)
     */
    async cleanupNow() {
        if (this.config) {
            await this._performCleanup();
        } else {
            console.log('No config set, cannot perform cleanup');
        }
    }
}

module.exports = LogCleaner;