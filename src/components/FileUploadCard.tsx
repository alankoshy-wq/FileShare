import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FolderUp, Link2, Copy, Check, Loader2, ExternalLink, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BlockBlobClient } from "@azure/storage-blob";

interface FileWithRelativePath extends File {
  webkitRelativePath: string;
}

export const FileUploadCard = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [shareableLink, setShareableLink] = useState("");
  const [uploadedFilesList, setUploadedFilesList] = useState<{ name: string, url: string }[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const [uploadProgress, setUploadProgress] = useState("");

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

    setIsUploading(true);
    setUploadProgress(`0/${files.length}`);
    toast({
      title: "Transfer initiated",
      description: `Starting upload for ${files.length} file${files.length > 1 ? 's' : ''}...`,
    });

    try {
      const transferId = crypto.randomUUID();
      let completedCount = 0;

      // Upload files in parallel
      const uploadPromises = files.map(async (file) => {
        try {
          // 1. Get SAS Token from Backend
          // Use webkitRelativePath if available to preserve folder structure
          const relativePath = (file as FileWithRelativePath).webkitRelativePath;
          const filePath = relativePath || file.name;
          const blobName = `${transferId}/${filePath}`;

          const response = await fetch(`http://localhost:3000/api/sas?file=${encodeURIComponent(blobName)}`);
          if (!response.ok) {
            throw new Error(`Failed to get upload permission for ${file.name}`);
          }
          const { sasTokenUrl } = await response.json();

          // 2. Upload to Azure Blob Storage
          const blockBlobClient = new BlockBlobClient(sasTokenUrl);
          await blockBlobClient.uploadData(file);

          // Update progress
          completedCount++;
          setUploadProgress(`${completedCount}/${files.length}`);

          // 3. Return result
          const publicUrl = sasTokenUrl.split('?')[0];
          return { name: filePath, url: publicUrl };
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          throw error;
        }
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Generate the single shareable link
      const transferLink = `${window.location.origin}/share/${transferId}`;
      setShareableLink(transferLink);

      // We don't need the individual file list for links anymore, but we keep it for the email payload if needed
      // However, for the UI, we just show the single link.
      setUploadedFilesList([{ name: "Transfer Link", url: transferLink }]);

      toast({
        title: "Transfer complete!",
        description: "All files uploaded successfully",
      });

      // 4. Send Email (if recipient provided)
      if (recipientEmail) {
        try {
          await fetch('http://localhost:3000/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientEmail,
              files: uploadedFiles,
              shareLink: transferLink,
              message
            })
          });
          toast({
            title: "Email sent",
            description: `Notification sent to ${recipientEmail}`,
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          toast({
            title: "Email failed",
            description: "Could not send notification email",
            variant: "destructive"
          });
        }
      }

      // 5. Lock transfer with password if provided
      if (password && password.trim().length > 0) {
        try {
          await fetch(`http://localhost:3000/api/transfer/${transferId}/lock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
          });
          toast({
            title: "Transfer secured",
            description: "Password protection enabled",
          });
        } catch (lockError) {
          console.error('Failed to lock transfer:', lockError);
          toast({
            title: "Password protection failed",
            description: "Transfer uploaded but password protection could not be enabled",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: "One or more files failed to upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress("");
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
            <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
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
              Shareable links
            </Label>
            <div className="space-y-2">
              {uploadedFilesList.map((file, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={file.url}
                    readOnly
                    className="bg-accent border-border font-mono text-sm"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(file.url);
                      toast({
                        title: "Link copied!",
                        description: `Link for ${file.name} copied to clipboard`,
                      });
                    }}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Copy link"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => window.open(file.url, '_blank')}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Download file"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
