import { provideZonelessChangeDetection, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Association } from './association';
import { AssociationColumn } from './association-column';
import { AssociationItem } from './association-item';

describe('Association Extension', () => {
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
        Association.configure({ injector }),
        AssociationColumn.configure({ injector }),
        AssociationItem.configure({ injector }),
      ],
      content:
        '<div data-type="association" data-cola-type="123" data-colb-type="abc" class="ex-association-wrapper"><div class="ex-association-content"><div data-type="association-column" data-col-type="colA" class="ex-association-col-wrapper"><div class="ex-association-col-content"><div data-type="association-item" class="ex-association-item"><div class="ex-association-item-content"><p>Item 1</p></div></div></div></div><div data-type="association-column" data-col-type="colB" class="ex-association-col-wrapper"><div class="ex-association-col-content"><div data-type="association-item" class="ex-association-item"><div class="ex-association-item-content"><p>Item 2</p></div></div></div></div></div></div>',
    });
  });

  afterEach(() => {
    editor?.destroy();
  });

  it('deve registrar nós de associação no schema', () => {
    expect(editor.schema.nodes['association']).toBeDefined();
    expect(editor.schema.nodes['associationColumn']).toBeDefined();
    expect(editor.schema.nodes['associationItem']).toBeDefined();
  });

  it('deve fazer o parse de association com duas colunas', () => {
    const json = editor.getJSON();
    const associationNode = json.content?.find((node) => node.type === 'association');

    expect(associationNode).toBeDefined();
    expect(associationNode?.attrs?.['colAListType']).toBe('123');
    expect(associationNode?.attrs?.['colBListType']).toBe('abc');
    expect(associationNode?.content?.length).toBe(2);
  });

  it('deve inserir estrutura completa com insertAssociation', () => {
    editor.commands.clearContent();
    editor.commands.insertAssociation();

    const json = editor.getJSON();
    const associationNode = json.content?.find((node) => node.type === 'association');

    expect(associationNode).toBeDefined();
    expect(associationNode?.content?.length).toBe(2); // 2 colunas
    expect(associationNode?.content?.[0].type).toBe('associationColumn');
    expect(associationNode?.content?.[1].type).toBe('associationColumn');
  });
});
