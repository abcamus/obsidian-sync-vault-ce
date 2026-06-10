import { createLogger } from '@/util/logger';
import {
    ViewUpdate,
    PluginValue,
    EditorView,
    ViewPlugin,
    WidgetType,
    Decoration,
} from '@codemirror/view';

const logger = createLogger("ImagePreviewPlugin");

class CloudImageWidget extends WidgetType {
    private isSelected = false;
    private selectionChangeHandler: () => void;

    constructor(
        readonly originalText: string,
        readonly imgUrl: string,
        private cursorInside: boolean,
        private view: EditorView
    ) {
        super();
        this.selectionChangeHandler = () => this.updateSelectionState();
    }

    toDOM(): HTMLElement {
        // 图片
        const img = window.activeDocument.createElement("img");
        img.src = this.imgUrl;
        img.addClass("sync-vault-image-preview");
        return img;
    }

    // 新增的销毁方法
    destroy(dom: HTMLElement) {
        dom.removeEventListener("mouseup", this.selectionChangeHandler);
        this.view.dom.removeEventListener("selectionchange", this.selectionChangeHandler);
        super.destroy(dom);
    }

    private updateSelectionState(dom?: HTMLElement, textSpan?: HTMLSpanElement) {
        const container = dom;
        const textElement = textSpan;

        if (!container || !textElement) return;

        // 只在点击时切换显示
        if (!this.isSelected) {
            textElement.removeClass("sync-vault-preview-text-hidden");
            textElement.addClass("sync-vault-preview-text-visible");
            this.isSelected = true;
        } else {
            textElement.removeClass("sync-vault-preview-text-visible");
            textElement.addClass("sync-vault-preview-text-hidden");
            this.isSelected = false;
        }
    }

    eq(other: CloudImageWidget) {
        return this.originalText === other.originalText &&
            this.imgUrl === other.imgUrl &&
            this.cursorInside === other.cursorInside;
    }

    ignoreEvent() {
        return false;
    }
}

class ImagePreviewPlugin implements PluginValue {
    _decorations;
    constructor(view: EditorView) {
        this._decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this._decorations = this.buildDecorations(update.view);
        }
    }

    destroy() {
        logger.info('View destroyed.');
    }

    private buildDecorations(view: EditorView) {
        // 只有在实时预览模式下才渲染
        if (!view.dom.parentElement?.classList.contains('is-live-preview')) {
            return Decoration.none;
        }
        const widgets = [];
        const regex = /{{baidu-image:(baidu:\/\/image\/[^\s%]+)}}/g;
        const selection = view.state.selection.main;

        for (let { from, to } of view.visibleRanges) {
            const text = view.state.doc.sliceString(from, to);
            let match;
            while ((match = regex.exec(text)) !== null) {
                logger.debug(`Image view matched`);
                const baiduPath = match[0];
                const start = from + match.index;
                const end = start + baiduPath.length;
                const imgUrl = "https://placehold.co/600x400/e5e7eb/000?text=BD+Image&font=roboto";

                const cursorInside = selection.from <= end && selection.to >= start;

                logger.debug    (`Build decoration, cursorInside = ${cursorInside}`);
                widgets.push(
                    Decoration.widget({
                        widget: new CloudImageWidget(baiduPath, imgUrl, cursorInside, view),
                        side: 1,
                        // inclusive: true
                    }).range(end)
                );
                if (!cursorInside) {
                    widgets.push(Decoration.replace({}).range(start, end));
                }
            }
        }
        return Decoration.set(widgets, true);
    }

    get decorations() {
        return this._decorations;
    }
}

export const imageViewPlugin = ViewPlugin.fromClass(
    ImagePreviewPlugin,
    { decorations: v => v.decorations }
);