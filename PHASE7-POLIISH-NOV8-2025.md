It's structured exactly like your previous roadmap files (e.g., UGC-redesign-NOV7th.md) --- so Claude can read it, understand scope, and implement one subphase at a time.

* * * * *

```
# 📘 Phase 7 --- AI Caption Customization & Scheduled Posting System
**Date:** Nov 2025
**Owner:** Streamline AI Dev Team
**Build Context:** Post-Phase-6 UGC Ad Studio (Video generation pipeline stable)

---

## 🎯 Objective
Enhance the UGC Ad Studio with:
1. **Customizable AI Caption Writer** --- users can personalize tone, style, and CTA via a system prompt.
2. **Scheduling System** --- users can schedule auto-generated UGC videos to post later via Late.dev.
3. **Schedule Dashboard** --- show all scheduled, posted, and failed posts in one unified view.

Goal: Make the app feel like a full **AI content studio** --- not just a generator.

---

## 🧠 1️⃣ Caption Agent Customization

### 🧩 Feature Description
Each user can edit and save their own **caption system prompt** and toggle automatic caption generation.

Example use case:
> User prefers captions that sound like "influencer reviews" or "corporate promos."
> They update the system prompt:
> *"Write like a motivational personal trainer --- energetic, short, emoji-rich."*

### ⚙️ Implementation Tasks

#### Database
Add new fields to `users` table:
```sql
ALTER TABLE users
ADD COLUMN caption_system_prompt TEXT,
ADD COLUMN caption_auto_generate BOOLEAN DEFAULT true;
```

#### **Backend**

-   Update /api/social/post:

    -   Fetch user's custom caption prompt.

    -   If empty → fallback to default global prompt.

    -   Use this value in the OpenAI caption generation call:

```
const captionPrompt = user.caption_system_prompt || DEFAULT_PROMPT;
```

-   Add /api/user/caption-settings:

    -   GET → return user's current settings.

    -   PUT → save new prompt + toggle.

#### **Frontend**

-   Add **"Caption Settings" modal** or drawer accessible from AI Studio sidebar:

    -   Textarea: "AI Caption Prompt"

    -   Toggle: "Auto-generate captions for my posts"

    -   Button: "Save Settings"

    -   Toast feedback:

        -   ✅ "Caption settings saved successfully"

        -   ⚠️ "Failed to save settings"

#### **UX Behavior**

-   When posting video → auto-generate caption using user's system prompt.

-   If toggle is off → user writes caption manually.

* * * * *

**⏱️ 2️⃣ Scheduled Posting System**
-----------------------------------

### **🧩 Feature Description**

Users can schedule when a generated video will be posted on Instagram.

Late.dev handles posting via cron jobs on the backend.

### **⚙️ Implementation Tasks**

#### **Database**

Extend social_posts:

```
ALTER TABLE social_posts
ADD COLUMN scheduled_for TIMESTAMPTZ,
ADD COLUMN is_scheduled BOOLEAN DEFAULT false,
ADD COLUMN posted_at TIMESTAMPTZ;
```

#### **Backend**

-   Update /api/social/post:

    -   Accept scheduledFor parameter.

    -   If present → mark post as scheduled:

```
is_scheduled: true,
scheduled_for: new Date(req.body.scheduledFor),
```

-   -

    -   Save in DB; do not call Late.dev immediately.

-   Create **cron job** (scripts/cron-post-scheduler.ts):

    -   Runs every 5 minutes.

    -   Finds posts where is_scheduled = true and scheduled_for <= now().

    -   Posts to Late.dev.

    -   Updates status = 'posted', posted_at = now().

#### **Frontend**

-   Add **"Schedule Post"** option in modal.

    -   Opens datetime picker.

    -   Displays estimated posting time.

    -   On success → toast "Post scheduled for Nov 10, 3:00 PM 🕒"

-   Retain "Post Now" option.

#### **API Flow**

1.  /api/social/post receives caption, platform, videoUrl, and scheduledFor.

2.  Saves record with is_scheduled=true.

3.  Cron job auto-posts at scheduled time.

* * * * *

**📅 3️⃣ Schedule Dashboard Page**
----------------------------------

### **🧩 Feature Description**

A new page /schedule to show upcoming and past UGC posts.

Users can see what's queued, what's done, and what failed.

### **⚙️ Implementation Tasks**

#### **Frontend**

-   New page route: /schedule

-   Add to navbar: "📅 Schedule"

-   Table view:

|

**Video**

 |

**Caption**

 |

**Platform**

 |

**Status**

 |

**Scheduled**

 |

**Posted**

 |
| --- | --- | --- | --- | --- | --- |
|

🎥 GLP-1.mp4

 |

"Boost energy naturally ⚡️"

 |

Instagram

 |

🕐 Scheduled

 |

Nov 9, 3:00 PM

 |

---

 |
|

🎥 Creatine.mp4

 |

"Level up your workouts 💪"

 |

Instagram

 |

✅ Posted

 |

Nov 8, 2:00 PM

 |

Nov 8, 2:03 PM

 |
|

🎥 Collagen.mp4

 |

"Shine from within ✨"

 |

Instagram

 |

❌ Failed

 |

Nov 7, 4:00 PM

 |

---

 |

-   Auto-refresh every 30 seconds.

-   Filters: All / Scheduled / Posted / Failed.

#### **Backend**

-   GET /api/social/schedule → returns all posts for current user.

* * * * *

**🧩 Integration Points**
-------------------------

|

**Component**

 |

**Description**

 |
| --- | --- |
|

/api/social/post

 |

Handles posting or scheduling; integrates with Late.dev

 |
|

Late.dev API

 |

Publishes posts (immediate or scheduled)

 |
|

cron-post-scheduler.ts

 |

Auto-publishes scheduled posts

 |
|

/schedule page

 |

Displays scheduling logs and statuses

 |
|

/api/user/caption-settings

 |

CRUD for caption agent customization

 |

* * * * *

**✅ Success Criteria**
----------------------

|

**Category**

 |

**Criteria**

 |
| --- | --- |
|

Caption Agent

 |

Users can edit + save AI caption prompt

 |
|

Caption Preview

 |

Posts generate captions with new tone/style

 |
|

Scheduled Posting

 |

Cron job successfully posts scheduled videos

 |
|

Schedule Dashboard

 |

All posts visible with real-time status

 |
|

UX

 |

Feels like "Generate → Schedule → Track → Post"

 |
|

Stability

 |

No missing auth issues or 401s

 |

* * * * *

**🧭 Rollout Plan**
-------------------

|

**Phase**

 |

**Focus**

 |

**Estimated Time**

 |
| --- | --- | --- |
|

7.1

 |

Caption Settings (backend + modal)

 |

4--6 hours

 |
|

7.2

 |

Scheduled Posting (API + cron job)

 |

6--8 hours

 |
|

7.3

 |

Schedule Dashboard (UI + polling)

 |

4--5 hours

 |
|

7.4

 |

Testing & Polish (toasts, logs, auth)

 |

2--3 hours

 |

* * * * *

**🧱 Deliverables for Claude**
------------------------------

Claude must:

1.  Implement /api/user/caption-settings CRUD endpoints.

2.  Extend /api/social/post for scheduling support.

3.  Add cron worker for scheduled posts.

4.  Create /schedule page (React + Tailwind).

5.  Add Caption Settings modal.

6.  Implement success/error toasts across new flows.

7.  Ensure all new endpoints respect req.user.id.

* * * * *

**🧩 Expected Output from Claude**
----------------------------------

1.  **File-by-file diff summary**

2.  **Migration scripts** for users and social_posts

3.  **UI components**: CaptionSettingsModal.tsx, SchedulePage.tsx

4.  **Test script** for cron posting (npx tsx scripts/test-cron.ts)

5.  **End-to-end testing checklist**

* * * * *

**🧩 Final Notes**
------------------

-   Keep modularity: reuse generateCaption() from existing caption logic.

-   Don't duplicate Late.dev post logic.

-   Maintain auth middleware consistency.

-   Use consistent toast components (useToast() hook).

* * * * *

```
─────────────────────────────────────────────────────────────────────────────────────
 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 PHASE 7.1b: Add Caption Settings Modal in AI Studio

 Overview:
 Add quick-access caption customization directly in the AI Studio interface. Users
 can customize their AI caption system prompt and toggle auto-generation without
 leaving the UGC Ad creation page.

 ---
 🧩 Phase 7.1b.1: Create CaptionSettingsModal Component

 What: Build a reusable modal component for caption settings

 Files to create:
 - client/src/components/CaptionSettingsModal.tsx

 Implementation:
 // New modal component with:
 - Dialog wrapper (Radix UI @radix-ui/react-dialog)
 - Textarea for system prompt (max 1000 chars, character counter)
 - Toggle switch for auto-generate
 - Save button with loading state
 - Cancel button
 - Success/error toast notifications
 - Fetches current settings on mount via GET /api/user/caption-settings
 - Saves settings via PUT /api/user/caption-settings
 - Props: open, onOpenChange, onSaved (callback after successful save)

 UI Design:
 - Dark theme matching AI Studio aesthetic
 - Glassmorphism card style (bg-white/10 backdrop-blur)
 - Responsive (full screen on mobile, centered modal on desktop)
 - Similar layout to existing CaptionSettingsPage but more compact

 ---
 🧩 Phase 7.1b.2: Integrate Modal into AI Studio Header

 What: Add "Caption Settings" button to AI Studio navigation

 Files to modify:
 - client/src/pages/AIStudioPage.tsx

 Implementation:
 // Add to header section (near "UGC Ad Studio" title):
 1. Import CaptionSettingsModal
 2. Add state: const [captionModalOpen, setCaptionModalOpen] = useState(false)
 3. Add button with Settings icon next to title
 4. Render CaptionSettingsModal with open/onOpenChange props
 5. Optional: Add tooltip explaining feature

 Button placement:
 - Top-right area of header, before user profile
 - Icon: Settings (from lucide-react)
 - Label: "Caption Settings" or just icon with tooltip
 - Styling: Ghost button matching existing UI

 ---
 🧩 Phase 7.1b.3: Add Quick Access from Form

 What: Add inline hint/link in the Product Brief form

 Files to modify:
 - client/src/pages/AIStudioPage.tsx (form section)

 Implementation:
 // Below the "Generate UGC Ad Video" button:
 - Add info text: "Captions will be auto-generated when posting"
 - Add link/button: "Customize AI caption style →"
 - Clicking opens the CaptionSettingsModal
 - Only show if user has auto-generate enabled

 UX considerations:
 - Non-intrusive, subtle text color (text-white/50)
 - Helpful for new users discovering the feature
 - Uses existing modal (no duplication)

 ---
 🧩 Phase 7.1b.4: Backend Integration

 What: Ensure modal correctly uses existing endpoints

 Files (no changes needed, just verify):
 - server/routes.ts - GET/PUT /api/user/caption-settings
 - client/src/lib/queryClient.ts - apiRequest helper

 Integration points:
 // Modal will use:
 1. useQuery to fetch settings on mount
 2. useMutation to save settings
 3. queryClient.invalidateQueries to refresh
 4. Toast notifications for feedback

 Error handling:
 - Network errors → toast notification
 - Validation errors → inline field errors
 - 401 errors → redirect to login
 - Success → toast + close modal + optional callback

 ---
 🧩 Phase 7.1b.5: Testing & Polish

 What: Comprehensive testing and UX refinement

 Test scenarios:
 1. Open modal - Verify current settings load correctly
 2. Edit prompt - Change system prompt, verify character counter
 3. Toggle auto-generate - Switch on/off, verify state
 4. Save changes - Click save, verify API call, toast, modal closes
 5. Cancel changes - Click cancel/close, verify no save
 6. Validation - Enter >1000 chars, verify error
 7. Network error - Simulate 500 error, verify error toast
 8. Mobile responsive - Test on phone, verify full-screen modal
 9. Integration - Post UGC ad, verify caption uses saved prompt
 10. Persistence - Refresh page, verify settings persist

 Success criteria:
 ✅ Modal opens smoothly from AI Studio header
 ✅ Current settings load immediately (no flash of default values)
 ✅ Character counter works correctly (shows remaining chars)
 ✅ Toggle switch reflects current auto-generate state
 ✅ Save button disabled until changes made
 ✅ Save succeeds → toast notification + modal closes
 ✅ Cancel/close → no API call, changes discarded
 ✅ Validation prevents >1000 chars from being saved
 ✅ Error handling shows user-friendly messages
 ✅ Mobile experience is seamless (full-screen overlay)
 ✅ No duplication with existing CaptionSettingsPage
 ✅ Performance: No lag when opening/closing modal

 ---
 📐 Component Structure

 AIStudioPage.tsx
 ├── Header
 │   ├── Title: "UGC Ad Studio"
 │   ├── Button: "Caption Settings" (opens modal) ← NEW
 │   └── User menu
 ├── Form Card
 │   ├── Product Brief fields
 │   ├── Generate Button
 │   └── Hint: "Customize AI caption style →" ← NEW
 └── CaptionSettingsModal (conditional render) ← NEW
     ├── Dialog overlay
     ├── Dialog content
     │   ├── Header: "AI Caption Settings"
     │   ├── Textarea: System prompt
     │   ├── Toggle: Auto-generate
     │   ├── Character counter
     │   ├── Buttons: Cancel | Save
     │   └── Loading states
     └── Toast notifications

 ---
 🔌 API Integration Flow

 User clicks "Caption Settings"
   ↓
 Modal opens
   ↓
 useQuery → GET /api/user/caption-settings
   ↓
 Display current settings in form
   ↓
 User edits prompt/toggle
   ↓
 User clicks "Save"
   ↓
 useMutation → PUT /api/user/caption-settings
   ↓
 Success: Toast + invalidate queries + close modal
 Error: Toast with error message

 ---
 🎨 Design Consistency

 Reuse existing patterns:
 - Dialog from UGCAdPreviewModal.tsx (same Radix UI setup)
 - Textarea styling from form fields in AIStudioPage.tsx
 - Toggle switch from CaptionSettingsPage.tsx
 - Toast notifications using useToast() hook
 - Loading states using Loader2 icon from lucide-react
 - Color scheme: dark bg with white/10 opacity cards

 New additions:
 - Settings icon button in header (lucide-react Settings)
 - Inline hint text with arrow → pointing to modal
 - Compact modal layout (less padding than full settings page)

 ---
 📦 Dependencies (already installed)

 - @radix-ui/react-dialog ✅
 - @tanstack/react-query ✅
 - lucide-react ✅
 - Existing toast system ✅

 ---
 🚀 Deployment Considerations

 No breaking changes:
 - Purely additive feature
 - Uses existing backend endpoints
 - No database migrations needed
 - No environment variables required

 Rollout:
 - Feature available immediately after deploy
 - No feature flag needed (low risk)
 - Backwards compatible (existing settings page still works)
 - Mobile-friendly (responsive design)

 ---
 📊 Success Metrics

 User engagement:
 - % of users who open caption settings modal
 - % of users who customize their prompt
 - Average session time in modal
 - Conversion: modal saves vs. cancels

 Technical:
 - Modal load time <500ms
 - API response time <1s
 - Error rate <1%
 - Mobile vs. desktop usage ratio

 ---
 This plan adds quick-access caption customization to AI Studio while maintaining
 consistency with existing patterns and avoiding code duplication.
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌

---