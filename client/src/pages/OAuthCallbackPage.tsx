import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OAuthCallbackPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your connection...');
  const [accountInfo, setAccountInfo] = useState<{ platform: string; username: string } | null>(null);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Parse query parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const connected = urlParams.get('connected');
      const profileId = urlParams.get('profileId');
      const username = urlParams.get('username');
      const error = urlParams.get('error');
      const platform = urlParams.get('platform');

      // Handle error case
      if (error) {
        setStatus('error');
        setMessage(`Failed to connect ${platform || 'account'}. ${error}`);
        return;
      }

      // Validate required parameters
      if (!connected || !profileId || !username) {
        setStatus('error');
        setMessage('Invalid callback parameters. Please try connecting again.');
        return;
      }

      // Send callback data to backend
      const response = await fetch('/api/social/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          connected,
          profileId,
          username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete connection');
      }

      const data = await response.json();

      // Success!
      setStatus('success');
      setMessage(`Successfully connected your ${connected} account!`);
      setAccountInfo({
        platform: connected,
        username: data.account.username,
      });

      // Close window after delay if opened in popup
      if (window.opener) {
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        // Redirect to settings after delay if not in popup
        setTimeout(() => {
          setLocation('/settings/social-accounts');
        }, 2000);
      }
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage(error.message || 'An error occurred while connecting your account');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <h2 className="text-xl font-semibold">Connecting Account</h2>
                <p className="text-muted-foreground">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-green-600">Success!</h2>
                <p className="text-muted-foreground">{message}</p>
                {accountInfo && (
                  <div className="p-3 bg-gray-50 rounded-lg w-full">
                    <p className="text-sm">
                      <span className="font-medium capitalize">{accountInfo.platform}:</span>{' '}
                      @{accountInfo.username}
                    </p>
                  </div>
                )}
                {!window.opener && (
                  <Button onClick={() => setLocation('/settings/social-accounts')}>
                    Go to Settings
                  </Button>
                )}
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-red-600">Connection Failed</h2>
                <p className="text-muted-foreground">{message}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setLocation('/settings/social-accounts')}>
                    Back to Settings
                  </Button>
                  <Button onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
