import { Maximize2Icon, Minimize2Icon } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";
import { validationService } from "../services";
import { useEditorContext } from "../state";
import InsertMenu from "../Toolbar/InsertMenu";
import VisibilitySelector from "../Toolbar/VisibilitySelector";
import type { EditorToolbarProps } from "../types";

export const EditorToolbar: FC<EditorToolbarProps> = ({ onSave, onCancel, memoName }) => {
  const t = useTranslate();
  const { state, actions, dispatch } = useEditorContext();
  const { valid } = validationService.canSave(state);

  const isSaving = state.ui.isLoading.saving;
  const isFocusMode = state.ui.isFocusMode;

  const handleLocationChange = (location: typeof state.metadata.location) => {
    dispatch(actions.setMetadata({ location }));
  };

  const handleToggleFocusMode = () => {
    dispatch(actions.toggleFocusMode());
  };

  const handleVisibilityChange = (visibility: typeof state.metadata.visibility) => {
    dispatch(actions.setMetadata({ visibility }));
  };

  return (
    <div
      className={cn(
        "w-full flex flex-row justify-between items-center gap-2 mb-1",
        // Keep actions reachable while scrolling long content in focus mode.
        isFocusMode &&
          "sticky bottom-0 z-20 -mx-4 px-4 pt-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] border-t border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80",
      )}
    >
      <div className="flex flex-row justify-start items-center shrink-0">
        <InsertMenu
          isUploading={state.ui.isLoading.uploading}
          location={state.metadata.location}
          onLocationChange={handleLocationChange}
          onToggleFocusMode={handleToggleFocusMode}
          memoName={memoName}
        />
      </div>

      <div className="flex flex-row justify-end items-center gap-1.5 sm:gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 sm:h-8 sm:w-8 shrink-0 touch-manipulation"
          onClick={handleToggleFocusMode}
          title={isFocusMode ? t("editor.exit-focus-mode") : t("editor.focus-mode")}
        >
          {isFocusMode ? (
            <Minimize2Icon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Maximize2Icon className="w-5 h-5 text-muted-foreground" />
          )}
        </Button>
        <VisibilitySelector value={state.metadata.visibility} onChange={handleVisibilityChange} />

        {onCancel && (
          <Button variant="ghost" className="h-9 px-2.5 sm:h-8 sm:px-3 shrink-0 touch-manipulation" onClick={onCancel} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
        )}

        <Button className="h-9 px-3 sm:h-8 sm:px-4 shrink-0 touch-manipulation" onClick={onSave} disabled={!valid || isSaving}>
          {isSaving ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
};
