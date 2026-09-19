import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import {
  clamp,
  Indent,
  isBulletListNode,
  isListNode,
  isOrderedListNode,
  isTodoListNode,
} from './indent';

describe('Indent Extension', () => {
  describe('Utility functions', () => {
    it('clamp should constrain value within [min, max]', () => {
      expect(clamp(-10, 0, 270)).toBe(0);
      expect(clamp(100, 0, 270)).toBe(100);
      expect(clamp(300, 0, 270)).toBe(270);
    });

    it('list node checkers should correctly identify list nodes', () => {
      const mockBullet = { type: { name: 'bullet_list' } } as any;
      const mockOrdered = { type: { name: 'order_list' } } as any;
      const mockTodo = { type: { name: 'todo_list' } } as any;
      const mockParagraph = { type: { name: 'paragraph' } } as any;

      expect(isBulletListNode(mockBullet)).toBeTrue();
      expect(isBulletListNode(mockParagraph)).toBeFalse();

      expect(isOrderedListNode(mockOrdered)).toBeTrue();
      expect(isOrderedListNode(mockParagraph)).toBeFalse();

      expect(isTodoListNode(mockTodo)).toBeTrue();
      expect(isTodoListNode(mockParagraph)).toBeFalse();

      expect(isListNode(mockBullet)).toBeTrue();
      expect(isListNode(mockOrdered)).toBeTrue();
      expect(isListNode(mockTodo)).toBeTrue();
      expect(isListNode(mockParagraph)).toBeFalse();
    });
  });

  describe('Extension attributes and commands', () => {
    let editor: Editor;

    beforeEach(() => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Indent],
        content: '<p>Line of text</p>',
      });
    });

    afterEach(() => {
      editor.destroy();
    });

    it('should configure indent extension on paragraph', () => {
      const ext = editor.extensionManager.extensions.find((e) => e.name === 'indent');
      expect(ext).toBeDefined();
    });

    it('should indent paragraph by 30px when indent command is called', () => {
      editor.commands.setTextSelection(1);
      const changed = editor.commands.indent();
      expect(changed).toBeTrue();

      const html = editor.getHTML();
      expect(html).toMatch(/margin-left:\s*30px\s*!important/);
    });

    it('should outdent paragraph back to 0px when outdent command is called', () => {
      editor.commands.setTextSelection(1);
      editor.commands.indent();
      editor.commands.indent(); // 60px

      let html = editor.getHTML();
      expect(html).toMatch(/margin-left:\s*60px\s*!important/);

      const outdented = editor.commands.outdent();
      expect(outdented).toBeTrue();

      html = editor.getHTML();
      expect(html).toMatch(/margin-left:\s*30px\s*!important/);
    });

    it('should not allow outdent below min level (0px)', () => {
      editor.commands.setTextSelection(1);
      // Already at 0px indent
      const outdented = editor.commands.outdent();
      expect(outdented).toBeFalse();
    });
  });
});
