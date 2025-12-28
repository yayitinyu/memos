import { BoldIcon, CheckSquareIcon, Code2Icon, CodeIcon, Heading1Icon, Heading2Icon, Heading3Icon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, QuoteIcon, StrikethroughIcon, TableIcon } from "lucide-react";
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

const MarkdownToolbar = ({ editorRef, showLineNumbers, toggleShowLineNumbers }: MarkdownToolbarProps) => {
  const handleInsert = (prefix: string, suffix: string = "") => {
    editorRef.current?.insertText("", prefix, suffix);
  };

  const actions = [
    { icon: BoldIcon, label: "Bold", prefix: "**", suffix: "**" },
    { icon: ItalicIcon, label: "Italic", prefix: "*", suffix: "*" },
    { icon: StrikethroughIcon, label: "Strikethrough", prefix: "~~", suffix: "~~" },
    { icon: CodeIcon, label: "Code", prefix: "`", suffix: "`" },
    { icon: Code2Icon, label: "Code Block", prefix: "\n```\n", suffix: "\n```\n" },
    { icon: QuoteIcon, label: "Quote", prefix: "\n> ", suffix: "" },
    { icon: LinkIcon, label: "Link", prefix: "[", suffix: "](url)" },
    { icon: Heading1Icon, label: "Heading 1", prefix: "\n# ", suffix: "" },
    { icon: Heading2Icon, label: "Heading 2", prefix: "\n## ", suffix: "" },
    { icon: Heading3Icon, label: "Heading 3", prefix: "\n### ", suffix: "" },
    { icon: ListIcon, label: "Unordered List", prefix: "\n- ", suffix: "" },
    { icon: ListOrderedIcon, label: "Ordered List", prefix: "\n1. ", suffix: "" },
    { icon: CheckSquareIcon, label: "Task List", prefix: "\n- [ ] ", suffix: "" },
    { icon: TableIcon, label: "Table", prefix: "\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n", suffix: "" },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-muted/20">
      <TooltipProvider>
        {actions.map((action) => (
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
      </TooltipProvider>
      <div className="w-[1px] h-6 bg-border mx-1" />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", showLineNumbers && "bg-muted-foreground/20")}
              onClick={toggleShowLineNumbers}
            >
              <ListOrderedIcon className="w-4 h-4" />
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
