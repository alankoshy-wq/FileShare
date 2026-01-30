
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

interface AuditLog {
    id: string;
    email: string;
    action: string;
    details: any;
    ip?: string;
    timestamp: string;
}

interface AuditLogManagerProps {
    token: string | null;
}

export function AuditLogManager({ token }: AuditLogManagerProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const logRes = await fetch('/api/admin/logs?limit=100', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (logRes.ok) {
                    const data = await logRes.json();
                    setLogs(data.logs);
                }
            } catch (error) {
                console.error("Error loading logs", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchLogs();
    }, [token]);

    const filteredLogs = logs.filter(log =>
        log.email.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-card border rounded-lg shadow-sm relative min-h-[400px]">
            {loading && <LoadingOverlay message="Loading Audit Logs..." />}
            <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-semibold">Audit Logs</h2>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by email or action..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-6 py-4 font-medium">Timestamp</th>
                            <th className="px-6 py-4 font-medium">User</th>
                            <th className="px-6 py-4 font-medium">Action</th>
                            <th className="px-6 py-4 font-medium">Details</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                    No logs found.
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium">{log.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                                                log.action.includes('LOGIN') ? 'bg-green-100 text-green-800' :
                                                    'bg-blue-100 text-blue-800'}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate text-muted-foreground">
                                        {log.details?.name || log.details?.company ? (
                                            <div className="flex flex-col text-xs">
                                                {log.details.name && <span>Name: {log.details.name}</span>}
                                                {log.details.company && <span>Company: {log.details.company}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-xs italic opacity-50">No info</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedLog(log)}
                                            className="text-primary hover:text-primary/80"
                                        >
                                            More...
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Audit Log Details</DialogTitle>
                        <DialogDescription>
                            Detailed information for this activity.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <span className="text-sm font-semibold">User:</span>
                            <span className="col-span-3 text-sm">{selectedLog?.email}</span>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <span className="text-sm font-semibold">Action:</span>
                            <span className="col-span-3 text-sm">{selectedLog?.action}</span>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <span className="text-sm font-semibold">Time:</span>
                            <span className="col-span-3 text-sm">
                                {selectedLog?.timestamp && new Date(selectedLog.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <span className="text-sm font-semibold">IP:</span>
                            <span className="col-span-3 text-sm font-mono">{selectedLog?.ip || 'Unknown'}</span>
                        </div>
                        <div className="space-y-2">
                            <span className="text-sm font-semibold">Full Data:</span>
                            <pre className="p-3 bg-muted rounded-md text-[10px] overflow-auto max-h-48">
                                {JSON.stringify(selectedLog?.details, null, 2)}
                            </pre>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
