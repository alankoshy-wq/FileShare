
import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

interface User {
    email: string;
    name: string;
    role: string;
    createdAt: string;
}

interface UserManagerProps {
    token: string | null;
}

export function UserManager({ token }: UserManagerProps) {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            } else {
                toast.error("Failed to load users");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchUsers();
    }, [token]);

    const handleDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);

        try {
            const res = await fetch(`/api/admin/users/${userToDelete}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success("User deleted");
                setUsers(users.filter(u => u.email !== userToDelete));
                setUserToDelete(null);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete user");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error deleting user");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="rounded-md border relative min-h-[200px]">
            {loading && <LoadingOverlay message="Loading Users..." />}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">No users found.</TableCell>
                        </TableRow>
                    ) : (
                        users.map((user) => (
                            <TableRow key={user.email}>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {user.role}
                                    </span>
                                </TableCell>
                                <TableCell>{user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    {user.email !== currentUser?.email && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setUserToDelete(user.email)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Translucent Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 space-y-6 text-left">
                        <div className="space-y-2 text-center">
                            <h2 className="text-2xl font-bold text-foreground">Delete User</h2>
                            <p className="text-muted-foreground">
                                Are you sure you want to delete user <span className="font-semibold text-foreground">{userToDelete}</span>? This will delete all their files and history.
                            </p>
                        </div>
                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-center">
                            <Button
                                variant="outline"
                                onClick={() => setUserToDelete(null)}
                                disabled={isDeleting}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isDeleting ? "Deleting..." : "Yes, Delete User"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
