import { App } from 'obsidian';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { Article, ArticleData, TaskData, ArticleSection } from '../../../../types/article.types';
import { z } from "zod";

interface SubSection {
    title: string;
    paragraphs: string[];
}

type ParagraphContent = string | SubSection;

interface Section {
    title: string;
    paragraphs: ParagraphContent[];
}

interface ArticleOutline {
    outline: Section[];
}

const paragraphSchema = z.union([
  z.string(),
  z.object({
    title: z.string(),
    paragraphs: z.array(z.string())
  })
]);

const sectionSchema = z.object({
  title: z.string(),
  paragraphs: z.array(paragraphSchema)
});

const outlineSchema = z.object({
  outline: z.array(z.object({
    title: z.string(),
    paragraphs: z.array(z.string())
  }))
});

type OutlineResponse = z.infer<typeof outlineSchema>;

export class ObsidianArticleWriter {
  private model: ChatOpenAI;
  private app: App;

  constructor(app: App, openAIKey: string) {
    this.app = app;
    this.model = new ChatOpenAI({ 
      openAIApiKey: openAIKey,
      modelName: "gpt-3.5-turbo",
      temperature: 0.7
    });
  }

  private async writeArticleOutline(keyword: string, niche: string): Promise<OutlineResponse> {
    const parser = StructuredOutputParser.fromZodSchema(outlineSchema);

    const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            "Tu es un expert en rédaction d'articles SEO. Tu vas créer un plan détaillé pour un article optimisé pour le référencement."
        ),
        HumanMessagePromptTemplate.fromTemplate(
            "Crée un plan détaillé pour un article sur {keyword} dans la niche {niche}. " +
            "Le plan doit inclure une introduction, plusieurs sections principales avec des paragraphes détaillés, et une conclusion. " +
            "Format attendu : \n{format_instructions}"
        ),
    ]);

    const chain = prompt.pipe(this.model).pipe(parser);

    const response = await chain.invoke({
        keyword,
        niche,
        format_instructions: parser.getFormatInstructions()
    });

    return response;
  }

  private async writeParagraph(task: TaskData): Promise<string> {
    const prompt = ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(
        "You are a professional article writer. Write engaging and informative content."
      ),
      HumanMessagePromptTemplate.fromTemplate(
        `Write a detailed paragraph for an article.
Niche: {niche}
Main keyword: {keyword}
Section title: {title}
Paragraph topic: {paragraph}

Write a well-structured, engaging paragraph that naturally incorporates the keyword.`
      )
    ]);

    const chain = prompt.pipe(this.model);

    const result = await chain.invoke(task);
    return result.content as string;
  }

  private async saveToObsidian(article: Article): Promise<void> {
    // Créer le frontmatter
    const frontmatter = `---
keyword: ${article.keyword}
niche: ${article.niche}
words: ${article.words}
date: ${article.date.toISOString()}
---\n\n`;

    // Ajouter le frontmatter au contenu
    const content = frontmatter + article.article;

    // Créer un nom de fichier valide à partir du mot-clé
    const fileName = `${article.keyword.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.md`;
    const filePath = `${article.folder}/${fileName}`;

    // Créer le dossier s'il n'existe pas
    const folderExists = await this.app.vault.adapter.exists(article.folder);
    if (!folderExists) {
      await this.app.vault.createFolder(article.folder);
    }

    // Créer ou mettre à jour le fichier
    await this.app.vault.create(filePath, content);
  }

  private outlineToMarkdown(outline: OutlineResponse): string {
    let markdown = '';
    
    for (const section of outline.outline) {
        markdown += `# ${section.title}\n\n`;
        
        for (const paragraph of section.paragraphs) {
            markdown += `${paragraph}\n\n`;
        }
    }
    
    return markdown;
  }

  async writeArticle(data: ArticleData, onProgress?: (step: 'outline' | 'paragraph', current: number, total: number) => Promise<void>): Promise<Article> {
    try {
      // Générer le plan
      const outline = await this.writeArticleOutline(data.keyword, data.niche);
      if (onProgress) await onProgress('outline', 1, 1);

      // Générer chaque paragraphe
      let article = '';
      let currentParagraph = 0;
      const totalParagraphs = outline.outline.length;

      for (const section of outline.outline) {
        article += `# ${section.title}\n\n`;

        for (const paragraph of section.paragraphs) {
          const task: TaskData = {
            niche: data.niche,
            keyword: data.keyword,
            title: section.title,
            paragraph: paragraph
          };

          const content = await this.writeParagraph(task);
          article += content + '\n\n';
          currentParagraph++;

          if (onProgress) {
            await onProgress('paragraph', currentParagraph, totalParagraphs);
          }
        }
      }

      const result = {
        folder: data.folder,
        keyword: data.keyword,
        niche: data.niche,
        isFinished: true,
        taskId: data.taskId,
        words: article.split(/\s+/).length,
        article: article,
        date: new Date()
      };

      // Sauvegarder l'article dans Obsidian
      await this.saveToObsidian(result);

      return result;
    } catch (error) {
      console.error('Error writing article:', error);
      throw error;
    }
  }
}
