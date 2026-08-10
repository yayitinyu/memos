import { defaultSchema } from "rehype-sanitize";

export const MAX_DISPLAY_HEIGHT = 256;

export const COMPACT_STATES: Record<"ALL" | "SNIPPET", { textKey: string; next: "ALL" | "SNIPPET" }> = {
  ALL: { textKey: "memo.show-more", next: "SNIPPET" },
  SNIPPET: { textKey: "memo.show-less", next: "ALL" },
};

const TRUSTED_IFRAME_SRC_PATTERNS = [
  /^https:\/\/www\.youtube\.com\/embed\/[^?#]+(?:\?.*)?$/i,
  /^https:\/\/www\.youtube-nocookie\.com\/embed\/[^?#]+(?:\?.*)?$/i,
  /^https:\/\/player\.vimeo\.com\/video\/[^?#]+(?:\?.*)?$/i,
  /^https:\/\/open\.spotify\.com\/embed\/[^?#]+(?:\?.*)?$/i,
  /^https:\/\/w\.soundcloud\.com\/player\/?(?:\?.*)?$/i,
  /^https:\/\/www\.loom\.com\/embed\/[^?#]+(?:\?.*)?$/i,
  /^https:\/\/www\.google\.com\/maps\/embed(?:\/[^?#]*)?(?:\?.*)?$/i,
  /^https:\/\/(?:app\.)?diagrams\.net\/(?:[^?#]+)?(?:\?.*)?$/i,
  /^https:\/\/(?:www\.)?draw\.io\/(?:[^?#]+)?(?:\?.*)?$/i,
];

export const isTrustedIframeSrc = (src: string): boolean => TRUSTED_IFRAME_SRC_PATTERNS.some((pattern) => pattern.test(src));

export const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img || []), "height", "width"],
    input: [...(defaultSchema.attributes?.input || []), ["checked", true]],
    code: [...(defaultSchema.attributes?.code || []), ["className", "language-math", "math-inline", "math-display"]],
    span: [...(defaultSchema.attributes?.span || []), ["className", "tag"], ["aria*"], ["data*"]],
    iframe: [["src", ...TRUSTED_IFRAME_SRC_PATTERNS], "width", "height", "frameborder", "allowfullscreen", "title", "loading"],
  },
  tagNames: [...(defaultSchema.tagNames || []), "iframe"],
  protocols: {
    ...defaultSchema.protocols,
    src: ["https"],
  },
};
