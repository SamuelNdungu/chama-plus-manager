import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ChamaProvider } from "./context/ChamaContext";
import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/ui/loader";
// Immediate load (essential for initial render)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { useAuth } from "./context/AuthContext";

// Lazy load (code splitting for better performance)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Members = lazy(() => import("./pages/Members"));
const AddMember = lazy(() => import("./pages/AddMember"));
const MemberDetails = lazy(() => import("./pages/MemberDetails"));
const EditMember = lazy(() => import("./pages/EditMember"));
const Contributions = lazy(() => import("./pages/Contributions"));
const ContributionDetails = lazy(() => import("./pages/ContributionDetails"));
const AddContribution = lazy(() => import("./pages/AddContribution"));
const ArrearsBoard = lazy(() => import("./pages/ArrearsBoard"));
const Meetings = lazy(() => import("./pages/Meetings"));
const Assets = lazy(() => import("./pages/Assets"));
const AddAsset = lazy(() => import("./pages/AddAsset"));
const AssetDetails = lazy(() => import("./pages/AssetDetails"));
const NetWorthDashboard = lazy(() => import("./pages/NetWorthDashboard"));
const Investments = lazy(() => import("./pages/Investments"));
const Loans = lazy(() => import("./pages/Loans"));
const ApplyLoan = lazy(() => import("./pages/ApplyLoan"));
const LoanDetails = lazy(() => import("./pages/LoanDetails"));
const Documents = lazy(() => import("./pages/Documents"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
      
      {/* Protected routes */}
      <Route path="/signup" element={
        <ProtectedRoute>
          <Signup />
        </ProtectedRoute>
      } />
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
      <Route path="/contributions/:id" element={
        <ProtectedRoute>
          <ChamaProvider>
            <ContributionDetails />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/arrears" element={
        <ProtectedRoute>
          <ChamaProvider>
            <ArrearsBoard />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/investments" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Investments />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/loans" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Loans />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/loans/apply" element={
        <ProtectedRoute>
          <ChamaProvider>
            <ApplyLoan />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/loans/:id" element={
        <ProtectedRoute>
          <ChamaProvider>
            <LoanDetails />
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
      <Route path="/assets/add" element={
        <ProtectedRoute>
          <ChamaProvider>
            <AddAsset />
          </ChamaProvider>
        </ProtectedRoute>
      } />      <Route path="/assets/:id" element={
        <ProtectedRoute>
          <ChamaProvider>
            <AssetDetails />
          </ChamaProvider>
        </ProtectedRoute>
      } />
      <Route path="/net-worth" element={
        <ProtectedRoute>
          <ChamaProvider>
            <NetWorthDashboard />
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
      <Route path="/reports" element={
        <ProtectedRoute>
          <ChamaProvider>
            <Reports />
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
    </Suspense>
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
