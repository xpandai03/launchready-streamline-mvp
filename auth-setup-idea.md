## **🧭 High-Level Direction (Where You Are Now)**

-   ✅ Deployed working app on **Render**
-   ✅ Supabase CLI installed, authenticated, and linked
-   ✅ Database connected and migrations folder created
-   🔜 Next: Add **Auth + multi-tenant logic** so each user can:
    -   Log in or sign up
    -   Generate their own clips
    -   See _only their_ clips and posts
    -   Connect _their own_ Late social accounts (Instagram/TikTok/etc.)
    -   Eventually: manage billing via Stripe
* * *

## **🧩 Step 1 — User Requirements (for Claude + team)**

Here’s what the “multi-tenant user system” should accomplish:

### **🎯 Core Functional Requirements**

1.  **User Authentication**
    -   Email/password login via Supabase Auth
    -   Later: Google or other OAuth providers
    -   Secure sessions handled by Supabase
2.  **User Isolation**
    -   Each user only sees their own:
        -   Uploaded videos
        -   Generated clips
        -   Social posts (social\_posts.user\_id)
    -   No shared or public project visibility
3.  **Late.dev Integration per User**
    -   When a new user signs up:
        1.  Create a Late profile via POST /v1/profiles
        2.  Store late\_profile\_id in users table
    -   When they connect a social account:
        -   Use /v1/connect/\[platform\]?profileId=<their\_late\_profile\_id>
        -   Store account\_id for posting
    -   All posts they make use _their_ Late profile/account combo
4.  **Permissions**
    -   Users can only call /api/social/post for:
        -   Their own projects
        -   Their connected accounts
5.  **Stripe Billing (Phase 2)**
    -   Only paying users can post/export
    -   Free plan → 3 posts/month
    -   Pro plan → unlimited posting
* * *

## **🧱 Step 2 — Database Schema Additions**

We’ll extend your Supabase schema as follows:

```
-- Users table
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  stripe_customer_id text,
  late_profile_id text,
  created_at timestamp default now()
);

-- Modify existing tables
alter table projects add column user_id uuid references users(id);
alter table social_posts add column user_id uuid references users(id);
```

This ensures every project, clip, and social post is owned by a user.

* * *

## **⚙️ Step 3 — Auth Integration Plan**

### **Backend (Render)**

-   Add Supabase SDK with service role key:

```
npm install @supabase/supabase-js
```

-
-   Create server/services/supabaseClient.ts:

```
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### **Frontend**

-   Use Supabase JS for client auth:

```
npm install @supabase/supabase-js
```

-
-   Create an Auth context (client/src/context/AuthProvider.tsx):
    -   Handles sign-in, sign-up, and session management
-   Protect routes and pages:
    -   Only authenticated users can view dashboard or generate clips
* * *

## **🚀 Step 4 — Development Path Forward**

|
**Phase**

 |

**Goal**

 |

**Deliverable**

 |
| --- | --- | --- |
|

**Phase 1**

 |

Add Supabase Auth (email/password)

 |

/auth/signup and /auth/login routes + frontend UI

 |
|

**Phase 2**

 |

Add user ownership in DB

 |

Link user\_id in all related tables

 |
|

**Phase 3**

 |

Connect Late profiles per user

 |

Create Late profile on signup

 |
|

**Phase 4**

 |

Add Stripe billing

 |

Plans + limits per user

 |
|

**Phase 5**

 |

Testing + go-live

 |

QA, security, deploy, invite beta users

 |

* * *

## **✅ Immediate Next Actions**

1.  In Supabase Dashboard → Enable **Email Auth** under Auth → Providers.
2.  Create a migration for the users table (and user\_id in other tables).

```
supabase migration new add_users_table
# edit SQL → supabase db push
```

2.

3.  Add Supabase SDK in your app.
4.  Build simple sign-up/login pages on frontend.
5.  Confirm you can register and fetch a session.

Once this works → we’ll move to **Late profile creation per user** (Phase 3) and then **Stripe**.

* * *

If you’d like, I can now generate a **Claude prompt** to:

-   Scaffold the users table migration
-   Add Supabase Auth integration (signup/login)
-   Update backend and frontend files accordingly
