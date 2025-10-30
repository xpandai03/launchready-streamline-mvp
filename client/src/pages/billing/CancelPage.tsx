import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, Home, ArrowLeft } from "lucide-react";

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Card className="border-orange-500/20">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/10">
              <XCircle className="h-12 w-12 text-orange-500" />
            </div>
            <CardTitle className="text-3xl mb-2">Payment Cancelled</CardTitle>
            <CardDescription className="text-lg">
              Your checkout session was cancelled
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted p-6 text-center">
              <p className="text-muted-foreground">
                No charges were made to your account. You can try upgrading again whenever you're ready.
              </p>
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
              <h4 className="font-semibold mb-2 text-sm">Why upgrade to Pro?</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Unlimited video conversions and social media posts</li>
                <li>• Auto-export to Instagram, TikTok & YouTube</li>
                <li>• Priority support from our team</li>
                <li>• Cancel anytime, no long-term commitment</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                className="flex-1"
              >
                <Link href="/pricing">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Try Again
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1"
              >
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Link>
              </Button>
            </div>

            <div className="text-center pt-4">
              <p className="text-xs text-muted-foreground">
                Have questions? Contact us at{" "}
                <a href="mailto:support@streamline.com" className="text-primary hover:underline">
                  support@streamline.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
