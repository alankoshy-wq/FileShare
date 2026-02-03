
import React, { createContext, useContext, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface UploadContextType {
    isUploading: boolean;
    uploadProgress: string;
    uploadPercentage: number;
    files: File[];
    startUpload: (files: File[], email?: string, message?: string, password?: string) => Promise<string | void>;
    cancelUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [uploadPercentage, setUploadPercentage] = useState(0);
    const [files, setFiles] = useState<File[]>([]);

    // We can use a ref to store the abort controller if we want to support cancellation
    // For XHR we need to store the requests
    const xhrRefs = useRef<XMLHttpRequest[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    const startUpload = async (filesToUpload: File[], recipientEmail?: string, message?: string, password?: string) => {
        setIsUploading(true);
        setFiles(filesToUpload);
        setUploadProgress(`0/${filesToUpload.length}`);
        setUploadPercentage(0);
        const token = localStorage.getItem('token');

        // We still use AbortController for the non-XHR parts (tokens, finalize, etc)
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;
        xhrRefs.current = [];

        try {
            const transferId = uuidv4();
            let completedCount = 0;
            const totalSize = filesToUpload.reduce((acc, file) => acc + file.size, 0);

            // Track progress per file
            const fileProgress = new Array(filesToUpload.length).fill(0);

            const updateAggregateProgress = () => {
                const totalLoaded = fileProgress.reduce((acc, curr) => acc + curr, 0);
                const percentage = totalSize > 0 ? (totalLoaded / totalSize) * 100 : 0;
                setUploadPercentage(Math.min(percentage, 100)); // Cap at 100
            };

            const uploadPromises = filesToUpload.map(async (file, index) => {
                if (signal.aborted) throw new Error('Upload cancelled');

                // 1. Get SAS Token
                const relativePath = (file as any).webkitRelativePath || file.name;
                const blobName = `${transferId}/${relativePath}`;
                const contentType = file.type || 'application/octet-stream';

                const sasRes = await fetch(`/api/sas?file=${encodeURIComponent(blobName)}&contentType=${encodeURIComponent(contentType)}`);
                if (!sasRes.ok) throw new Error(`Failed to get upload permission for ${file.name}`);
                const { sasTokenUrl } = await sasRes.json();

                // 2. Upload to GCS using XHR
                return new Promise<{ name: string, url: string }>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhrRefs.current.push(xhr);

                    xhr.open('PUT', sasTokenUrl);
                    xhr.setRequestHeader('Content-Type', contentType);

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            fileProgress[index] = event.loaded;
                            updateAggregateProgress();
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            completedCount++;
                            setUploadProgress(`${completedCount}/${filesToUpload.length}`);
                            // Ensure this file counts as fully loaded
                            fileProgress[index] = file.size;
                            updateAggregateProgress();
                            resolve({ name: relativePath, url: sasTokenUrl });
                        } else {
                            reject(new Error(`Failed to upload ${file.name}`));
                        }
                    };

                    xhr.onerror = () => reject(new Error(`Network error uploading ${file.name}`));
                    xhr.onabort = () => reject(new Error('Upload cancelled'));

                    xhr.send(file);
                });
            });

            await Promise.all(uploadPromises);

            // Ensure 100% at the end
            setUploadPercentage(100);

            // 3. Finalize
            let transferName = "Untitled Transfer";
            if (filesToUpload.length > 0) {
                const first = filesToUpload[0].name;
                transferName = filesToUpload.length === 1 ? first : `${first} + ${filesToUpload.length - 1} others`;
            }

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
            if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
                toast.info("Upload cancelled");
            } else {
                console.error("Upload failed", error);
                toast.error("Upload failed");
            }
        } finally {
            setIsUploading(false);
            setUploadProgress("");
            setUploadPercentage(0);
            setFiles([]);
            abortControllerRef.current = null;
            xhrRefs.current = [];
        }
    };

    const cancelUpload = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        xhrRefs.current.forEach(xhr => xhr.abort());
    };

    return (
        <UploadContext.Provider value={{ isUploading, uploadProgress, uploadPercentage, files, startUpload, cancelUpload }}>
            {children}
        </UploadContext.Provider>
    );
}

export function useUpload() {
    const context = useContext(UploadContext);
    if (!context) throw new Error('useUpload must be used within UploadProvider');
    return context;
}
