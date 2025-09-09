const { Client } = require('@notionhq/client');
const { Octokit } = require('@octokit/rest');

class GitHubNotionSync {
  constructor(notionToken, githubToken, databaseId) {
    this.notion = new Client({ auth: notionToken });
    this.github = new Octokit({ auth: githubToken });
    this.databaseId = databaseId;
  }

  async getRepositories() {
    const repos = await this.github.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });
    
    return repos.data.map(repo => ({
      name: repo.name,
      description: repo.description || '',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      issues: repo.open_issues_count,
      size: repo.size,
      created: repo.created_at,
      updated: repo.updated_at,
      url: repo.html_url,
      private: repo.private,
      topics: repo.topics || []
    }));
  }

  async syncToNotion(repos) {
    for (const repo of repos) {
      await this.notion.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          'Name': { title: [{ text: { content: repo.name } }] },
          'Description': { rich_text: [{ text: { content: repo.description } }] },
          'Language': { rich_text: [{ text: { content: repo.language } }] },
          'Stars': { rich_text: [{ text: { content: repo.stars.toString() } }] },
          'Forks': { rich_text: [{ text: { content: repo.forks.toString() } }] },
          'Size (KB)': { rich_text: [{ text: { content: repo.size.toString() } }] },
          'Created': { rich_text: [{ text: { content: repo.created } }] },
          'Updated': { rich_text: [{ text: { content: repo.updated } }] },
          'URL': { rich_text: [{ text: { content: repo.url } }] },
          'Private': { rich_text: [{ text: { content: repo.private ? 'Yes' : 'No' } }] },
          'Topics': { rich_text: [{ text: { content: repo.topics.join(', ') } }] }
        }
      });
    }
  }

  async generateInsights(repos) {
    return {
      totalRepos: repos.length,
      languages: this.getLanguageStats(repos),
      totalStars: repos.reduce((sum, repo) => sum + repo.stars, 0),
      avgStars: repos.reduce((sum, repo) => sum + repo.stars, 0) / repos.length,
      mostStarred: repos.sort((a, b) => b.stars - a.stars)[0],
      recentActivity: repos.filter(repo => 
        new Date(repo.updated) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length
    };
  }

  getLanguageStats(repos) {
    const languages = {};
    repos.forEach(repo => {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    });
    return Object.entries(languages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }
}

module.exports = GitHubNotionSync;
