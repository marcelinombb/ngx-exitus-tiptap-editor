/* eslint-disable camelcase */
//@ts-nocheck
import { type Editor } from '@tiptap/core'
import Configuration from '@wiris/mathtype-html-integration-devkit/src/configuration'
import IntegrationModel, { type IntegrationModelProperties } from '@wiris/mathtype-html-integration-devkit/src/integrationmodel'
import MathML from '@wiris/mathtype-html-integration-devkit/src/mathml'
import Parser from '@wiris/mathtype-html-integration-devkit/src/parser'
import Telemeter from '@wiris/mathtype-html-integration-devkit/src/telemeter'
import Util from '@wiris/mathtype-html-integration-devkit/src/util'
import Latex from '@wiris/mathtype-html-integration-devkit/src/latex'

export class ExitusEditorIntegration extends IntegrationModel {
    integrationFolderName: string
    editor: Editor

    constructor(integrationModelProperties: IntegrationModelProperties) {
        const editor = integrationModelProperties.editorObject as Editor
        const options = integrationModelProperties.integrationParameters

        if (typeof options !== 'undefined') {
            integrationModelProperties.integrationParameters = options
        }

        super(integrationModelProperties)
        this.editor = editor
        this.integrationFolderName = 'exitus_wiris'
    }

    // Override init to pre-initialize Telemeter with correct URL
    init() {
        // Manually Init Telemeter to avoid 404 on WASM file
        try {
            const os = this.getOS()
            const browser = this.getBrowser()
            const domain = window.location.hostname

            const hosts = [
                {
                    nam: browser.detectedBrowser,
                    fam: 'browser',
                    ver: browser.versionBrowser
                },
                {
                    nam: 'exituseditor',
                    fam: 'html-editor',
                    ver: '1.0'
                },
                {
                    nam: os.detectedOS,
                    fam: 'os',
                    ver: os.versionOS
                },
                {
                    nam: domain,
                    fam: 'domain'
                }
            ]

            Telemeter.init({
                solution: {
                    name: 'MathType for ExitusEditor',
                    version: '1.0.0'
                },
                hosts: hosts,
                config: {
                    test: false,
                    debug: false,
                    dry_run: false,
                    api_key: 'eda2ce9b-0e8a-46f2-acdd-c228a615314e'
                },
                url: 'telemeter_wasm_bg.wasm' // Explicitly set root URL
            })
        } catch (e) {
            console.error('Failed to pre-init Telemeter', e)
        }

        super.init()
    }

    getLanguage() {
        // Try to get editorParameters.language, fail silently otherwise
        try {
            if (this.editorParameters && this.editorParameters.language) {
                return this.editorParameters.language
            }
        } catch (e) { }

        return super.getLanguage()
    }

    addEditorListeners() {
        // In Tiptap we handle listeners via the Plugin system in MathTypePlugin.ts
        // But we still need to check element readiness if needed
        this.checkElement()
    }

    checkElement() {
        const newElement = this.editor.view.dom.parentElement
        // If the element wasn't treated, add the events.
        if (newElement && !newElement.wirisActive) {
            this.setTarget(newElement)
            this.addEvents()
            // Set the element as treated
            newElement.wirisActive = true
        }
    }

    /**
     * @inheritdoc
     * @param {HTMLElement} element - HTMLElement target.
     * @param {MouseEvent} event - event which trigger the handler.
     */
    doubleClickHandler(element: HTMLElement, event: MouseEvent) {
        this.core.editionProperties.dbclick = true

        if (this.editor.isEditable) {
            if (element.nodeName.toLowerCase() === 'img') {
                if (Util.containsClass(element, Configuration.get('imageClassName'))) {
                    // Stop propagation to prevent other handlers
                    if (typeof event.stopPropagation !== 'undefined') {
                        event.stopPropagation()
                    } else {
                        event.returnValue = false
                    }

                    this.core.getCustomEditors().disable()

                    const customEditorAttr = element.getAttribute(Configuration.get('imageCustomEditorName'))
                    if (customEditorAttr) {
                        this.core.getCustomEditors().enable(customEditorAttr)
                    }

                    this.core.editionProperties.temporalImage = element
                    this.openExistingFormulaEditor()
                }
            }
        }
    }

    openNewFormulaEditor() {
        // Store the editor selection as it will be lost upon opening the modal
        this.core.editionProperties.selection = this.editor.state.selection
        return super.openNewFormulaEditor()
    }

    /**
     * Replaces old formula with new MathML or inserts it in caret position if new
     */
    insertMathml(mathml: string): HTMLElement | null {
        const { state, view } = this.editor
        const core = this.getCore()

        // We create a simpler return object for now, Tiptap handles the DOM creation
        const modelElementNew = document.createElement('mathml')
        modelElementNew.setAttribute('formula', mathml)

        if (core.editionProperties.isNewElement) {
            // Don't bother inserting anything at all if the MathML is empty.
            if (!mathml) return null

            const selection = this.core.editionProperties.selection || state.selection
            const from = selection.from
            const to = selection.to

            const formulaImg = this.createViewImage(mathml)

            // Insert the content
            this.editor.chain()
                .focus()
                .insertContentAt({ from, to }, formulaImg)
                .run()

        } else {
            // Updating existing element
            const temporalImage = core.editionProperties.temporalImage
            if (temporalImage) {
                // Try to find the position of the node in the document
                let pos = -1
                const widgetWrapper = temporalImage.closest('.tiptap-widget')
                if (widgetWrapper) {
                    pos = this.editor.view.posAtDOM(widgetWrapper, -1)
                }

                // If we didn't find the wrapper, try the image itself
                if (pos === -1) {
                    pos = this.editor.view.posAtDOM(temporalImage, 0)
                }

                if (pos > -1) {
                    const node = this.editor.state.doc.nodeAt(pos)
                    if (node && node.type.name === 'mathtype') {
                        const from = pos
                        const to = pos + node.nodeSize

                        const formulaImg = this.createViewImage(mathml)

                        // Replace the existing node
                        this.editor.chain()
                            .focus()
                            .insertContentAt({ from, to }, formulaImg)
                            .run()
                    }
                }
            } else if (mathml) {
                // Fallback if temporalImage is lost but we have mathml? 
                const formulaImg = this.createViewImage(mathml)
                this.editor.chain().focus().insertContent(formulaImg).run()
            }
        }

        return modelElementNew
    }

    insertFormula(_focusElement: HTMLElement, windowTarget: Window, mathml: string, _wirisProperties: object) {
        const returnObject: any = {}
        let mathmlOrigin

        if (!mathml) {
            this.insertMathml('')
        } else if (this.core.editMode === 'latex') {
            // Handle LaTeX input
            const latex = Latex.getLatexFromMathML(mathml)
            this.editor.chain().focus().insertContent(`$$${latex}$$`).run()
        } else {
            mathmlOrigin = this.core.editionProperties.temporalImage?.dataset.mathml

            try {
                returnObject.node = this.insertMathml(mathml)
            } catch (e) {
                const x = e.toString()
                if (x.includes("Cannot read property 'parent' of undefined")) {
                    this.core.modalDialog.cancelAction()
                }
                console.error(e)
            }
        }

        // Telemetry
        const payload: any = {
            mathml_origin: mathmlOrigin ? MathML.safeXmlDecode(mathmlOrigin) : mathmlOrigin,
            mathml: mathml ? MathML.safeXmlDecode(mathml) : mathml,
            elapsed_time: Date.now() - this.core.editionProperties.editionStartTime,
            editor_origin: null,
            toolbar: this.core.modalDialog.contentManager.toolbar,
            size: mathml?.length
        }

        Object.keys(payload).forEach(key => {
            if (key === 'mathml_origin' || key === 'editor_origin') !payload[key] ? delete payload[key] : {}
        })

        try {
            //@ts-ignore
            Telemeter.telemeter.track('INSERTED_FORMULA', {
                ...payload
            })
        } catch (err) {
            console.error(err)
        }

        //@ts-ignore
        this.core.editionProperties.temporalImage = null
        return returnObject
    }

    createViewImage(formula: string): string {
        const imageFormula = Parser.initParse(formula, this.getLanguage())
        return imageFormula
    }

    callbackFunction() {
        super.callbackFunction()
        this.addEditorListeners()
    }

    notifyWindowClosed() {
        this.editor.commands.focus()
    }
}
