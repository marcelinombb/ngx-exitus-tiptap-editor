import { Node, mergeAttributes } from '@tiptap/core';
import { AngularNodeViewRenderer } from 'ngx-tiptap';
import { Injector } from '@angular/core';
import { AlternativeItemComponent } from './alternative-item.component';

export interface AlternativeItemOptions {
    HTMLAttributes: Record<string, any>;
    injector?: Injector;
}

export const AlternativeItem = Node.create<AlternativeItemOptions>({
    name: 'alternativeItem',

    group: 'block',
    content: 'paragraph block*',
    defining: true,

    addOptions() {
        return {
            HTMLAttributes: {},
            injector: undefined,
        };
    },

    addAttributes() {
        return {
            'data-marker': {
                default: '',
                parseHTML: element => element.getAttribute('data-marker'),
                renderHTML: attributes => {
                    return {
                        'data-marker': attributes['data-marker'],
                    };
                }
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="alternative-item"]',
                contentElement: 'div.ex-alternative-item-content',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const markerLabel = HTMLAttributes['data-marker'] || '';

        return [
            'div', mergeAttributes(HTMLAttributes, { 'data-type': 'alternative-item', class: 'ex-alternative-item' }),
            ['div', { class: 'ex-alternative-item-marker' }, markerLabel],
            ['div', { class: 'ex-alternative-item-content' }, 0]
        ];
    },

    addKeyboardShortcuts() {
        return {
            Enter: () => this.editor.commands.splitListItem(this.name),
            'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
        }
    },

    addNodeView() {
        if (!this.options.injector) {
            console.warn('AlternativeItemExtension: Injector not provided.');
        }
        return AngularNodeViewRenderer(AlternativeItemComponent, { injector: this.options.injector! });
    },
});
