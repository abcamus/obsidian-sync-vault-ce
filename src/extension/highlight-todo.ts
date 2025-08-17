import { EditorView, Decoration } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

// 示例：高亮所有 "TODO" 文本
const highlightTODO = EditorView.decorations.of(view => {
    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let pos = 0;
        while ((pos = text.indexOf("TODO", pos)) >= 0) {
            const start = from + pos;
            const end = start + 4; // "TODO" 长度
            builder.add(
                start,
                end,
                Decoration.mark({ class: "cm-todo-highlight" })
            );
            pos += 4;
        }
    }
    return builder.finish();
});

// 导出扩展
export const myExtension = [highlightTODO];