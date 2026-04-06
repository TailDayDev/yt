'use strict';

const { assertConfig, resolveConfig } = require('../config');
const { createYouTrackHttpClient } = require('./client');
const {
  ARTICLE_FIELDS,
  ISSUE_FIELDS,
  ISSUE_FIELDS_SHORT,
  YT_PROJECT_SCHEMA,
  buildCreateCustomFields,
  getFieldNameMap,
  normalizeArticle,
  normalizeIssue,
} = require('./utils');
const { createExtensionHooks } = require('./hooks');

function createYouTrackApi(overrides) {
  const config = assertConfig(resolveConfig(overrides));
  const http = createYouTrackHttpClient(config);
  const fieldNames = getFieldNameMap();
  const projectCache = new Map();
  const projectCustomFieldCache = new Map();
  let tagCache = null;

  function normalizeLookupValue(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/gu, '');
  }

  async function getProject(projectName) {
    if (projectCache.has(projectName)) {
      return projectCache.get(projectName);
    }

    const projects = await http.request({
      method: 'GET',
      params: {
        fields: 'id,name,shortName',
        query: projectName,
      },
      url: '/admin/projects',
    });

    const project =
      projects.find(
        (entry) =>
          entry.name === projectName ||
          entry.shortName === projectName ||
          entry.id === projectName,
      ) || null;

    if (!project) {
      throw new Error(`YouTrack project not found: ${projectName}`);
    }

    projectCache.set(projectName, project);
    return project;
  }

  async function getProjectCustomFields(projectName) {
    const project = await getProject(projectName);
    if (projectCustomFieldCache.has(project.id)) {
      return projectCustomFieldCache.get(project.id);
    }

    const customFields = await http.request({
      method: 'GET',
      params: {
        fields: 'field(name),bundle(values(name,localizedName,isResolved))',
      },
      url: `/admin/projects/${encodeURIComponent(project.id)}/customFields`,
    });

    projectCustomFieldCache.set(project.id, customFields);
    return customFields;
  }

  async function resolveStatusName(status) {
    const requested = normalizeLookupValue(status);
    if (!requested) {
      throw new Error('Status value is empty.');
    }

    const customFields = await getProjectCustomFields(config.projectName);
    const statusField = customFields.find(
      (entry) => entry.field?.name === fieldNames.status,
    );
    const values = statusField?.bundle?.values || [];

    for (const value of values) {
      const candidates = [value.name, value.localizedName].filter(Boolean);
      for (const candidate of candidates) {
        if (normalizeLookupValue(candidate) === requested) {
          return value.name;
        }
      }
    }

    if (requested === 'open') {
      const fallback = values.find((value) =>
        ['backlog', 'todo', 'new'].includes(normalizeLookupValue(value.name)) ||
        ['backlog', 'todo', 'new'].includes(
          normalizeLookupValue(value.localizedName),
        ),
      );
      if (fallback) {
        return fallback.name;
      }
    }

    throw new Error(
      `Status "${status}" is not available. Available stages: ${values
        .map((value) => value.name)
        .join(', ')}`,
    );
  }

  async function getIssue(issueId, options) {
    const full = options?.full ?? false;
    const fields = full ? ISSUE_FIELDS : ISSUE_FIELDS_SHORT;

    const rawIssue = await http.request({
      method: 'GET',
      params: { fields },
      url: `/issues/${encodeURIComponent(issueId)}`,
    });

    if (!full) {
      return {
        idReadable: rawIssue.idReadable,
        summary: rawIssue.summary || null,
        description: rawIssue.description || null,
      };
    }

    return normalizeIssue(rawIssue);
  }

  async function buildSubtaskNode(issueId, depth) {
    const issue = await getIssue(issueId);
    if (depth <= 0) {
      return {
        children: [],
        issue,
      };
    }

    const children = await Promise.all(
      issue.subtasks.map((subtask) => buildSubtaskNode(subtask.idReadable, depth - 1)),
    );

    return {
      children,
      issue,
    };
  }

  async function listSubtasks(issueId, options) {
    const depth =
      typeof options?.depth === 'number' && options.depth >= 0 ? options.depth : 10;
    const parentIssue = await getIssue(issueId);
    const subtasks = await Promise.all(
      parentIssue.subtasks.map((subtask) => buildSubtaskNode(subtask.idReadable, depth - 1)),
    );

    return {
      parent: parentIssue,
      subtasks,
    };
  }

  async function createSubtask(parentIssueId, input) {
    if (!input || !input.summary) {
      throw new Error('createSubtask requires a summary.');
    }

    const projectName = input.projectName || YT_PROJECT_SCHEMA.project;
    const project = await getProject(projectName);
    const customFields = buildCreateCustomFields(input);

    const created = await http.request({
      data: {
        customFields,
        description: input.description || null,
        project: { id: project.id },
        summary: input.summary,
      },
      method: 'POST',
      params: { fields: ISSUE_FIELDS },
      url: '/issues',
    });

    const createdIssue = normalizeIssue(created);

    await http.request({
      data: {
        issues: [{ idReadable: createdIssue.idReadable }],
        query: `subtask of ${parentIssueId}`,
      },
      method: 'POST',
      url: '/commands',
    });

    return getIssue(createdIssue.idReadable);
  }

  async function updateStatus(issueId, status) {
    if (!status) {
      throw new Error('updateStatus requires a status value.');
    }

    const resolvedStatus = await resolveStatusName(status);
    const command = `${fieldNames.status} ${resolvedStatus}`;
    await http.request({
      data: {
        issues: [{ idReadable: issueId }],
        query: command,
      },
      method: 'POST',
      url: '/commands',
    });

    return {
      command,
      issueId,
      status: resolvedStatus,
      requestedStatus: status,
    };
  }

  async function addComment(issueId, text) {
    if (!text) {
      throw new Error('addComment requires a comment body.');
    }

    return http.request({
      data: { text },
      method: 'POST',
      params: {
        fields: 'id,text,created,updated,author(id,login,name,fullName)',
      },
      url: `/issues/${encodeURIComponent(issueId)}/comments`,
    });
  }

  async function searchIssues(query, options) {
    return http.request({
      method: 'GET',
      params: {
        $skip: options?.skip || 0,
        $top: options?.top || 10,
        fields: ISSUE_FIELDS,
        query,
      },
      url: '/issues',
    }).then((issues) => issues.map(normalizeIssue));
  }

  async function deleteIssue(issueId) {
    await http.request({
      method: 'DELETE',
      url: `/issues/${encodeURIComponent(issueId)}`,
    });
    return {
      deleted: true,
      issueId,
    };
  }

  async function getArticle(articleId) {
    const raw = await http.request({
      method: 'GET',
      params: { fields: ARTICLE_FIELDS },
      url: `/articles/${encodeURIComponent(articleId)}`,
    });
    return normalizeArticle(raw);
  }

  async function listArticles(options) {
    const raw = await http.request({
      method: 'GET',
      params: {
        $skip: options?.skip || 0,
        $top: options?.top || 20,
        fields: ARTICLE_FIELDS,
      },
      url: '/articles',
    });
    return raw.map(normalizeArticle);
  }

  async function createArticle(input) {
    if (!input || !input.summary) {
      throw new Error('createArticle requires a summary.');
    }

    const projectName = input.projectName || YT_PROJECT_SCHEMA.project;
    const project = await getProject(projectName);

    const data = {
      project: { id: project.id },
      summary: input.summary,
    };

    if (input.content != null) {
      data.content = input.content;
    }

    if (input.parentArticle) {
      data.parentArticle = { id: input.parentArticle };
    }

    const raw = await http.request({
      data,
      method: 'POST',
      params: { fields: ARTICLE_FIELDS },
      url: '/articles',
    });

    const article = normalizeArticle(raw);

    if (input.tags?.length) {
      await tagArticle(article.idReadable, input.tags);
      return getArticle(article.idReadable);
    }

    return article;
  }

  async function updateArticle(articleId, input) {
    if (!articleId) {
      throw new Error('updateArticle requires an article ID.');
    }

    const data = {};
    if (input.summary != null) {
      data.summary = input.summary;
    }
    if (input.content != null) {
      data.content = input.content;
    }

    if (Object.keys(data).length === 0) {
      throw new Error('updateArticle requires at least --summary or --content.');
    }

    const raw = await http.request({
      data,
      method: 'POST',
      params: { fields: ARTICLE_FIELDS },
      url: `/articles/${encodeURIComponent(articleId)}`,
    });

    return normalizeArticle(raw);
  }

  async function deleteArticle(articleId) {
    if (!articleId) {
      throw new Error('deleteArticle requires an article ID.');
    }

    await http.request({
      method: 'DELETE',
      url: `/articles/${encodeURIComponent(articleId)}`,
    });

    return {
      deleted: true,
      articleId,
    };
  }

  async function listChildArticles(parentArticleId, options) {
    if (!parentArticleId) {
      throw new Error('listChildArticles requires a parent article ID.');
    }

    const raw = await http.request({
      method: 'GET',
      params: {
        $skip: options?.skip || 0,
        $top: options?.top || 42,
        fields: ARTICLE_FIELDS,
      },
      url: `/articles/${encodeURIComponent(parentArticleId)}/childArticles`,
    });

    return raw.map(normalizeArticle);
  }

  async function createChildArticle(parentArticleId, input) {
    if (!parentArticleId) {
      throw new Error('createChildArticle requires a parent article ID.');
    }
    if (!input || !input.summary) {
      throw new Error('createChildArticle requires a summary.');
    }

    const parent = await getArticle(parentArticleId);
    const projectName = input.projectName || YT_PROJECT_SCHEMA.project;
    const project = await getProject(projectName);

    const data = {
      parentArticle: { id: parent.id },
      project: { id: project.id },
      summary: input.summary,
    };

    if (input.content != null) {
      data.content = input.content;
    }

    const raw = await http.request({
      data,
      method: 'POST',
      params: { fields: ARTICLE_FIELDS },
      url: '/articles',
    });

    const childArticle = normalizeArticle(raw);

    if (input.tags?.length) {
      await tagArticle(childArticle.idReadable, input.tags);
      return getArticle(childArticle.idReadable);
    }

    return childArticle;
  }

  async function fetchAllTags() {
    if (tagCache) {
      return tagCache;
    }

    tagCache = await http.request({
      method: 'GET',
      params: { fields: 'id,name', $top: 200 },
      url: '/tags',
    });

    return tagCache;
  }

  async function resolveTag(tagName) {
    const tags = await fetchAllTags();
    const needle = normalizeLookupValue(tagName);
    const found = tags.find((t) => normalizeLookupValue(t.name) === needle);
    if (found) {
      return found;
    }

    const created = await http.request({
      data: { name: tagName },
      method: 'POST',
      params: { fields: 'id,name' },
      url: '/tags',
    });

    tagCache.push(created);
    return created;
  }

  async function tagArticle(articleId, tagNames) {
    if (!articleId) {
      throw new Error('tagArticle requires an article ID.');
    }

    const article = await getArticle(articleId);
    const dbId = article.id;
    const names = Array.isArray(tagNames) ? tagNames : [tagNames];
    const results = [];

    for (const name of names) {
      const tag = await resolveTag(name);
      const result = await http.request({
        data: { id: tag.id },
        method: 'POST',
        params: { fields: 'id,name' },
        url: `/articles/${encodeURIComponent(dbId)}/tags`,
      });
      results.push(result);
    }

    return results;
  }

  async function linkChildArticle(parentArticleId, childArticleId) {
    if (!parentArticleId || !childArticleId) {
      throw new Error('linkChildArticle requires both parent and child article IDs.');
    }

    const child = await getArticle(childArticleId);

    const raw = await http.request({
      data: { id: child.id, idReadable: child.idReadable, $type: 'Article' },
      method: 'POST',
      params: { fields: ARTICLE_FIELDS },
      url: `/articles/${encodeURIComponent(parentArticleId)}/childArticles`,
    });

    return normalizeArticle(raw);
  }

  return {
    addComment,
    config,
    createArticle,
    createChildArticle,
    createExtensionHooks,
    createSubtask,
    deleteArticle,
    deleteIssue,
    getArticle,
    getIssue,
    linkChildArticle,
    listArticles,
    listChildArticles,
    listSubtasks,
    searchIssues,
    tagArticle,
    updateArticle,
    updateStatus,
  };
}

module.exports = {
  createYouTrackApi,
};
