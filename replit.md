# YouTube to Shorts Converter

## Overview
A full-stack web application that converts YouTube videos into viral-ready short clips using the Klap API. The application provides an end-to-end workflow for submitting videos, tracking processing status, viewing generated shorts with virality scores, and exporting clips for download. This project aims to streamline content creation for short-form video platforms, leveraging AI to identify and extract the most engaging segments from longer YouTube videos.

## User Preferences
- **Communication Style**: I prefer clear, concise, and direct communication. Get straight to the point.
- **Coding Style**: I appreciate clean, readable code with good comments where necessary. TypeScript usage should be consistent.
- **Workflow**: I prefer an iterative development approach. Break down tasks into smaller, manageable steps.
- **Interaction**: Ask for clarification if something is unclear. Inform me before making significant architectural changes.
- **Error Handling**: Implement robust error handling and provide user-friendly error messages.

## System Architecture

### UI/UX Decisions
The application uses a utility-focused SaaS design with a "status-first" approach, providing clear visual feedback for all processing states. It features color-coded statuses (Purple for primary, Blue for pending, Amber for processing, Green for complete, Red for error), consistent spacing (4, 6, 8, 12, 16px increments), and Inter for UI typography. Auto-polling indicators and progress visualizations enhance the user experience.

### Technical Implementations
- **Frontend**: React with TypeScript, Wouter for routing, TanStack Query for data fetching, Tailwind CSS and Shadcn UI for styling.
- **Backend**: Express.js, PostgreSQL (Neon) with Drizzle ORM for type-safe database operations, and Zod for request validation.
- **Key Features**:
    - **Auto-Export Pipeline**: Automated conversion and export in a single workflow.
    - **Bulk Video Processing**: Submit up to 1000 YouTube URLs simultaneously with parallel task creation and detailed failure reporting.
    - **Unified Progress Tracking**: Displays complete pipeline status (Converting → Exporting X/N → Complete).
    - **Auto-Polling**: Real-time status updates on detail pages without manual refresh.
    - **Virality Scores**: Each short displays a viral potential score (0-100).
    - **Intelligent Export Management**: Options for auto-export or manual selective export.
    - **Error Handling**: Comprehensive error states with user-friendly messages.
    - **Responsive Design**: Optimized for desktop, tablet, and mobile.
    - **Advanced Processing Parameters**: Allows users to specify target clip count (1-10) and minimum duration (1-180s) for generated shorts.

### Feature Specifications
- **HomePage (`/`)**: Video URL submission with optional email and advanced parameters (Target Clip Count, Minimum Duration sliders).
- **VideoListPage (`/videos`)**: Lists all video tasks with status badges.
- **VideoDetailPage (`/details/:id`)**: Detailed view of a task including processing status, progress bar, grid of generated shorts with virality scores, and export/download options.

### System Design Choices
- **Database Schema**: PostgreSQL storing users, tasks, folders, projects, exports, and API logs, structured to mirror Klap API data.
- **API Endpoints**:
    - `POST /api/videos`: Creates a new video processing task.
    - `POST /api/videos/bulk`: Creates multiple video processing tasks in parallel.
    - `GET /api/videos`: Fetches all video tasks.
    - `GET /api/videos/:id`: Fetches detailed task info, updates status, and stores projects/exports.
    - `POST /api/videos/:id/export`: Triggers export for a specific short.
    - `POST /api/process-video-advanced`: Advanced endpoint with custom Klap API parameters (targetClipCount: 1-10, minimumDuration: 1-180s).
- **Background Processing**: Asynchronous polling of Klap API for video processing (30s intervals, max 30 min) and export processing (15s intervals, max 10 min).

## External Dependencies
- **Klap API**: Core service for video-to-shorts processing, task management, project fetching, and export creation.
  - **Custom Parameters**: Integrated support for `target_clip_count` and `min_duration` parameters
  - **API Endpoint**: `POST /v2/tasks/video-to-shorts` with customizable clip generation settings
- **PostgreSQL (Neon)**: Managed relational database for persistent storage.

## Recent Updates

### 2025-10-24 (Klap API Parameter Integration)
- **Klap API Documentation**: Reviewed official Klap API docs at https://docs.klap.app/endpoints/tasks
- **Service Layer Update**: Modified `createVideoToShortsTask` in `klapService` to accept optional parameters
- **Parameter Mapping**: 
  - `targetClipCount` → `target_clip_count` (Klap API parameter)
  - `minimumDuration` → `min_duration` (Klap API parameter)
- **Backward Compatible**: Existing endpoints continue to work; parameters are optional
- **Full Integration**: `/api/process-video-advanced` now passes custom parameters directly to Klap API
- **UI Controls**: Target Clip Count (1-10, default: 3) and Minimum Duration (1-180s, default: 30s) sliders fully functional