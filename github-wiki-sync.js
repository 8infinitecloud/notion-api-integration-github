const { Client } = require('@notionhq/client');
const { Octokit } = require('@octokit/rest');

class GitHubWikiSync {
  constructor(notionToken, githubToken) {
    this.notion = new Client({ auth: notionToken });
    this.github = new Octokit({ auth: githubToken });
  }

  // Convertir contenido de Notion a Markdown
  async notionToMarkdown(blocks) {
    let markdown = '';
    
    for (const block of blocks) {
      switch (block.type) {
        case 'paragraph':
          markdown += this.richTextToMarkdown(block.paragraph.rich_text) + '\n\n';
          break;
        case 'heading_1':
          markdown += `# ${this.richTextToMarkdown(block.heading_1.rich_text)}\n\n`;
          break;
        case 'heading_2':
          markdown += `## ${this.richTextToMarkdown(block.heading_2.rich_text)}\n\n`;
          break;
        case 'heading_3':
          markdown += `### ${this.richTextToMarkdown(block.heading_3.rich_text)}\n\n`;
          break;
        case 'bulleted_list_item':
          markdown += `- ${this.richTextToMarkdown(block.bulleted_list_item.rich_text)}\n`;
          break;
        case 'numbered_list_item':
          markdown += `1. ${this.richTextToMarkdown(block.numbered_list_item.rich_text)}\n`;
          break;
        case 'code':
          markdown += `\`\`\`${block.code.language || ''}\n${this.richTextToMarkdown(block.code.rich_text)}\n\`\`\`\n\n`;
          break;
      }
    }
    
    return markdown;
  }

  richTextToMarkdown(richText) {
    return richText.map(text => {
      let content = text.text.content;
      if (text.annotations.bold) content = `**${content}**`;
      if (text.annotations.italic) content = `*${content}*`;
      if (text.annotations.code) content = `\`${content}\``;
      if (text.text.link) content = `[${content}](${text.text.link.url})`;
      return content;
    }).join('');
  }

  // Crear página wiki en GitHub desde página de Notion
  async createGitHubWiki(notionPageId, repoOwner, repoName, wikiTitle) {
    // Obtener contenido de la página de Notion
    const page = await this.notion.pages.retrieve({ page_id: notionPageId });
    const blocks = await this.notion.blocks.children.list({ block_id: notionPageId });
    
    // Convertir a Markdown
    const markdown = await this.notionToMarkdown(blocks.results);
    
    // Crear archivo en el repositorio wiki (GitHub usa git para wikis)
    const fileName = wikiTitle.replace(/\s+/g, '-') + '.md';
    
    try {
      await this.github.rest.repos.createOrUpdateFileContents({
        owner: repoOwner,
        repo: `${repoName}.wiki`,
        path: fileName,
        message: `Create wiki page: ${wikiTitle}`,
        content: Buffer.from(markdown).toString('base64')
      });
      
      return `https://github.com/${repoOwner}/${repoName}/wiki/${fileName.replace('.md', '')}`;
    } catch (error) {
      console.error('Error creating wiki:', error.message);
      throw error;
    }
  }

  // Sincronizar página de Notion con wiki existente
  async syncNotionToWiki(notionPageId, repoOwner, repoName, wikiFileName) {
    const blocks = await this.notion.blocks.children.list({ block_id: notionPageId });
    const markdown = await this.notionToMarkdown(blocks.results);
    
    await this.github.rest.repos.createOrUpdateFileContents({
      owner: repoOwner,
      repo: `${repoName}.wiki`,
      path: wikiFileName,
      message: `Update wiki from Notion: ${new Date().toISOString()}`,
      content: Buffer.from(markdown).toString('base64')
    });
  }

  // Crear página de Notion desde wiki de GitHub
  async createNotionFromWiki(repoOwner, repoName, wikiFileName, parentPageId) {
    try {
      const file = await this.github.rest.repos.getContent({
        owner: repoOwner,
        repo: `${repoName}.wiki`,
        path: wikiFileName
      });
      
      const markdown = Buffer.from(file.data.content, 'base64').toString();
      const title = wikiFileName.replace('.md', '').replace(/-/g, ' ');
      
      // Crear página en Notion (simplificado - solo texto)
      const page = await this.notion.pages.create({
        parent: { page_id: parentPageId },
        properties: {
          title: { title: [{ text: { content: title } }] }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: markdown } }]
            }
          }
        ]
      });
      
      return page;
    } catch (error) {
      console.error('Error creating Notion page from wiki:', error.message);
      throw error;
    }
  }
}

module.exports = GitHubWikiSync;
