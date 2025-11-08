/**
 * Image Upload Field Component
 *
 * Hybrid input that supports both:
 * 1. Drag-and-drop or click-to-upload local files (JPG/PNG)
 * 2. Manual URL paste for remote images
 *
 * Features:
 * - Live thumbnail preview
 * - File validation (type and size)
 * - Accessible keyboard navigation
 * - Drag-and-drop visual feedback
 */

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { Input } from './input';
import { Label } from './label';

interface ImageUploadFieldProps {
  value: string;
  onChange: (value: string) => void;
  onFileChange?: (file: File | null) => void; // New: callback for actual File object
  label?: string;
  required?: boolean;
  description?: string;
  maxSizeMB?: number;
}

export function ImageUploadField({
  value,
  onChange,
  onFileChange,
  label = "Product Image",
  required = false,
  description = "Upload or paste a URL to your product photo",
  maxSizeMB = 10,
}: ImageUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(value);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      return 'Please upload a JPG or PNG image';
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    return null;
  };

  // Handle file upload
  const handleFileUpload = (file: File) => {
    setError("");

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Create blob URL for preview (display only)
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);
    onChange(blobUrl); // For backward compatibility - preview URL

    // Pass actual File object to parent for upload
    if (onFileChange) {
      onFileChange(file);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle drag events
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle URL input change
  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setError("");
    onChange(url);
    setPreviewUrl(url);

    // Clear file object when switching to URL mode
    if (onFileChange) {
      onFileChange(null);
    }
  };

  // Clear image
  const handleClear = () => {
    setPreviewUrl("");
    onChange("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Clear file object
    if (onFileChange) {
      onFileChange(null);
    }
  };

  // Click upload area
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <Label className="text-white text-sm font-medium flex items-center gap-2">
        <Upload className="h-4 w-4" />
        {label}
        {required && <span className="text-red-400">*</span>}
        {!required && <span className="text-white/50 font-normal">(Optional)</span>}
      </Label>

      {/* Upload Area */}
      <div
        onClick={handleUploadClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-6
          flex flex-col items-center justify-center
          cursor-pointer transition-all
          ${isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex flex-col items-center gap-2 text-center">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center
            ${isDragging ? 'bg-blue-500/20' : 'bg-white/10'}
          `}>
            <Upload className={`h-6 w-6 ${isDragging ? 'text-blue-400' : 'text-white/60'}`} />
          </div>

          <div>
            <p className={`text-sm font-medium ${isDragging ? 'text-blue-400' : 'text-white/90'}`}>
              {isDragging ? 'Drop image here' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-white/50 mt-1">
              JPG, JPEG or PNG (max {maxSizeMB}MB)
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Preview */}
      {previewUrl && !error && (
        <div className="relative">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-20 h-20 rounded-md object-cover border border-white/20"
              onError={() => {
                setError("Failed to load image");
                setPreviewUrl("");
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/90 font-medium mb-1">Preview</p>
              <p className="text-xs text-white/50 truncate">
                {previewUrl.startsWith('blob:') ? 'Uploaded file' : previewUrl}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-white/50 hover:text-red-400 transition-colors"
              aria-label="Clear image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink mx-4 text-xs text-white/40">or paste a URL</span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      {/* URL Input */}
      <Input
        type="url"
        value={value}
        onChange={handleUrlChange}
        placeholder="https://yourproduct.com/image.jpg"
        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
      />

      {/* Description */}
      {description && (
        <p className="text-xs text-white/50">
          {description}
        </p>
      )}
    </div>
  );
}
