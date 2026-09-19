import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { MathType } from './mathtype';

describe('MathType Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, MathType],
      content:
        '<p><img class="Wirisformula" src="data:image/svg+xml;utf8,<svg></svg>" width="100" height="50" data-mathml="<math></math>"/></p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('deve registrar o nó mathtype no schema', () => {
    expect(editor.schema.nodes['mathtype']).toBeDefined();
  });

  it('deve ter as configurações de nó inline atom', () => {
    expect(MathType.config.inline).toBeTrue();
    expect(MathType.config.atom).toBeTrue();
    expect(MathType.config.group).toBe('inline');
  });

  it('deve fazer parse do nó mathtype a partir do HTML com classe Wirisformula', () => {
    const json = editor.getJSON();
    const paragraph = json.content?.[0];
    const mathtypeNode = paragraph?.content?.find((node) => node.type === 'mathtype') as any;

    expect(mathtypeNode).toBeDefined();
    expect(mathtypeNode?.attrs?.['class']).toBe('Wirisformula');
    expect(mathtypeNode?.attrs?.['width']).toBe('100');
    expect(mathtypeNode?.attrs?.['height']).toBe('50');
    expect(mathtypeNode?.attrs?.['data-mathml']).toBe('<math></math>');
  });

  it('deve renderizar a estrutura de container span.ex-mathype contendo a img', () => {
    const render = (MathType.config.renderHTML as any)?.call(
      {},
      {
        HTMLAttributes: { class: 'Wirisformula', width: '80', height: '40' },
      },
    );
    expect(render).toBeDefined();
    expect(render[0]).toBe('span');
    expect(render[1]?.class).toBe('ex-mathype');
    expect(render[2]?.[0]).toBe('img');
  });
});
