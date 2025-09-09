require('dotenv').config();
const GitHubIssuesSync = require('./github-issues-sync');
const GitHubWikiSync = require('./github-wiki-sync');

async function main() {
  const issuesSync = new GitHubIssuesSync(
    process.env.NOTION_TOKEN,
    process.env.GITHUB_TOKEN,
    process.env.NOTION_ISSUES_DATABASE_ID
  );

  const wikiSync = new GitHubWikiSync(
    process.env.NOTION_TOKEN,
    process.env.GITHUB_TOKEN
  );

  try {
    const action = process.argv[2];
    const repoOwner = process.argv[3];
    const repoName = process.argv[4];

    switch (action) {
      case 'sync-issues':
        console.log(`Sincronizando issues de ${repoOwner}/${repoName}...`);
        await issuesSync.syncAllIssues(repoOwner, repoName);
        console.log('✅ Issues sincronizados');
        break;

      case 'create-issue':
        const notionPageId = process.argv[5];
        console.log('Creando issue en GitHub...');
        const issue = await issuesSync.createGitHubIssue(notionPageId, repoOwner, repoName);
        console.log(`✅ Issue creado: ${issue.html_url}`);
        break;

      case 'update-issue':
        const issueNumber = process.argv[5];
        const notionPageIdUpdate = process.argv[6];
        console.log('Actualizando issue...');
        await issuesSync.updateGitHubIssue(notionPageIdUpdate, repoOwner, repoName, issueNumber);
        console.log('✅ Issue actualizado');
        break;

      case 'create-wiki':
        const notionPageIdWiki = process.argv[5];
        const wikiTitle = process.argv[6];
        console.log('Creando página wiki...');
        const wikiUrl = await wikiSync.createGitHubWiki(notionPageIdWiki, repoOwner, repoName, wikiTitle);
        console.log(`✅ Wiki creada: ${wikiUrl}`);
        break;

      case 'sync-wiki':
        const notionPageIdSync = process.argv[5];
        const wikiFileName = process.argv[6];
        console.log('Sincronizando wiki...');
        await wikiSync.syncNotionToWiki(notionPageIdSync, repoOwner, repoName, wikiFileName);
        console.log('✅ Wiki sincronizada');
        break;

      default:
        console.log(`
Uso: node sync-issues-wiki.js <acción> <owner> <repo> [argumentos]

Acciones disponibles:
  sync-issues <owner> <repo>                    - Sincronizar todos los issues
  create-issue <owner> <repo> <notion-page-id>  - Crear issue desde Notion
  update-issue <owner> <repo> <issue-number> <notion-page-id> - Actualizar issue
  create-wiki <owner> <repo> <notion-page-id> <title> - Crear wiki desde Notion
  sync-wiki <owner> <repo> <notion-page-id> <wiki-file> - Sincronizar wiki

Ejemplos:
  node sync-issues-wiki.js sync-issues 8infinitecloud mi-repo
  node sync-issues-wiki.js create-issue 8infinitecloud mi-repo abc123def456
  node sync-issues-wiki.js create-wiki 8infinitecloud mi-repo abc123def456 "Getting Started"
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
