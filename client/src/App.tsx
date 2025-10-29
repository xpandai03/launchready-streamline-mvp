import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Header } from "@/components/Header";
import HomePage from "@/pages/HomePage";
import VideoListPage from "@/pages/VideoListPage";
import VideoDetailPage from "@/pages/VideoDetailPage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import SocialAccountsPage from "@/pages/settings/SocialAccountsPage";
import OAuthCallbackPage from "@/pages/OAuthCallbackPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <Header />
      <Switch>
        {/* Auth routes - public */}
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/auth/signup" component={SignupPage} />

        {/* OAuth callback - public */}
        <Route path="/oauth-callback" component={OAuthCallbackPage} />

        {/* Protected routes - require authentication */}
        <Route path="/">
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        </Route>
        <Route path="/videos">
          <ProtectedRoute>
            <VideoListPage />
          </ProtectedRoute>
        </Route>
        <Route path="/details/:id">
          <ProtectedRoute>
            <VideoDetailPage />
          </ProtectedRoute>
        </Route>
        <Route path="/settings/social-accounts">
          <ProtectedRoute>
            <SocialAccountsPage />
          </ProtectedRoute>
        </Route>

        {/* 404 */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
