import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles, TrendingUp } from "lucide-react";

interface LimitReachedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: "video" | "post";
  current: number;
  limit: number;
}

export function LimitReachedDialog({
  open,
  onOpenChange,
  limitType,
  current,
  limit,
}: LimitReachedDialogProps) {
  const isVideo = limitType === "video";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
            <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-500" />
          </div>
          <AlertDialogTitle className="text-center">
            Free Tier Limit Reached
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You've reached your free tier limit of{" "}
            <span className="font-semibold text-foreground">
              {limit} {isVideo ? "videos" : "posts"}
            </span>{" "}
            per month ({current}/{limit}).
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-4 border border-primary/20">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Upgrade to Pro for Unlimited Access
          </h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold flex-shrink-0">✓</span>
              <span>Unlimited video conversions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold flex-shrink-0">✓</span>
              <span>Unlimited social media posts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold flex-shrink-0">✓</span>
              <span>AI-powered clip selection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold flex-shrink-0">✓</span>
              <span>Auto-export to Instagram, TikTok & YouTube</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold flex-shrink-0">✓</span>
              <span>Priority support</span>
            </li>
          </ul>
          <div className="mt-3 pt-3 border-t border-primary/20">
            <p className="text-sm font-medium text-center">
              Just <span className="text-lg font-bold text-primary">$29</span>/month
            </p>
            <p className="text-xs text-center text-muted-foreground mt-1">
              Cancel anytime, no long-term commitment
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="mt-0">Maybe Later</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/pricing">
              <a className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </a>
            </Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
