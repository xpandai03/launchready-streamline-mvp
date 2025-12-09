/**
 * Schedule Dashboard - Phase 7.3
 *
 * View and manage scheduled Instagram posts:
 * - Table view with post details
 * - Filter by status (all, scheduled, posting, published, failed)
 * - Auto-refresh every 30 seconds
 * - Real-time status updates
 * - Post preview and metadata
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2, RefreshCw, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { format, formatDistanceToNow } from 'date-fns';

interface ScheduledPost {
  id: number;
  platform: string;
  caption: string | null;
  scheduledFor: string | null;
  isScheduled: string;
  status: string;
  platformPostUrl: string | null;
  errorMessage: string | null;
  captionSource: string | null;
  publishedAt: string | null;
  createdAt: string;
  projectId: string | null;
  taskId: string | null;
  mediaAssetId: string | null;
}

interface ScheduledPostsResponse {
  posts: ScheduledPost[];
  count: number;
}

export default function ScheduleDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch scheduled posts with auto-refresh every 30 seconds
  const { data, isLoading, refetch, isRefetching } = useQuery<ScheduledPostsResponse>({
    queryKey: ['/api/social/scheduled', statusFilter],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const posts = data?.posts || [];

  // Filter counts
  const counts = {
    all: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    posting: posts.filter(p => p.status === 'posting').length,
    published: posts.filter(p => p.status === 'published').length,
    failed: posts.filter(p => p.status === 'failed').length,
  };

  // Filter posts based on selected status
  const filteredPosts = statusFilter === 'all'
    ? posts
    : posts.filter(p => p.status === statusFilter);

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const config = {
      scheduled: { icon: Clock, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
      posting: { icon: RefreshCw, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 animate-pulse' },
      published: { icon: CheckCircle2, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
      failed: { icon: XCircle, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
      draft: { icon: AlertCircle, color: 'text-gray-400 bg-gray-500/10 border-gray-500/20' },
    };

    const { icon: Icon, color } = config[status as keyof typeof config] || config.draft;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400">Loading scheduled posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 md:px-8 pt-24 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-white mb-2 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-400" />
              Schedule Dashboard
            </h1>
            <p className="text-gray-400">
              View and manage your scheduled Instagram posts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => refetch()}
              disabled={isRefetching}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10"
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button asChild>
              <Link href="/ai-studio">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule New Post
              </Link>
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'All Posts' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'posting', label: 'Posting' },
            { value: 'published', label: 'Published' },
            { value: 'failed', label: 'Failed' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${statusFilter === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              {filter.label}
              <span className="ml-2 text-xs opacity-75">
                ({counts[filter.value as keyof typeof counts]})
              </span>
            </button>
          ))}
        </div>

        {/* Posts Table */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 mb-6">
              <Calendar className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-white mb-2">
              No {statusFilter !== 'all' ? statusFilter : ''} posts
            </h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {statusFilter === 'all'
                ? 'Schedule your first post from the AI Studio'
                : `No posts with "${statusFilter}" status`}
            </p>
            <Button asChild>
              <Link href="/ai-studio">
                <Calendar className="h-5 w-5 mr-2" />
                Schedule Post
              </Link>
            </Button>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Post
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Scheduled For
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-white/5 transition-colors">
                      {/* Post Caption */}
                      <td className="px-6 py-4">
                        <div className="max-w-md">
                          <p className="text-sm text-white line-clamp-2">
                            {post.caption || <span className="text-white/40 italic">No caption</span>}
                          </p>
                          {post.captionSource && (
                            <p className="text-xs text-white/40 mt-1">
                              {post.captionSource === 'ai_auto' && '🤖 Auto-generated'}
                              {post.captionSource === 'ai_manual' && '🤖 AI-assisted'}
                              {post.captionSource === 'manual' && '✍️ Manual'}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Scheduled Time */}
                      <td className="px-6 py-4">
                        {post.scheduledFor ? (
                          <div>
                            <p className="text-sm text-white font-medium">
                              {format(new Date(post.scheduledFor), 'MMM d, yyyy')}
                            </p>
                            <p className="text-xs text-white/60">
                              {format(new Date(post.scheduledFor), 'h:mm a')}
                            </p>
                            <p className="text-xs text-white/40 mt-1">
                              {formatDistanceToNow(new Date(post.scheduledFor), { addSuffix: true })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-white/40">Not scheduled</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={post.status} />
                        {post.publishedAt && (
                          <p className="text-xs text-white/40 mt-1">
                            Published {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
                          </p>
                        )}
                        {post.errorMessage && (
                          <p className="text-xs text-red-400 mt-1 line-clamp-1" title={post.errorMessage}>
                            {post.errorMessage}
                          </p>
                        )}
                      </td>

                      {/* Platform */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-white/80">
                          {post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {post.platformPostUrl && (
                            <a
                              href={post.platformPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 bg-white/5 border-t border-white/10">
              <p className="text-sm text-white/60">
                Showing {filteredPosts.length} of {posts.length} total posts
                {statusFilter !== 'all' && ` · Filtered by: ${statusFilter}`}
              </p>
            </div>
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="mt-6 text-center">
          <p className="text-xs text-white/40 flex items-center justify-center gap-2">
            <RefreshCw className="h-3 w-3" />
            Auto-refreshing every 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
