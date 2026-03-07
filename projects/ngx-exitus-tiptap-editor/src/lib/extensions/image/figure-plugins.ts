import { Plugin, PluginKey, NodeSelection } from 'prosemirror-state';

export const createFigurePlugins = (): Plugin[] => {
    return [
        new Plugin({
            key: new PluginKey('figure-drag-select'),
            props: {
                handleDOMEvents: {
                    dragstart(view, event) {
                        const target = event.target as HTMLElement;

                        if (!target || target.tagName !== 'IMG') {
                            return false;
                        }

                        const pos = view.posAtDOM(target, 0);

                        if (pos == null) {
                            return false;
                        }

                        const $pos = view.state.doc.resolve(pos);

                        // walk up to find the figure
                        for (let d = $pos.depth; d > 0; d--) {
                            const node = $pos.node(d);

                            if (node.type.name === 'figure') {
                                const figurePos = $pos.before(d);

                                const tr = view.state.tr.setSelection(
                                    NodeSelection.create(view.state.doc, figurePos),
                                );

                                view.dispatch(tr);

                                return false; // allow native drag to continue
                            }
                        }

                        return false;
                    },
                },
            },
        }),
    ];
};
