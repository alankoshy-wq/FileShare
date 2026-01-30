import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Users, FileStack, Database, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from '@/components/MetricCard';
import { TransferManager } from '@/components/TransferManager';
import { UserManager } from '@/components/UserManager';
import { SessionManager } from '@/components/SessionManager';
import { AuditLogManager } from '@/components/AuditLogManager';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';


const AdminDashboard = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState({ totalUsers: 0, totalTransfers: 0, storageUsed: 'N/A', activeSessions: 0, bandwidthUsed: 'N/A' });
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("transfers");

    const fetchMetrics = async () => {
        try {
            const metricsRes = await fetch('/api/admin/metrics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (metricsRes.ok) {
                const data = await metricsRes.json();
                setMetrics(data.metrics);
            }
        } catch (error) {
            console.error("Error loading metrics", error);
        } finally {
            setMetricsLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchMetrics();

            // Set up polling for metrics every 10 seconds to keep counts fresh
            const interval = setInterval(fetchMetrics, 10000);
            return () => clearInterval(interval);
        }
    }, [token]);

    return (
        <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <ShieldAlert className="h-8 w-8 text-primary" />
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                </div>

                {/* Metric Cards */}
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <MetricCard
                        title="Total Users"
                        value={metrics.totalUsers}
                        icon={Users}
                        description="Registered accounts"
                        onClick={() => setActiveTab("users")}
                    />
                    <MetricCard
                        title="Total Transfers"
                        value={metrics.totalTransfers}
                        icon={FileStack}
                        description="All time transfers"
                        onClick={() => setActiveTab("transfers")}
                    />
                    <MetricCard
                        title="Storage Used"
                        value={metrics.storageUsed}
                        icon={Database}
                        description="GCS Bucket Usage"
                        onClick={() => setActiveTab("transfers")}
                    />
                    <MetricCard
                        title="Bandwidth Used"
                        value={metrics.bandwidthUsed || '0 B'}
                        icon={Activity}
                        description="All time egress"
                        onClick={() => setActiveTab("transfers")}
                    />
                    <MetricCard
                        title="Active Sessions"
                        value={metrics.activeSessions || 0}
                        icon={Activity}
                        description="Currently logged in"
                        onClick={() => setActiveTab("sessions")}
                    />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="transfers">Transfers</TabsTrigger>
                        <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="logs">Audit Logs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="transfers" className="space-y-4">
                        <TransferManager token={token} />
                    </TabsContent>



                    <TabsContent value="sessions" className="space-y-4">
                        <SessionManager token={token} refreshMetrics={fetchMetrics} />
                    </TabsContent>

                    <TabsContent value="users" className="space-y-4">
                        <UserManager token={token} />
                    </TabsContent>

                    <TabsContent value="logs" className="space-y-4">
                        <AuditLogManager token={token} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default AdminDashboard;
