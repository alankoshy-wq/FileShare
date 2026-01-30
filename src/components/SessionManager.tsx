
import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Smartphone, Monitor, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

interface Session {
    sessionId: string;
    email: string;
    userAgent: string;
    ip: string;
    createdAt: string;
    expiresAt: string;
}

interface SessionManagerProps {
    token: string | null;
    refreshMetrics?: () => void;
}

export function SessionManager({ token, refreshMetrics }: SessionManagerProps) {
    const { user: currentUser } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRevoking, setIsRevoking] = useState(false);
    const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/admin/sessions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions);
            } else {
                toast.error("Failed to load sessions");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading sessions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchSessions();
    }, [token]);

    const handleRevoke = async () => {
        if (!sessionToRevoke) return;
        setIsRevoking(true);

        try {
            const res = await fetch(`/api/admin/sessions/${sessionToRevoke}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success("Session revoked");
                setSessions(sessions.filter(s => s.sessionId !== sessionToRevoke));
                setSessionToRevoke(null);
                if (refreshMetrics) refreshMetrics();
            } else {
                toast.error("Failed to revoke session");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error revoking session");
        } finally {
            setIsRevoking(false);
        }
    };

    const getDeviceIcon = (ua: string) => {
        if (/mobile/i.test(ua)) return <Smartphone className="h-4 w-4 text-muted-foreground mr-2 inline" />;
        return <Monitor className="h-4 w-4 text-muted-foreground mr-2 inline" />;
    };

    const formatUserAgent = (ua: string) => {
        // Simple parser for display
        if (ua.includes('Windows')) return 'Windows PC';
        if (ua.includes('Macintosh')) return 'Mac';
        if (ua.includes('Linux')) return 'Linux';
        if (ua.includes('Android')) return 'Android';
        if (ua.includes('iPhone')) return 'iPhone';
        return 'Unknown Device';
    };

    return (
        <div className="rounded-md border relative min-h-[200px]">
            {loading && <LoadingOverlay message="Loading Active Sessions..." />}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Expires At</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sessions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center">No active sessions found.</TableCell>
                        </TableRow>
                    ) : (
                        sessions.map((session) => (
                            <TableRow key={session.sessionId}>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{session.email}</span>
                                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">{session.sessionId.substring(0, 8)}...</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center">
                                        {getDeviceIcon(session.userAgent)}
                                        <div className="flex flex-col">
                                            <span className="text-sm">{formatUserAgent(session.userAgent)}</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={session.userAgent}>
                                                {session.userAgent}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">{session.ip}</TableCell>
                                <TableCell>{format(new Date(session.createdAt), 'MMM d, HH:mm')}</TableCell>
                                <TableCell>{format(new Date(session.expiresAt), 'MMM d, HH:mm')}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSessionToRevoke(session.sessionId)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Revoke Session"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Revoke Confirmation Modal */}
            {sessionToRevoke && (
                <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 space-y-6 text-left">
                        <div className="space-y-2 text-center">
                            <h2 className="text-2xl font-bold text-foreground">Revoke Session</h2>
                            <p className="text-muted-foreground">
                                Are you sure you want to revoke this session? The user will be logged out immediately.
                            </p>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-center">
                            <Button
                                variant="outline"
                                onClick={() => setSessionToRevoke(null)}
                                disabled={isRevoking}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleRevoke}
                                disabled={isRevoking}
                                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isRevoking ? "Revoking..." : "Yes, Revoke Session"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
