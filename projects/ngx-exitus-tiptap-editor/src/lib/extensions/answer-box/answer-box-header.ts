import { Node, mergeAttributes } from '@tiptap/core';

export const AnswerBoxHeader = Node.create({
    name: 'answerBoxHeader',

    group: 'block',

    content: 'inline*',

    defining: true,

    parseHTML() {
        return [
            {
                tag: 'div.ex-answer-box-header',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { class: 'ex-answer-box-header' }), 0];
    },
});
