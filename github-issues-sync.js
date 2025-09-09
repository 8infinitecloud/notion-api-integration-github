const { Client } = require('@notionhq/client');
const { Octokit } = require('@octokit/rest');

class GitHubIssuesSync {
  constructor(notionToken, githubToken, issuesDatabaseId) {
    this.notion = new Client({ auth: notionToken });
    this.github = new Octokit({ auth: githubToken });
    this.issuesDatabaseId = issuesDatabaseId;
  }

  // Crear issue en GitHub desde Notion
  async createGitHubIssue(notionPageId, repoOwner, repoName) {
    const page = await this.notion.pages.retrieve({ page_id: notionPageId });
    const properties = page.properties;
    
    const title = properties.Title?.title?.[0]?.text?.content || 'Untitled Issue';
    const description = properties.Description?.rich_text?.[0]?.text?.content || '';
    const labels = properties.Labels?.multi_select?.map(label => label.name) || [];
    
    const issue = await this.github.rest.issues.create({
      owner: repoOwner,
      repo: repoName,
      title,
      body: description,
      labels
    });

    // Actualizar Notion con el número de issue y URL
    await this.notion.pages.update({
      page_id: notionPageId,
      properties: {
        'GitHub Issue': { rich_text: [{ text: { content: `#${issue.data.number}` } }] },
        'GitHub URL': { rich_text: [{ text: { content: issue.data.html_url } }] },
        'Status': { rich_text: [{ text: { content: 'open' } }] }
      }
    });

    return issue.data;
  }

  // Sincronizar estado de issue desde GitHub a Notion
  async syncIssueStatus(repoOwner, repoName, issueNumber, notionPageId) {
    const issue = await this.github.rest.issues.get({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber
    });

    await this.notion.pages.update({
      page_id: notionPageId,
      properties: {
        'Status': { rich_text: [{ text: { content: issue.data.state } }] },
        'Assignee': { rich_text: [{ text: { content: issue.data.assignee?.login || 'Unassigned' } }] },
        'Updated': { rich_text: [{ text: { content: issue.data.updated_at } }] }
      }
    });
  }

  // Actualizar issue en GitHub desde cambios en Notion
  async updateGitHubIssue(notionPageId, repoOwner, repoName, issueNumber) {
    const page = await this.notion.pages.retrieve({ page_id: notionPageId });
    const properties = page.properties;
    
    const title = properties.Title?.title?.[0]?.text?.content;
    const description = properties.Description?.rich_text?.[0]?.text?.content;
    const status = properties.Status?.rich_text?.[0]?.text?.content;
    
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.body = description;
    if (status === 'closed') updateData.state = 'closed';
    else if (status === 'open') updateData.state = 'open';

    await this.github.rest.issues.update({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber,
      ...updateData
    });
  }

  // Obtener todos los issues de un repositorio y sincronizar con Notion
  async syncAllIssues(repoOwner, repoName) {
    const issues = await this.github.rest.issues.listForRepo({
      owner: repoOwner,
      repo: repoName,
      state: 'all'
    });

    for (const issue of issues.data) {
      await this.notion.pages.create({
        parent: { database_id: this.issuesDatabaseId },
        properties: {
          'Title': { title: [{ text: { content: issue.title } }] },
          'Description': { rich_text: [{ text: { content: issue.body || '' } }] },
          'Repository': { rich_text: [{ text: { content: `${repoOwner}/${repoName}` } }] },
          'GitHub Issue': { rich_text: [{ text: { content: `#${issue.number}` } }] },
          'GitHub URL': { rich_text: [{ text: { content: issue.html_url } }] },
          'Status': { rich_text: [{ text: { content: issue.state } }] },
          'Assignee': { rich_text: [{ text: { content: issue.assignee?.login || 'Unassigned' } }] },
          'Labels': { rich_text: [{ text: { content: issue.labels.map(l => l.name).join(', ') } }] },
          'Created': { rich_text: [{ text: { content: issue.created_at } }] },
          'Updated': { rich_text: [{ text: { content: issue.updated_at } }] }
        }
      });
    }
  }
}

module.exports = GitHubIssuesSync;
