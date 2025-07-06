import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { SessionProvider } from "./contexts/SessionContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { Skeleton } from "./components/ui/skeleton";
import { ThemeProvider } from "./components/ThemeProvider";
import PwaUpdater from "./components/PwaUpdater";

const queryClient = new QueryClient();

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EmployeeManagement = lazy(() => import("./pages/EmployeeManagement"));
const Login = lazy(() => import("./pages/Login"));
const DemandDetails = lazy(() => import("./pages/DemandDetails"));
const Locations = lazy(() => import("./pages/Locations"));
const LocationDetails = lazy(() => import("./pages/LocationDetails"));
const UserWorkReport = lazy(() => import("./pages/UserWorkReport"));

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="space-y-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
    </div>
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionProvider>
            <PwaUpdater />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/employees" element={<EmployeeManagement />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/locations/:id" element={<LocationDetails />} />
                    <Route path="/demands/:id" element={<DemandDetails />} />
                    <Route path="/reports/users" element={<UserWorkReport />} />
                  </Route>
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </SessionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;