import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Tab } from './tab';

describe('Tab Extension (teclatab)', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, Tab],
      content: '<p>Hello world</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('should be registered with name "teclatab" in schema', () => {
    expect(editor.schema.nodes['teclatab']).toBeDefined();
  });

  it('should have inline, atom, and non-selectable configuration', () => {
    expect(Tab.config.inline).toBeTrue();
    expect(Tab.config.atom).toBeTrue();
    expect(Tab.config.selectable).toBeFalse();
    expect(Tab.config.group).toBe('inline');
  });

  it('should parse HTML with class ex-tab and tabIndent', () => {
    const parseRules = (Tab.config.parseHTML as any)?.call({});
    expect(parseRules).toBeDefined();
    expect(parseRules?.[0]?.tag).toBe('span.ex-tab, span.tabIndent');
    expect(parseRules?.[0]?.priority).toBe(9999);
  });

  it('should render HTML with class ex-tab and proper inline styles', () => {
    const render = (Tab.config.renderHTML as any)?.call(
      {},
      {
        node: {} as any,
        HTMLAttributes: {},
      },
    );
    expect(render).toBeDefined();
    expect(render?.[0]).toBe('span');
    expect(render?.[1]?.class).toBe('ex-tab');
    expect(render?.[1]?.style).toContain('display: inline-block');
    expect(render?.[1]?.style).toContain('width: 4ch');
  });

  it('should insert a teclatab node when tabIndent command is executed', () => {
    editor.commands.setTextSelection(1);
    const result = editor.commands.tabIndent();
    expect(result).toBeTrue();

    const json = editor.getJSON();
    const paragraph = json.content?.[0];
    const hasTab = paragraph?.content?.some((node) => node.type === 'teclatab');
    expect(hasTab).toBeTrue();
  });

  it('should return true on tabOutdent', () => {
    expect(editor.commands.tabOutdent()).toBeTrue();
  });

  it('should delete preceding teclatab on Shift-Tab', () => {
    editor.commands.setTextSelection(1);
    editor.commands.tabIndent();

    const shortcuts = Tab.config.addKeyboardShortcuts?.call({ editor } as any);
    expect(shortcuts?.['Shift-Tab']).toBeDefined();

    const handled = shortcuts?.['Shift-Tab']?.({} as any);
    expect(handled).toBeTrue();

    const json = editor.getJSON();
    const paragraph = json.content?.[0];
    const hasTab = paragraph?.content?.some((node) => node.type === 'teclatab');
    expect(hasTab).toBeFalse();
  });
});
