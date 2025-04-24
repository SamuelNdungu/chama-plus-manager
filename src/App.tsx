
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ChamaProvider } from "./context/ChamaContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import AddMember from "./pages/AddMember";
import Contributions from "./pages/Contributions";
import AddContribution from "./pages/AddContribution";
import Meetings from "./pages/Meetings";
import Assets from "./pages/Assets";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import MemberDetails from "./pages/MemberDetails";
import EditMember from "./pages/EditMember";
import { useAuth } from "./context/AuthContext";

const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    // Show loading state while checking authentication
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// App Routes component to be wrapped with AuthProvider
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Dashboard />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/members" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Members />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/members/add" element={
        <ProtectedRoute>
          <ChamaProvider>
            <AddMember />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/members/:id" element={
        <ProtectedRoute>
          <ChamaProvider>
            <MemberDetails />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/members/:id/edit" element={
        <ProtectedRoute>
          <ChamaProvider>
            <EditMember />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/contributions" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Contributions />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/contributions/add" element={
        <ProtectedRoute>
          <ChamaProvider>
            <AddContribution />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/meetings" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Meetings />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/assets" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Assets />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/documents" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Documents />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Settings />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      
      {/* Catch all other routes */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// This is the main App component that needs to be a proper React component
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
