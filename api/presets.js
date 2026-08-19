'use strict';

const DEFAULT_ASSIGNEE = {
  fullName: 'Theodore Bogdanovich',
  login: 'bogdan808',
  name: 'Theodore Bogdanovich',
};

const PRESETS = {
  me: {
    assignee: DEFAULT_ASSIGNEE,
    description:
      'Task assigned to the current YouTrack user. Default for new issues.',
    name: 'me',
    priority: 'Normal',
    status: 'Backlog',
    type: 'Task',
  },
  task: {
    assignee: DEFAULT_ASSIGNEE,
    description: 'Regular TailDay task, assigned to you. Type stays Task.',
    name: 'task',
    priority: 'Normal',
    status: 'Backlog',
    type: 'Task',
  },
  bug: {
    assignee: DEFAULT_ASSIGNEE,
    description:
      'Bug assigned to you. Type is Bug. Assignee is kept unless --assignee or --unassigned is passed.',
    name: 'bug',
    priority: 'Normal',
    status: 'Backlog',
    type: 'Bug',
  },
};

function listPresets() {
  return Object.values(PRESETS).map((preset) => ({
    assignee: preset.assignee.login,
    description: preset.description,
    name: preset.name,
    priority: preset.priority,
    status: preset.status,
    type: preset.type,
  }));
}

function getPreset(name) {
  const key = String(name || '')
    .trim()
    .toLowerCase();
  const preset = PRESETS[key];
  if (!preset) {
    throw new Error(
      `Unknown preset "${name}". Available: ${Object.keys(PRESETS).join(', ')}`,
    );
  }
  return preset;
}

function toAssignee(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return { login: value };
  }

  if (Array.isArray(value)) {
    return value.length ? toAssignee(value[0]) : null;
  }

  if (value.login) {
    return {
      fullName: value.fullName || value.name || null,
      login: value.login,
      name: value.name || value.fullName || null,
    };
  }

  return null;
}

function applyPreset(input, options) {
  const source = input && typeof input === 'object' ? input : {};
  const presetName = source.preset || options?.defaultPreset || 'me';
  const preset = getPreset(presetName);
  const currentUser = options?.currentUser;
  const defaultAssignee = currentUser?.login
    ? toAssignee(currentUser)
    : toAssignee(preset.assignee);

  const next = {
    description: source.description,
    estimate: source.estimate,
    preset: preset.name,
    priority: source.priority != null ? source.priority : preset.priority,
    projectName: source.projectName,
    rawCustomFields: source.rawCustomFields,
    status: source.status != null ? source.status : preset.status,
    summary: source.summary,
    type: source.type != null ? source.type : preset.type,
  };

  if (source.unassigned || source.assignee === null) {
    next.assignee = null;
  } else if (source.assignee !== undefined) {
    next.assignee = toAssignee(source.assignee);
  } else {
    next.assignee = defaultAssignee;
  }

  return next;
}

module.exports = {
  DEFAULT_ASSIGNEE,
  PRESETS,
  applyPreset,
  getPreset,
  listPresets,
  toAssignee,
};
