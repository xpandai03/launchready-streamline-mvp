# YouTube to Shorts Converter

## Overview

A full-stack web application that converts YouTube videos into viral-ready short clips using the Klap API. The application provides an end-to-end workflow for submitting videos, tracking processing status, viewing generated shorts with virality scores, and exporting clips for download.

## Tech Stack

### Frontend
- **React** with TypeScript
- **Wouter** for routing
- **TanStack Query (React Query)** for data fetching and caching
- **Tailwind CSS** for styling
- **Shadcn UI** for component library
- **Lucide React** for icons
- **Date-fns** for date formatting

### Backend
- **Express.js** for API server
- **PostgreSQL** (Neon) for database
- **Drizzle ORM** for type-safe database operations
- **Klap API** for video-to-shorts processing
- **Zod** for request validation

## Architecture

### Database Schema

The application uses PostgreSQL with the following tables:

1. **users** - Stores user accounts (default admin user with ID 1)
2. **tasks** - Stores video processing tasks from Klap API
3. **folders** - Stores folder IDs returned from Klap when processing completes
4. **projects** - Stores generated short clips with virality scores
5. **exports** - Stores export job data and download URLs
6. **api_logs** - Logs all Klap API requests and responses for debugging

All tables follow the Klap API structure with proper foreign key relationships.

### API Endpoints

#### POST `/api/videos`
- Creates a new video processing task
- Submits video URL to Klap API
- Automatically starts background processing
- Returns: `{ taskId, status }`

#### GET `/api/videos`
- Fetches all video tasks for the current user
- Returns array of task objects with status

#### GET `/api/videos/:id`
- Fetches detailed information for a specific task
- Auto-updates task status from Klap if still processing
- Fetches and stores projects when processing completes
- Updates export statuses if they're processing
- Returns: `{ task, projects, exports }`

#### POST `/api/videos/:id/export`
- Triggers export for a specific short/project
- Creates export job in Klap API
- Starts background polling for export status
- Returns export job details

### Klap API Integration

The application integrates with Klap's API following this workflow:

1. **Submit Video** → POST `/tasks/video-to-shorts`
2. **Poll Task Status** → GET `/tasks/{task_id}` (30s intervals, max 30 min)
3. **Fetch Projects** → GET `/projects/{folder_id}` (when task complete)
4. **Create Export** → POST `/projects/{folder_id}/{project_id}/exports`
5. **Poll Export Status** → GET `/projects/{folder_id}/{project_id}/exports/{export_id}` (15s intervals, max 10 min)

All requests/responses are logged to `api_logs` table for debugging.

### Background Processing

- **Video Processing**: Polls Klap API every 30 seconds until task completes or fails (max 30 minutes)
- **Export Processing**: Polls Klap API every 15 seconds until export completes or fails (max 10 minutes)
- Both run asynchronously without blocking API responses

### Frontend Pages

1. **HomePage** (`/`) - Video URL submission form with validation
2. **VideoListPage** (`/videos`) - List of all video tasks with status badges
3. **VideoDetailPage** (`/details/:id`) - Detailed view with:
   - Task processing status with progress bar
   - Auto-polling for real-time updates (15-30s intervals)
   - Grid of generated shorts with virality scores
   - Export buttons with status tracking
   - Download links when exports complete

### Key Features

- **Auto-Polling**: Detail page automatically polls backend when processing or exporting
- **Status Badges**: Color-coded status indicators (pending, processing, complete, error)
- **Progress Visualization**: Progress bars and step indicators for task status
- **Virality Scores**: Each short displays its viral potential score (0-100)
- **Export Management**: Track multiple exports per video with individual status
- **Error Handling**: Comprehensive error states with user-friendly messages
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `KLAP_API_KEY` - Klap API authentication key
- `SESSION_SECRET` - Session encryption secret (optional)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - PostgreSQL credentials (auto-configured)

## Development

### Running Locally

The application runs automatically with the "Start application" workflow:
```bash
npm run dev
```

This starts:
- Express server on port 5000
- Vite dev server for frontend (proxied through Express)
- Hot module reloading for development

### Database Management

The database schema is managed through SQL:
```bash
# Tables are created automatically via execute_sql_tool
# Schema is defined in shared/schema.ts
```

Default admin user (ID: 1) is created automatically on first request.

## Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── PollingIndicator.tsx
│   │   │   ├── VideoCard.tsx
│   │   │   └── ShortCard.tsx
│   │   ├── pages/             # Route pages
│   │   │   ├── HomePage.tsx
│   │   │   ├── VideoListPage.tsx
│   │   │   └── VideoDetailPage.tsx
│   │   ├── App.tsx            # Main app with routing
│   │   └── index.css          # Global styles
│   └── index.html
├── server/
│   ├── services/
│   │   └── klap.ts           # Klap API integration
│   ├── db.ts                  # Database connection
│   ├── storage.ts             # Data access layer
│   └── routes.ts              # API endpoints
├── shared/
│   └── schema.ts              # Database schema & types
├── design_guidelines.md       # UI/UX design system
└── replit.md                  # This file
```

## Design System

The application follows a utility-focused SaaS design with:
- **Status-first approach**: Clear visual feedback for all processing states
- **Color-coded statuses**: Purple (primary), Blue (pending), Amber (processing), Green (complete), Red (error)
- **Consistent spacing**: 4, 6, 8, 12, 16px increments
- **Typography**: Inter for UI, JetBrains Mono for technical data
- **Auto-polling indicators**: Subtle pulsing dot when actively updating
- **Progress visualization**: Horizontal bars with color-coded status

See `design_guidelines.md` for complete design specifications.

## Workflow

### User Journey

1. **Submit Video**: User enters YouTube URL or direct video link
2. **Processing**: Video is analyzed by Klap AI (can take several minutes)
3. **View Shorts**: Generated clips appear with virality scores
4. **Export**: User selects shorts to export in high quality
5. **Download**: Export URLs become available for download

### Status Flow

```
Task: pending → processing → complete/error
Export: pending → processing → complete/error
```

Auto-polling keeps status up-to-date in real-time without manual refresh.

## Recent Changes

### 2025-10-17
- Initial implementation of complete YouTube to Shorts converter
- Full Klap API integration with request/response logging
- Auto-polling mechanism for real-time status updates
- Database schema with all required tables and relations
- Beautiful, responsive UI following design guidelines
- Background processing for tasks and exports
- Comprehensive error handling and user feedback

## Known Limitations

1. **Single User**: Currently supports only default admin user (ID: 1)
2. **Processing Timeouts**: Tasks timeout after 30 minutes, exports after 10 minutes
3. **No Edit Functionality**: Cannot modify shorts before export (uses Klap defaults)
4. **No Batch Processing**: One video submission at a time

## Future Enhancements

- Multi-user authentication system
- Batch video processing for multiple URLs
- Custom editing options (captions, reframing, watermarks)
- Local download and storage of exported shorts
- Virality score filtering and sorting
- Export job queuing and management
- Webhook support for async notifications
- Analytics dashboard for processing metrics
