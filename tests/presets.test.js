'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { applyPreset, getPreset, listPresets } = require('../api/presets');
const { buildCreateCustomFields } = require('../api/utils');

describe('presets', () => {
  it('lists me, task, and bug', () => {
    const names = listPresets().map((preset) => preset.name).sort();
    assert.deepEqual(names, ['bug', 'me', 'task']);
  });

  it('applies me with the current user and Task type', () => {
    const result = applyPreset(
      { summary: 'FE: Test' },
      { currentUser: { login: 'bogdan808', name: 'Theodore Bogdanovich' } },
    );

    assert.equal(result.preset, 'me');
    assert.equal(result.type, 'Task');
    assert.equal(result.status, 'Backlog');
    assert.equal(result.priority, 'Normal');
    assert.equal(result.assignee.login, 'bogdan808');
  });

  it('applies bug without changing assignee', () => {
    const result = applyPreset(
      { preset: 'bug', summary: 'FE: Broken button' },
      { currentUser: { login: 'bogdan808', name: 'Theodore Bogdanovich' } },
    );

    assert.equal(result.type, 'Bug');
    assert.equal(result.assignee.login, 'bogdan808');
  });

  it('keeps preset assignee when assignee is omitted', () => {
    const result = applyPreset({ preset: 'task', summary: 'FE: Keep me' });
    assert.equal(result.assignee.login, 'bogdan808');
  });

  it('keeps preset assignee when assignee is explicitly undefined', () => {
    const result = applyPreset({
      assignee: undefined,
      preset: 'bug',
      summary: 'FE: CLI omitted assignee',
      unassigned: false,
    });
    assert.equal(result.type, 'Bug');
    assert.equal(result.assignee.login, 'bogdan808');
  });

  it('allows an explicit assignee override', () => {
    const result = applyPreset({
      assignee: { login: 'IgorCavliuc' },
      preset: 'bug',
      summary: 'FE: Reassigned',
    });
    assert.equal(result.assignee.login, 'IgorCavliuc');
    assert.equal(result.type, 'Bug');
  });

  it('unassigns only when asked', () => {
    const result = applyPreset({
      preset: 'bug',
      summary: 'FE: Unassigned',
      unassigned: true,
    });
    assert.equal(result.assignee, null);
    assert.equal(result.type, 'Bug');
  });

  it('rejects unknown presets', () => {
    assert.throws(() => getPreset('hotfix'), /Unknown preset/);
  });
});

describe('buildCreateCustomFields', () => {
  it('keeps template assignee when input does not mention assignee', () => {
    const fields = buildCreateCustomFields({
      summary: 'FE: Keep assignee',
      type: 'Task',
    });
    const assignee = fields.find((field) => field.name === 'Assignee');
    assert.equal(assignee.$type, 'MultiUserIssueCustomField');
    assert.deepEqual(assignee.value, [{ login: 'bogdan808' }]);
  });

  it('sets Type Bug for the bug preset payload', () => {
    const payload = applyPreset(
      { preset: 'bug', summary: 'FE: Bug' },
      { currentUser: { login: 'bogdan808' } },
    );
    const fields = buildCreateCustomFields(payload);
    const type = fields.find((field) => field.name === 'Type');
    const assignee = fields.find((field) => field.name === 'Assignee');
    assert.deepEqual(type.value, { name: 'Bug' });
    assert.deepEqual(assignee.value, [{ login: 'bogdan808' }]);
  });

  it('sends an empty assignee list when unassigned', () => {
    const fields = buildCreateCustomFields({
      assignee: null,
      summary: 'FE: No owner',
    });
    const assignee = fields.find((field) => field.name === 'Assignee');
    assert.deepEqual(assignee.value, []);
  });
});
