import logo from "@/assets/logo.png";
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, ChevronDown, Trash2, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export const Header = () => {
  const { user, logout, isLoading } = useAuth();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        logout();
        window.location.href = '/';
      } else {
        alert("Failed to delete account");
        setIsDeleting(false);
      }
    } catch (e) {
      console.error(e);
      alert("Error deleting account");
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <img src={logo} alt="10xDS" className="h-8 w-auto" />
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                {isLoading ? (
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="h-9 w-20 bg-secondary rounded-md" />
                    <div className="h-9 w-24 bg-primary/10 rounded-md" />
                  </div>
                ) : user ? (
                  <div className="flex items-center gap-4">
                    <Link
                      to="/dashboard"
                      className="text-sm font-medium hidden sm:block px-4 py-2 rounded-md border border-transparent bg-secondary hover:bg-purple-50 hover:border-purple-300 transition-all mr-2"
                    >
                      My Transfers
                    </Link>
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2">
                          {user.name}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">Name: {user.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                              Email: {user.email}
                            </p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {user.role === 'admin' && (
                          <>
                            <DropdownMenuItem onClick={() => window.location.href = '/admin'} className="cursor-pointer font-semibold">
                              <ShieldAlert className="mr-2 h-4 w-4 text-primary" />
                              <span>Admin Dashboard</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}

                        <DropdownMenuItem
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete Account</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={logout} className="cursor-pointer">
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 transition-opacity duration-300 ease-in">
                    <Link to="/login">
                      <Button variant="ghost">Login</Button>
                    </Link>
                    <Link to="/register">
                      <Button>Get Started</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Full Screen Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-6 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-foreground">Delete Account</h2>
              <p className="text-muted-foreground">
                Are you sure you want to delete your account? This action is permanent and will delete all your files and data.
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-center">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete My Account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
