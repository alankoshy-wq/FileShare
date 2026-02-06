import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import Transfer from "./pages/Transfer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import MyTransfers from "./pages/MyTransfers";
import SharePage from "./pages/SharePage";
import NotFound from "./pages/NotFound";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import LandingPage from "./pages/LandingPage";

import { UploadProvider } from "@/contexts/UploadContext";
import { UploadProgressWidget } from "@/components/UploadProgressWidget";

const queryClient = new QueryClient();

// Component to handle First Run logic
const FirstRunHandler = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");

  // Check synchronously before render
  if (!hasSeenWelcome && location.pathname === "/") {
    return <Navigate to="/welcome" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <UploadProvider>
          <BrowserRouter>
            <FirstRunHandler>
              <Routes>
                {/* Default route is now the App (Transfer) */}
                <Route path="/" element={<Transfer />} />
                {/* Landing page is now at /welcome */}
                <Route path="/welcome" element={<LandingPage />} />

                <Route path="/transfer" element={<Transfer />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/dashboard" element={<MyTransfers />} />
                <Route path="/share/:id" element={<SharePage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </FirstRunHandler>
            <UploadProgressWidget />
          </BrowserRouter>
        </UploadProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
