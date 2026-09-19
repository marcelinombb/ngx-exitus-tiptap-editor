import { provideZonelessChangeDetection, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Alternative } from './alternative';
import { AlternativeItem } from './alternative-item';

describe('Alternative Extension', () => {
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
        Alternative.configure({ injector }),
        AlternativeItem.configure({ injector }),
      ],
      content:
        '<div data-type="alternative" class="ex-alternative-wrapper"><div class="ex-alternative-content"><div data-type="alternative-item" data-marker="A"><div class="ex-alternative-item-content"><p>Opção A</p></div></div></div></div>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('deve registrar nós alternative e alternativeItem no schema', () => {
    expect(editor.schema.nodes['alternative']).toBeDefined();
    expect(editor.schema.nodes['alternativeItem']).toBeDefined();
  });

  it('deve fazer o parse de alternative e alternativeItem do HTML', () => {
    const json = editor.getJSON();
    const alternativeNode = json.content?.find((node) => node.type === 'alternative');

    expect(alternativeNode).toBeDefined();
    expect(alternativeNode?.content?.length).toBe(1);

    const firstItem = alternativeNode?.content?.[0] as any;
    expect(firstItem?.type).toBe('alternativeItem');
    expect(firstItem?.attrs?.['data-marker']).toBe('A');
  });

  it('deve inserir bloco com 4 alternativas com insertAlternative', () => {
    editor.commands.clearContent();
    editor.commands.insertAlternative();

    const json = editor.getJSON();
    const alternativeNode = json.content?.find((node) => node.type === 'alternative');

    expect(alternativeNode).toBeDefined();
    expect(alternativeNode?.content?.length).toBe(4);
    alternativeNode?.content?.forEach((item) => {
      expect(item.type).toBe('alternativeItem');
    });
  });
});
