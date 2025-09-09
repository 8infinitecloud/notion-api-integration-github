require('dotenv').config();
const GitHubNotionSync = require('./github-notion-sync');

async function createIssue() {
  const sync = new GitHubNotionSync(
    process.env.NOTION_TOKEN,
    process.env.GITHUB_TOKEN,
    process.env.NOTION_DATABASE_ID
  );

  const repoPageId = process.argv[2];
  const issueTitle = process.argv[3];
  const issueDescription = process.argv[4] || '';

  if (!repoPageId || !issueTitle) {
    console.log(`
Uso: node create-issue.js <notion-page-id> <título> [descripción]

Ejemplo:
node create-issue.js abc123def456 "Fix bug in login" "El login no funciona correctamente"
    `);
    return;
  }

  try {
    console.log('Creando issue...');
    const issue = await sync.createIssueFromNotion(repoPageId, issueTitle, issueDescription);
    console.log(`✅ Issue creado: ${issue.html_url}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createIssue();
