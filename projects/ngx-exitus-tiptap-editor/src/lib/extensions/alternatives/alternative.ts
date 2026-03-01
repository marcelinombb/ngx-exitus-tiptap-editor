import { Node, mergeAttributes } from '@tiptap/core';
import { AngularNodeViewRenderer } from 'ngx-tiptap';
import { Injector } from '@angular/core';
import { AlternativeComponent } from './alternative.component';

export interface AlternativeOptions {
    HTMLAttributes: Record<string, any>;
    injector?: Injector;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        alternative: {
            insertAlternative: () => ReturnType;
        };
    }
}

export const Alternative = Node.create<AlternativeOptions>({
    name: 'alternative',

    group: 'block',
    content: 'alternativeItem+',
    defining: true,
    isolating: true,
    draggable: true,

    addOptions() {
        return {
            HTMLAttributes: {},
            injector: undefined,
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="alternative"]',
                contentElement: 'div.ex-alternative-content',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'alternative', class: 'ex-alternative-wrapper' }),
            ['div', { class: 'ex-alternative-content' }, 0]
        ];
    },

    addNodeView() {
        if (!this.options.injector) {
            console.warn('AlternativeExtension: Injector not provided. Angular NodeView might fail.');
        }
        return AngularNodeViewRenderer(AlternativeComponent, { injector: this.options.injector! });
    },

    addCommands() {
        return {
            insertAlternative: () => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    content: [
                        {
                            type: 'alternativeItem',
                            content: [{ type: 'paragraph' }]
                        },
                        {
                            type: 'alternativeItem',
                            content: [{ type: 'paragraph' }]
                        },
                        {
                            type: 'alternativeItem',
                            content: [{ type: 'paragraph' }]
                        },
                        {
                            type: 'alternativeItem',
                            content: [{ type: 'paragraph' }]
                        }
                    ]
                });
            },
        };
    },
});
