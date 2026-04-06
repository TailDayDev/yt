'use strict';

const { createYouTrackApi } = require('../api');

async function runTailday802Scenario(options) {
  const api = createYouTrackApi(options);
  const targetIssue = options?.issueId || 'TAILDAY-802';
  const statusFlow = options?.statusFlow || ['Open', 'In Progress', 'Done'];
  const shouldCleanup = Boolean(options?.cleanup);

  const result = {
    cleanup: null,
    comment: null,
    createdSubtask: null,
    issue: null,
    statusesApplied: [],
    subtasks: null,
    targetIssue,
  };

  result.issue = await api.getIssue(targetIssue);
  result.subtasks = await api.listSubtasks(targetIssue);

  try {
    const createdSubtask = await api.createSubtask(targetIssue, {
      description: 'Создано ИИ агентом для проверки интеграции',
      summary: 'Тест Таск',
    });
    result.createdSubtask = createdSubtask;

    for (const status of statusFlow) {
      const updated = await api.updateStatus(createdSubtask.idReadable, status);
      result.statusesApplied.push({
        actualStatus: updated.status,
        requestedStatus: status,
      });
    }

    result.comment = await api.addComment(
      createdSubtask.idReadable,
      'Test automation complete',
    );

    if (shouldCleanup) {
      result.cleanup = await api.deleteIssue(createdSubtask.idReadable);
    }

    return result;
  } catch (error) {
    if (shouldCleanup && result.createdSubtask?.idReadable) {
      try {
        result.cleanup = await api.deleteIssue(result.createdSubtask.idReadable);
      } catch (cleanupError) {
        result.cleanup = {
          deleted: false,
          error: cleanupError.message,
          issueId: result.createdSubtask.idReadable,
        };
      }
    }

    error.scenarioResult = result;
    throw error;
  }
}

module.exports = {
  runTailday802Scenario,
};
