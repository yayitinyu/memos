import { useCallback } from "react";
import { NavigateOptions, useNavigate } from "react-router-dom";

const useNavigateTo = () => {
  const navigateTo = useNavigate();

  return useCallback(
    (to: string, options?: NavigateOptions) => {
      const doc = window.document as unknown as Document & { startViewTransition?: (callback: () => void) => void };
      if (!doc.startViewTransition) {
        navigateTo(to, options);
      } else {
        document.startViewTransition(() => {
          navigateTo(to, options);
        });
      }
    },
    [navigateTo],
  );
};

export default useNavigateTo;
