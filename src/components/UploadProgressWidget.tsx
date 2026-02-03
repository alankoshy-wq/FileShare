
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUpload } from "@/contexts/UploadContext";
import { useLocation } from "react-router-dom";

export const UploadProgressWidget = () => {
    const { isUploading, uploadProgress, uploadPercentage, cancelUpload } = useUpload();
    const location = useLocation();

    if (!isUploading) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-card border shadow-lg rounded-lg p-4 w-[320px]">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Uploading Files...</p>
                    <p className="text-xs text-muted-foreground">{Math.round(uploadPercentage)}%</p>
                </div>

                <Progress value={uploadPercentage} className="h-2 mb-2" />

                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{uploadProgress} files</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelUpload}
                        className="h-6 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
};
