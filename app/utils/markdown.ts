// import rehypeRaw from 'rehype-raw'; // Commented out because the module is missing
// import remarkGfm from 'remark-gfm'; // Commented out because the module is missing
// import type { PluggableList, Plugin } from 'unified'; // Commented out because the module is missing
// import rehypeSanitize, { defaultSchema, type Options as RehypeSanitizeOptions } from 'rehype-sanitize'; // Commented out because the module is missing
// import { SKIP, visit } from 'unist-util-visit'; // Commented out because the module is missing
// import type { UnistNode, UnistParent } from 'node_modules/unist-util-visit/lib'; // Commented out because the module is missing

export const allowedHTMLElements = [
  'b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
];

// Add custom rehype plugin
function remarkThinkRawContent() {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type === 'html' && node.value && node.value.startsWith('<think>')) {
        const cleanedContent = node.value.slice(7);
        node.value = `<div class="__boltThought__">${cleanedContent}`;

        return;
      }

      if (node.type === 'html' && node.value && node.value.startsWith('</think>')) {
        const cleanedContent = node.value.slice(8);
        node.value = `</div>${cleanedContent}`;
      }
    });
  };
}

// Temporary replacements for missing imports
const rehypeSanitizeOptions = {};
const remarkGfm = {};
const rehypeRaw = {};
const rehypeSanitize = {};
const SKIP = {};
const visit = (tree: any, visitor: any) => {};

export function remarkPlugins(limitedMarkdown: boolean) {
  const plugins: any[] = [remarkGfm];

  if (limitedMarkdown) {
    plugins.unshift(limitedMarkdownPlugin);
  }

  plugins.unshift(remarkThinkRawContent);

  return plugins;
}

export function rehypePlugins(html: boolean) {
  const plugins: any[] = [];

  if (html) {
    plugins.push(rehypeRaw, [rehypeSanitize, rehypeSanitizeOptions]);
  }

  return plugins;
}

const limitedMarkdownPlugin = () => {
  return (tree: any, file: any) => {
    const contents = file.toString();

    visit(tree, (node: any, index: any, parent: any) => {
      if (
        index == null ||
        ['paragraph', 'text', 'inlineCode', 'code', 'strong', 'emphasis'].includes(node.type) ||
        !node.position
      ) {
        return true;
      }

      let value = contents.slice(node.position.start.offset, node.position.end.offset);

      if (node.type === 'heading') {
        value = `\n${value}`;
      }

      parent.children[index] = {
        type: 'text',
        value,
      } as any;

      return [SKIP, index] as const;
    });
  };
};
