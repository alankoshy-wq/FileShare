import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, ExternalLink, Calendar, FileText, ArrowUpDown, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/Header";
import { Link } from "react-router-dom";

interface Transfer {
    id: string;
    createdAt: string | null;
    name?: string | null;
}

export default function MyTransfers() {
    const { user, token } = useAuth();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

    useEffect(() => {
        document.title = "Transfer History | SendShare";
    }, []);

    useEffect(() => {
        if (token) {
            fetchTransfers();
        }
    }, [token]);

    const fetchTransfers = async () => {
        try {
            const res = await fetch("/api/user/transfers", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setTransfers(data.transfers);
            } else {
                console.error("Failed to fetch transfers");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const copyLink = (id: string) => {
        const link = `${window.location.origin}/share/${id}`;
        navigator.clipboard.writeText(link);
        toast.success("Link copied to clipboard");
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this transfer? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/transfer/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.ok) {
                toast.success("Transfer deleted");
                // Remove from local list immediately
                setTransfers(prev => prev.filter(t => t.id !== id));
            } else {
                toast.error("Failed to delete transfer");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Error deleting transfer");
        }
    };

    const filteredTransfers = [...transfers].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    if (!user) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="pt-24 pb-12 px-4">
                    <div className="container mx-auto max-w-4xl">
                        <Card className="text-center py-12">
                            <CardHeader>
                                <CardTitle className="text-2xl">Access Restricted</CardTitle>
                                <CardDescription>
                                    Please log in to view your transfer history.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-center mb-6">
                                    <FileText className="h-16 w-16 text-muted-foreground/30" />
                                </div>
                                <Button asChild size="lg">
                                    <a href="/login">Log In</a>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <div className="pt-24 pb-12 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="mb-6">
                        <Link to="/">
                            <Button variant="ghost" size="sm" className="pl-0 hover:pl-2 transition-all">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Home
                            </Button>
                        </Link>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">Transfer History</h1>
                            <p className="text-muted-foreground mt-1">
                                Manage your shared files and links
                            </p>
                        </div>

                        {transfers.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground hidden sm:inline-block">Sort by:</span>
                                <Select value={sortOrder} onValueChange={(val: "newest" | "oldest") => setSortOrder(val)}>
                                    <SelectTrigger className="w-[180px]">
                                        <div className="flex items-center gap-2">
                                            <ArrowUpDown className="w-4 h-4" />
                                            <SelectValue placeholder="Sort order" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="newest">Newest First</SelectItem>
                                        <SelectItem value="oldest">Oldest First</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : transfers.length === 0 ? (
                        <Card className="text-center py-12">
                            <CardContent>
                                <div className="flex justify-center mb-4">
                                    <FileText className="h-12 w-12 text-muted-foreground/50" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">No transfers yet</h3>
                                <p className="text-muted-foreground mb-6">
                                    You haven't shared any files yet.
                                </p>
                                <Button asChild>
                                    <a href="/">Start Sharing</a>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {filteredTransfers.map((transfer) => (
                                <Card key={transfer.id} className="overflow-hidden transition-all hover:shadow-md">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-lg">
                                                        {/* Show Name if available, else ID */}
                                                        {transfer.name || transfer.id}
                                                    </span>
                                                    {!transfer.name && (
                                                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                                                            ID
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>
                                                        {transfer.createdAt
                                                            ? format(new Date(transfer.createdAt), "PPP p")
                                                            : "Unknown date"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => copyLink(transfer.id)}
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy Link
                                                </Button>
                                                <Button asChild size="sm">
                                                    <a href={`/share/${transfer.id}`} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        View
                                                    </a>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(transfer.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
