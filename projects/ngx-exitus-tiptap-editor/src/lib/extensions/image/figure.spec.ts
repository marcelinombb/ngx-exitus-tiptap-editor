import { provideZonelessChangeDetection, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Figure } from './Figure';
import { Figcaption } from './Figcaption';
import { Image } from './image';
import { findFigureNode } from '../../utils/tiptap-selection';

describe('Figure Extension', () => {
  let editor: Editor;
  let injector: Injector;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    injector = TestBed.inject(Injector);

    editor = new Editor({
      extensions: [
        StarterKit,
        Image.configure({ inline: false, allowBase64: true }),
        Figcaption,
        Figure.configure({ injector }),
      ],
      content: '<figure><img src="https://example.com/test.png" /></figure>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('deve inicializar o schema com nó figure', () => {
    expect(editor.schema.nodes['figure']).toBeDefined();
    expect(editor.schema.nodes['figcaption']).toBeDefined();
  });

  it('deve carregar o conteúdo inicial como um nó figure', () => {
    const html = editor.getHTML();
    expect(html).toContain('<figure');
    expect(html).toContain('img src="https://example.com/test.png"');
  });

  it('deve encontrar o nó figure através de findFigureNode quando selecionado', () => {
    editor.commands.setTextSelection(1);
    const figureInfo = findFigureNode(editor.state);
    expect(figureInfo).toBeDefined();
    expect(figureInfo?.node.type.name).toBe('figure');
  });

  it('deve aplicar largura ao nó figure com setImageWidth', () => {
    editor.commands.setTextSelection(1);
    editor.commands.setImageWidth(350);

    const figureInfo = findFigureNode(editor.state);
    expect(figureInfo?.node.attrs['width']).toBe(350);
  });

  it('deve alterar e verificar o alinhamento com setImageAlignment e hasAlignment', () => {
    editor.commands.setTextSelection(1);

    expect(editor.commands.hasAlignment('middle')).toBeTrue();

    editor.commands.setImageAlignment('right');
    expect(editor.commands.hasAlignment('right')).toBeTrue();
    expect(editor.commands.hasAlignment('middle')).toBeFalse();

    editor.commands.setImageAlignment('left');
    expect(editor.commands.hasAlignment('left')).toBeTrue();
    expect(editor.commands.hasAlignment('right')).toBeFalse();
  });

  it('deve alternar a figcaption com toggleFigcaption', () => {
    editor.commands.setNodeSelection(0);

    let figureInfo = findFigureNode(editor.state);
    expect(figureInfo?.node.childCount).toBe(1); // apenas img

    editor.commands.toggleFigcaption();

    editor.commands.setNodeSelection(0);
    figureInfo = findFigureNode(editor.state);
    expect(figureInfo?.node.childCount).toBe(2); // img + figcaption
    expect(figureInfo?.node.lastChild?.type.name).toBe('figcaption');

    editor.commands.toggleFigcaption();

    editor.commands.setNodeSelection(0);
    figureInfo = findFigureNode(editor.state);
    expect(figureInfo?.node.childCount).toBe(1); // figcaption removida
  });
});
