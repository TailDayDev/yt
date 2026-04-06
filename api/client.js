'use strict';

const { createLogger } = require('./logger');
const { normalizeYouTrackError } = require('./errors');

function sleep(timeoutMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}

function parseRetryAfter(headerValue) {
  if (!headerValue) {
    return 0;
  }

  const numeric = Number(headerValue);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric * 1000;
  }

  const dateValue = new Date(headerValue).getTime();
  if (Number.isFinite(dateValue)) {
    return Math.max(0, dateValue - Date.now());
  }

  return 0;
}

function getRetryDelay(attempt, error) {
  const retryAfterMs = parseRetryAfter(error.response?.headers?.['retry-after']);
  if (retryAfterMs > 0) {
    return retryAfterMs;
  }

  const exponentialDelay = Math.min(30000, 500 * 2 ** attempt);
  const jitter = Math.round(Math.random() * 250);
  return exponentialDelay + jitter;
}

function createYouTrackHttpClient(config) {
  const logger = createLogger(config.logLevel);

  async function runRequest(requestConfig) {
    const url = new URL(`${config.baseUrl}/api${requestConfig.url}`);

    for (const [key, value] of Object.entries(requestConfig.params || {})) {
      if (value == null) {
        continue;
      }

      url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        body:
          requestConfig.data == null
            ? undefined
            : JSON.stringify(requestConfig.data),
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          ...(requestConfig.headers || {}),
        },
        method: requestConfig.method || 'GET',
        signal: controller.signal,
      });

      const rawBody = await response.text();
      const contentType = response.headers.get('content-type') || '';
      const body =
        rawBody && contentType.includes('application/json')
          ? JSON.parse(rawBody)
          : rawBody || null;

      if (!response.ok) {
        throw {
          config: {
            method: requestConfig.method || 'GET',
            url: url.toString(),
          },
          message: `YouTrack request failed with status ${response.status}`,
          response: {
            data: body,
            headers: Object.fromEntries(response.headers.entries()),
            status: response.status,
          },
        };
      }

      return {
        data: body,
        status: response.status,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw {
          code: 'ETIMEDOUT',
          config: {
            method: requestConfig.method || 'GET',
            url: url.toString(),
          },
          message: `YouTrack request timed out after ${config.timeoutMs}ms`,
        };
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function request(requestConfig, context) {
    const maxRetries =
      typeof context?.maxRetries === 'number'
        ? context.maxRetries
        : config.maxRetries;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        logger.debug('Request started', {
          attempt: attempt + 1,
          method: String(requestConfig.method || 'GET').toUpperCase(),
          url: requestConfig.url,
        });

        const response = await runRequest(requestConfig);

        logger.debug('Request finished', {
          method: String(requestConfig.method || 'GET').toUpperCase(),
          statusCode: response.status,
          url: requestConfig.url,
        });

        return response.data;
      } catch (error) {
        const normalizedError = normalizeYouTrackError(error, {
          context,
          requestConfig,
        });

        if (!normalizedError.retryable || attempt >= maxRetries) {
          logger.error('Request failed', {
            method: normalizedError.method,
            statusCode: normalizedError.statusCode,
            url: normalizedError.url,
          });
          throw normalizedError;
        }

        const delay = getRetryDelay(attempt, error);
        logger.warn('Request failed, retrying', {
          attempt: attempt + 1,
          delay,
          method: normalizedError.method,
          statusCode: normalizedError.statusCode,
          url: normalizedError.url,
        });
        await sleep(delay);
      }
    }

    throw new Error('Unexpected retry loop termination.');
  }

  return {
    logger,
    request,
  };
}

module.exports = {
  createYouTrackHttpClient,
};
