import { db } from "../db";
import { apiLogs, type InsertApiLog } from "@shared/schema";

const KLAP_API_URL = "https://api.klap.app/v2";
const KLAP_API_KEY = process.env.KLAP_API_KEY;

if (!KLAP_API_KEY) {
  throw new Error("KLAP_API_KEY must be set in environment variables");
}

interface KlapRequestOptions {
  method: "GET" | "POST";
  endpoint: string;
  body?: any;
  taskId?: string;
}

async function klapRequest<T = any>(options: KlapRequestOptions): Promise<T> {
  const { method, endpoint, body, taskId } = options;
  const url = `${KLAP_API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KLAP_API_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const logEntry: InsertApiLog = {
      taskId: taskId || null,
      endpoint,
      method,
      requestBody: body || null,
      responseBody: null,
      statusCode: response.status,
      errorMessage: null,
    };

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      logEntry.responseBody = errorData as any;
      logEntry.errorMessage =
        errorData.error || errorData.message || `HTTP ${response.status}`;

      await db.insert(apiLogs).values([logEntry]);

      throw new Error(logEntry.errorMessage);
    }

    const data = await response.json();
    logEntry.responseBody = data as any;

    await db.insert(apiLogs).values([logEntry]);

    return data;
  } catch (error: any) {
    const errorLog: InsertApiLog = {
      taskId: taskId || null,
      endpoint,
      method,
      requestBody: body || null,
      responseBody: null,
      statusCode: null,
      errorMessage: error.message || "Request failed",
    };
    await db.insert(apiLogs).values([errorLog]);
    throw error;
  }
}

export interface VideoToShortsResponse {
  id: string;
  status: "processing" | "ready" | "error";
  output_id?: string;
}

export interface TaskStatusResponse {
  id: string;
  status: "processing" | "ready" | "error";
  output_id?: string;
  error?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  folder_id: string;
  virality_score: number;
}

export interface ExportResponse {
  id: string;
  status: "processing" | "ready" | "error";
  src_url?: string;
  error?: string;
}

export interface VideoToShortsOptions {
  targetClipCount?: number;
  minimumDuration?: number;
}

export const klapService = {
  async createVideoToShortsTask(
    sourceVideoUrl: string,
    options?: VideoToShortsOptions,
    taskId?: string,
  ): Promise<VideoToShortsResponse> {
    const body: any = {
      source_video_url: sourceVideoUrl,
      language: "en",
      max_duration: 180,
      editing_options: {
        intro_title: false,
      },
    };

    // Add target_clip_count if provided (API parameter name)
    if (options?.targetClipCount) {
      body.target_clip_count = options.targetClipCount;
    }

    // Add min_duration if provided (API parameter name)
    if (options?.minimumDuration) {
      body.min_duration = options.minimumDuration;
    }

    return klapRequest<VideoToShortsResponse>({
      method: "POST",
      endpoint: "/tasks/video-to-shorts",
      body,
      taskId,
    });
  },

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    return klapRequest<TaskStatusResponse>({
      method: "GET",
      endpoint: `/tasks/${taskId}`,
      taskId,
    });
  },

  async getProjects(
    folderId: string,
    taskId?: string,
  ): Promise<ProjectResponse[]> {
    return klapRequest<ProjectResponse[]>({
      method: "GET",
      endpoint: `/projects/${folderId}`,
      taskId,
    });
  },

  async createExport(
    folderId: string,
    projectId: string,
    taskId?: string,
  ): Promise<ExportResponse> {
    return klapRequest<ExportResponse>({
      method: "POST",
      endpoint: `/projects/${folderId}/${projectId}/exports`,
      body: {},
      taskId,
    });
  },

  async getExportStatus(
    folderId: string,
    projectId: string,
    exportId: string,
    taskId?: string,
  ): Promise<ExportResponse> {
    return klapRequest<ExportResponse>({
      method: "GET",
      endpoint: `/projects/${folderId}/${projectId}/exports/${exportId}`,
      taskId,
    });
  },
};