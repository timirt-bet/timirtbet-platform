// CodeMirror 6 for the Timirtbet challenge editor. Bundled to web/src/vendor/codemirror.js (npm run build).
// Exposes window.TBEditor.create({ parent, doc, lang, onChange, onRun }).
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, highlightSpecialChars, rectangularSelection, crosshairCursor, dropCursor } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { indentOnInput, bracketMatching, foldGutter, foldKeymap, syntaxHighlighting, HighlightStyle, indentUnit } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { lintKeymap } from "@codemirror/lint";
import { javascript } from "@codemirror/lang-javascript";
import { go } from "@codemirror/lang-go";
import { tags as t } from "@lezer/highlight";

// Colours come from CSS variables, so the editor follows the app's light and dark themes.
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier], color: "var(--syn-kw)" },
  { tag: [t.string, t.special(t.string), t.regexp, t.character], color: "var(--syn-str)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--syn-num)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--syn-com)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: "var(--syn-fn)" },
  { tag: [t.typeName, t.className, t.standard(t.typeName)], color: "var(--syn-type)" },
  { tag: t.invalid, color: "var(--clay)" },
]);

const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--code-bg)", color: "var(--ink)", fontSize: "13.5px" },
  "&.cm-focused": { outline: "none", boxShadow: "inset 0 0 0 2px var(--accent)" },
  ".cm-scroller": { fontFamily: "var(--mono)", lineHeight: "1.6" },
  ".cm-content": { padding: "10px 0", caretColor: "var(--ink)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--ink)", borderLeftWidth: "2px" },
  ".cm-gutters": { backgroundColor: "var(--code-bg)", color: "var(--ink-3)", border: "none", borderRight: "1px solid var(--line)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--accent) 7%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--ink)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--accent) 28%, transparent) !important" },
  ".cm-selectionMatch": { backgroundColor: "color-mix(in srgb, var(--sun) 25%, transparent)" },
  "&.cm-focused .cm-matchingBracket": { backgroundColor: "color-mix(in srgb, var(--accent) 25%, transparent)", outline: "1px solid var(--accent)" },
  ".cm-foldGutter .cm-gutterElement": { padding: "0 4px", cursor: "pointer" },
  ".cm-tooltip": { backgroundColor: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "8px" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--accent-soft)", color: "var(--ink)" },
  ".cm-panels": { backgroundColor: "var(--surface-2)", color: "var(--ink)" },
  ".cm-panels input, .cm-panels button": { color: "var(--ink)" },
});

function create({ parent, doc = "", lang = "js", onChange = () => {}, onRun = () => {} }) {
  const isGo = lang === "go";
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(), foldGutter(), drawSelection(), dropCursor(),
        EditorState.allowMultipleSelections.of(true), indentOnInput(), syntaxHighlighting(highlight), bracketMatching(), closeBrackets(),
        autocompletion(), rectangularSelection(), crosshairCursor(), highlightActiveLine(), highlightSelectionMatches(),
        isGo ? go() : javascript(),
        indentUnit.of(isGo ? "\t" : "  "), EditorState.tabSize.of(4),
        keymap.of([
          { key: "Mod-Enter", preventDefault: true, run: () => { onRun(); return true; } },
          ...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap, ...completionKeymap, ...lintKeymap, indentWithTab,
        ]),
        EditorView.contentAttributes.of({ "aria-label": "Code editor", autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
        EditorView.updateListener.of((u) => { if (u.docChanged) onChange(u.state.doc.toString()); }),
        theme,
      ],
    }),
  });
  return {
    view,
    get value() { return view.state.doc.toString(); },
    set value(v) { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } }); },
    focus() { view.focus(); },
    destroy() { view.destroy(); },
  };
}

window.TBEditor = { create };
window.dispatchEvent(new Event("tbeditor-ready"));
