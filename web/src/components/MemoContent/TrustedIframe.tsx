import type { Element } from "hast";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";
import { isTrustedIframeSrc } from "./constants";

type TrustedIframeProps = React.ComponentProps<"iframe"> & { node?: Element };

export const TrustedIframe = ({ node: _node, src, className, title, ...props }: TrustedIframeProps) => {
  const t = useTranslate();
  if (typeof src !== "string" || !isTrustedIframeSrc(src)) {
    return null;
  }

  return (
    <iframe
      {...props}
      src={src}
      title={title || t("memo.embedded-content")}
      className={cn("max-w-full rounded-lg border border-border", className)}
      loading="lazy"
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
};
