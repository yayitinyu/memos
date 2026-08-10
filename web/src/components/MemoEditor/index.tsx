import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import useCurrentUser from "@/hooks/useCurrentUser";
import { memoKeys } from "@/hooks/useMemoQueries";
import { userKeys } from "@/hooks/useUserQueries";
import { handleError } from "@/lib/error";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";

import { EditorContent, EditorMetadata, EditorToolbar, FocusModeOverlay } from "./components";
import { FOCUS_MODE_STYLES } from "./constants";
import type { EditorRefActions } from "./Editor";
import { useAutoSave, useFocusMode, useKeyboard, useMemoInit } from "./hooks";
import { cacheService, errorService, memoService, validationService } from "./services";
import { EditorProvider, useEditorContext } from "./state";
import MarkdownToolbar from "./Toolbar/MarkdownToolbar";
import type { MemoEditorProps } from "./types";

const MemoEditor = (props: MemoEditorProps) => {
  const { className, cacheKey, memoName, parentMemoName, autoFocus, placeholder, onConfirm, onCancel } = props;

  return (
    <EditorProvider>
      <MemoEditorImpl
        className={className}
        cacheKey={cacheKey}
        memoName={memoName}
        parentMemoName={parentMemoName}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </EditorProvider>
  );
};

const MemoEditorImpl: React.FC<MemoEditorProps> = ({
  className,
  cacheKey,
  memoName,
  parentMemoName,
  autoFocus,
  placeholder,
  onConfirm,
  onCancel,
}) => {
  const t = useTranslate();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();

  const editorRef = useRef<EditorRefActions>(null);
  const { state, actions, dispatch } = useEditorContext();
  // Line numbers are tracked separately - they persist within focus mode session
  // but are not shown when focus mode is off
  const [lineNumbersEnabled, setLineNumbersEnabled] = useState(false);

  // Line numbers only show when both: focus mode is on AND user has enabled them
  const showLineNumbers = state.ui.isFocusMode && lineNumbersEnabled;

  useMemoInit(editorRef, memoName, cacheKey, currentUser?.name ?? "", autoFocus);

  // Auto-save content to localStorage
  useAutoSave(state.content, currentUser?.name ?? "", cacheKey);

  // Focus mode management with body scroll lock
  useFocusMode(state.ui.isFocusMode);

  const handleToggleFocusMode = () => {
    dispatch(actions.toggleFocusMode());
  };

  // Toggle line numbers - persists within focus mode session
  const handleToggleLineNumbers = () => {
    setLineNumbersEnabled((prev) => !prev);
  };

  useEffect(() => {
    if (!state.ui.isFocusMode) return;
    // Delay focus to ensure DOM is ready after focus mode transition.
    const timer = window.setTimeout(() => {
      const editor = editorRef.current;
      if (editor) {
        editor.focus();
        const len = editor.getContent().length;
        editor.setCursorPosition(len);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [state.ui.isFocusMode]);

  // Keyboard shortcuts
  useKeyboard(editorRef, { onSave: handleSave, onToggleFocusMode: handleToggleFocusMode });

  async function handleSave() {
    // Validate before saving
    const { valid, reason } = validationService.canSave(state);
    if (!valid) {
      toast.error(reason ? t(reason) : t("editor.cannot-save"));
      return;
    }

    dispatch(actions.setLoading("saving", true));

    try {
      const result = await memoService.save(state, { memoName, parentMemoName });

      if (!result.hasChanges) {
        toast.error(t("editor.no-changes-detected"));
        onCancel?.();
        return;
      }

      // Clear localStorage cache on successful save
      cacheService.clear(cacheService.key(currentUser?.name ?? "", cacheKey));

      // Invalidate React Query cache to refresh memo lists across the app
      const invalidationPromises = [
        queryClient.invalidateQueries({ queryKey: memoKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: userKeys.stats() }),
      ];

      // If this was a comment, also invalidate the comments query for the parent memo
      if (parentMemoName) {
        invalidationPromises.push(queryClient.invalidateQueries({ queryKey: memoKeys.comments(parentMemoName) }));
      }

      await Promise.all(invalidationPromises);

      // Reset editor state to initial values
      dispatch(actions.reset());

      // Notify parent component of successful save
      onConfirm?.(result.memoName);
    } catch (error) {
      handleError(error, toast.error, {
        context: "Failed to save memo",
        fallbackMessage: errorService.getErrorMessage(error),
      });
    } finally {
      dispatch(actions.setLoading("saving", false));
    }
  }

  const handleClearContent = () => {
    editorRef.current?.setContent("");
    cacheService.clear(cacheService.key(currentUser?.name ?? "", cacheKey));

    // Fully reset draft extras: pending uploads, linked attachments, relations, location.
    if (state.localFiles.length > 0) {
      dispatch(actions.clearLocalFiles());
    }
    if (state.metadata.attachments.length > 0 || state.metadata.relations.length > 0 || state.metadata.location) {
      dispatch(
        actions.setMetadata({
          attachments: [],
          relations: [],
          location: undefined,
        }),
      );
    }
  };

  const canClear =
    state.content.trim().length > 0 ||
    state.localFiles.length > 0 ||
    state.metadata.attachments.length > 0 ||
    state.metadata.relations.length > 0 ||
    Boolean(state.metadata.location);

  return (
    <>
      <FocusModeOverlay isActive={state.ui.isFocusMode} onToggle={handleToggleFocusMode} />

      {/*
        Layout structure:
        - Sticky markdown toolbar always available (including mobile)
        - In focus mode: becomes fixed with specific spacing, editor grows to fill space
        - In normal mode: stays relative with max-height constraint
      */}
      <div
        className={cn(
          "group relative w-full flex flex-col justify-between items-start bg-card px-4 pt-0 pb-1 rounded-lg border border-border overflow-hidden",
          FOCUS_MODE_STYLES.transition,
          state.ui.isFocusMode && cn(FOCUS_MODE_STYLES.container.base, FOCUS_MODE_STYLES.container.spacing, "overflow-y-auto"),
          className,
        )}
      >
        <MarkdownToolbar
          editorRef={editorRef}
          showLineNumbers={lineNumbersEnabled}
          toggleShowLineNumbers={handleToggleLineNumbers}
          showLineNumberToggle={state.ui.isFocusMode}
          onClear={handleClearContent}
          canClear={canClear}
        />

        {/* Editor content grows to fill available space in focus mode */}
        <div className={cn("w-full flex flex-col flex-1 min-h-0 pt-2", state.ui.isFocusMode && "min-h-[40vh]")}>
          <EditorContent ref={editorRef} placeholder={placeholder} autoFocus={autoFocus} showLineNumbers={showLineNumbers} />
        </div>

        {/* Metadata and action bar grouped together at bottom */}
        <div className="w-full flex flex-col gap-2">
          <EditorMetadata />
          <EditorToolbar onSave={handleSave} onCancel={onCancel} memoName={memoName} />
        </div>
      </div>
    </>
  );
};

export default MemoEditor;
