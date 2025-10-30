import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CreditCard, Calendar, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserData {
  id: string;
  email: string;
  subscriptionStatus: string;
  stripeCustomerId?: string;
  subscriptionEndsAt?: string;
}

export default function BillingSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user data to check subscription status
  const { data: userData, isLoading: userLoading, refetch } = useQuery<UserData>({
    queryKey: ["/api/user"],
    enabled: !!user,
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/create-portal-session");
      return await response.json();
    },
    onSuccess: (data: { success: boolean; url: string }) => {
      if (data.success && data.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleManageSubscription = () => {
    if (!userData?.stripeCustomerId) {
      toast({
        title: "No Subscription Found",
        description: "You don't have an active subscription yet. Upgrade to Pro to get started.",
        variant: "destructive",
      });
      return;
    }

    portalMutation.mutate();
  };

  const handleUpgrade = () => {
    setLocation("/pricing");
  };

  const isPro = userData?.subscriptionStatus === "pro";
  const subscriptionEndsAt = userData?.subscriptionEndsAt
    ? new Date(userData.subscriptionEndsAt)
    : null;

  return (
    <div className="min-h-screen bg-black pt-24 pb-8 px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Billing & Subscription</h1>
            <p className="text-gray-400 mt-1">
              Manage your subscription and payment methods
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        {/* Current Plan Card */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  Current Plan
                  {isPro && (
                    <Badge className="bg-blue-600 text-white">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                  {!isPro && <Badge variant="outline" className="border-white/20 text-gray-300">Free</Badge>}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {isPro
                    ? "You have unlimited access to all features"
                    : "Upgrade to Pro for unlimited videos and posts"}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {isPro ? "$29" : "$0"}
                </div>
                <div className="text-sm text-gray-400">/month</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan Features */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Video Conversions</span>
                  <span className="font-medium text-white">
                    {isPro ? "Unlimited" : "3/month"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Social Media Posts</span>
                  <span className="font-medium text-white">
                    {isPro ? "Unlimited" : "3/month"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">AI Clip Selection</span>
                  <span className="font-medium text-white">✓ Included</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Priority Support</span>
                  <span className="font-medium text-white">
                    {isPro ? "✓ Included" : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Subscription Details for Pro Users */}
            {isPro && subscriptionEndsAt && (
              <div className="rounded-lg bg-white/5 p-4 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">Next billing date:</span>
                  <span className="font-medium text-white">
                    {subscriptionEndsAt.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              {isPro ? (
                <>
                  <Button
                    className="flex-1"
                    onClick={handleManageSubscription}
                    disabled={portalMutation.isPending || userLoading}
                  >
                    {portalMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Opening Portal...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Manage Subscription
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                  >
                    <Link href="/pricing">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Plans
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="flex-1"
                    onClick={handleUpgrade}
                    disabled={userLoading}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                  >
                    <Link href="/pricing">
                      View All Plans
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Billing Portal Info for Pro Users */}
        {isPro && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Manage Your Subscription</CardTitle>
              <CardDescription className="text-gray-400">
                Update payment method, view invoices, or cancel subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-400">
              <p>
                The Stripe Customer Portal allows you to:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Update your payment method</li>
                <li>View and download past invoices</li>
                <li>Update billing information</li>
                <li>Cancel your subscription (effective at end of billing period)</li>
              </ul>
              <p className="text-xs pt-2">
                All payment processing is securely handled by Stripe. We never store your
                payment information on our servers.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Free Tier Info */}
        {!isPro && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Why Upgrade to Pro?</CardTitle>
              <CardDescription className="text-gray-400">
                Unlock unlimited access and premium features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Unlimited Video Processing</p>
                    <p className="text-gray-400">
                      Convert as many videos to shorts as you need
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Unlimited Social Posting</p>
                    <p className="text-gray-400">
                      Post to Instagram, TikTok, and YouTube without limits
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Priority Support</p>
                    <p className="text-gray-400">
                      Get faster responses and dedicated assistance
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Cancel Anytime</p>
                    <p className="text-gray-400">
                      No long-term commitment, cancel whenever you want
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
