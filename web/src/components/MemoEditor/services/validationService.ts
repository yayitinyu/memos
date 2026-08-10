import type { Translations } from "@/utils/i18n";
import type { EditorState } from "../state";

export interface ValidationResult {
  valid: boolean;
  reason?: Translations;
}

export const validationService = {
  canSave(state: EditorState): ValidationResult {
    // Must have content, attachment, or local file
    if (!state.content.trim() && state.metadata.attachments.length === 0 && state.localFiles.length === 0) {
      return { valid: false, reason: "editor.validation.content-required" };
    }

    // Cannot save while uploading
    if (state.ui.isLoading.uploading) {
      return { valid: false, reason: "editor.validation.upload-in-progress" };
    }

    // Cannot save while already saving
    if (state.ui.isLoading.saving) {
      return { valid: false, reason: "editor.validation.save-in-progress" };
    }

    return { valid: true };
  },
};
