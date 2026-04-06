'use strict';

const YT_PROJECT_SCHEMA = {
  project: 'TailDay',

  fields: {
    status: 'Stage',
    priority: 'Priority',
    estimate: 'Оценка',
    timeSpent: 'Затраченное время',
    assignee: 'Assignee',
  },

  defaults: {
    status: 'Backlog',
    priority: 'Normal',
  },
};

const YT_TASK_PARAMS_SCHEMA_NEEDED = {
  id: 'TAILDAY-847',
  summary: 'FE: Пернести icons из assets в shared',
  project: 'TailDay',
  priority: 'Normal',
  assignee: null,
  stage: 'Backlog',
  estimate: null,
  rawCustomFields: {
    Priority: {
      name: 'Normal',
      $type: 'EnumBundleElement',
    },
    Assignee: [
      {
        login: 'bogdan808',
        name: 'Theodore Bogdanovich',
        fullName: 'Theodore Bogdanovich',
        $type: 'User',
      },
    ],
    Stage: {
      name: 'Backlog',
      $type: 'StateBundleElement',
    },
    'Оценка': null,
    'Затраченное время': null,
  },
};

module.exports = {
  YT_PROJECT_SCHEMA,
  YT_TASK_PARAMS_SCHEMA_NEEDED,
};
