import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import { CustomParagraph, normalizeEmptyIndentedParagraphs } from './index';

describe('CustomParagraph & normalizeEmptyIndentedParagraphs', () => {
  describe('normalizeEmptyIndentedParagraphs', () => {
    it('should return unchanged HTML when no paragraph has margin-left: 0px !important', () => {
      const html = '<p>Normal text</p><p style="margin-left: 30px !important"></p>';
      expect(normalizeEmptyIndentedParagraphs(html)).toBe(html);
    });

    it('should insert <br> when paragraph has margin-left: 0px !important and is empty', () => {
      const html = '<p style="margin-left: 0px !important"></p>';
      expect(normalizeEmptyIndentedParagraphs(html)).toBe(
        '<p style="margin-left: 0px !important"><br></p>',
      );
    });

    it('should insert <br> when paragraph has margin-left: 0px !important and contains only spaces or &nbsp;', () => {
      const html = '<p style="margin-left: 0px !important">&nbsp; &#160;  </p>';
      expect(normalizeEmptyIndentedParagraphs(html)).toBe(
        '<p style="margin-left: 0px !important"><br></p>',
      );
    });

    it('should preserve existing <br> and not duplicate it', () => {
      const html = '<p style="margin-left: 0px !important"><br></p>';
      expect(normalizeEmptyIndentedParagraphs(html)).toBe(
        '<p style="margin-left: 0px !important"><br></p>',
      );
    });

    it('should preserve paragraphs with actual text content', () => {
      const html = '<p style="margin-left: 0px !important">Hello world</p>';
      expect(normalizeEmptyIndentedParagraphs(html)).toBe(html);
    });
  });

  describe('CustomParagraph Extension', () => {
    let editor: Editor;

    beforeEach(() => {
      editor = new Editor({
        extensions: [Document, Text, CustomParagraph],
        content: '<p>Initial text</p>',
      });
    });

    afterEach(() => {
      editor.destroy();
    });

    it('should create paragraph extension with name "paragraph"', () => {
      expect(editor.extensionManager.extensions.some((e) => e.name === 'paragraph')).toBeTrue();
      expect(editor.schema.nodes['paragraph']).toBeDefined();
    });

    it('should wrap getHTML to automatically normalize empty paragraphs with 0px margin', () => {
      editor.commands.setContent(
        '<p style="margin-left: 0px !important"></p><p>Content paragraph</p>',
      );
      const html = editor.getHTML();
      expect(html).toContain('Content paragraph');
    });

    it('should ignore p tags that contain an img tag in parseHTML', () => {
      const parseRules = (CustomParagraph.config.parseHTML as any)?.call({});
      expect(parseRules).toBeDefined();
      const pRule = parseRules?.[0];
      expect(pRule?.tag).toBe('p');

      const elWithImg = document.createElement('p');
      elWithImg.appendChild(document.createElement('img'));
      const attrsWithImg = pRule?.getAttrs?.(elWithImg);
      expect(attrsWithImg).toBeFalse();

      const normalEl = document.createElement('p');
      const attrsNormal = pRule?.getAttrs?.(normalEl);
      expect(attrsNormal).toEqual({});
    });
  });
});
