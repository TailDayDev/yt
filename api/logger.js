'use strict';

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function createLogger(level) {
  const threshold = LEVELS[level] || LEVELS.info;

  function shouldLog(messageLevel) {
    return (LEVELS[messageLevel] || LEVELS.info) >= threshold;
  }

  function write(messageLevel, message, meta) {
    if (!shouldLog(messageLevel)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const parts = [`[youtrack:${messageLevel}]`, timestamp, message];

    if (meta && Object.keys(meta).length > 0) {
      parts.push(JSON.stringify(meta));
    }

    const writer =
      messageLevel === 'error'
        ? console.error
        : messageLevel === 'warn'
          ? console.warn
          : console.log;

    writer(parts.join(' '));
  }

  return {
    debug(message, meta) {
      write('debug', message, meta);
    },
    info(message, meta) {
      write('info', message, meta);
    },
    warn(message, meta) {
      write('warn', message, meta);
    },
    error(message, meta) {
      write('error', message, meta);
    },
  };
}

module.exports = {
  createLogger,
};
