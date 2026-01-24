//@ts-nocheck
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import Configuration from '@wiris/mathtype-html-integration-devkit/src/configuration'
import Core from '@wiris/mathtype-html-integration-devkit/src/core.src'
import Image from '@wiris/mathtype-html-integration-devkit/src/image'
import IntegrationModel from '@wiris/mathtype-html-integration-devkit/src/integrationmodel'
import Latex from '@wiris/mathtype-html-integration-devkit/src/latex'
import Listeners from '@wiris/mathtype-html-integration-devkit/src/listeners'
import MathML from '@wiris/mathtype-html-integration-devkit/src/mathml'
import Parser from '@wiris/mathtype-html-integration-devkit/src/parser'
import Util from '@wiris/mathtype-html-integration-devkit/src/util'

import { ExitusEditorIntegration } from './mathtype-integration'

// Icons as strings
export const chemIcon = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 22.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 40.3 49.5" style="enable-background:new 0 0 40.3 49.5;" xml:space="preserve">
<style type="text/css">
	.st0{fill:#A4CF61;}
</style>
<path class="st0" d="M39.2,12.1c0-1.9-1.1-3.6-2.7-4.4L24.5,0.9l0,0c-0.7-0.4-1.5-0.6-2.4-0.6c-0.9,0-1.7,0.2-2.4,0.6l0,0L2.3,10.8
	l0,0C0.9,11.7,0,13.2,0,14.9h0v19.6h0c0,1.7,0.9,3.3,2.3,4.1l0,0l17.4,9.9l0,0c0.7,0.4,1.5,0.6,2.4,0.6c0.9,0,1.7-0.2,2.4-0.6l0,0
	l12.2-6.9h0c1.5-0.8,2.6-2.5,2.6-4.3c0-2.7-2.2-4.9-4.9-4.9c-0.9,0-1.8,0.3-2.5,0.7l0,0l-9.7,5.6l-12.3-7V17.8l12.3-7l9.9,5.7l0,0
	c0.7,0.4,1.5,0.6,2.4,0.6C37,17,39.2,14.8,39.2,12.1"/>
</svg>`

export const mathIcon = `<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Illustrator 22.0.1, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 300 261.7" style="enable-background:new 0 0 300 261.7;" xml:space="preserve">
<style type="text/css">
	.st0{fill:#FFFFFF;}
	.st1{fill:#EF4A5F;}
	.st2{fill:#C8202F;}
</style>
<path class="st0" d="M300,32.8c0-16.4-13.4-29.7-29.9-29.7c-2.9,0-7.2,0.8-7.2,0.8c-37.9,9.1-71.3,14-112,14c-0.3,0-0.6,0-1,0
	c-16.5,0-29.9,13.3-29.9,29.7c0,16.4,13.4,29.7,29.9,29.7l0,0c45.3,0,83.1-5.3,125.3-15.3h0C289.3,59.5,300,47.4,300,32.8"/>
<path class="st0" d="M90.2,257.7c-11.4,0-21.9-6.4-27-16.7l-60-119.9c-7.5-14.9-1.4-33.1,13.5-40.5c14.9-7.5,33.1-1.4,40.5,13.5
	l27.3,54.7L121.1,39c5.3-15.8,22.4-24.4,38.2-19.1c15.8,5.3,24.4,22.4,19.1,38.2l-59.6,179c-3.9,11.6-14.3,19.7-26.5,20.6
	C91.6,257.7,90.9,257.7,90.2,257.7"/>
<g>
	<g>
		<path class="st1" d="M90.2,257.7c-11.4,0-21.9-6.4-27-16.7l-60-119.9c-7.5-14.9-1.4-33.1,13.5-40.5c14.9-7.5,33.1-1.4,40.5,13.5
			l27.3,54.7L121.1,39c5.3-15.8,22.4-24.4,38.2-19.1c15.8,5.3,24.4,22.4,19.1,38.2l-59.6,179c-3.9,11.6-14.3,19.7-26.5,20.6
			C91.6,257.7,90.9,257.7,90.2,257.7"/>
	</g>
</g>
<g>
	<g>
		<path class="st2" d="M300,32.8c0-16.4-13.4-29.7-29.9-29.7c-2.9,0-7.2,0.8-7.2,0.8c-37.9,9.1-71.3,14-112,14c-0.3,0-0.6,0-1,0
			c-16.5,0-29.9,13.3-29.9,29.7c0,16.4,13.4,29.7,29.9,29.7l0,0c45.3,0,83.1-5.3,125.3-15.3h0C289.3,59.5,300,47.4,300,32.8"/>
	</g>
</g>
</svg>`

export interface MathTypeOptions {
    mathTypeParameters?: any
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        openMathType: (type?: string | null) => ReturnType
    }
}

export const MathTypePluginKey = new PluginKey('mathTypePlugin')

export const MathTypePlugin = Extension.create<MathTypeOptions>({
    name: 'mathTypePlugin',

    addOptions() {
        return {
            mathTypeParameters: {
                editorParameters: {
                    fontFamily: 'Arial',
                    fontStyle: 'normal',
                    fontSize: '14px',
                    fonts: [
                        {
                            id: 'inherit',
                            label: 'Arial'
                        }
                    ],
                    language: 'pt_br'
                }
            }
        }
    },

    addCommands() {
        return {
            openMathType: (type = null) => ({ editor }) => {
                const pluginState = MathTypePluginKey.getState(editor.state)
                if (pluginState) {
                    pluginState.openEditor(type)
                    return true
                }
                return false
            }
        }
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: MathTypePluginKey,
                state: {
                    init: () => {
                        return new MathTypeIntegrationManager(this.editor, this.options.mathTypeParameters)
                    },
                    apply: (tr, value) => {
                        return value
                    }
                },
                view: (view) => {
                    const pluginState = MathTypePluginKey.getState(view.state)
                    if (pluginState) {
                        pluginState.init()
                    }
                    return {
                        destroy: () => {
                            if (pluginState) {
                                pluginState.destroy()
                            }
                        }
                    }
                },
                props: {
                    handleDOMEvents: {
                        dblclick: (view, event) => {
                            const pluginState = MathTypePluginKey.getState(view.state)
                            if (pluginState && pluginState.integration) {
                                pluginState.integration.doubleClickHandler(event.target as HTMLElement, event)
                            }
                            return false
                        }
                    }
                }
            })
        ]
    }
})

class MathTypeIntegrationManager {
    integration: ExitusEditorIntegration | undefined
    private editor: any
    private config: any

    constructor(editor: any, config: any) {
        this.editor = editor
        this.config = config
    }

    init() {
        this.createMathTypeIntegration()
    }

    openEditor(editorType: string | null = null) {
        try {
            const integration = this.integration
            if (!integration) return

            if (editorType == null) {
                integration.core.getCustomEditors().disable()
            } else {
                integration.core.getCustomEditors().enable(editorType)
            }

            integration.core.editionProperties.dbclick = false

            // Check for selected formula in Tiptap
            const { state, view } = this.editor
            const { selection } = state
            let image = null

            if (selection.isNodeSelection) {
                const node = selection.node
                if (node.type.name === 'mathtype') {
                    // We need the DOM element for the integration
                    const domNode = view.nodeDOM(selection.from)
                    if (domNode) {
                        // The nodeDOM might be the wrapper span. We need the img.
                        image = (domNode as HTMLElement).querySelector('img.Wirisformula') || domNode
                    }
                }
            }

            // Also check if the cursor is near/on a formula in DOM (double click handling calls this implicitly sometimes?)
            // But openEditor is manually called via button.
            // If selection is text selection but perhaps wrapping the formula?

            // In Wiris logic, 'temporalImage' being set triggers 'openExisting'.
            // Simple approach: trust selection.

            if (image && (image as HTMLElement).classList.contains('Wirisformula')) {
                integration.core.editionProperties.temporalImage = image
                integration.openExistingFormulaEditor()
            } else {
                integration.openNewFormulaEditor()
            }
        } catch (e) {
            console.error(e)
        }
    }

    createMathTypeIntegration() {
        try {
            if (this.integration !== undefined) return

            this.integration = this.addIntegration(this.config)

            window.WirisPlugin = {
                Core,
                Parser,
                Image,
                MathML,
                Util,
                Configuration,
                Listeners,
                IntegrationModel,
                currentInstance: this.integration,
                Latex
            }
        } catch (e) {
            console.error(e)
        }
    }

    addIntegration(integrationParameters: any) {
        const integrationProperties: any = {}
        integrationProperties.environment = {}
        integrationProperties.environment.editor = 'ExitusEditor'
        integrationProperties.environment.editorVersion = '1.x'
        integrationProperties.version = '1.0.0'
        integrationProperties.editorObject = this.editor
        integrationProperties.serviceProviderProperties = {}
        integrationProperties.serviceProviderProperties.URI = 'https://www.wiris.net/demo/plugins/app'
        integrationProperties.serviceProviderProperties.server = 'java'
        integrationProperties.target = this.editor.view.dom.parentElement
        integrationProperties.scriptName = 'bundle.js'
        integrationProperties.managesLanguage = true
        integrationProperties.integrationParameters = integrationParameters

        let integration: ExitusEditorIntegration
        if (integrationProperties.target) {
            integration = new ExitusEditorIntegration(integrationProperties)
            integration.init()
            integration.listeners.fire('onTargetReady', {})
            integration.checkElement()
        }

        // @ts-ignore
        return integration
    }

    destroy(): void {
        this.integration?.destroy()
        this.integration = undefined
    }
}
