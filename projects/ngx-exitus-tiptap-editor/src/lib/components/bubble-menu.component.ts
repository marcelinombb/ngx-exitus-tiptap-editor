import { Component, ElementRef, input, viewChild } from '@angular/core';
import { type BubbleMenuPluginProps, BubbleMenuPlugin } from '@tiptap/extension-bubble-menu';
import { Editor } from '@tiptap/core';

@Component({
    standalone: true,
    imports: [],
    selector: 'bubble-menu',
    template: `
    <div #menu class="bubble-menu">
        <ng-content></ng-content>
    </div>
    `,
    styles: `
        .bubble-menu {
            width: max-content;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 10;
        }
        .bubble-menu { display:block; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; width:280px; background: #ffffff; padding:12px; border-radius:12px; box-shadow: 0 8px 24px rgba(20,27,33,0.10); border: 1px solid rgba(16,24,40,0.04) }
    `,
})
export class BubbleMenuComponent {

    editor = input.required<Editor>();
    pluginKey = input<string>('bubbleMenu');
    updateDelay = input<number>();
    resizeDelay = input<number>();
    appendTo = input<HTMLElement>();
    shouldShow = input<BubbleMenuPluginProps['shouldShow']>();
    getReferencedVirtualElement = input<any>();
    options = input<BubbleMenuPluginProps['options']>();

    private menu = viewChild.required<ElementRef>('menu');
    private createdPluginKey: string | null = null;

    ngOnInit() {
        const pluginEditor = this.editor();

        if (!pluginEditor ||pluginEditor.isDestroyed) {
            console.warn('BubbleMenu component is not rendered inside of an editor component or does not have editor prop.');
            return;
        }

        const bubbleMenuElement = this.menu().nativeElement as HTMLElement;
        bubbleMenuElement.style.visibility = 'hidden';
        bubbleMenuElement.style.position = 'absolute';

        // Append to provided container or document.body
        const parent = this.appendTo?.() ?? document.body;
        parent.appendChild(bubbleMenuElement);

        const bubbleProps: Omit<BubbleMenuPluginProps, 'editor' | 'element'> = {
            updateDelay: this.updateDelay?.(),
            resizeDelay: this.resizeDelay?.(),
            appendTo: this.appendTo?.(),
            pluginKey: this.pluginKey?.(),
            shouldShow: this.shouldShow?.(),
            getReferencedVirtualElement: this.getReferencedVirtualElement?.(),
            options: this.options?.(),
        } as any;

        const plugin = BubbleMenuPlugin({
            ...bubbleProps,
            editor: pluginEditor,
            element: bubbleMenuElement,
        });

        pluginEditor.registerPlugin(plugin);

        const key = bubbleProps.pluginKey ?? this.pluginKey();
        this.createdPluginKey = typeof key === 'string' ? key : null;
    }

    ngOnDestroy() {
        const pluginEditor = this.editor?.();
        if (pluginEditor && !pluginEditor.isDestroyed) {
            if (this.createdPluginKey) {
                pluginEditor.unregisterPlugin(this.createdPluginKey);
            } else {
                pluginEditor.unregisterPlugin(this.pluginKey());
            }
        }

        const bubbleMenuElement = this.menu().nativeElement as HTMLElement;
        if (bubbleMenuElement.parentNode) {
            bubbleMenuElement.parentNode.removeChild(bubbleMenuElement);
        }
    }
}
