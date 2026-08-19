'use strict';

const { after, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createYouTrackApi } = require('../api');

const live = process.env.YOUTRACK_RUN_LIVE_TESTS === '1';

describe('live create-task and create-subtask', { skip: !live }, () => {
  const api = createYouTrackApi();
  const createdIds = [];

  after(async () => {
    for (const issueId of createdIds.splice(0)) {
      try {
        await api.deleteIssue(issueId);
      } catch (error) {
        console.error(`cleanup failed for ${issueId}: ${error.message}`);
      }
    }
  });

  it('creates a task assigned to the current user', async () => {
    const created = await api.createIssue({
      description: 'Disposable live test. Safe to delete.',
      preset: 'me',
      summary: 'FE: yt live create-task me',
    });
    createdIds.push(created.idReadable);

    assert.match(created.idReadable, /^TAILDAY-\d+$/u);
    assert.equal(created.type, 'Task');
    assert.equal(created.assignee?.login, 'bogdan808');
    assert.equal(created.status, 'Backlog');
  });

  it('creates a bug that stays assigned to the current user', async () => {
    const created = await api.createIssue({
      description: 'Disposable live bug test. Safe to delete.',
      preset: 'bug',
      summary: 'FE: yt live create-task bug',
    });
    createdIds.push(created.idReadable);

    assert.equal(created.type, 'Bug');
    assert.equal(created.assignee?.login, 'bogdan808');
  });

  it('creates a subtask without wiping assignee', async () => {
    const parent = await api.createIssue({
      preset: 'me',
      summary: 'FE: yt live parent for subtask',
    });
    createdIds.push(parent.idReadable);

    const subtask = await api.createSubtask(parent.idReadable, {
      preset: 'me',
      summary: 'FE: yt live subtask',
    });
    createdIds.push(subtask.idReadable);

    assert.equal(subtask.assignee?.login, 'bogdan808');
    assert.equal(subtask.parent?.idReadable, parent.idReadable);
    assert.equal(subtask.type, 'Task');
  });
});
