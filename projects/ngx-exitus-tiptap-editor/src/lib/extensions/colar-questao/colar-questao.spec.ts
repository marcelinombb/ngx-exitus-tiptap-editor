import { provideZonelessChangeDetection, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ColarQuestao } from './colar-questao';

describe('ColarQuestao Extension', () => {
  let editor: Editor;
  let injector: Injector;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    injector = TestBed.inject(Injector);

    editor = new Editor({
      extensions: [StarterKit, ColarQuestao.configure({ injector })],
      content: '<p>Texto da questão</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('deve registrar o nó colarQuestao no schema', () => {
    expect(editor.schema.nodes['colarQuestao']).toBeDefined();
  });

  it('deve envolver o bloco selecionado com addColarQuestao', () => {
    editor.commands.setTextSelection(2);
    const added = editor.commands.addColarQuestao('Questão 1');
    expect(added).toBeTrue();

    const html = editor.getHTML();
    expect(html).toContain('<colar-questao');
    expect(html).toContain('title="Questão 1"');
    expect(html).toContain('Texto da questão');
  });

  it('não deve permitir adicionar dois nós com o mesmo título', () => {
    editor.commands.setTextSelection(2);
    editor.commands.addColarQuestao('Questão Duplicada');

    // Tentar adicionar outro com o mesmo título
    const secondAdd = editor.commands.addColarQuestao('Questão Duplicada');
    expect(secondAdd).toBeFalse();
  });

  it('deve atualizar o título se a seleção estiver dentro de um colarQuestao existente', () => {
    editor.commands.setTextSelection(2);
    editor.commands.addColarQuestao('Título Inicial');

    // Seleção ainda dentro do bloco
    editor.commands.setTextSelection(3);
    const updated = editor.commands.addColarQuestao('Título Novo');
    expect(updated).toBeTrue();

    const html = editor.getHTML();
    expect(html).toContain('title="Título Novo"');
    expect(html).not.toContain('title="Título Inicial"');
  });

  it('deve retornar o HTML do conteúdo interno com getColarQuestaoContent', () => {
    editor.commands.setTextSelection(2);
    editor.commands.addColarQuestao('Questão Teste');

    const contentHtml = (editor.commands as any).getColarQuestaoContent('Questão Teste');
    expect(contentHtml).toContain('<p>Texto da questão</p>');
  });

  it('deve desencapsular o conteúdo ao chamar removeColarQuestao', () => {
    editor.commands.setTextSelection(2);
    editor.commands.addColarQuestao('Remover');

    expect(editor.getHTML()).toContain('<colar-questao');

    const removed = editor.commands.removeColarQuestao(0);
    expect(removed).toBeTrue();

    const html = editor.getHTML();
    expect(html).not.toContain('<colar-questao');
    expect(html).toContain('<p>Texto da questão</p>');
  });
});
