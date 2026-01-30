
import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

interface Transfer {
    id: string;
    name?: string;
    createdAt: string;
    passwordHash?: string;
    sizeBytes?: number;
    fileCount?: number;
    creatorEmail?: string;
}

interface TransferManagerProps {
    token: string | null;
}

export function TransferManager({ token }: TransferManagerProps) {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTransfers = async () => {
        try {
            const res = await fetch('/api/admin/transfers?limit=50', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTransfers(data.transfers);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load transfers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchTransfers();
    }, [token]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this transfer? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/admin/transfers/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success("Transfer deleted");
                setTransfers(transfers.filter(t => t.id !== id));
            } else {
                toast.error("Failed to delete transfer");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error deleting transfer");
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="rounded-md border relative min-h-[200px]">
            {loading && <LoadingOverlay message="Loading Transfers..." />}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Transfer Name / ID</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>User Email</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Protected</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transfers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">No transfers found.</TableCell>
                        </TableRow>
                    ) : (
                        transfers.map((transfer) => (
                            <TableRow key={transfer.id}>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{transfer.name || 'Untitled'}</span>
                                        <span className="text-xs text-muted-foreground text-ellipsis overflow-hidden max-w-[200px]">{transfer.id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{transfer.sizeBytes ? formatBytes(transfer.sizeBytes) : '-'}</TableCell>
                                <TableCell>
                                    <span className="text-xs">{transfer.creatorEmail || 'Guest'}</span>
                                </TableCell>
                                <TableCell>{transfer.createdAt ? format(new Date(transfer.createdAt), 'MMM d, yyyy HH:mm') : 'N/A'}</TableCell>
                                <TableCell>{transfer.passwordHash ? 'Yes' : 'No'}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" asChild>
                                            <a href={`/share/${transfer.id}`} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(transfer.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
