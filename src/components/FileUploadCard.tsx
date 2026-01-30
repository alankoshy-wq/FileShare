
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FolderUp, Link2, Copy, Check, Loader2, ExternalLink, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUpload } from "@/contexts/UploadContext";

interface FileWithRelativePath extends File {
  webkitRelativePath: string;
}

export const FileUploadCard = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [shareableLink, setShareableLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Consuming global context
  const { startUpload, isUploading, uploadProgress } = useUpload();

  const { toast } = useToast();
  const { token } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleTransfer = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to transfer",
        variant: "destructive",
      });
      return;
    }

    // Start Global Upload
    try {
      const link = await startUpload(files, recipientEmail, message, password);
      if (link) {
        setShareableLink(link);
        // Clear form
        setFiles([]);
        setRecipientEmail("");
        setMessage("");
        setPassword("");
      }
    } catch (error) {
      console.error("Initiation failed", error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink);
    setLinkCopied(true);
    toast({
      title: "Link copied!",
      description: "Share this link with your recipients",
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-md bg-card rounded-2xl shadow-[var(--shadow-card)] p-6 sm:p-8 transition-shadow hover:shadow-[var(--shadow-hover)]">
      <h2 className="text-xl font-semibold mb-6 text-foreground">Share Files</h2>

      <div className="space-y-6">
        {/* File Upload Buttons */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-1 sm:gap-2 p-3 sm:p-6 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors h-full">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center">
                <Upload className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground">Add files</span>
            </div>
          </label>

          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              {...{ webkitdirectory: "", directory: "" } as any}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center gap-1 sm:gap-2 p-3 sm:p-6 bg-secondary rounded-xl hover:bg-secondary/80 transition-colors h-full">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center">
                <FolderUp className="w-4 h-4 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground">Add folders</span>
            </div>
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-2">Selected Files ({files.length})</p>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
              {files.map((file, index) => {
                const relativePath = (file as FileWithRelativePath).webkitRelativePath;
                const displayName = relativePath || file.name;
                return (
                  <div key={`${displayName}-${index}`} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg group hover:bg-accent transition-colors">
                    <span className="text-sm text-foreground truncate max-w-[200px]" title={displayName}>
                      {displayName}
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:text-red-600 hover:bg-red-50 ring-1 ring-red-500/20 hover:ring-red-500 transition-all duration-200"
                      title="Remove file"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Recipient email (optional)
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="recipient@example.com"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="bg-input border-border"
          />
        </div>

        {/* Message Input */}
        <div className="space-y-2">
          <Label htmlFor="message" className="text-sm font-medium">
            Message (optional)
          </Label>
          <Textarea
            id="message"
            placeholder="Add a message to your transfer"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-input border-border resize-none"
            rows={3}
          />
        </div>

        {/* Password (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground">
            Password (Optional)
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Protect with password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-input border-border"
          />
        </div>

        {/* Transfer Button */}
        <Button
          onClick={handleTransfer}
          className="w-full h-12 text-base font-semibold"
          size="lg"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading {uploadProgress}...
            </>
          ) : (
            "Transfer"
          )}
        </Button>

        {/* Shareable Links */}
        {shareableLink && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Shareable link
            </Label>
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <Input
                  value={shareableLink}
                  readOnly
                  className="bg-accent border-border font-mono text-sm"
                />
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title={linkCopied ? "Copied" : "Copy link"}
                >
                  {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  onClick={() => window.open(shareableLink, '_blank')}
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Open link"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
