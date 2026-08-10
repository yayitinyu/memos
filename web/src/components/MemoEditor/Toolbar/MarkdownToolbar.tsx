import {
  BoldIcon,
  CheckSquareIcon,
  ClipboardIcon,
  Code2Icon,
  CodeIcon,
  HashIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  Redo2Icon,
  SigmaIcon,
  SquareFunctionIcon,
  StrikethroughIcon,
  TableIcon,
  Undo2Icon,
} from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type Translations, useTranslate } from "@/utils/i18n";
import type { EditorRefActions } from "../Editor";

interface MarkdownToolbarProps {
  editorRef: RefObject<EditorRefActions>;
  showLineNumbers?: boolean;
  toggleShowLineNumbers?: () => void;
}

interface ToolbarAction {
  icon: typeof BoldIcon;
  labelKey: Translations;
  prefix: string;
  suffix: string;
}

const actionGroups: ToolbarAction[][] = [
  [
    { icon: BoldIcon, labelKey: "editor.toolbar.bold", prefix: "**", suffix: "**" },
    { icon: ItalicIcon, labelKey: "editor.toolbar.italic", prefix: "*", suffix: "*" },
    { icon: StrikethroughIcon, labelKey: "editor.toolbar.strikethrough", prefix: "~~", suffix: "~~" },
    { icon: CodeIcon, labelKey: "editor.toolbar.code", prefix: "`", suffix: "`" },
  ],
  [
    { icon: Code2Icon, labelKey: "editor.toolbar.code-block", prefix: "```\n", suffix: "\n```" },
    { icon: QuoteIcon, labelKey: "editor.toolbar.quote", prefix: "> ", suffix: "" },
    { icon: LinkIcon, labelKey: "editor.toolbar.link", prefix: "[", suffix: "](url)" },
    { icon: SigmaIcon, labelKey: "editor.toolbar.inline-math", prefix: "$", suffix: "$" },
    { icon: SquareFunctionIcon, labelKey: "editor.toolbar.math-block", prefix: "$$\n", suffix: "\n$$" },
  ],
  [
    { icon: Heading1Icon, labelKey: "editor.toolbar.heading-1", prefix: "# ", suffix: "" },
    { icon: Heading2Icon, labelKey: "editor.toolbar.heading-2", prefix: "## ", suffix: "" },
    { icon: Heading3Icon, labelKey: "editor.toolbar.heading-3", prefix: "### ", suffix: "" },
  ],
  [
    { icon: ListIcon, labelKey: "editor.toolbar.unordered-list", prefix: "- ", suffix: "" },
    { icon: ListOrderedIcon, labelKey: "editor.toolbar.ordered-list", prefix: "1. ", suffix: "" },
    { icon: CheckSquareIcon, labelKey: "editor.toolbar.task-list", prefix: "- [ ] ", suffix: "" },
    {
      icon: TableIcon,
      labelKey: "editor.toolbar.table",
      prefix: "| Header | Header |\n| --- | --- |\n| Cell | Cell |",
      suffix: "",
    },
  ],
];

const MarkdownToolbar = ({ editorRef, showLineNumbers, toggleShowLineNumbers }: MarkdownToolbarProps) => {
  const t = useTranslate();
  const handleInsert = (prefix: string, suffix = "") => editorRef.current?.insertText("", prefix, suffix);

  const handleUndo = () => {
    document.execCommand("undo");
    editorRef.current?.focus();
  };

  const handleRedo = () => {
    document.execCommand("redo");
    editorRef.current?.focus();
  };

  const handlePaste = async () => {
    try {
      editorRef.current?.insertText(await navigator.clipboard.readText());
    } catch {
      document.execCommand("paste");
    }
    editorRef.current?.focus();
  };

  const utilityActions = [
    { label: t("editor.toolbar.undo"), icon: Undo2Icon, onClick: handleUndo },
    { label: t("editor.toolbar.redo"), icon: Redo2Icon, onClick: handleRedo },
    { label: t("editor.toolbar.paste"), icon: ClipboardIcon, onClick: handlePaste },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 sm:px-4 py-2 border-b border-border bg-background sticky top-0 z-20 overflow-x-auto">
      <TooltipProvider>
        <div className="flex items-center gap-0.5">
          {utilityActions.map((action) => (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={action.onClick} aria-label={action.label}>
                  <action.icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{action.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="w-px h-5 bg-border mx-1" />

        {actionGroups.map((group, groupIndex) => (
          <div key={group.map((action) => action.labelKey).join("-")} className="flex items-center gap-0.5">
            {group.map((action) => {
              const label = t(action.labelKey);
              return (
                <Tooltip key={action.labelKey}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleInsert(action.prefix, action.suffix)}
                      aria-label={label}
                    >
                      <action.icon className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {groupIndex < actionGroups.length - 1 && <div className="w-px h-5 bg-border mx-1" />}
          </div>
        ))}
      </TooltipProvider>

      <div className="flex-1" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", showLineNumbers && "bg-muted-foreground/20")}
              onClick={toggleShowLineNumbers}
              aria-label={t("editor.toolbar.toggle-line-numbers")}
            >
              <HashIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("editor.toolbar.toggle-line-numbers")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default MarkdownToolbar;
