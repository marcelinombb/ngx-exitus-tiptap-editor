import { type Editor } from '@tiptap/core';
import { type Node as ProseMirrorNode, type Node } from '@tiptap/pm/model';
import { type NodeView } from '@tiptap/pm/view';

import { type ImageProxyUrlBuilder, ImageProxyBuilders, POST_BODY_TOKEN } from './image';

// ─────────────────────────────────────────────────────────────
// REGEX
// ─────────────────────────────────────────────────────────────
const imageUrlRegex = /^https?:\/\//i;

// ─────────────────────────────────────────────────────────────
// NODE VIEW
// ─────────────────────────────────────────────────────────────
export class ImageView implements NodeView {
  node: Node;
  dom: HTMLImageElement;
  contentDOM?: HTMLElement | null;
  editor: Editor;
  getPos: () => number | undefined;
  originalSize = 300;

  /** Função resolvida que constrói a URL final para o proxy */
  private readonly proxyUrlBuilder?: ImageProxyUrlBuilder;
  /** Permite cancelar o fetch em andamento ao destruir a view */
  private abortController?: AbortController;

  constructor(
    node: Node,
    editor: Editor,
    getPos: () => number | undefined,
    proxyUrl?: string | ImageProxyUrlBuilder,
  ) {
    this.node = node;
    this.editor = editor;
    this.getPos = getPos;

    // Retrocompatibilidade: string usa o padrão antigo ?imgurl= automaticamente
    if (typeof proxyUrl === 'string') {
      this.proxyUrlBuilder = ImageProxyBuilders.queryParam(proxyUrl);
    } else if (typeof proxyUrl === 'function') {

      this.proxyUrlBuilder = proxyUrl;
    }

    // DOM
    this.dom = document.createElement('img');
    this.dom.draggable = false;
    this.dom.style.width = '100%';
    this.setImageAttributes(this.dom, node);

    // Mede o tamanho natural para imagens base64
    this.dom.addEventListener(
      'load',
      () => {
        this.originalSize = this.dom.naturalWidth;
      },
      { once: true },
    );

    // Converte URL externa → Base64 via proxy (se configurado)
    const src = node.attrs['src'];
    if (typeof src === 'string' && imageUrlRegex.test(src) && this.proxyUrlBuilder) {
      this.convertUrlToBase64(src);
    }
  }

  // ───────────────────────────────────────────────────────────
  // LIFECYCLE: DESTROY
  // ───────────────────────────────────────────────────────────
  destroy() {
    // Cancela qualquer fetch em andamento ao remover o nó
    this.abortController?.abort();
  }

  // ───────────────────────────────────────────────────────────
  // UPDATE
  // ───────────────────────────────────────────────────────────
  update(newNode: ProseMirrorNode) {
    if (newNode.type !== this.node.type) return false;

    this.node = newNode;
    this.setImageAttributes(this.dom, newNode);

    return true;
  }

  // ───────────────────────────────────────────────────────────
  // URL → BASE64
  // ───────────────────────────────────────────────────────────

  /**
   * Converte a URL externa para base64 via proxy.
   *
   * Suporta dois modos de requisição:
   * - **GET** (padrão) — a URL final é construída pelo {@link proxyUrlBuilder}.
   * - **POST** — detectado quando o builder retorna uma string iniciada
   *   com {@link POST_BODY_TOKEN}; o corpo da requisição contém `{ url }`.
   */
  private async convertUrlToBase64(src: string): Promise<void> {
    if (!this.proxyUrlBuilder) return;

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      const builtUrl = this.proxyUrlBuilder(src);

      let res: Response;

      if (builtUrl.startsWith(POST_BODY_TOKEN)) {
        // Modo POST: a URL base está após o token
        const base = builtUrl.slice(POST_BODY_TOKEN.length);
        res = await fetch(base, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: src }),
          signal,
        });
      } else {
        // Modo GET (padrão)
        res = await fetch(builtUrl, { signal });
      }

      if (!res.ok) {
        throw new Error(`[ImageView] Proxy respondeu com status ${res.status}`);
      }

      const blob = await res.blob();
      const base64 = await this.blobToDataUrl(blob);
      this.updateAttributes({ src: base64 });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Fetch cancelado intencionalmente — não é um erro
        return;
      }
      console.error('[ImageView] Falha ao converter URL para base64:', err);
    }
  }

  /**
   * Converte um Blob para uma Data URL usando {@link FileReader}.
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') resolve(result);
        else reject(new Error('[ImageView] FileReader retornou resultado inválido'));
      };
      reader.onerror = () => reject(reader.error ?? new Error('[ImageView] FileReader falhou sem detalhes'));
      reader.readAsDataURL(blob);
    });
  }

  // ───────────────────────────────────────────────────────────
  // UPDATE ATTRIBUTES
  // ───────────────────────────────────────────────────────────
  private updateAttributes(attributes: Record<string, unknown>) {
    if (typeof this.getPos !== 'function') return;

    const pos = this.getPos();
    if (pos == null) return;

    const { view } = this.editor;
    const tr = view.state.tr;

    tr.setNodeMarkup(pos, undefined, {
      ...this.node.attrs,
      ...attributes,
    });

    view.dispatch(tr);
  }

  // ───────────────────────────────────────────────────────────
  // APPLY ATTRIBUTES
  // ───────────────────────────────────────────────────────────
  private setImageAttributes(image: HTMLImageElement, node: Node) {
    if (node.attrs['style']) {
      image.setAttribute('style', node.attrs['style']);
    }
    if (node.attrs['src']) {
      image.setAttribute('src', node.attrs['src']);
    }
  }
}
