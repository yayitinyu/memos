import { forwardRef } from "react";
import type { LocalFile } from "@/components/memo-metadata";
import { cn } from "@/lib/utils";
import Editor, { type EditorRefActions } from "../Editor";
import { useBlobUrls, useDragAndDrop } from "../hooks";
import { useEditorContext } from "../state";
import type { EditorContentProps } from "../types";

export const EditorContent = forwardRef<EditorRefActions, EditorContentProps>(({ placeholder, showLineNumbers }, ref) => {
  const { state, actions, dispatch } = useEditorContext();
  const { createBlobUrl } = useBlobUrls();
  const isLoading = state.ui.isLoading.loading;

  const { dragHandlers } = useDragAndDrop((files: FileList) => {
    const localFiles: LocalFile[] = Array.from(files).map((file) => ({
      file,
      previewUrl: createBlobUrl(file),
    }));
    localFiles.forEach((localFile) => dispatch(actions.addLocalFile(localFile)));
  });

  const handleCompositionStart = () => {
    dispatch(actions.setComposing(true));
  };

  const handleCompositionEnd = () => {
    dispatch(actions.setComposing(false));
  };

  const handleContentChange = (content: string) => {
    dispatch(actions.updateContent(content));
  };

  const handlePaste = () => {
    // Paste handling is managed by the Editor component internally
  };

  return (
    <div 
      className={cn(
        "w-full flex flex-col flex-1 transition-opacity duration-200",
        isLoading ? "opacity-50" : "opacity-100"
      )} 
      {...dragHandlers}
    >
      <Editor
        ref={ref}
        className="memo-editor-content"
        initialContent={state.content}
        placeholder={isLoading ? "Loading..." : (placeholder || "")}
        isFocusMode={state.ui.isFocusMode}
        showLineNumbers={showLineNumbers}
        isInIME={state.ui.isComposing}
        onContentChange={handleContentChange}
        onPaste={handlePaste}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
    </div>
  );
});

EditorContent.displayName = "EditorContent";

