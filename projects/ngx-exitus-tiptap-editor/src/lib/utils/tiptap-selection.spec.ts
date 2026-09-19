import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { findNodeFromSelection, findFigureNode } from './tiptap-selection';

describe('tiptap-selection utils', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [StarterKit],
      content: '<p>Primeiro parágrafo</p><blockquote><p>Citação em bloco</p></blockquote>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('deve encontrar nó pai quando a seleção estiver dentro de blockquote', () => {
    // Posição dentro da blockquote
    editor.commands.setTextSelection(25);

    const found = findNodeFromSelection(editor.state.selection, 'blockquote');
    expect(found).toBeDefined();
    expect(found?.node.type.name).toBe('blockquote');
  });

  it('deve aceitar EditorState diretamente em findNodeFromSelection', () => {
    editor.commands.setTextSelection(25);

    const found = findNodeFromSelection(editor.state, 'blockquote');
    expect(found).toBeDefined();
    expect(found?.node.type.name).toBe('blockquote');
  });

  it('deve retornar undefined quando o nó não for encontrado', () => {
    editor.commands.setTextSelection(3); // dentro do primeiro parágrafo

    const found = findNodeFromSelection(editor.state.selection, 'blockquote');
    expect(found).toBeUndefined();
  });

  it('findFigureNode deve retornar undefined quando não há nó figure', () => {
    expect(findFigureNode(editor.state)).toBeUndefined();
    expect(findFigureNode(editor.state.selection)).toBeUndefined();
  });

  it('deve encontrar nó via direct NodeSelection', () => {
    // Definir seleção de nó na blockquote (pos 20)
    editor.commands.setNodeSelection(20);
    const found = findNodeFromSelection(editor.state.selection, 'blockquote');
    expect(found).toBeDefined();
    expect(found?.node.type.name).toBe('blockquote');
    expect(found?.pos).toBe(20);
  });
});
