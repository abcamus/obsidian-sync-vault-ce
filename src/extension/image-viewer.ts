import {
    ViewUpdate,
    PluginValue,
    EditorView,
    ViewPlugin,
    WidgetType,
    Decoration,
} from '@codemirror/view';

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
        this.selectionChangeHandler = this.updateSelectionState.bind(this);
    }

    toDOM(): HTMLElement {
        // const span = document.createElement("span");
        // span.className = "baidu-image-mark";
        // if (this.cursorInside) {
        //     // 文字
        //     const textDiv = document.createElement("div");
        //     textDiv.textContent = this.originalText;
        //     textDiv.style.opacity = "0.6";
        //     textDiv.style.fontSize = "0.95em";
        //     span.appendChild(textDiv);
        // }

        // 图片
        const img = document.createElement("img");
        img.src = this.imgUrl;
        img.style.maxWidth = "200px";
        // img.style.maxHeight = "1.5em";
        img.style.display = "block";
        img.style.marginTop = "4px";
        img.style.verticalAlign = "middle";
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
            textElement.style.display = "inline";
            this.isSelected = true;
        } else {
            textElement.style.display = "none";
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
        // ...
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this._decorations = this.buildDecorations(update.view);
        }
    }

    destroy() {
        // ...
        console.log('View destroyed.');
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
            // console.log(`View text: ${text}`);
            while ((match = regex.exec(text)) !== null) {
                console.log(`Image view matched`);
                const baiduPath = match[0];
                const start = from + match.index;
                const end = start + baiduPath.length;
                const imgUrl = "https://placehold.co/600x400/e5e7eb/000?text=BD+Image&font=roboto";

                const cursorInside = selection.from <= end && selection.to >= start;

                console.log(`Build decoration, cursorInside = ${cursorInside}`);
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