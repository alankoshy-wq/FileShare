
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setSubmitted(true);
            } else {
                toast.error(data.error || 'Request failed');
            }
        } catch (error) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Check your email</CardTitle>
                        <CardDescription>
                            If an account exists for {email}, we have sent a password reset link to it.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Link to="/login" className="w-full">
                            <Button variant="outline" className="w-full">
                                Back to Login
                            </Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="relative space-y-1">
                    <div className="flex items-center justify-center min-h-[40px]">
                        <Link to="/login" className="absolute left-4">
                            <Button variant="ghost" size="icon" className="h-10 w-10">
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <CardTitle className="text-3xl font-bold">Forgot Password</CardTitle>
                    </div>
                    <CardDescription className="text-center">
                        Enter your email address to receive a password reset link.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Reset Link
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
