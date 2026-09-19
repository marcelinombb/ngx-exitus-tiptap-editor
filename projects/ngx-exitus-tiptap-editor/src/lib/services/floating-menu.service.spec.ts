import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { FloatingMenuService } from './floating-menu.service';

describe('FloatingMenuService', () => {
  let service: FloatingMenuService;
  let editor: Editor;

  beforeEach(() => {
    service = new FloatingMenuService();

    editor = new Editor({
      extensions: [Document, Paragraph, Text],
      content: '<p>Paragraph text</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return false if target node name is not active in the editor', () => {
    service.registerMenu('table');
    const isActive = service.isMostSpecificNodeActive(editor, 'table');
    expect(isActive).toBeFalse();
  });

  it('should return true when target node is active in the editor', () => {
    service.registerMenu('paragraph');
    editor.commands.setTextSelection(2);
    const isActive = service.isMostSpecificNodeActive(editor, 'paragraph');
    expect(isActive).toBeTrue();
  });

  it('should support array of target names', () => {
    service.registerMenu('paragraph');
    editor.commands.setTextSelection(2);
    const isActive = service.isMostSpecificNodeActive(editor, ['heading', 'paragraph']);
    expect(isActive).toBeTrue();
  });
});
