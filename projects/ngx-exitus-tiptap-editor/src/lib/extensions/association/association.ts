import { Node, mergeAttributes } from '@tiptap/core';
import { AngularNodeViewRenderer } from 'ngx-tiptap';
import { Injector } from '@angular/core';
import { AssociationComponent } from './association.component';

export interface AssociationOptions {
    HTMLAttributes: Record<string, any>;
    injector?: Injector;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        association: {
            insertAssociation: () => ReturnType;
        };
    }
}

export const Association = Node.create<AssociationOptions>({
    name: 'association',

    group: 'block',
    content: 'associationColumn{2}', // Exactly 2 columns
    draggable: true,

    addOptions() {
        return {
            HTMLAttributes: {},
            injector: undefined,
        };
    },

    addAttributes() {
        return {
            colAListType: {
                default: '123',
                parseHTML: element => element.getAttribute('data-cola-type') || '123',
                renderHTML: attributes => {
                    return {
                        'data-cola-type': attributes['colAListType'],
                    };
                }
            },
            colBListType: {
                default: 'gap',
                parseHTML: element => element.getAttribute('data-colb-type') || 'gap',
                renderHTML: attributes => {
                    return {
                        'data-colb-type': attributes['colBListType'],
                    };
                }
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="association"]',
                contentElement: 'div.ex-association-content',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 'data-type': 'association', class: 'ex-association-wrapper' }),
            ['div', { class: 'ex-association-content' }, 0]
        ];
    },

    addNodeView() {
        if (!this.options.injector) {
            console.warn('AssociationExtension: Injector not provided. Angular NodeView might fail.');
        }
        return AngularNodeViewRenderer(AssociationComponent, { injector: this.options.injector! });
    },

    addCommands() {
        return {
            insertAssociation: () => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: { colAListType: '123', colBListType: 'gap' },
                    content: [
                        {
                            type: 'associationColumn',
                            attrs: { type: 'colA' },
                            content: [
                                {
                                    type: 'associationItem',
                                    content: [{ type: 'paragraph' }]
                                }
                            ]
                        },
                        {
                            type: 'associationColumn',
                            attrs: { type: 'colB' },
                            content: [
                                {
                                    type: 'associationItem',
                                    content: [{ type: 'paragraph' }]
                                }
                            ]
                        }
                    ]
                });
            },
        };
    },
});
