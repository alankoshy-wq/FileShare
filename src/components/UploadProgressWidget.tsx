
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/contexts/UploadContext";
import { useLocation } from "react-router-dom";

export const UploadProgressWidget = () => {
    const { isUploading, uploadProgress, cancelUpload } = useUpload();
    const location = useLocation();

    // Optionally hide on the home page if the main card is visible, 
    // BUT since the card might scroll out of view, it's consistent to always show it 
    // or show it only when NOT on home.
    // Let's show it always for now to guarantee feedback.

    if (!isUploading) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-card border shadow-lg rounded-lg p-4 flex items-center gap-4 min-w-[300px]">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium">Uploading Files...</p>
                    <p className="text-xs text-muted-foreground">{uploadProgress}</p>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelUpload}
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
