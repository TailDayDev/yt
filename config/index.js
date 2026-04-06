'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_BASE_URL = 'https://underogat.youtrack.cloud';
const ENV_FILES = [
  '.env.local',
  '.env',
  '.env.development.local',
  '.env.development',
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalIndex = line.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

function loadProjectEnv() {
  return ENV_FILES.reduce((accumulator, fileName) => {
    const next = parseEnvFile(path.join(PROJECT_ROOT, fileName));
    return { ...accumulator, ...next };
  }, {});
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/u, '');
}

function resolveConfig(overrides) {
  const projectEnv = loadProjectEnv();
  const merged = {
    ...projectEnv,
    ...process.env,
    ...(overrides || {}),
  };

  return {
    projectRoot: PROJECT_ROOT,
    baseUrl: stripTrailingSlash(
      merged.YOUTRACK_BASE_URL ||
        merged.YT_BASE_URL ||
        merged.REACT_APP_YOUTRACK_BASE_URL ||
        DEFAULT_BASE_URL,
    ),
    token:
      merged.YOUTRACK_BEARER_TOKEN ||
      merged.YT_BEARER_TOKEN ||
      null,
    projectName: merged.YOUTRACK_PROJECT || 'TailDay',
    logLevel: String(merged.YOUTRACK_LOG_LEVEL || 'info').toLowerCase(),
    timeoutMs: Number(merged.YOUTRACK_TIMEOUT_MS || 20000),
    maxRetries: Number(merged.YOUTRACK_MAX_RETRIES || 4),
  };
}

function assertConfig(config) {
  if (!config.baseUrl) {
    throw new Error(
      'Missing YOUTRACK_BASE_URL. Add it to the shell or a local .env file before running live YouTrack commands.',
    );
  }

  if (!config.token) {
    throw new Error('Missing YOUTRACK_BEARER_TOKEN.');
  }

  return config;
}

module.exports = {
  DEFAULT_BASE_URL,
  PROJECT_ROOT,
  assertConfig,
  loadProjectEnv,
  resolveConfig,
};
