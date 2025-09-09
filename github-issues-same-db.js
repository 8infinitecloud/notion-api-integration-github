const { Client } = require('@notionhq/client');
const { Octokit } = require('@octokit/rest');

class GitHubIssuesSameDB {
  constructor(notionToken, githubToken, databaseId) {
    this.notion = new Client({ auth: notionToken });
    this.github = new Octokit({ auth: githubToken });
    this.databaseId = databaseId; // Misma BD que los repos
  }

  // Agregar issues como páginas hijas de un repositorio
  async addIssuesToRepo(repoPageId, repoOwner, repoName) {
    const issues = await this.github.rest.issues.listForRepo({
      owner: repoOwner,
      repo: repoName,
      state: 'all'
    });

    for (const issue of issues.data) {
      await this.notion.pages.create({
        parent: { page_id: repoPageId }, // Página hija del repo
        properties: {
          'Name': { title: [{ text: { content: `Issue #${issue.number}: ${issue.title}` } }] }
        },
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: `Estado: ${issue.state}` } }]
            }
          },
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: `URL: ${issue.html_url}` } }]
            }
          },
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: issue.body || 'Sin descripción' } }]
            }
          }
        ]
      });
    }
  }
}

module.exports = GitHubIssuesSameDB;
