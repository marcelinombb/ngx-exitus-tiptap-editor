import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Katex } from './katex';

describe('Katex Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, Katex],
      content: '<p>Formula: <span class="math-tex">\\(x = 2\\)</span></p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('deve registrar o nó katex no schema', () => {
    expect(editor.schema.nodes['katex']).toBeDefined();
  });

  it('deve ter as configurações de nó inline atom', () => {
    expect(Katex.config.inline).toBeTrue();
    expect(Katex.config.atom).toBeTrue();
    expect(Katex.config.group).toBe('inline');
  });

  it('deve renderizar span com a classe math-tex', () => {
    const render = (Katex.config.renderHTML as any)?.call(
      {},
      {
        HTMLAttributes: { latexFormula: 'E=mc^2' },
      },
    );
    expect(render).toBeDefined();
    expect(render[0]).toBe('span');
    expect(render[1]?.class).toBe('math-tex');
    expect(render[2]).toContain('E=mc^2');
  });

  it('deve inserir nó katex através do comando addLatexInput', () => {
    editor.commands.setTextSelection(1);
    const success = editor.commands.addLatexInput();
    expect(success).toBeTrue();

    const json = editor.getJSON();
    const paragraph = json.content?.[0];
    const hasKatex = paragraph?.content?.some((node) => node.type === 'katex');
    expect(hasKatex).toBeTrue();
  });
});
