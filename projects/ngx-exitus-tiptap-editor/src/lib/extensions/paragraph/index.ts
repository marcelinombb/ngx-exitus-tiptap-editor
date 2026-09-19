import { Paragraph } from '@tiptap/extension-paragraph';

const normalizeEmptyIndentedParagraphs = (html: string): string => html.replace(
    /<p([^>]*)>([\s\S]*?)<\/p>/g,
    (match, attrs: string, content: string) => {
        const hasMarginLeft = /style=(['"])[^'"]*margin-left:\s*0px\s*!important[^'"]*\1/i.test(attrs);
        const hasLineBreak = /<br\s*\/?>/i.test(content);
        const normalizedContent = content.replace(/(&nbsp;|&#160;|\u00A0|\s)/gi, '');

        if (!hasMarginLeft || hasLineBreak || normalizedContent.length > 0) {
            return match;
        }

        return `<p${attrs}><br></p>`;
    },
);

export const CustomParagraph = Paragraph.extend({
    parseHTML() {
        return [
            {
                tag: 'p',
                getAttrs: (node) => {
                    if (node instanceof HTMLElement && node.querySelector('img')) {
                        return false;
                    }
                    return {};
                },
            },
        ];
    },
    onCreate({ editor }) {
        const originalGetHTML = editor.getHTML.bind(editor);

        editor.getHTML = () => normalizeEmptyIndentedParagraphs(originalGetHTML());
    },
})
