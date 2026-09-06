import MarkdownIt from 'markdown-it';

const parser = new MarkdownIt({ html: true });

/** Use the Markdown parser so reference links, escaping and code examples agree. */
export function markdownReferences(markdown: string): { links: string[]; html: string[] } {
    const links = new Set<string>(), html: string[] = [];
    const visit = (tokens: ReturnType<typeof parser.parse>) => {
        for (const token of tokens) {
            if (token.type === 'link_open' || token.type === 'image') {
                const destination = token.attrGet(token.type === 'image' ? 'src' : 'href');
                if (destination) links.add(String(destination));
            }
            if (token.type === 'text') for (const match of token.content.matchAll(/!?\[\[([^\]\n]+)\]\]/g)) links.add(match[1]);
            if (token.type === 'html_block' || token.type === 'html_inline') html.push(token.content);
            if (token.children) visit(token.children);
        }
    };
    visit(parser.parse(markdown, {}));
    return { links: [...links], html };
}
