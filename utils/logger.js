// chrome-llm-summarizer/utils/logger.js

/**
 * Simple logger utility wrapping console methods.
 * Adds context such as the module name.
 */
const createLogger = (moduleName) => {
  const log = (level, ...args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg); // Fallback for circular references etc.
        }
      }
      return String(arg);
    }).join(' ');
    console[level](`[${timestamp}] [${level.toUpperCase()}] [${moduleName}] - ${message}`);
  };

  return {
    debug: (...args) => log('debug', ...args),
    info: (...args) => log('info', ...args),
    warn: (...args) => log('warn', ...args),
    error: (...args) => log('error', ...args),
    // Use console.error for errors, it often includes stack trace in browser consoles
    errorWithStack: (message, error) => console.error(`[${new Date().toISOString()}] [ERROR] [${moduleName}] - ${message}`, error)
  };
};

// Example usage (not needed in the final build, just for clarity)
// const logger = createLogger('MyModule');
// logger.info('This is an informative message.');
// logger.error('An error occurred.');

// Export the factory function
// Note: In Chrome Extension Service Workers, direct function export might need adjustments or importing using dynamic imports if not a module worker.
// For simplicity across different parts, let's rely on importing `utils/constants.js` first to get STORAGE_KEYS etc.
// As Service Workers support ES Modules, we can use `export`.

export default createLogger;