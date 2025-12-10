/**
 * AdminCreditsPage - Admin dashboard for managing credit pricing
 */

import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield,
  Home,
  Coins,
  Loader2,
  Save,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CreditPricing {
  id: string;
  featureKey: string;
  featureName: string;
  baseCostUsd: string;
  creditCost: number;
  isActive: boolean;
}

interface GlobalSettings {
  markupFactor: string;
  pricePerCreditUsd: string;
}

export default function AdminCreditsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingFeature, setEditingFeature] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  // Fetch pricing data
  const { data: pricingData, isLoading: pricingLoading } = useQuery<{ pricing: CreditPricing[] }>({
    queryKey: ["/api/admin/credits/pricing"],
  });

  // Fetch global settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery<{ settings: GlobalSettings }>({
    queryKey: ["/api/admin/credits/settings"],
  });

  // Update pricing mutation
  const updatePricingMutation = useMutation({
    mutationFn: async ({ featureKey, creditCost }: { featureKey: string; creditCost: number }) => {
      const response = await apiRequest("PUT", `/api/admin/credits/pricing/${featureKey}`, { creditCost });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credits/pricing"] });
      toast({ title: "Pricing updated", description: "Credit cost saved successfully." });
      setEditingFeature(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pricing",
        variant: "destructive",
      });
    },
  });

  const handleSave = (featureKey: string) => {
    updatePricingMutation.mutate({ featureKey, creditCost: editValue });
  };

  const startEditing = (feature: CreditPricing) => {
    setEditingFeature(feature.featureKey);
    setEditValue(feature.creditCost);
  };

  const pricing = pricingData?.pricing || [];
  const settings = settingsData?.settings;

  return (
    <div className="min-h-screen bg-black pt-24 pb-8 px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-amber-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin: Credit Pricing</h1>
              <p className="text-gray-400 mt-1">
                Manage feature credit costs
              </p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>

        {/* Global Settings */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Coins className="h-5 w-5 text-yellow-500" />
              Global Settings
            </CardTitle>
            <CardDescription className="text-gray-400">
              System-wide credit configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading settings...
              </div>
            ) : settings ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-400">Markup Factor</p>
                  <p className="text-xl font-semibold text-white">{settings.markupFactor}x</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-400">Price per Credit</p>
                  <p className="text-xl font-semibold text-white">${settings.pricePerCreditUsd}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No settings found</p>
            )}
          </CardContent>
        </Card>

        {/* Feature Pricing Table */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Feature Pricing</CardTitle>
                <CardDescription className="text-gray-400">
                  Edit credit costs for each feature
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/credits/pricing"] })}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pricingLoading ? (
              <div className="flex items-center gap-2 text-gray-400 py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading pricing...
              </div>
            ) : pricing.length === 0 ? (
              <p className="text-gray-400 py-8 text-center">No pricing data found</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-4 py-2 px-4 text-sm font-medium text-gray-400 border-b border-white/10">
                  <div>Feature</div>
                  <div>Base Cost (USD)</div>
                  <div>Credits</div>
                  <div>Actions</div>
                </div>
                {pricing.map((feature) => (
                  <div
                    key={feature.featureKey}
                    className="grid grid-cols-4 gap-4 py-3 px-4 bg-white/5 rounded-lg items-center"
                  >
                    <div>
                      <p className="text-white font-medium">{feature.featureName}</p>
                      <p className="text-xs text-gray-500">{feature.featureKey}</p>
                    </div>
                    <div className="text-gray-300">${feature.baseCostUsd}</div>
                    <div>
                      {editingFeature === feature.featureKey ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                          className="w-24 bg-white/10 border-white/20"
                        />
                      ) : (
                        <span className="text-yellow-500 font-semibold">{feature.creditCost}</span>
                      )}
                    </div>
                    <div>
                      {editingFeature === feature.featureKey ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(feature.featureKey)}
                            disabled={updatePricingMutation.isPending}
                          >
                            {updatePricingMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingFeature(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(feature)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
