'use strict';

const path = require('path');

const {
  YT_PROJECT_SCHEMA,
  YT_TASK_PARAMS_SCHEMA_NEEDED,
} = require(path.resolve(
  __dirname,
  '../yt_params_schema.js',
));

const VALUE_FIELDS =
  'id,name,localizedName,login,fullName,presentation,minutes,text,isResolved';
const CUSTOM_FIELD_FIELDS = `id,name,$type,value(${VALUE_FIELDS})`;
const USER_FIELDS = 'id,login,name,fullName';
const COMMENT_FIELDS = `id,text,created,updated,author(${USER_FIELDS})`;
const ARTICLE_FIELDS = [
  'id',
  'idReadable',
  'summary',
  'content',
  'created',
  'updated',
  `project(id,name,shortName)`,
  `reporter(${USER_FIELDS})`,
  `updatedBy(${USER_FIELDS})`,
  `parentArticle(id,idReadable,summary)`,
  `childArticles(id,idReadable,summary)`,
  'hasChildren',
  'tags(id,name)',
].join(',');

const ISSUE_FIELDS_SHORT = 'id,idReadable,summary,description';

const ISSUE_FIELDS = [
  'id',
  'idReadable',
  'summary',
  'description',
  'created',
  'updated',
  'resolved',
  `project(id,name,shortName)`,
  `reporter(${USER_FIELDS})`,
  `customFields(${CUSTOM_FIELD_FIELDS})`,
  `comments(${COMMENT_FIELDS})`,
  `subtasks(issues(id,idReadable,summary,customFields(${CUSTOM_FIELD_FIELDS})))`,
  `parent(issues(id,idReadable,summary))`,
].join(',');

function getFieldNameMap() {
  return YT_PROJECT_SCHEMA.fields;
}

function getDefaultTaskTemplate() {
  return JSON.parse(JSON.stringify(YT_TASK_PARAMS_SCHEMA_NEEDED));
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  return [value];
}

function normalizeSimpleValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeSimpleValue);
  }

  if (!value || typeof value !== 'object') {
    return value ?? null;
  }

  if ('login' in value || 'fullName' in value) {
    return {
      $type: value.$type || null,
      fullName: value.fullName || value.name || null,
      id: value.id || null,
      login: value.login || null,
      name: value.name || null,
    };
  }

  if ('minutes' in value || 'presentation' in value) {
    return {
      $type: value.$type || null,
      minutes: value.minutes ?? null,
      presentation: value.presentation || null,
    };
  }

  if ('name' in value || 'localizedName' in value) {
    return {
      $type: value.$type || null,
      id: value.id || null,
      isResolved: value.isResolved ?? null,
      localizedName: value.localizedName || value.name || null,
      name: value.name || value.localizedName || null,
    };
  }

  if ('text' in value) {
    return {
      $type: value.$type || null,
      text: value.text || null,
    };
  }

  return value;
}

function normalizeFieldMap(customFields) {
  return (customFields || []).reduce((accumulator, field) => {
    accumulator[field.name] = normalizeSimpleValue(field.value);
    return accumulator;
  }, {});
}

function getNamedField(fieldMap, fieldName) {
  const value = fieldMap[fieldName];
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value || null;
}

function normalizeIssueSummary(rawIssue) {
  const fieldMap = normalizeFieldMap(rawIssue.customFields || []);
  const statusField = getFieldNameMap().status;

  return {
    id: rawIssue.id,
    idReadable: rawIssue.idReadable,
    status: getNamedField(fieldMap, statusField)?.name || null,
    summary: rawIssue.summary || null,
  };
}

function normalizeIssue(rawIssue) {
  const fieldMap = normalizeFieldMap(rawIssue.customFields || []);
  const fieldNames = getFieldNameMap();

  return {
    assignee: getNamedField(fieldMap, fieldNames.assignee),
    comments: toArray(rawIssue.comments).map((comment) => ({
      author: comment.author || null,
      created: comment.created ?? null,
      id: comment.id,
      text: comment.text || null,
      updated: comment.updated ?? null,
    })),
    created: rawIssue.created ?? null,
    customFields: fieldMap,
    description: rawIssue.description || null,
    estimate: fieldMap[fieldNames.estimate] ?? null,
    id: rawIssue.id,
    idReadable: rawIssue.idReadable,
    parent: rawIssue.parent?.issues?.[0]
      ? normalizeIssueSummary(rawIssue.parent.issues[0])
      : null,
    priority: getNamedField(fieldMap, fieldNames.priority)?.name || null,
    project: rawIssue.project || null,
    raw: rawIssue,
    reporter: rawIssue.reporter || null,
    resolved: rawIssue.resolved ?? null,
    status: getNamedField(fieldMap, fieldNames.status)?.name || null,
    subtasks: toArray(rawIssue.subtasks?.issues).map(normalizeIssueSummary),
    summary: rawIssue.summary || null,
    timeSpent: fieldMap[fieldNames.timeSpent] ?? null,
    updated: rawIssue.updated ?? null,
  };
}

function inferCustomFieldType(fieldName, value) {
  const fieldNames = getFieldNameMap();

  if (fieldName === fieldNames.priority) {
    return 'SingleEnumIssueCustomField';
  }

  if (fieldName === fieldNames.status) {
    return 'StateIssueCustomField';
  }

  if (fieldName === fieldNames.assignee) {
    return Array.isArray(value) && value.length > 1
      ? 'MultiUserIssueCustomField'
      : 'SingleUserIssueCustomField';
  }

  if (fieldName === fieldNames.estimate || fieldName === fieldNames.timeSpent) {
    return 'PeriodIssueCustomField';
  }

  if (Array.isArray(value)) {
    return 'MultiEnumIssueCustomField';
  }

  return 'SimpleIssueCustomField';
}

function normalizeCreateValue(value) {
  if (value == null) {
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length === 1) {
      return normalizeCreateValue(value[0]);
    }

    return value.map(normalizeCreateValue);
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (value.login) {
    return { login: value.login };
  }

  if (value.name) {
    return { name: value.name };
  }

  return value;
}

function buildCreateCustomFields(input) {
  const fieldNames = getFieldNameMap();
  const defaultTemplate = getDefaultTaskTemplate();
  const rawCustomFields = {
    ...(defaultTemplate.rawCustomFields || {}),
    ...(input.rawCustomFields || {}),
  };

  const assigneeValue =
    input.assignee == null ? null : input.assignee;
  const statusValue =
    input.status == null
      ? rawCustomFields[fieldNames.status] ||
        defaultTemplate.rawCustomFields[fieldNames.status]
      : { name: input.status };
  const priorityValue =
    input.priority == null
      ? rawCustomFields[fieldNames.priority] ||
        defaultTemplate.rawCustomFields.Priority
      : { name: input.priority };

  const merged = {
    ...rawCustomFields,
    [fieldNames.assignee]: assigneeValue,
    [fieldNames.priority]: priorityValue,
    [fieldNames.status]: statusValue,
  };

  return Object.entries(merged).reduce((accumulator, [fieldName, value]) => {
    if (value == null) {
      return accumulator;
    }

    accumulator.push({
      $type: inferCustomFieldType(fieldName, value),
      name: fieldName,
      value: normalizeCreateValue(value),
    });
    return accumulator;
  }, []);
}

function normalizeArticle(rawArticle) {
  return {
    id: rawArticle.id,
    idReadable: rawArticle.idReadable,
    summary: rawArticle.summary || null,
    content: rawArticle.content || null,
    created: rawArticle.created ?? null,
    updated: rawArticle.updated ?? null,
    project: rawArticle.project || null,
    reporter: rawArticle.reporter || null,
    updatedBy: rawArticle.updatedBy || null,
    parentArticle: rawArticle.parentArticle
      ? {
          id: rawArticle.parentArticle.id,
          idReadable: rawArticle.parentArticle.idReadable,
          summary: rawArticle.parentArticle.summary || null,
        }
      : null,
    childArticles: (rawArticle.childArticles || []).map((child) => ({
      id: child.id,
      idReadable: child.idReadable,
      summary: child.summary || null,
    })),
    hasChildren: rawArticle.hasChildren ?? false,
    tags: (rawArticle.tags || []).map((tag) => tag.name),
  };
}

function formatTree(items, depth) {
  return items
    .map((item) => {
      const indent = '  '.repeat(depth);
      const line = `${indent}- ${item.issue.idReadable} [${item.issue.status || 'Unknown'}] ${item.issue.summary || ''}`;
      const nested = formatTree(item.children || [], depth + 1);
      return nested ? `${line}\n${nested}` : line;
    })
    .join('\n');
}

module.exports = {
  ARTICLE_FIELDS,
  COMMENT_FIELDS,
  ISSUE_FIELDS,
  ISSUE_FIELDS_SHORT,
  YT_PROJECT_SCHEMA,
  buildCreateCustomFields,
  formatTree,
  getDefaultTaskTemplate,
  getFieldNameMap,
  normalizeArticle,
  normalizeIssue,
  normalizeIssueSummary,
};
