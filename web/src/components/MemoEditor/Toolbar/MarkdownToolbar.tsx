import { BoldIcon, CheckSquareIcon, ClipboardIcon, Code2Icon, CodeIcon, Heading1Icon, Heading2Icon, Heading3Icon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, QuoteIcon, Redo2Icon, StrikethroughIcon, TableIcon, HashIcon, Undo2Icon } from "lucide-react";
import { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EditorRefActions } from "../Editor";

interface MarkdownToolbarProps {
  editorRef: RefObject<EditorRefActions>;
  showLineNumbers?: boolean;
  toggleShowLineNumbers?: () => void;
}

// Grouped actions for better organization
// Removed \n prefix from headings, lists, todos, table - insert at current position
const actionGroups = [
  // Text formatting
  [
    { icon: BoldIcon, label: "Bold", prefix: "**", suffix: "**" },
    { icon: ItalicIcon, label: "Italic", prefix: "*", suffix: "*" },
    { icon: StrikethroughIcon, label: "Strikethrough", prefix: "~~", suffix: "~~" },
    { icon: CodeIcon, label: "Code", prefix: "`", suffix: "`" },
  ],
  // Block elements
  [
    { icon: Code2Icon, label: "Code Block", prefix: "```\n", suffix: "\n```" },
    { icon: QuoteIcon, label: "Quote", prefix: "> ", suffix: "" },
    { icon: LinkIcon, label: "Link", prefix: "[", suffix: "](url)" },
  ],
  // Headings - insert at current line
  [
    { icon: Heading1Icon, label: "Heading 1", prefix: "# ", suffix: "" },
    { icon: Heading2Icon, label: "Heading 2", prefix: "## ", suffix: "" },
    { icon: Heading3Icon, label: "Heading 3", prefix: "### ", suffix: "" },
  ],
  // Lists & Table - insert at current line
  [
    { icon: ListIcon, label: "Unordered List", prefix: "- ", suffix: "" },
    { icon: ListOrderedIcon, label: "Ordered List", prefix: "1. ", suffix: "" },
    { icon: CheckSquareIcon, label: "Task List", prefix: "- [ ] ", suffix: "" },
    { icon: TableIcon, label: "Table", prefix: "| Header | Header |\n| --- | --- |\n| Cell | Cell |", suffix: "" },
  ],
];

const MarkdownToolbar = ({ editorRef, showLineNumbers, toggleShowLineNumbers }: MarkdownToolbarProps) => {
  const handleInsert = (prefix: string, suffix: string = "") => {
    editorRef.current?.insertText("", prefix, suffix);
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
      const text = await navigator.clipboard.readText();
      editorRef.current?.insertText(text);
    } catch (err) {
      // Fallback: trigger paste via execCommand
      document.execCommand("paste");
    }
    editorRef.current?.focus();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-border bg-muted/20 sticky top-0 z-10">
      <TooltipProvider>
        {/* Undo/Redo/Paste group */}
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo}>
                <Undo2Icon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Undo</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRedo}>
                <Redo2Icon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Redo</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePaste}>
                <ClipboardIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Paste</p></TooltipContent>
          </Tooltip>
        </div>
        <div className="w-[1px] h-5 bg-border mx-1" />

        {actionGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-0.5">
            {group.map((action) => (
              <Tooltip key={action.label}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleInsert(action.prefix, action.suffix)}
                  >
                    <action.icon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {groupIndex < actionGroups.length - 1 && (
              <div className="w-[1px] h-5 bg-border mx-1" />
            )}
          </div>
        ))}
      </TooltipProvider>

      {/* Spacer to push line numbers toggle to right */}
      <div className="flex-1" />

      {/* Line numbers toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", showLineNumbers && "bg-muted-foreground/20")}
              onClick={toggleShowLineNumbers}
            >
              <HashIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle Line Numbers</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default MarkdownToolbar;


