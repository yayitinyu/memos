import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { EDITOR_HEIGHT } from "../constants";
import type { EditorProps } from "../types";
import { editorCommands } from "./commands";
import SlashCommands from "./SlashCommands";
import TagSuggestions from "./TagSuggestions";
import { useListCompletion } from "./useListCompletion";

export interface EditorRefActions {
  getEditor: () => HTMLTextAreaElement | null;
  focus: () => void;
  scrollToCursor: () => void;
  insertText: (text: string, prefix?: string, suffix?: string) => void;
  removeText: (start: number, length: number) => void;
  setContent: (text: string) => void;
  getContent: () => string;
  getSelectedContent: () => string;
  getCursorPosition: () => number;
  setCursorPosition: (startPos: number, endPos?: number) => void;
  getCursorLineNumber: () => number;
  getLine: (lineNumber: number) => string;
  setLine: (lineNumber: number, text: string) => void;
}

const Editor = forwardRef(function Editor(props: EditorProps, ref: React.ForwardedRef<EditorRefActions>) {
  const {
    className,
    initialContent,
    placeholder,
    onPaste,
    onContentChange: handleContentChangeCallback,
    isFocusMode,
    showLineNumbers,
    isInIME = false,
    onCompositionStart,
    onCompositionEnd,
  } = props;
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  
  // Track line count for line numbers display
  const [lineCount, setLineCount] = useState(1);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const updateEditorHeight = useCallback(() => {
    if (editorRef.current) {
      // Always use dynamic height - textarea expands with content
      editorRef.current.style.height = "auto";
      editorRef.current.style.height = `${editorRef.current.scrollHeight ?? 0}px`;
    }
  }, []);

  const updateContent = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.value;
      handleContentChangeCallback(content);
      updateEditorHeight();
      // Update line count for line numbers
      setLineCount(content.split("\n").length);
    }
  }, [handleContentChangeCallback, updateEditorHeight]);

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.value = initialContent;
      handleContentChangeCallback(initialContent);
      updateEditorHeight();
      // Initialize line count
      setLineCount(initialContent.split("\n").length);
    }
    // Only run once on mount to set initial content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset height when switching focus mode
  useEffect(() => {
    // Small delay to ensure DOM is ready after mode switch
    const timer = setTimeout(() => {
      updateEditorHeight();
    }, 50);
    return () => clearTimeout(timer);
  }, [isFocusMode, updateEditorHeight]);

  // Update editor when content is externally changed (e.g., reset after save)
  useEffect(() => {
    if (editorRef.current && editorRef.current.value !== initialContent) {
      editorRef.current.value = initialContent;
      updateEditorHeight();
      // Update line count
      setLineCount(initialContent.split("\n").length);
    }
  }, [initialContent, updateEditorHeight]);

  const editorActions: EditorRefActions = useMemo(
    () => ({
      getEditor: () => editorRef.current,
      focus: () => editorRef.current?.focus(),
      scrollToCursor: () => {
        if (editorRef.current) {
          editorRef.current.scrollTop = editorRef.current.scrollHeight;
        }
      },
      insertText: (content = "", prefix = "", suffix = "") => {
        const editor = editorRef.current;
        if (!editor) return;

        const cursorPos = editor.selectionStart;
        const endPos = editor.selectionEnd;
        const prev = editor.value;
        const actual = content || prev.slice(cursorPos, endPos);
        editor.value = prev.slice(0, cursorPos) + prefix + actual + suffix + prev.slice(endPos);

        editor.focus();
        editor.setSelectionRange(cursorPos + prefix.length + actual.length, cursorPos + prefix.length + actual.length);
        updateContent();
      },
      removeText: (start: number, length: number) => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.value = editor.value.slice(0, start) + editor.value.slice(start + length);
        editor.focus();
        editor.selectionEnd = start;
        updateContent();
      },
      setContent: (text: string) => {
        const editor = editorRef.current;
        if (editor) {
          editor.value = text;
          updateContent();
        }
      },
      getContent: () => editorRef.current?.value ?? "",
      getCursorPosition: () => editorRef.current?.selectionStart ?? 0,
      getSelectedContent: () => {
        const editor = editorRef.current;
        if (!editor) return "";
        return editor.value.slice(editor.selectionStart, editor.selectionEnd);
      },
      setCursorPosition: (startPos: number, endPos?: number) => {
        const endPosition = Number.isNaN(endPos) ? startPos : (endPos as number);
        editorRef.current?.setSelectionRange(startPos, endPosition);
      },
      getCursorLineNumber: () => {
        const editor = editorRef.current;
        if (!editor) return 0;
        const lines = editor.value.slice(0, editor.selectionStart).split("\n");
        return lines.length - 1;
      },
      getLine: (lineNumber: number) => editorRef.current?.value.split("\n")[lineNumber] ?? "",
      setLine: (lineNumber: number, text: string) => {
        const editor = editorRef.current;
        if (!editor) return;
        const lines = editor.value.split("\n");
        lines[lineNumber] = text;
        editor.value = lines.join("\n");
        editor.focus();
        updateContent();
      },
    }),
    [updateContent],
  );

  useImperativeHandle(ref, () => editorActions, [editorActions]);

  const handleEditorInput = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.value;
      handleContentChangeCallback(content);
      updateEditorHeight();
      // Update line count on input
      setLineCount(content.split("\n").length);
    }
  }, [handleContentChangeCallback, updateEditorHeight]);

  // Auto-complete markdown lists when pressing Enter
  useListCompletion({
    editorRef,
    editorActions,
    isInIME,
  });

  // Generate line numbers array based on lineCount state
  const lineNumbers = useMemo(() => 
    Array.from({ length: lineCount }, (_, i) => i + 1),
    [lineCount]
  );

  return (
    <div
      className={cn(
        "flex flex-col justify-start items-start relative w-full bg-inherit",
        // Focus mode: flex-1 to grow and fill space; Normal: h-auto with max-height and overflow
        isFocusMode ? "flex-1" : `h-auto ${EDITOR_HEIGHT.normal} overflow-y-auto`,
        className,
      )}
    >
      <div className={cn("w-full flex flex-row", isFocusMode ? "flex-1 h-full overflow-hidden" : "")}>
        {showLineNumbers && (
          <div
            ref={lineNumbersRef}
            className="shrink-0 w-8 mr-2 text-right text-muted-foreground/50 font-mono text-base overflow-hidden select-none bg-transparent py-1"
          >
            {lineNumbers.map((num) => (
              <div key={num} className="leading-[1.5]">{num}</div>
            ))}
          </div>
        )}
        <textarea
          className={cn(
            "flex-1 w-full my-1 text-base resize-none overflow-x-hidden bg-transparent outline-none placeholder:opacity-70 whitespace-pre-wrap break-words leading-[1.5]",
            // Focus mode: flex-1 with overflow-y-auto; Normal: auto height (controlled by JS)
            isFocusMode ? "flex-1 h-0 overflow-y-auto" : "overflow-y-hidden",
          )}
          rows={1}
          placeholder={placeholder}
          ref={editorRef}
          onPaste={onPaste}
          onInput={handleEditorInput}
          onScroll={handleScroll}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
        ></textarea>
      </div>
      <TagSuggestions editorRef={editorRef} editorActions={ref} />
      <SlashCommands editorRef={editorRef} editorActions={ref} commands={editorCommands} />
    </div>
  );
});

export default Editor;


