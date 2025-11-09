# 🔍 PHASE 0: HEIC Upload Investigation Report

**Date:** 2025-11-08
**Issue:** Mobile uploads (iPhone photos) fail in UGC Ad Studio
**Hypothesis:** HEIC/HEIF file format incompatibility
**Status:** Pre-Investigation Complete - Failure Points Identified

---

## 📋 Executive Summary

**3 Critical Failure Points Discovered** (before any testing):

1. **Frontend validation rejects HEIC** (client/src/components/ui/ImageUploadField.tsx:47-48)
2. **File input doesn't accept HEIC** (client/src/components/ui/ImageUploadField.tsx:176)
3. **Backend has no HEIC handling** (server accepts `image/*` but doesn't convert)

**Impact:** iPhone users uploading HEIC photos from camera roll will see "Please upload a JPG or PNG image" error immediately.

---

## 🧬 Current Upload Flow Analysis

### Step-by-Step Upload Path

```
iPhone User → Selects photo from camera roll (HEIC format)
    ↓
[FRONTEND: ImageUploadField.tsx]
    ↓
Line 176: <input accept="image/png, image/jpeg, image/jpg">
    ❌ FIRST FAILURE: HEIC not in accept list (browser may still allow it)
    ↓
Line 47-48: validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    ❌ SECOND FAILURE: validateFile() rejects image/heic MIME type
    ↓
Line 68-69: setError('Please upload a JPG or PNG image')
    ❌ USER SEES ERROR - Upload fails here

[Never reaches backend]
```

### Code Evidence

#### 🔴 Failure Point 1: File Input Restrictions
**Location:** `client/src/components/ui/ImageUploadField.tsx:176`

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/png, image/jpeg, image/jpg"  // ❌ No HEIC
  className="hidden"
  onChange={handleFileInputChange}
/>
```

**Impact:** Browser file picker may gray out HEIC files (browser-dependent)

---

#### 🔴 Failure Point 2: Frontend Validation
**Location:** `client/src/components/ui/ImageUploadField.tsx:47-49`

```tsx
const validateFile = (file: File): string | null => {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];  // ❌ No HEIC
  if (!validTypes.includes(file.type)) {
    return 'Please upload a JPG or PNG image';  // ❌ Error message
  }
  // ...
};
```

**MIME Types for HEIC:**
- `image/heic` (most common)
- `image/heif` (HEIF container format)
- Sometimes: `image/heic-sequence` (burst photos)

**Impact:** Instant rejection with user-facing error message

---

#### 🟡 Failure Point 3: Backend MIME Filter
**Location:** `server/routes.ts:66-73`

```tsx
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {  // ✅ Would accept HEIC
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});
```

**Impact:** Backend would actually accept HEIC if frontend passed it through! Uses `image/*` pattern.

---

#### 🟡 Potential Issue 4: KIE Upload Service
**Location:** `server/services/kie.ts:177-208`

```tsx
async uploadFileBuffer(buffer: Buffer, mimeType: string, originalFilename?: string): Promise<string> {
  // Determine file extension from MIME type
  const extension = mimeType.split('/')[1] || 'jpg';  // ✅ Would handle 'heic'
  const fileName = originalFilename || `ugc_upload_${Date.now()}.${extension}`;

  // Create form data
  const form = new FormData();
  form.append('file', buffer, {
    filename: fileName,
    contentType: mimeType,  // ✅ Passes HEIC MIME type as-is
  });

  // Upload to KIE
  const uploadResponse = await axios.post(uploadUrl, form, { ... });
}
```

**Unknown:** Does KIE's `/api/file-stream-upload` endpoint accept HEIC files?
- If YES → We just need frontend fixes
- If NO → We need server-side conversion

---

## 🎯 Root Cause Confirmation

**Primary Failure:** Frontend validation (ImageUploadField.tsx:47-48)

**User Journey:**
1. iPhone user taps "Upload Product Image"
2. Browser shows camera roll (HEIC files visible)
3. User selects HEIC photo
4. `handleFileInputChange()` fires
5. `validateFile()` checks MIME type
6. Sees `image/heic` → not in `validTypes` array
7. Returns error: "Please upload a JPG or PNG image"
8. User sees error message, upload blocked

**Why Desktop Works:**
- Desktop users typically export/download images as JPEG/PNG
- Screenshot tools save as PNG
- Photo editors export as JPEG
- Rarely encounter HEIC files

**Why Mobile Fails:**
- iPhone default camera format = HEIC (since iOS 11)
- Android some models also use HEIC
- Users uploading directly from camera roll = raw HEIC files

---

## 🛠️ Solution Paths

### Option A: Frontend Conversion (Recommended)
**Approach:** Convert HEIC → JPEG in browser before upload

**Pros:**
✅ No backend changes needed
✅ Works with existing KIE upload flow
✅ Reduces server load
✅ Faster perceived upload (no extra server processing)

**Cons:**
❌ Requires client-side library (~50KB: heic2any)
❌ Slightly slower initial upload (conversion time)

**Implementation:**
```tsx
// Add heic2any library
import heic2any from 'heic2any';

const handleFileUpload = async (file: File) => {
  let processedFile = file;

  // Convert HEIC to JPEG
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9
    });
    processedFile = new File([converted], file.name.replace(/\.heic$/i, '.jpg'), {
      type: 'image/jpeg'
    });
  }

  // Continue with existing validation
  const validationError = validateFile(processedFile);
  // ...
};
```

---

### Option B: Backend Conversion
**Approach:** Accept HEIC in frontend, convert on server

**Pros:**
✅ No client-side dependencies
✅ Centralized conversion logic
✅ Can handle other exotic formats

**Cons:**
❌ Requires sharp or heic-convert Node module
❌ Increased server CPU usage
❌ Slower uploads (network + conversion time)

**Implementation:**
```tsx
// Frontend: Accept HEIC
const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];

// Backend: Convert before KIE upload
import sharp from 'sharp';

if (mimeType === 'image/heic' || mimeType === 'image/heif') {
  buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
  mimeType = 'image/jpeg';
  originalFilename = originalFilename?.replace(/\.heic$/i, '.jpg');
}
```

---

### Option C: Hybrid (Best of Both)
**Approach:** Frontend conversion with backend fallback

**Pros:**
✅ Best user experience (fast client conversion)
✅ Safety net (backend handles edge cases)
✅ Progressive enhancement

**Cons:**
❌ Most code changes
❌ Duplication of conversion logic

---

## 📊 Recommended Solution: **Option A (Frontend Conversion)**

**Rationale:**
1. Faster perceived performance (conversion during upload prep)
2. Reduces server load (important for scaling)
3. Works seamlessly with existing KIE integration
4. Small bundle size increase (heic2any ~50KB gzipped)

---

## ✅ Implementation Checklist

### Frontend Changes (ImageUploadField.tsx)

- [ ] Install `heic2any` package: `npm install heic2any`
- [ ] Add HEIC to `accept` attribute: `accept="image/png, image/jpeg, image/jpg, image/heic, image/heif"`
- [ ] Add HEIC to `validTypes` array: `['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']`
- [ ] Add conversion logic in `handleFileUpload()` before validation
- [ ] Update UI description: "JPG, PNG or HEIC (iPhone photos supported)"
- [ ] Add loading state during conversion: "Converting iPhone photo..."

### Backend Changes (Optional Safety Net)

- [ ] Log HEIC files received for monitoring: `console.log('[Upload] HEIC file received:', filename)`
- [ ] Add server-side conversion fallback if KIE rejects HEIC (to be determined after testing)

### Testing

- [ ] Test iPhone photo upload (HEIC)
- [ ] Test Android photo upload (may be HEIC or JPEG)
- [ ] Test desktop JPEG/PNG (ensure no regression)
- [ ] Test large HEIC file (>5MB conversion performance)
- [ ] Test burst photos / Live Photos (edge case)
- [ ] Verify converted image quality in KIE
- [ ] Verify generated videos use converted image correctly

---

## 🧪 Test Plan

### Phase 1: Confirm Failure (Pre-Fix)
1. Open UGC Ad Studio on iPhone
2. Tap "Upload Product Image"
3. Select photo from Camera Roll (recent photo = HEIC)
4. **Expected:** Error message "Please upload a JPG or PNG image"
5. **Capture:** Screenshot + console logs

### Phase 2: Implement Fix
1. Apply frontend conversion (Option A)
2. Deploy to staging

### Phase 3: Verify Success (Post-Fix)
1. Repeat same upload on iPhone
2. **Expected:**
   - "Converting iPhone photo..." message appears
   - Conversion completes in <2 seconds
   - Preview shows converted image
   - Upload proceeds normally
   - Video generation succeeds with converted image

### Phase 4: Edge Cases
1. Test very large HEIC (>8MB)
2. Test HEIC burst sequence
3. Test iPhone Live Photo
4. Test Android HEIC (if available)

---

## 📝 Questions for KIE Support (If Needed)

If we discover KIE doesn't accept HEIC on backend:

1. Does `/api/file-stream-upload` accept `image/heic` MIME type?
2. Are HEIC files automatically converted server-side?
3. What's the recommended upload format for iOS photos?
4. Any file type restrictions we should document?

---

## 🎯 Next Steps

1. **User Confirmation:** Test on real iPhone to confirm HEIC rejection
2. **Implement Fix:** Frontend conversion (Option A)
3. **Deploy & Test:** Verify end-to-end flow works
4. **Monitor:** Watch logs for any KIE HEIC issues
5. **Document:** Add mobile upload guide for users

---

## 📚 Technical References

- [HEIC Format Spec](https://en.wikipedia.org/wiki/High_Efficiency_Image_File_Format)
- [heic2any Library](https://github.com/alexcorvi/heic2any)
- [iOS Camera Default Format](https://support.apple.com/en-us/HT207022)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)

---

**Status:** ✅ Investigation Complete - Ready to implement Option A
**Next Action:** Install heic2any and update ImageUploadField.tsx
