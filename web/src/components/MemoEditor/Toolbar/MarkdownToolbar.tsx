import {
  BoldIcon,
  CheckSquareIcon,
  ClipboardIcon,
  Code2Icon,
  CodeIcon,
  EllipsisIcon,
  EraserIcon,
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
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type Translations, useTranslate } from "@/utils/i18n";
import type { EditorRefActions } from "../Editor";

interface MarkdownToolbarProps {
  editorRef: RefObject<EditorRefActions | null>;
  showLineNumbers?: boolean;
  toggleShowLineNumbers?: () => void;
  /** When true, shows the line-number toggle (typically focus mode only). */
  showLineNumberToggle?: boolean;
  onClear?: () => void;
  /** Whether the editor currently has clearable content. */
  canClear?: boolean;
}

interface ToolbarAction {
  icon: typeof BoldIcon;
  labelKey: Translations;
  prefix: string;
  suffix: string;
}

interface ToolbarMenuGroup {
  labelKey: Translations;
  actions: ToolbarAction[];
}

/** Full desktop toolbar groups (left → right). */
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

/** Always-visible primary actions on narrow screens. */
const mobilePrimaryActions: ToolbarAction[] = [
  { icon: BoldIcon, labelKey: "editor.toolbar.bold", prefix: "**", suffix: "**" },
  { icon: ItalicIcon, labelKey: "editor.toolbar.italic", prefix: "*", suffix: "*" },
  { icon: ListIcon, labelKey: "editor.toolbar.unordered-list", prefix: "- ", suffix: "" },
  { icon: LinkIcon, labelKey: "editor.toolbar.link", prefix: "[", suffix: "](url)" },
];

/** Overflow menu groups on narrow screens (everything not in primary). */
const mobileOverflowGroups: ToolbarMenuGroup[] = [
  {
    labelKey: "editor.toolbar.group-text",
    actions: [
      { icon: StrikethroughIcon, labelKey: "editor.toolbar.strikethrough", prefix: "~~", suffix: "~~" },
      { icon: CodeIcon, labelKey: "editor.toolbar.code", prefix: "`", suffix: "`" },
      { icon: Code2Icon, labelKey: "editor.toolbar.code-block", prefix: "```\n", suffix: "\n```" },
      { icon: QuoteIcon, labelKey: "editor.toolbar.quote", prefix: "> ", suffix: "" },
    ],
  },
  {
    labelKey: "editor.toolbar.group-heading",
    actions: [
      { icon: Heading1Icon, labelKey: "editor.toolbar.heading-1", prefix: "# ", suffix: "" },
      { icon: Heading2Icon, labelKey: "editor.toolbar.heading-2", prefix: "## ", suffix: "" },
      { icon: Heading3Icon, labelKey: "editor.toolbar.heading-3", prefix: "### ", suffix: "" },
    ],
  },
  {
    labelKey: "editor.toolbar.group-list",
    actions: [
      { icon: ListOrderedIcon, labelKey: "editor.toolbar.ordered-list", prefix: "1. ", suffix: "" },
      { icon: CheckSquareIcon, labelKey: "editor.toolbar.task-list", prefix: "- [ ] ", suffix: "" },
      {
        icon: TableIcon,
        labelKey: "editor.toolbar.table",
        prefix: "| Header | Header |\n| --- | --- |\n| Cell | Cell |",
        suffix: "",
      },
    ],
  },
  {
    labelKey: "editor.toolbar.group-math",
    actions: [
      { icon: SigmaIcon, labelKey: "editor.toolbar.inline-math", prefix: "$", suffix: "$" },
      { icon: SquareFunctionIcon, labelKey: "editor.toolbar.math-block", prefix: "$$\n", suffix: "\n$$" },
    ],
  },
];

const toolbarButtonClass = "h-9 w-9 shrink-0 touch-manipulation sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground";

const MarkdownToolbar = ({
  editorRef,
  showLineNumbers,
  toggleShowLineNumbers,
  showLineNumberToggle = false,
  onClear,
  canClear = false,
}: MarkdownToolbarProps) => {
  const t = useTranslate();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const handleInsert = (prefix: string, suffix = "") => {
    editorRef.current?.insertText("", prefix, suffix);
    editorRef.current?.focus();
  };

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

  const handleClearConfirm = () => {
    onClear?.();
    editorRef.current?.focus();
  };

  const utilityActions = [
    { label: t("editor.toolbar.undo"), icon: Undo2Icon, onClick: handleUndo },
    { label: t("editor.toolbar.redo"), icon: Redo2Icon, onClick: handleRedo },
    { label: t("editor.toolbar.paste"), icon: ClipboardIcon, onClick: handlePaste },
  ];

  const renderIconButton = (key: string, label: string, Icon: typeof BoldIcon, onClick: () => void, active = false) => (
    <Tooltip key={key}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(toolbarButtonClass, active && "bg-muted-foreground/20 text-foreground")}
          onClick={onClick}
          aria-label={label}
        >
          <Icon className="w-4 h-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );

  const trailingActions = (
    <div className="flex items-center gap-0.5 shrink-0 pl-1">
      {onClear && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(toolbarButtonClass, canClear && "text-destructive/80 hover:text-destructive")}
              onClick={() => setClearDialogOpen(true)}
              disabled={!canClear}
              aria-label={t("editor.toolbar.clear")}
            >
              <EraserIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("editor.toolbar.clear")}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {showLineNumberToggle && toggleShowLineNumbers && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(toolbarButtonClass, showLineNumbers && "bg-muted-foreground/20 text-foreground")}
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
      )}
    </div>
  );

  const utilityButtons = (
    <div className="flex items-center gap-0.5 shrink-0">
      {utilityActions.map((action) => renderIconButton(action.label, action.label, action.icon, action.onClick))}
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-20 w-full",
          "-mx-4 px-2 sm:px-3",
          "flex items-center gap-0.5 py-1.5 sm:py-2",
          "border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80",
        )}
        role="toolbar"
        aria-label={t("editor.toolbar.label")}
      >
        <TooltipProvider delayDuration={400}>
          {/* Mobile: compact primary row + overflow menu */}
          <div className="flex sm:hidden items-center gap-0.5 w-full min-w-0">
            {utilityButtons}
            <div className="w-px h-5 bg-border mx-1 shrink-0" aria-hidden />
            {mobilePrimaryActions.map((action) =>
              renderIconButton(action.labelKey, t(action.labelKey), action.icon, () => handleInsert(action.prefix, action.suffix)),
            )}

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={toolbarButtonClass} aria-label={t("editor.toolbar.more")}>
                  <EllipsisIcon className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 max-h-[70vh]">
                {mobileOverflowGroups.map((group, groupIndex) => (
                  <div key={group.labelKey}>
                    {groupIndex > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{t(group.labelKey)}</DropdownMenuLabel>
                    {group.actions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <DropdownMenuItem
                          key={action.labelKey}
                          className="gap-2 cursor-pointer"
                          onSelect={() => handleInsert(action.prefix, action.suffix)}
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span>{t(action.labelKey)}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 min-w-1" />
            {trailingActions}
          </div>

          {/* Desktop / tablet: full horizontal toolbar */}
          <div
            className={cn(
              "hidden sm:flex items-center gap-0.5 w-full min-w-0",
              "overflow-x-auto overscroll-x-contain",
              "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
            )}
          >
            {utilityButtons}
            <div className="w-px h-5 bg-border mx-1 shrink-0" aria-hidden />

            {actionGroups.map((group, groupIndex) => (
              <div key={group.map((action) => action.labelKey).join("-")} className="flex items-center gap-0.5 shrink-0">
                {group.map((action) =>
                  renderIconButton(action.labelKey, t(action.labelKey), action.icon, () => handleInsert(action.prefix, action.suffix)),
                )}
                {groupIndex < actionGroups.length - 1 && <div className="w-px h-5 bg-border mx-1" aria-hidden />}
              </div>
            ))}

            <div className="flex-1 min-w-2" />
            {trailingActions}
          </div>
        </TooltipProvider>
      </div>

      <ConfirmDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        title={t("editor.toolbar.clear-confirm")}
        description={t("editor.toolbar.clear-confirm-description")}
        confirmLabel={t("common.clear")}
        cancelLabel={t("common.cancel")}
        confirmVariant="destructive"
        onConfirm={handleClearConfirm}
      />
    </>
  );
};

export default MarkdownToolbar;
