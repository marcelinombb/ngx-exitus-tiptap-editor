# ngx-exitus-tiptap-editor

> A powerful, feature-rich Tiptap-based Rich Text Editor for Angular 18+, specifically designed for educational and technical content.

[![NPM Version](https://img.shields.io/npm/v/ngx-exitus-tiptap-editor?style=flat-square)](https://www.npmjs.com/package/ngx-exitus-tiptap-editor)
[![Angular Version](https://img.shields.io/badge/angular-%23DD0031.svg?style=flat-square&logo=angular&logoColor=white)](https://angular.dev/)
[![Tiptap Version](https://img.shields.io/badge/tiptap-%2324292e.svg?style=flat-square&logo=tiptap&logoColor=white)](https://tiptap.dev/)

## ✨ Features

- 📐 **Scientific Formula Support**: Full [KaTeX](https://katex.org/) and [MathType](https://www.wiris.com/mathtype/) integration.
- 🖼️ **Advanced Image Handling**: Responsive images with figures, captions, alignment, and resizing handles.
- 🛠️ **Custom Extensions**: 
  - **Indent**: Control line indentation.
  - **Tab**: Custom tab key behavior.
  - **ColarQuestao**: Specialized tool for pasting educational questions.
- 🎨 **Modern UI**: Clean toolbar and floating menus for formula and image editing.
- ⚡ **Angular 18+ Ready**: Built with the latest Angular features (signals, inputs/outputs).

## 🚀 Installation

To install the library, run:

```bash
npm install ngx-exitus-tiptap-editor
```

### Peer Dependencies
This library depends on several Tiptap packages and KaTeX. Ensure you have them installed in your project:

```bash
npm install @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extension-subscript @tiptap/extension-superscript @tiptap/extension-text-align @tiptap/extension-bubble-menu katex
```

## ⚙️ Configuration

### WASM Assets Setup (Required)

To use the **MathType** and **Advanced Image** features properly, you **must** configure your Angular application to serve the WebAssembly files. Update your `angular.json` by adding the following to the `assets` array (in both `build` and `test` targets):

```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  {
    "glob": "**/*.wasm",
    "input": "node_modules/ngx-exitus-tiptap-editor/assets/telemeter-wasm",
    "output": "assets/mathtype/"
  },
  {
    "glob": "**/*.wasm",
    "input": "node_modules/ngx-exitus-tiptap-editor/assets/image-to-base64-wasm",
    "output": "assets/image-to-base64-wasm/"
  }
]
```

> [!IMPORTANT]
> If this configuration is missing, you will encounter `404 (Not Found)` errors for the WebAssembly files when using formulas or images.

## 📦 Usage

### 1. Import the Component
In your component file:

```typescript
import { ExitusTiptapEditor } from 'ngx-exitus-tiptap-editor';

@Component({
  standalone: true,
  imports: [ExitusTiptapEditor],
  // ...
})
export class MyAppComponent {
  editorContent = '<p>Initial content with <b>formatting</b></p>';

  handleContentChange(html: string) {
    console.log('New content:', html);
  }
}
```

### 2. Use in Template

```html
<exitus-tiptap-editor 
  [content]="editorContent" 
  (onContentChange)="handleContentChange($event)">
</exitus-tiptap-editor>
```

---

## 🛠️ API Reference

### Inputs
| Input | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `content` | `string` | `""` | The initial HTML content of the editor. |

### Outputs
| Output | Type | Description |
| :--- | :--- | :--- |
| `onContentChange` | `EventEmitter<string>` | Emits the HTML content whenever the editor is updated. |

---

## 🧪 Extensions Detail

### 📐 Math & Science
- **KaTeX**: Write LaTeX formulas directly. Includes a floating menu for quick editing.
- **MathType**: Advanced formula editor integration via Wiris.

### 🖼️ Image Management
The editor uses a custom `Figure` extension that wraps images in a `<figure>` tag with support for:
- `<figcaption>` for image descriptions.
- Resizing handles (300px to 700px).
- Alignment options (left, center, right).
- Fullscreen/Wide modes.

### 📝 Productivity
- **Indent/Outdent**: Standard shortcut and toolbar support.
- **Tab Handling**: Consistent tab behavior within the editor.
- **Colar Questão**: specialized logic for pasting data into educational templates.

---

## 🛠 Development

### Setup
Run `npm install` to install dependencies.

### Development Server
Run `npm run dev` to start a development server for both the library and the test application. This command uses `concurrently` to watch for library changes and serve the app.

### Building
Run `npm run build:lib` to build the library. The build artifacts will be stored in the `dist/ngx-exitus-tiptap-editor` directory.

---

## 📜 License
MIT
