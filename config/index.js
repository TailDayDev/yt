'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_BASE_URL = 'https://underogat.youtrack.cloud';
const DEFAULT_PROJECT_NAME = 'TailDay';
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_MAX_RETRIES = 4;
const CONFIG_DIR = path.join(
  process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'),
  'tailday',
);
const CONFIG_PATH = path.join(CONFIG_DIR, 'yt.json');
const ENV_FILES = [
  '.env.local',
  '.env',
  '.env.development.local',
  '.env.development',
];
const CONFIG_KEY_MAP = {
  'base-url': 'baseUrl',
  baseUrl: 'baseUrl',
  'log-level': 'logLevel',
  logLevel: 'logLevel',
  'max-retries': 'maxRetries',
  maxRetries: 'maxRetries',
  project: 'projectName',
  projectName: 'projectName',
  token: 'token',
  'timeout-ms': 'timeoutMs',
  timeoutMs: 'timeoutMs',
};

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

function ensureConfigDir() {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

function parseConfigFile() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return {};
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf8').trim();
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function normalizeConfigKey(key) {
  const normalizedKey = CONFIG_KEY_MAP[key];

  if (!normalizedKey) {
    throw new Error(
      `Unknown config key "${key}". Allowed keys: ${Object.keys(CONFIG_KEY_MAP)
        .filter((entry) => !/[A-Z]/u.test(entry))
        .sort()
        .join(', ')}`,
    );
  }

  return normalizedKey;
}

function normalizeStoredConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  const next = {};

  if (source.baseUrl != null && String(source.baseUrl).trim()) {
    next.baseUrl = stripTrailingSlash(source.baseUrl);
  }

  if (source.token != null && String(source.token).trim()) {
    next.token = String(source.token).trim();
  }

  if (source.projectName != null && String(source.projectName).trim()) {
    next.projectName = String(source.projectName).trim();
  }

  if (source.logLevel != null && String(source.logLevel).trim()) {
    next.logLevel = String(source.logLevel).trim().toLowerCase();
  }

  if (source.timeoutMs != null && String(source.timeoutMs).trim()) {
    next.timeoutMs = Number(source.timeoutMs);
  }

  if (source.maxRetries != null && String(source.maxRetries).trim()) {
    next.maxRetries = Number(source.maxRetries);
  }

  return next;
}

function readUserConfig() {
  return normalizeStoredConfig(parseConfigFile());
}

function writeUserConfig(config) {
  ensureConfigDir();
  const normalized = normalizeStoredConfig(config);
  fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

function updateUserConfig(updates) {
  const current = readUserConfig();
  return writeUserConfig({
    ...current,
    ...updates,
  });
}

function unsetUserConfig(key) {
  const normalizedKey = normalizeConfigKey(key);
  const current = readUserConfig();
  delete current[normalizedKey];
  return writeUserConfig(current);
}

function setUserConfigValue(key, value) {
  const normalizedKey = normalizeConfigKey(key);
  return updateUserConfig({
    [normalizedKey]: value,
  });
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/u, '');
}

function resolveConfig(overrides) {
  const userConfig = readUserConfig();
  const projectEnv = loadProjectEnv();
  const merged = {
    YOUTRACK_BASE_URL: userConfig.baseUrl || undefined,
    YOUTRACK_BEARER_TOKEN: userConfig.token || undefined,
    YOUTRACK_PROJECT: userConfig.projectName || undefined,
    YOUTRACK_LOG_LEVEL: userConfig.logLevel || undefined,
    YOUTRACK_TIMEOUT_MS:
      userConfig.timeoutMs == null ? undefined : String(userConfig.timeoutMs),
    YOUTRACK_MAX_RETRIES:
      userConfig.maxRetries == null ? undefined : String(userConfig.maxRetries),
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
    projectName: merged.YOUTRACK_PROJECT || DEFAULT_PROJECT_NAME,
    logLevel: String(merged.YOUTRACK_LOG_LEVEL || DEFAULT_LOG_LEVEL).toLowerCase(),
    timeoutMs: Number(merged.YOUTRACK_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
    maxRetries: Number(merged.YOUTRACK_MAX_RETRIES || DEFAULT_MAX_RETRIES),
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
  CONFIG_PATH,
  DEFAULT_LOG_LEVEL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_PROJECT_NAME,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_BASE_URL,
  PROJECT_ROOT,
  assertConfig,
  loadProjectEnv,
  normalizeConfigKey,
  readUserConfig,
  resolveConfig,
  setUserConfigValue,
  unsetUserConfig,
  updateUserConfig,
  writeUserConfig,
};
