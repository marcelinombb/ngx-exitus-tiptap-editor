import { provideZonelessChangeDetection, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { AnswerBox } from './answer-box';

describe('AnswerBox Extension', () => {
  let editor: Editor;
  let injector: Injector;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    injector = TestBed.inject(Injector);

    editor = new Editor({
      extensions: [StarterKit, AnswerBox.configure({ injector })],
      content:
        '<div class="ex-answer-box" data-style="box" data-lines="5"><div class="ex-answer-box-header">Cabeçalho</div></div>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('deve registrar o nó answerBox no schema', () => {
    expect(editor.schema.nodes['answerBox']).toBeDefined();
  });

  it('deve fazer o parse correto dos atributos do answerBox', () => {
    const json = editor.getJSON();
    const answerBoxNode = json.content?.find((node) => node.type === 'answerBox');

    expect(answerBoxNode).toBeDefined();
    expect(answerBoxNode?.attrs?.['style']).toBe('box');
    expect(answerBoxNode?.attrs?.['lines']).toBe(5);
  });

  it('deve alterar o estilo com setAnswerBoxStyle', () => {
    editor.commands.setNodeSelection(0);
    editor.commands.setAnswerBoxStyle('lines');

    const json = editor.getJSON();
    const answerBoxNode = json.content?.find((node) => node.type === 'answerBox');
    expect(answerBoxNode?.attrs?.['style']).toBe('lines');
  });

  it('deve atualizar o número de linhas com setAnswerBoxLines', () => {
    editor.commands.setNodeSelection(0);
    editor.commands.setAnswerBoxLines(10);

    const json = editor.getJSON();
    const answerBoxNode = json.content?.find((node) => node.type === 'answerBox');
    expect(answerBoxNode?.attrs?.['lines']).toBe(10);
  });

  it('deve alternar showHeader com toggleAnswerBoxHeader', () => {
    editor.commands.setNodeSelection(0);

    let answerBoxNode = editor.getJSON().content?.find((node) => node.type === 'answerBox');
    expect(answerBoxNode?.attrs?.['showHeader']).toBeFalse();

    editor.commands.toggleAnswerBoxHeader();

    answerBoxNode = editor.getJSON().content?.find((node) => node.type === 'answerBox');
    expect(answerBoxNode?.attrs?.['showHeader']).toBeTrue();
  });

  it('deve alternar hideBorder com toggleAnswerBoxBorder', () => {
    editor.commands.setNodeSelection(0);

    let answerBoxNode = editor.getJSON().content?.find((node) => node.type === 'answerBox');
    expect(answerBoxNode?.attrs?.['hideBorder']).toBeFalse();

    editor.commands.toggleAnswerBoxBorder();

    answerBoxNode = editor.getJSON().content?.find((node) => node.type === 'answerBox');
    expect(answerBoxNode?.attrs?.['hideBorder']).toBeTrue();
  });

  it('deve inserir um novo answerBox com insertAnswerBox', () => {
    editor.commands.clearContent();
    editor.commands.insertAnswerBox();

    const json = editor.getJSON();
    const answerBoxNode = json.content?.find((node) => node.type === 'answerBox');
    expect(answerBoxNode).toBeDefined();
    expect(answerBoxNode?.attrs?.['lines']).toBe(5);
    expect(answerBoxNode?.attrs?.['style']).toBe('box');
  });
});
