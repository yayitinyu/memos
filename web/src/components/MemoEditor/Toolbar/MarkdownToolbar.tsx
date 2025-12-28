import { BoldIcon, CheckSquareIcon, Code2Icon, CodeIcon, Heading1Icon, Heading2Icon, Heading3Icon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, QuoteIcon, StrikethroughIcon, TableIcon, HashIcon } from "lucide-react";
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
    { icon: Code2Icon, label: "Code Block", prefix: "\n```\n", suffix: "\n```\n" },
    { icon: QuoteIcon, label: "Quote", prefix: "\n> ", suffix: "" },
    { icon: LinkIcon, label: "Link", prefix: "[", suffix: "](url)" },
  ],
  // Headings
  [
    { icon: Heading1Icon, label: "Heading 1", prefix: "\n# ", suffix: "" },
    { icon: Heading2Icon, label: "Heading 2", prefix: "\n## ", suffix: "" },
    { icon: Heading3Icon, label: "Heading 3", prefix: "\n### ", suffix: "" },
  ],
  // Lists & Table
  [
    { icon: ListIcon, label: "Unordered List", prefix: "\n- ", suffix: "" },
    { icon: ListOrderedIcon, label: "Ordered List", prefix: "\n1. ", suffix: "" },
    { icon: CheckSquareIcon, label: "Task List", prefix: "\n- [ ] ", suffix: "" },
    { icon: TableIcon, label: "Table", prefix: "\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n", suffix: "" },
  ],
];

const MarkdownToolbar = ({ editorRef, showLineNumbers, toggleShowLineNumbers }: MarkdownToolbarProps) => {
  const handleInsert = (prefix: string, suffix: string = "") => {
    editorRef.current?.insertText("", prefix, suffix);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-border bg-muted/20">
      <TooltipProvider>
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

