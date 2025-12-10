/**
 * AnalyticsCharts Component
 *
 * Displays performance charts for analytics data:
 * 1. Performance Over Time - Line/Area chart showing metrics by date
 * 2. Performance by Platform - Bar chart showing metrics by platform
 *
 * Uses recharts library (already in project dependencies)
 */

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import {
  Eye,
  TrendingUp,
  Users,
  Heart,
  Share2,
  BarChart3,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface PostMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  clicks: number;
}

interface AnalyticsPost {
  id: string;
  thumbnailUrl: string | null;
  caption: string;
  createdAt: string;
  platformPostUrl: string | null;
  platform: string;
  metrics: PostMetrics;
}

interface AnalyticsSummary {
  views: number;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
}

interface AnalyticsChartsProps {
  summary: AnalyticsSummary;
  posts: AnalyticsPost[];
}

type MetricKey = 'views' | 'impressions' | 'reach' | 'likes' | 'shares';

// ============================================
// CONSTANTS
// ============================================

const METRICS_CONFIG: Record<MetricKey, { label: string; color: string; icon: typeof Eye }> = {
  views: { label: 'Views', color: '#3B82F6', icon: Eye },
  impressions: { label: 'Impressions', color: '#A855F7', icon: TrendingUp },
  reach: { label: 'Reach', color: '#22C55E', icon: Users },
  likes: { label: 'Likes', color: '#EF4444', icon: Heart },
  shares: { label: 'Shares', color: '#06B6D4', icon: Share2 },
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  tiktok: '#00F2EA',
  youtube: '#FF0000',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  googlebusiness: '#4285F4',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Aggregate posts by date
function aggregateByDate(posts: AnalyticsPost[], metricKey: MetricKey): { date: string; value: number; formattedDate: string }[] {
  const dateMap = new Map<string, number>();

  posts.forEach((post) => {
    const date = format(parseISO(post.createdAt), 'yyyy-MM-dd');
    const currentValue = dateMap.get(date) || 0;
    dateMap.set(date, currentValue + (post.metrics[metricKey] || 0));
  });

  // Convert to array and sort by date
  const result = Array.from(dateMap.entries())
    .map(([date, value]) => ({
      date,
      value,
      formattedDate: format(parseISO(date), 'MMM d'),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

// Aggregate posts by platform
function aggregateByPlatform(posts: AnalyticsPost[], metricKey: MetricKey): { platform: string; value: number; displayName: string }[] {
  const platformMap = new Map<string, number>();

  posts.forEach((post) => {
    const platform = post.platform.toLowerCase();
    const currentValue = platformMap.get(platform) || 0;
    platformMap.set(platform, currentValue + (post.metrics[metricKey] || 0));
  });

  // Convert to array
  return Array.from(platformMap.entries())
    .map(([platform, value]) => ({
      platform,
      value,
      displayName: platform.charAt(0).toUpperCase() + platform.slice(1),
    }))
    .sort((a, b) => b.value - a.value); // Sort by value descending
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Custom tooltip for dark theme
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-gray-900/95 border border-white/20 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AnalyticsCharts({ summary, posts }: AnalyticsChartsProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('views');

  // Memoized data aggregations
  const timeSeriesData = useMemo(
    () => aggregateByDate(posts, selectedMetric),
    [posts, selectedMetric]
  );

  const platformData = useMemo(
    () => aggregateByPlatform(posts, selectedMetric),
    [posts, selectedMetric]
  );

  const metricConfig = METRICS_CONFIG[selectedMetric];

  // If no posts, show empty state
  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Metric Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {(Object.keys(METRICS_CONFIG) as MetricKey[]).map((key) => {
          const config = METRICS_CONFIG[key];
          const Icon = config.icon;
          const isSelected = selectedMetric === key;

          return (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${isSelected
                  ? 'text-white shadow-lg'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                }
              `}
              style={isSelected ? { backgroundColor: config.color } : {}}
            >
              <Icon className="h-4 w-4" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Over Time - Area Chart */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${metricConfig.color}20` }}
            >
              <TrendingUp className="h-5 w-5" style={{ color: metricConfig.color }} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Performance Over Time</h3>
              <p className="text-sm text-gray-400">
                {metricConfig.label} aggregated by day
              </p>
            </div>
          </div>

          {timeSeriesData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No time series data available</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeSeriesData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="formattedDate"
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    tickFormatter={formatNumber}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name={metricConfig.label}
                    stroke={metricConfig.color}
                    strokeWidth={2}
                    fill={`url(#gradient-${selectedMetric})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Performance by Platform - Bar Chart */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${metricConfig.color}20` }}
            >
              <BarChart3 className="h-5 w-5" style={{ color: metricConfig.color }} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Performance by Platform</h3>
              <p className="text-sm text-gray-400">
                {metricConfig.label} breakdown per platform
              </p>
            </div>
          </div>

          {platformData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No platform data available</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={platformData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    tickFormatter={formatNumber}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    width={55}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    name={metricConfig.label}
                    radius={[0, 4, 4, 0]}
                    fill={metricConfig.color}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Legend / Data Summary */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <span className="text-gray-400">
            Data from <span className="text-white font-medium">{posts.length}</span> posts
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            <span className="text-white font-medium">{platformData.length}</span> platforms
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400">
            Total {metricConfig.label.toLowerCase()}:{' '}
            <span className="font-medium" style={{ color: metricConfig.color }}>
              {formatNumber(summary[selectedMetric] || 0)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
