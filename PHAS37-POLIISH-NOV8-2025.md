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
---