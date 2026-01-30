
import React, { createContext, useContext, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface UploadContextType {
    isUploading: boolean;
    uploadProgress: string;
    files: File[];
    startUpload: (files: File[], email?: string, message?: string, password?: string) => Promise<string | void>;
    cancelUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [files, setFiles] = useState<File[]>([]);

    // We can use a ref to store the abort controller if we want to support cancellation
    const abortControllerRef = useRef<AbortController | null>(null);

    const startUpload = async (filesToUpload: File[], recipientEmail?: string, message?: string, password?: string) => {
        setIsUploading(true);
        setFiles(filesToUpload);
        setUploadProgress(`0/${filesToUpload.length}`);
        const token = localStorage.getItem('token');

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        try {
            const transferId = uuidv4();
            let completedCount = 0;

            const uploadPromises = filesToUpload.map(async (file) => {
                if (signal.aborted) throw new Error('Upload cancelled');

                // 1. Get SAS Token
                const relativePath = (file as any).webkitRelativePath || file.name;
                const blobName = `${transferId}/${relativePath}`;
                const contentType = file.type || 'application/octet-stream';

                const sasRes = await fetch(`/api/sas?file=${encodeURIComponent(blobName)}&contentType=${encodeURIComponent(contentType)}`);
                if (!sasRes.ok) throw new Error(`Failed to get upload permission for ${file.name}`);
                const { sasTokenUrl } = await sasRes.json();

                // 2. Upload to GCS
                const uploadRes = await fetch(sasTokenUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': contentType },
                    body: file,
                    signal
                });

                if (!uploadRes.ok) throw new Error(`Failed to upload ${file.name}`);

                completedCount++;
                setUploadProgress(`${completedCount}/${filesToUpload.length}`);
                return { name: relativePath, url: sasTokenUrl };
            });

            await Promise.all(uploadPromises);

            // 3. Finalize
            let transferName = "Untitled Transfer";
            if (filesToUpload.length > 0) {
                const first = filesToUpload[0].name;
                transferName = filesToUpload.length === 1 ? first : `${first} + ${filesToUpload.length - 1} others`;
            }

            const totalSize = filesToUpload.reduce((acc, file) => acc + file.size, 0);

            await fetch(`/api/transfer/${transferId}/finalize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify({
                    name: transferName,
                    size: totalSize,
                    fileCount: filesToUpload.length
                })
            });

            // 4. Lock if password
            if (password && password.trim().length > 0) {
                await fetch(`/api/transfer/${transferId}/lock`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { 'Authorization': `Bearer ${token}` })
                    },
                    body: JSON.stringify({ password })
                });
            }

            // 5. Send Email
            const transferLink = `${window.location.origin}/share/${transferId}`;
            if (recipientEmail) {
                await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientEmail,
                        files: filesToUpload.map(f => ({ name: f.name, size: f.size })), // Simplified for email
                        shareLink: transferLink,
                        message
                    })
                });
            }

            // 6. Add to History
            if (token) {
                await fetch('/api/user/history', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ transferId })
                });
            }

            toast.success("Transfer complete!");
            return transferLink;

        } catch (error: any) {
            if (error.name === 'AbortError') {
                toast.info("Upload cancelled");
            } else {
                console.error("Upload failed", error);
                toast.error("Upload failed");
            }
        } finally {
            setIsUploading(false);
            setUploadProgress("");
            setFiles([]);
            abortControllerRef.current = null;
        }
    };

    const cancelUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    return (
        <UploadContext.Provider value={{ isUploading, uploadProgress, files, startUpload, cancelUpload }}>
            {children}
        </UploadContext.Provider>
    );
}

export function useUpload() {
    const context = useContext(UploadContext);
    if (!context) throw new Error('useUpload must be used within UploadProvider');
    return context;
}
