import { type Editor, Node, nodeInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

import { ImageView } from './imageView';

// ─────────────────────────────────────────────────────────────
// PROXY URL ABSTRACTION
// ─────────────────────────────────────────────────────────────

/**
 * Função que recebe a URL original da imagem e retorna a URL
 * final a ser requisitada ao proxy.
 *
 * @example
 * // Padrão customizado:
 * const myBuilder: ImageProxyUrlBuilder = (src) =>
 *   `https://meu-proxy.com/fetch?source=${encodeURIComponent(src)}`;
 */
export type ImageProxyUrlBuilder = (src: string) => string;

/**
 * Builders prontos para os padrões mais comuns de proxy.
 * Nenhum padrão é obrigatório — o integrador pode usar qualquer um
 * ou implementar o próprio {@link ImageProxyUrlBuilder}.
 */
export const ImageProxyBuilders = {
  /**
   * **Query parameter** (padrão retrocompatível com a versão anterior).
   *
   * `GET <base>?<param>=<encoded-src>`
   *
   * @param base   URL base do proxy, ex.: `https://proxy.example.com/img`
   * @param param  Nome do query param (default: `imgurl`)
   *
   * @example
   * ImageProxyBuilders.queryParam('https://proxy.example.com/img')
   * // https://proxy.example.com/img?imgurl=https%3A%2F%2F...
   *
   * ImageProxyBuilders.queryParam('https://proxy.example.com/img', 'url')
   * // https://proxy.example.com/img?url=https%3A%2F%2F...
   */
  queryParam:
    (base: string, param = 'imgurl'): ImageProxyUrlBuilder =>
      (src) =>
        `${base}?${param}=${encodeURIComponent(src)}`,

  /**
   * **Path encoded** — a URL da imagem é embutida no path.
   *
   * `GET <base>/<encoded-src>`
   *
   * @param base  URL base do proxy, ex.: `https://proxy.example.com/img`
   *
   * @example
   * ImageProxyBuilders.pathEncoded('https://proxy.example.com/img')
   * // https://proxy.example.com/img/https%3A%2F%2F...
   */
  pathEncoded:
    (base: string): ImageProxyUrlBuilder =>
      (src) =>
        `${base}/${encodeURIComponent(src)}`,

  /**
   * **POST body** — a URL da imagem é enviada no corpo da requisição.
   *
   * `POST <base>` com body `{ "url": "<src>" }`.
   *
   * **Nota:** este builder retorna a `base` e a lógica de POST é
   * tratada em {@link ImageView.convertUrlToBase64} quando detecta
   * que o builder foi criado com este helper.
   *
   * @param base  Endpoint do proxy, ex.: `https://proxy.example.com/img`
   *
   * @example
   * ImageProxyBuilders.postBody('https://proxy.example.com/img')
   */
  postBody:
    (base: string): ImageProxyUrlBuilder =>
      (_src) =>
        `__POST__${base}`,
} as const;

/** @internal Token que identifica um builder do tipo POST */
export const POST_BODY_TOKEN = '__POST__';

// ─────────────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────────────

export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
  /**
   * Endereço ou função que define como a URL da imagem externa é
   * transformada em uma requisição ao proxy de conversão base64.
   *
   * - `string` → retrocompatível; usa `?imgurl=<encoded>` automaticamente.
   * - `ImageProxyUrlBuilder` → total controle sobre o formato da URL.
   *
   * @see {@link ImageProxyBuilders} para helpers prontos.
   */
  proxyUrl?: string | ImageProxyUrlBuilder;
}

// ─────────────────────────────────────────────────────────────
// BASE64 UTILS (upload local de arquivo)
// ─────────────────────────────────────────────────────────────

export function convertToBase64(
  img: HTMLImageElement,
  callback: (base64Url: string, width: number) => void,
) {
  return function () {
    const maxHeight = Math.min(img.height, 700);
    const maxWidth = Math.min(img.width, 700);
    const newDimension =
      img.width > img.height
        ? { width: maxWidth, height: Math.round(maxWidth / (img.width / img.height)) }
        : { width: maxHeight * (img.width / img.height), height: maxHeight };

    const canvas = document.createElement('canvas');
    canvas.width = newDimension.width;
    canvas.height = newDimension.height;

    const ctx = canvas.getContext('2d');
    ctx!.fillStyle = '#FFFFFF';
    ctx?.fillRect(0, 0, canvas.width, canvas.height);
    ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    callback(dataUrl, canvas.width);
  };
}

export function parseImagesToBase64(img: File, editor: Editor) {
  if (img) {
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = document.createElement('img');
      img.onload = convertToBase64(img, (base64Url: string) => {
        editor.chain().focus().setImage({ src: base64Url }).run();
      });

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(img);
  }
}

// ─────────────────────────────────────────────────────────────
// COMMANDS
// ─────────────────────────────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: { src: string; alt?: string; title?: string }) => ReturnType;
    };
  }
}

export const inputRegex = /(?:^|\s)(!\[(.+|:?)](\((\S+)(?:(?:\s+)["'](\S+)["'])?\)))$/;

// ─────────────────────────────────────────────────────────────
// EXTENSION
// ─────────────────────────────────────────────────────────────

export const Image = Node.create<ImageOptions>({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      proxyUrl: undefined,
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      classes: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src } = HTMLAttributes;
    return ['img', { src, style: 'display: table-cell', draggable: false }];
  },

  addCommands() {
    return {
      setImage:
        (options) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: options,
            });
          },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, , alt, , src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      return new ImageView(node, editor, getPos, this.options.proxyUrl);
    };
  },

  addProseMirrorPlugins() {
    const self = this;
    return [
      new Plugin({
        key: new PluginKey('imageEventHandler'),
        props: {
          handleDOMEvents: {
            drop: (_view, event) => {
              const hasFiles =
                event.dataTransfer?.files?.length;

              if (hasFiles) {
                const images = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
                  /image/i.test(file.type),
                );

                if (images.length === 0) return false;

                images.forEach((image) => parseImagesToBase64(image, self.editor));
                event.preventDefault();
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
