'use strict';

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ETIMEDOUT',
]);

class YouTrackApiError extends Error {
  constructor(message, options) {
    super(message);
    this.name = 'YouTrackApiError';
    this.statusCode = options.statusCode || null;
    this.code = options.code || null;
    this.retryable = Boolean(options.retryable);
    this.requestId = options.requestId || null;
    this.details = options.details || null;
    this.method = options.method || null;
    this.url = options.url || null;
    this.cause = options.cause;
  }
}

function extractMessage(payload) {
  if (!payload) {
    return null;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload.error === 'string') {
    return payload.error;
  }

  if (typeof payload.error_description === 'string') {
    return payload.error_description;
  }

  if (typeof payload.value === 'string') {
    return payload.value;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return null;
}

function isRetryable(error) {
  const statusCode = error.response?.status;
  const errorCode = error.code;

  return (
    RETRYABLE_STATUS_CODES.has(statusCode) ||
    RETRYABLE_ERROR_CODES.has(errorCode) ||
    !error.response
  );
}

function normalizeYouTrackError(error, context) {
  if (error instanceof YouTrackApiError) {
    return error;
  }

  const payload = error.response?.data;
  const method = String(
    context?.requestConfig?.method || error.config?.method || 'GET',
  ).toUpperCase();
  const url = context?.requestConfig?.url || error.config?.url || '';
  const statusCode = error.response?.status || null;
  const requestId =
    error.response?.headers?.['x-request-id'] ||
    error.response?.headers?.['x-youtrack-request-id'] ||
    null;
  const message =
    extractMessage(payload) ||
    error.message ||
    `YouTrack request failed: ${method} ${url}`;

  return new YouTrackApiError(message, {
    cause: error,
    code: error.code || null,
    details: payload,
    method,
    requestId,
    retryable: isRetryable(error),
    statusCode,
    url,
  });
}

module.exports = {
  RETRYABLE_STATUS_CODES,
  YouTrackApiError,
  normalizeYouTrackError,
};
