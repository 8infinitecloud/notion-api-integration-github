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
    
    const reposWithIssues = [];
    
    for (const repo of repos.data) {
      // Obtener issues del repositorio
      const issues = await this.github.rest.issues.listForRepo({
        owner: repo.owner.login,
        repo: repo.name,
        state: 'all',
        per_page: 10
      });
      
      const openIssues = issues.data.filter(issue => issue.state === 'open');
      const recentIssues = issues.data.slice(0, 3);
      
      reposWithIssues.push({
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
        topics: repo.topics || [],
        // Nuevas propiedades de issues
        totalIssues: issues.data.length,
        openIssuesCount: openIssues.length,
        recentIssuesList: recentIssues.map(issue => `#${issue.number}: ${issue.title}`).join(' | '),
        issuesUrl: `${repo.html_url}/issues`
      });
    }
    
    return reposWithIssues;
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
          'Topics': { rich_text: [{ text: { content: repo.topics.join(', ') } }] },
          // Nuevas columnas de issues
          'Total Issues': { rich_text: [{ text: { content: repo.totalIssues.toString() } }] },
          'Open Issues': { rich_text: [{ text: { content: repo.openIssuesCount.toString() } }] },
          'Recent Issues': { rich_text: [{ text: { content: repo.recentIssuesList } }] },
          'Issues URL': { rich_text: [{ text: { content: repo.issuesUrl } }] }
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

  // Crear issue en GitHub desde página de repositorio en Notion
  async createIssueFromNotion(repoPageId, issueTitle, issueDescription) {
    // Obtener información del repositorio desde Notion
    const page = await this.notion.pages.retrieve({ page_id: repoPageId });
    const repoName = page.properties.Name?.title?.[0]?.text?.content;
    const repoUrl = page.properties.URL?.rich_text?.[0]?.text?.content;
    
    if (!repoUrl) throw new Error('No se encontró URL del repositorio');
    
    // Extraer owner y repo del URL
    const urlParts = repoUrl.split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1];
    
    // Crear issue en GitHub
    const issue = await this.github.rest.issues.create({
      owner,
      repo,
      title: issueTitle,
      body: issueDescription
    });
    
    // Agregar comentario en la página de Notion
    await this.notion.comments.create({
      parent: { page_id: repoPageId },
      rich_text: [
        { text: { content: `✅ Issue creado: #${issue.data.number} - ${issue.data.title}\n${issue.data.html_url}` } }
      ]
    });
    
    return issue.data;
  }
}

module.exports = GitHubNotionSync;
