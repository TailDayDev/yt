'use strict';

function createExtensionHooks() {
  return {
    createAiPlanningAdapter(handler) {
      return {
        name: 'ai-planning',
        run: handler,
      };
    },
    createBatchMigrationTool(handler) {
      return {
        name: 'batch-migration',
        run: handler,
      };
    },
    createEventDrivenMode(handler) {
      return {
        name: 'event-driven',
        run: handler,
      };
    },
    createGitIntegration(handler) {
      return {
        name: 'git-integration',
        run: handler,
      };
    },
    createWebhookSupport(handler) {
      return {
        name: 'webhook-support',
        run: handler,
      };
    },
  };
}

module.exports = {
  createExtensionHooks,
};
