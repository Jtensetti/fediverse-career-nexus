
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

const MarkdownEditor = ({
  value,
  onChange,
  placeholder = "Write your content in Markdown...",
  label = "Content",
}: MarkdownEditorProps) => {
  const [tab, setTab] = useState<"write" | "preview">("write");

  const handleInsertMarkdown = (markdownType: string) => {
    let textToInsert = "";
    const textarea = document.getElementById("markdown-textarea") as HTMLTextAreaElement;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = value.substring(selectionStart, selectionEnd);
    
    switch (markdownType) {
      case "bold":
        textToInsert = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        textToInsert = `*${selectedText || "italic text"}*`;
        break;
      case "heading":
        textToInsert = `\n## ${selectedText || "Heading"}\n`;
        break;
      case "link":
        textToInsert = `[${selectedText || "link text"}](url)`;
        break;
      case "image":
        textToInsert = `\n![${selectedText || "alt text"}](image-url)\n`;
        break;
      case "list":
        textToInsert = `\n- List item 1\n- List item 2\n- List item 3\n`;
        break;
      case "code":
        textToInsert = `\`\`\`\n${selectedText || "code here"}\n\`\`\``;
        break;
      case "quote":
        textToInsert = `\n> ${selectedText || "Quote"}\n`;
        break;
      default:
        textToInsert = "";
    }

    const newText =
      value.substring(0, selectionStart) +
      textToInsert +
      value.substring(selectionEnd);
    
    onChange(newText);
    
    // Set focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPosition = selectionStart + textToInsert.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor="markdown-textarea">{label}</Label>}
      
      <div className="border rounded-md">
        <div className="p-2 bg-gray-50 border-b flex items-center gap-1 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleInsertMarkdown("bold")}
          >
            <strong>B</strong>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleInsertMarkdown("italic")}
          >
            <em>I</em>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleInsertMarkdown("heading")}
          >
            H
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleInsertMarkdown("link")}
          >
            🔗
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleInsertMarkdown("image")}
          >
            🖼️
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleInsertMarkdown("list")}
          >
            📋
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleInsertMarkdown("code")}
          >
            {"</>"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleInsertMarkdown("quote")}
          >
            💬
          </Button>
        </div>

        <Tabs defaultValue="write" value={tab} onValueChange={(value) => setTab(value as "write" | "preview")}>
          <div className="px-2 pt-2 border-b bg-gray-50">
            <TabsList className="bg-transparent">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="write" className="p-0 mt-0">
            <Textarea
              id="markdown-textarea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="min-h-[300px] border-0 rounded-t-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </TabsContent>
          
          <TabsContent value="preview" className="p-4 mt-0 prose max-w-none min-h-[300px]">
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-400">Nothing to preview</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MarkdownEditor;
