require('dotenv').config();
const GitHubNotionSync = require('./github-notion-sync');

async function main() {
  const sync = new GitHubNotionSync(
    process.env.NOTION_TOKEN,
    process.env.GITHUB_TOKEN,
    process.env.NOTION_DATABASE_ID
  );

  try {
    console.log('Obteniendo repositorios de GitHub...');
    const repos = await sync.getRepositories();
    
    console.log('Generando insights...');
    const insights = await sync.generateInsights(repos);
    console.log('Insights:', insights);
    
    console.log('Sincronizando con Notion...');
    await sync.syncToNotion(repos);
    
    console.log(`✅ Sincronizados ${repos.length} repositorios`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
