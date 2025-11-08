/**
 * Caption Settings Modal - Quick access from AI Studio
 *
 * Allows users to customize AI caption generation settings without leaving AI Studio:
 * - System prompt customization (max 1000 chars)
 * - Auto-generate toggle
 * - Save/cancel actions
 * - Toast notifications
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Sparkles, XCircle } from 'lucide-react';

interface CaptionSettings {
  systemPrompt: string;
  autoGenerate: boolean;
}

interface CaptionSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void; // Optional callback after successful save
}

export function CaptionSettingsModal({ open, onOpenChange, onSaved }: CaptionSettingsModalProps) {
  const { toast } = useToast();
  const [systemPrompt, setSystemPrompt] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current caption settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery<CaptionSettings>({
    queryKey: ['/api/user/caption-settings'],
    enabled: open, // Only fetch when modal is open
  });

  // Initialize local state when data loads
  useEffect(() => {
    if (settings) {
      setSystemPrompt(settings.systemPrompt);
      setAutoGenerate(settings.autoGenerate);
      setHasChanges(false);
    }
  }, [settings]);

  // Track changes
  useEffect(() => {
    if (settings) {
      const changed =
        systemPrompt !== settings.systemPrompt ||
        autoGenerate !== settings.autoGenerate;
      setHasChanges(changed);
    }
  }, [systemPrompt, autoGenerate, settings]);

  // Update caption settings mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', '/api/user/caption-settings', {
        systemPrompt,
        autoGenerate,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to save settings');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/caption-settings'] });
      toast({
        title: 'Settings saved! ✨',
        description: 'Your caption preferences have been updated.',
      });
      setHasChanges(false);
      onOpenChange(false);
      if (onSaved) {
        onSaved();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (systemPrompt.length > 1000) {
      toast({
        title: 'System prompt too long',
        description: 'Please limit your prompt to 1000 characters.',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate();
  };

  const handleCancel = () => {
    if (settings) {
      setSystemPrompt(settings.systemPrompt);
      setAutoGenerate(settings.autoGenerate);
    }
    setHasChanges(false);
    onOpenChange(false);
  };

  const characterCount = systemPrompt.length;
  const characterLimit = 1000;
  const charactersRemaining = characterLimit - characterCount;
  const isOverLimit = characterCount > characterLimit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-blue-400" />
            AI Caption Settings
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Customize how AI generates captions for your Instagram posts
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load caption settings. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/10 rounded w-48 animate-pulse" />
                <div className="h-3 bg-white/10 rounded w-64 animate-pulse" />
              </div>
              <div className="h-6 w-12 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-white/10 rounded w-56 animate-pulse" />
              <div className="h-32 bg-white/10 rounded animate-pulse" />
              <div className="h-3 bg-white/10 rounded w-32 animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Auto-generate Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="space-y-1 flex-1">
                <Label htmlFor="auto-generate-modal" className="text-white font-medium text-base">
                  Auto-generate captions
                </Label>
                <p className="text-sm text-white/60">
                  Automatically generate captions when posting with an empty caption field
                </p>
              </div>
              <Switch
                id="auto-generate-modal"
                checked={autoGenerate}
                onCheckedChange={setAutoGenerate}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            {/* System Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="system-prompt-modal" className="text-white font-medium text-base">
                  Caption style & instructions
                </Label>
                <span
                  className={`text-sm ${
                    isOverLimit ? 'text-red-400 font-medium' : 'text-white/50'
                  }`}
                >
                  {charactersRemaining} characters remaining
                </span>
              </div>
              <Textarea
                id="system-prompt-modal"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="e.g., Write like a motivational personal trainer - energetic, short sentences, use fitness emojis"
                className={`
                  min-h-[140px] resize-none
                  bg-white/5 border-white/20 text-white placeholder:text-white/40
                  focus:border-blue-500 focus:ring-blue-500/20
                  ${isOverLimit ? 'border-red-500 focus:border-red-500' : ''}
                `}
              />
              <p className="text-xs text-white/50">
                Describe your desired tone, style, emoji usage, and caption length. The AI will
                follow these instructions when generating captions.
              </p>
            </div>

            {/* Info Card */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-300">
                <strong>💡 Tip:</strong> Be specific! Examples: "Keep it under 100 characters"
                or "Use Gen Z slang and trendy emojis" or "Professional tone, no emojis"
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending || isLoading || isOverLimit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
