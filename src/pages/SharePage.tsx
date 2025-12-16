import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2, AlertCircle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordDialog } from "@/components/PasswordDialog";

interface TransferFile {
    name: string;
    url: string;
    size: number;
    contentType: string;
}

const SharePage = () => {
    const { id } = useParams<{ id: string }>();
    const [files, setFiles] = useState<TransferFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [password, setPassword] = useState("");
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [isLocked, setIsLocked] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchFiles = async (pwd?: string) => {
            try {
                const headers: HeadersInit = {};
                if (pwd) {
                    headers['x-transfer-password'] = pwd;
                }

                const response = await fetch(`http://localhost:3000/api/transfer/${id}`, { headers });

                if (response.status === 401) {
                    const errorData = await response.json();

                    setIsLocked(true);

                    // If password was provided but wrong, show error
                    if (pwd) {
                        setPasswordError(errorData.error || "Invalid password");
                        setShowPasswordDialog(true);
                    } else {
                        // First time, no password provided
                        setShowPasswordDialog(true);
                    }
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error("Failed to load transfer details");
                }

                const data = await response.json();
                setFiles(data.files);
                setShowPasswordDialog(false);
                setPasswordError("");
                setIsLocked(false);
            } catch (err) {
                console.error(err);
                setError("Transfer not found or expired");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchFiles(password);
        }
    }, [id, password]);

    const handleDownload = async (file: TransferFile) => {
        try {
            const response = await fetch(file.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Download started",
                description: `Downloading ${file.name}...`,
            });
        } catch (error) {
            toast({
                title: "Download failed",
                description: "Could not download file",
                variant: "destructive",
            });
        }
    };

    const handleDownloadAll = async () => {
        try {
            const headers: HeadersInit = {};
            if (password) {
                headers['x-transfer-password'] = password;
            }

            const response = await fetch(`http://localhost:3000/api/transfer/${id}/zip`, { headers });

            if (!response.ok) {
                throw new Error('Failed to download zip');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transfer-${id}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
                title: "Download started",
                description: "Downloading all files as zip...",
            });
        } catch (error) {
            toast({
                title: "Download failed",
                description: "Could not download files",
                variant: "destructive",
            });
        }
    };

    const handlePasswordSubmit = (pwd: string) => {
        setPassword(pwd);
        setPasswordError("");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md border-destructive/50">
                    <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
                        <AlertCircle className="w-12 h-12 text-destructive" />
                        <h2 className="text-xl font-semibold text-foreground">{error}</h2>
                        <p className="text-muted-foreground">The transfer link may be invalid or expired.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Shared Files</h1>
                    <p className="text-muted-foreground">
                        {files.length} file{files.length !== 1 ? 's' : ''} ready for download
                    </p>
                </div>

                <Card className="border-border/50 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle className="text-lg font-medium">Files</CardTitle>
                        {files.length > 1 && (
                            <Button onClick={handleDownloadAll} variant="secondary" size="sm">
                                <Download className="w-4 h-4 mr-2" />
                                Download All
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLocked && files.length === 0 && (
                            <div
                                className="flex items-center gap-3 p-4 rounded-lg border-2 border-destructive bg-destructive/10 cursor-pointer hover:bg-destructive/20 transition-colors"
                                onClick={() => setShowPasswordDialog(true)}
                            >
                                <Lock className="w-5 h-5 text-destructive shrink-0" />
                                <div>
                                    <p className="font-medium text-destructive">Files are locked</p>
                                    <p className="text-sm text-destructive/80">Enter the password to view and download files</p>
                                </div>
                            </div>
                        )}
                        {files.map((file, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate text-foreground" title={file.name}>
                                            {file.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleDownload(file)}
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Download"
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
            {/* Navigation to Home */}
            <div className="mt-8 text-center">
                <Button
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                >
                    Send more files
                </Button>
            </div>

            {/* Password Dialog */}
            <PasswordDialog
                open={showPasswordDialog}
                onSubmit={handlePasswordSubmit}
                onCancel={() => setShowPasswordDialog(false)}
                error={passwordError}
            />
        </div>
    );
};

export default SharePage;
