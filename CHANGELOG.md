# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-09-29

### Added
- **🆕 Auto Cleanup Feature**: New `ttl_hour` configuration parameter for automatic cleanup of old rotated log files
  - **Default TTL**: 72 hours (3 days) - cleanup enabled by default
  - Prevents disk space issues from accumulating log files
  - Configurable TTL (Time To Live) in hours for each logger
  - Automatic cleanup schedule: first run after 1 minute, then every 30 minutes
  - Safe operation: only processes files matching `filename.YYYYMMDDHH` rotation pattern
  - Async file operations for non-blocking performance
  - Must be used with `auto_rotate: true`
- **New API Methods**:
  - `nodeLogger.cleanupNow()`: Manually trigger cleanup once (async)
  - Enhanced `nodeLogger.shutdown()`: Now stops cleanup service gracefully
- **Performance Improvements**:
  - All file operations in cleanup service are fully asynchronous
  - Parallel processing of file cleanup operations using `Promise.allSettled()`
  - Non-blocking cleanup operations don't affect main application performance

### Changed
- **Documentation**: Complete English rewrite of README.md with comprehensive configuration examples
- **Code Comments**: All Chinese comments converted to English for better international collaboration
- **Configuration**: Enhanced example configurations with new `ttl_hour` parameter

### Technical Details
- **File Pattern Recognition**: Uses regex pattern `^filename\.\\d{10}$` to safely identify rotated log files
- **Cleanup Algorithm**: Based on file modification time (`mtime`) comparison with configurable cutoff time
- **Error Handling**: Robust error handling ensures single file failures don't interrupt overall cleanup process
- **Service Lifecycle**: Cleanup service automatically starts with `configure()` and stops with `shutdown()`

### Migration Guide
- **Existing Users**: No breaking changes. All existing configurations continue to work
- **New Feature**: Add `ttl_hour: <hours>` to any logger configuration to enable cleanup
- **Requirements**: Cleanup only works with `auto_rotate: true` (already default for most users)

### Configuration Example
```javascript
{
    main: {
        'log_file': './logs/app.log',
        'auto_rotate': true,
        'ttl_hour': 168  // Keep logs for 1 week
    }
}
```

## [2.0.11] - Previous Release

### Fixed
- Stream error handling improvements
- Memory leak prevention in buffer management
- Enhanced stream lifecycle management with 60-second lock after failures

### Technical
- Improved error recovery mechanisms
- Better resource cleanup on stream failures
- Prevention of cascade failures in stream creation

---

## Contributing

When adding entries to this changelog:
1. Keep the format consistent
2. Use present tense ("Add feature" not "Added feature")
3. Include migration notes for breaking changes
4. Add technical details for complex features
5. Reference issue numbers where applicable