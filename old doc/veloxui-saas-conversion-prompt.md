# veloxui — Production SaaS Conversion
## Claude Code prompt — convert internal tool into a shippable product

---

## WHAT THIS PROMPT DOES

Converts the existing veloxui Next.js app from an internal pipeline tool
into a production-ready SaaS with:

1. Public marketing site (landing, pricing, about)
2. Authentication with gated access
3. Working subscription payments via Lemon Squeezy
4. User-facing library (browse, search, copy, download)
5. Pro tier gating on premium assets
6. User account + billing dashboard
7. Protected pipeline (owner-only, not accessible to regular users)
8. SEO, metadata, sitemap, robots.txt
9. Error handling, loading states, empty states throughout
10. Production environment configuration

Do NOT rewrite the pipeline logic, AI clients, or database queries.
Do NOT change the design system (colors, fonts, spacing already defined).
Add everything new on top of what exists.

---

## CURRENT STATE — what already works

- Pipeline: ideas → enrich → generate → validate → review → publish ✓
- Asset storage as code strings in Postgres ✓
- Sandboxed iframe preview ✓
- Semantic search with pgvector ✓
- Design system: dark, #080808 base, #e8ff47 accent, Geist Mono ✓
- Clerk installed but only wrapping the app ✓
- Lemon Squeezy env vars defined but no webhook ✓
- `is_pro` boolean on assets table ✓

---

## PART 1 — DATABASE ADDITIONS

Add these migrations to `supabase/migrations/002_saas.sql`.
Run after the existing 001_initial.sql migration.

```sql
-- User profiles (extends Clerk auth)
create table profiles (
  id           text primary key,  -- Clerk user ID
  email        text,
  plan         text default 'free' check (plan in ('free','pro','lifetime')),
  ls_customer_id   text,          -- Lemon Squeezy customer ID
  ls_subscription_id text,        -- Lemon Squeezy subscription ID
  ls_variant_id    text,          -- which plan variant they're on
  subscription_status text default 'inactive',
  subscription_ends_at timestamptz,
  copy_count   int default 0,     -- copies used this month (free tier limit)
  copy_reset_at timestamptz default now(),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Asset copy events (for analytics — no personal data)
create table copy_events (
  id         uuid primary key default gen_random_uuid(),
  asset_slug text not null,
  plan       text not null,        -- 'free' | 'pro' | 'lifetime'
  created_at timestamptz default now()
);

-- Waitlist (for pre-launch or new features)
create table waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  source     text,                 -- which page they signed up from
  created_at timestamptz default now()
);

-- Row level security
alter table profiles enable row level security;
create policy "Users can read own profile"
  on profiles for select using (auth.uid()::text = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid()::text = id);

-- Function: upsert profile on first sign in (called from webhook or API)
create or replace function upsert_profile(
  p_id text, p_email text
) returns void language sql as $$
  insert into profiles (id, email)
  values (p_id, p_email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
$$;

-- Helper: check if user has pro access
create or replace function is_pro_user(p_id text)
returns boolean language sql stable as $$
  select plan in ('pro', 'lifetime')
    and (subscription_status = 'active' or plan = 'lifetime')
  from profiles
  where id = p_id
  limit 1;
$$;
```

---

## PART 2 — ENVIRONMENT VARIABLES

Add to `.env.local`:

```bash
# Lemon Squeezy
LEMON_SQUEEZY_API_KEY=...
LEMON_SQUEEZY_STORE_ID=...
LEMON_SQUEEZY_WEBHOOK_SECRET=...

# Plan variant IDs from Lemon Squeezy dashboard
LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID=...
LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID=...
LEMON_SQUEEZY_LIFETIME_VARIANT_ID=...

# App
NEXT_PUBLIC_APP_URL=https://veloxui.dev
NEXT_PUBLIC_APP_NAME=veloxui

# Owner protection (pipeline access)
# Set this to your own Clerk user ID — only this user sees /pipeline
OWNER_USER_ID=user_xxxxx

# Analytics (optional — Plausible)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=veloxui.dev
```

---

## PART 3 — MIDDLEWARE

Create `middleware.ts` in the project root.

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Routes that require login
const isProtectedRoute = createRouteMatcher([
  '/account(.*)',
  '/billing(.*)',
])

// Routes only the owner can access (pipeline)
const isOwnerRoute = createRouteMatcher([
  '/pipeline(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()

  // Owner-only: pipeline pages
  if (isOwnerRoute(req)) {
    if (!userId || userId !== process.env.OWNER_USER_ID) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Auth-required pages
  if (isProtectedRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }
  }
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)']
}
```

---

## PART 4 — LEMON SQUEEZY INTEGRATION

### `lib/payments/lemon.ts`

```typescript
// Lemon Squeezy client wrapper

const LS_BASE = 'https://api.lemonsqueezy.com/v1'

const headers = {
  'Authorization': `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

// Create a checkout URL for a given variant
export async function createCheckout(
  variantId: string,
  userEmail: string,
  userId: string,
  redirectUrl: string
): Promise<string> {
  const res = await fetch(`${LS_BASE}/checkouts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
          },
          checkout_data: {
            email: userEmail,
            custom: { user_id: userId },
          },
          product_options: {
            redirect_url: redirectUrl,
            receipt_link_url: redirectUrl,
          },
          preview: false,
        },
        relationships: {
          store: {
            data: { type: 'stores', id: process.env.LEMON_SQUEEZY_STORE_ID }
          },
          variant: {
            data: { type: 'variants', id: variantId }
          }
        }
      }
    })
  })

  const data = await res.json()
  return data.data?.attributes?.url ?? ''
}

// Cancel a subscription
export async function cancelSubscription(subscriptionId: string) {
  await fetch(`${LS_BASE}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers,
  })
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  const res = await fetch(`${LS_BASE}/subscriptions/${subscriptionId}`, {
    headers,
  })
  return res.json()
}
```

### `app/api/payments/checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createCheckout } from '@/lib/payments/lemon'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const { variantId, plan } = await req.json()

  // Map plan name to variant ID
  const variantMap: Record<string, string> = {
    'pro-monthly':  process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID!,
    'pro-annual':   process.env.LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID!,
    'lifetime':     process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID!,
  }

  const variant = variantMap[plan]
  if (!variant) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const email = user?.emailAddresses?.[0]?.emailAddress ?? ''
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/account?checkout=success`

  const checkoutUrl = await createCheckout(variant, email, userId, redirectUrl)

  return NextResponse.json({ url: checkoutUrl })
}
```

### `app/api/payments/webhook/route.ts`

This is the most critical route — handles all Lemon Squeezy events.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/db/supabase-admin'

// Verify webhook signature
function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!
  const hmac = createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const eventName = event.meta?.event_name
  const data = event.data?.attributes
  const userId = event.meta?.custom_data?.user_id

  if (!userId) {
    return NextResponse.json({ error: 'No user_id' }, { status: 400 })
  }

  const admin = supabaseAdmin()

  switch (eventName) {

    case 'order_created': {
      // Lifetime purchase
      const variantId = String(data.first_order_item?.variant_id)
      if (variantId === process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID) {
        await admin.from('profiles').upsert({
          id: userId,
          plan: 'lifetime',
          ls_customer_id: String(data.customer_id),
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
      }
      break
    }

    case 'subscription_created':
    case 'subscription_updated': {
      const isActive = data.status === 'active' || data.status === 'on_trial'
      await admin.from('profiles').upsert({
        id: userId,
        plan: isActive ? 'pro' : 'free',
        ls_customer_id: String(data.customer_id),
        ls_subscription_id: String(data.id),
        ls_variant_id: String(data.variant_id),
        subscription_status: data.status,
        subscription_ends_at: data.ends_at ?? null,
        updated_at: new Date().toISOString(),
      })
      break
    }

    case 'subscription_cancelled':
    case 'subscription_expired': {
      await admin.from('profiles')
        .update({
          plan: 'free',
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      break
    }

    case 'subscription_resumed': {
      await admin.from('profiles')
        .update({
          plan: 'pro',
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      break
    }
  }

  return NextResponse.json({ received: true })
}

// Must use raw body for signature verification
export const config = { api: { bodyParser: false } }
```

### `lib/db/supabase-admin.ts` (service role — server only)

```typescript
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS — NEVER expose to client
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

---

## PART 5 — USER CONTEXT

### `lib/auth/getUser.ts`

Server helper — gets the current user's profile including plan.

```typescript
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db/supabase-admin'

export type UserProfile = {
  id: string
  plan: 'free' | 'pro' | 'lifetime'
  subscription_status: string
  copy_count: number
  copy_reset_at: string
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const { userId } = await auth()
  if (!userId) return null

  const admin = supabaseAdmin()
  const { data } = await admin
    .from('profiles')
    .select('id, plan, subscription_status, copy_count, copy_reset_at')
    .eq('id', userId)
    .single()

  return data
}

export async function isPro(): Promise<boolean> {
  const profile = await getUserProfile()
  if (!profile) return false
  return (
    (profile.plan === 'pro' && profile.subscription_status === 'active') ||
    profile.plan === 'lifetime'
  )
}

// Free tier: 10 copies per month
export const FREE_COPY_LIMIT = 10
```

### `app/api/auth/sync/route.ts`

Called on first sign-in to create profile row.

```typescript
import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db/supabase-admin'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress ?? ''

  const admin = supabaseAdmin()
  await admin.from('profiles').upsert(
    { id: userId, email, updated_at: new Date().toISOString() },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  return NextResponse.json({ ok: true })
}
```

---

## PART 6 — FILE STRUCTURE TO CREATE

```
app/
├── (marketing)/               ← public marketing pages, no auth required
│   ├── layout.tsx             ← marketing layout with Navbar + Footer
│   ├── page.tsx               ← landing page (replaces current homepage)
│   ├── pricing/
│   │   └── page.tsx           ← pricing page
│   ├── components/
│   │   └── page.tsx           ← component showcase / features page
│   └── changelog/
│       └── page.tsx           ← what's new
│
├── (app)/                     ← authenticated app shell
│   ├── layout.tsx             ← app layout with sidebar
│   ├── browse/
│   │   └── page.tsx           ← public library browser (no auth needed)
│   ├── asset/
│   │   └── [slug]/
│   │       └── page.tsx       ← asset detail page
│   ├── account/
│   │   └── page.tsx           ← billing, subscription management
│   └── dashboard/
│       └── page.tsx           ← post-login homepage (saved, recent, usage)
│
├── (pipeline)/                ← owner-only, protected by middleware
│   └── pipeline/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── ideas/page.tsx
│       ├── generate/page.tsx
│       └── review/page.tsx
│
├── (auth)/
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
│
└── api/
    ├── payments/
    │   ├── checkout/route.ts   ← create checkout session
    │   └── webhook/route.ts    ← handle LS events
    ├── auth/
    │   └── sync/route.ts       ← create profile on first login
    └── user/
        └── copy/route.ts       ← track copy event + enforce free limit

components/
├── marketing/
│   ├── Navbar.tsx             ← public nav with sign in CTA
│   ├── Footer.tsx             ← links, socials, legal
│   ├── HeroSection.tsx        ← landing hero
│   ├── FeatureGrid.tsx        ← feature highlights
│   ├── AnimationShowcase.tsx  ← live demos of components
│   ├── PricingCards.tsx       ← pricing tiers
│   ├── TestimonialStrip.tsx   ← social proof
│   └── CTASection.tsx         ← bottom conversion section
├── app/
│   ├── AppShell.tsx           ← sidebar + topbar for logged-in app
│   ├── CopyButton.tsx         ← copy with pro gate + limit tracking
│   ├── ProBadge.tsx           ← "Pro" lock overlay on gated content
│   └── UsageMeter.tsx         ← free tier copy limit indicator
└── auth/
    └── SyncUser.tsx           ← client component that calls /api/auth/sync
```

---

## PART 7 — LANDING PAGE

Create `app/(marketing)/page.tsx`

This replaces the current homepage. The current homepage search functionality
moves to `/browse`. The landing page is purely marketing.

### Sections in order:

**1. Navbar** — `components/marketing/Navbar.tsx`
```
Layout: fixed top, full width, backdrop-blur
Left:   logo "veloxui" in Instrument Serif italic
        + beta badge in accent color
Center: nav links — Components | Animations | Templates | Pricing
Right:  "Sign in" ghost button + "Get started free" accent button

Mobile: hamburger → slide-down drawer
Scroll behaviour: adds border-bottom after 20px scroll
```

**2. Hero section**
```
Background: #080808, no gradients
Eyebrow:    "500+ animations · 300 components · 100 templates"
            font-mono text-xs text-[--text-tertiary] tracking-wider

Headline:   "The UI library built for
             developers who ship."
            font-display italic, 56px desktop / 36px mobile
            Line 2 underlined with a hand-drawn SVG stroke
            Staggered fade-up animation on load

Subheadline: "Copy-paste React components, animations, and templates.
              All production-ready. Searchable by feel."
             text-[--text-secondary] text-lg max-w-xl

CTAs:        "Browse free components →" (accent button, large)
             "See how it works" (ghost, opens a demo video or scrolls)

Below CTAs:  Small trust line: "Used by developers at Vercel, Linear,
             Razorpay" — with small grayscale logos

Hero visual: 3-column grid of 6 live asset previews (actual iframes
             at reduced size, not screenshots) that play on hover.
             Slight stagger animation as they load in.
```

**3. Feature grid** — `components/marketing/FeatureGrid.tsx`
```
Section title: "Everything you need to ship faster"

6 feature cards in a 3×2 grid:
- Copy-paste ready      · "One click to copy. Works in any React project."
- AI semantic search    · "Describe what you want. Find it instantly."
- Sandboxed previews    · "See it run before you copy it."
- Production quality    · "Accessible, typed, dark-mode ready."
- Framer + GSAP         · "Both libraries. Pick what fits your stack."
- Always growing        · "50+ new assets added every month."

Each card:
  bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-5
  Icon top (14px, accent color SVG)
  Title: text-sm font-medium text-[--text-primary]
  Desc:  text-xs text-[--text-secondary] leading-relaxed mt-1
```

**4. Live showcase** — `components/marketing/AnimationShowcase.tsx`
```
Section title: "See it in action"
Subtitle: "Hover the previews. Copy in one click."

Masonry-style grid of 6–9 live asset iframes
Each: rounded-xl overflow-hidden, hoverable, with copy button on hover
Load from /api/assets/random?count=9&is_pro=false
```

**5. Pricing section** — `components/marketing/PricingCards.tsx`

Three tiers:

```
FREE                    PRO ($15/mo or $99/yr)    LIFETIME ($199 once)
────────────────────    ──────────────────────    ────────────────────
✓ 300 animations        Everything in Free +      Everything in Pro +
✓ 150 components        ✓ All 500 animations      ✓ All future assets
✗ Templates             ✓ All 300 components      ✓ Lifetime updates
✗ Pro animations        ✓ 100 templates           ✓ Commercial license
10 copies/month         Unlimited copies          Unlimited copies
                        Commercial license        Priority support

[Browse free]           [Get Pro →]               [Get Lifetime →]
                        MOST POPULAR badge
```

Card styling:
```
All three: bg-[--bg-surface] border border-[--border-subtle] rounded-2xl p-6
Pro card:  border-[--accent-border] — 2px border, accent glow
Annual toggle at top: saves 45% vs monthly
Checkout buttons call POST /api/payments/checkout
```

**6. Testimonials** — `components/marketing/TestimonialStrip.tsx`
```
3 quote cards in a row
Each: author avatar (initials circle), name, role, quote text
Keep them credible and specific — not generic praise
Subtle border, no backgrounds that compete with the dark base
```

**7. Bottom CTA**
```
"Start building better UIs today"
[Browse free components →]  [Sign up free]
```

**8. Footer** — `components/marketing/Footer.tsx`
```
4 columns: Product | Resources | Legal | Connect
Bottom bar: © 2026 veloxui · Made with Develozy · Privacy · Terms
```

---

## PART 8 — PRICING PAGE

Create `app/(marketing)/pricing/page.tsx`

Full-page version of the pricing section. Same three tiers but with:

- Full feature comparison table below the cards
- FAQ section (8–10 questions)
- "Still deciding?" → free tier CTA at bottom

**FAQ questions to include:**
1. Can I use components in client projects?
2. What counts as a "copy"?
3. What happens when I hit the free limit?
4. Is there a refund policy?
5. Does the lifetime deal include future assets?
6. Which AI models are used to generate components?
7. Can I request specific components?
8. How is this different from shadcn/ui?

---

## PART 9 — BROWSE / LIBRARY PAGE

Create `app/(app)/browse/page.tsx` — replaces the current library/search page.

This is the main user-facing product page. Accessible without auth (free browsing).

```
Layout:
  Sticky top: search bar + filter row
  Below: asset grid (infinite scroll or pagination)

Filter row:
  Category:   All · Animations · Components · Templates
  Tech:       All · Framer Motion · GSAP · CSS
  Complexity: All · Low · Medium · High
  Sort:       Newest · Popular · A–Z
  Toggle:     Free only / Show Pro

Search:
  Semantic search via /api/assets/search
  Debounced 300ms
  Shows "Searching…" spinner
  Empty state with suggestions

Asset cards in grid (3 cols desktop, 2 tablet, 1 mobile):
  Free assets: full preview + copy button
  Pro assets (not subscribed): blurred preview + lock icon + "Pro" badge
  Copy button:
    - Not logged in: redirects to /sign-up
    - Free user + under limit: copies code, increments counter
    - Free user + over limit: shows upgrade modal
    - Pro user: copies code, no limit
```

---

## PART 10 — ASSET DETAIL PAGE

Update `app/(app)/asset/[slug]/page.tsx`

```
Layout: max-w-5xl, centered

Header:
  Breadcrumb: Browse → [Category] → Asset Name
  Title: asset name in font-display italic
  Tags + tech badges
  Pro badge if is_pro: true

Main: 2 columns (60/40)

Left — preview:
  Large iframe (aspect-video, rounded-xl)
  Responsive preview toggle: Desktop / Tablet / Mobile

Right — details + code:
  Description text
  Metadata: type, category, complexity, license
  
  Code section:
    Syntax-highlighted code block (use shiki)
    "Copy component →" button (with auth + pro gate)
    
  If Pro and not subscribed:
    Code block is blurred
    "Unlock with Pro — from $15/mo" button
    Links to /pricing

Below the fold:
  "More like this" — 4 similar assets via semantic search
  "Recently added" — 4 newest assets
```

---

## PART 11 — COPY BUTTON WITH GATING

Create `components/app/CopyButton.tsx`

This is the most important UI element for monetisation. Handle all states:

```typescript
'use client'

interface CopyButtonProps {
  assetSlug: string
  code: string | null       // null if pro-gated (not returned from API)
  isPro: boolean            // asset is pro-gated
  userPlan: 'free' | 'pro' | 'lifetime' | null  // null = not logged in
  copyCount: number         // copies used this month
  className?: string
}

// States:
// 1. Not logged in + free asset     → copies code, prompts soft sign-up after
// 2. Not logged in + pro asset      → redirect to /sign-up
// 3. Free user + free asset + under limit → copies, increments counter
// 4. Free user + free asset + over limit  → shows UpgradeModal
// 5. Free user + pro asset          → shows UpgradeModal
// 6. Pro user + any asset           → copies, no limit
// 7. Lifetime user + any asset      → copies, no limit
// 8. Just copied                    → shows ✓ Copied for 2 seconds

// On copy success: POST /api/user/copy { slug }
// This increments copy_count and logs the event
```

---

## PART 12 — ACCOUNT / BILLING PAGE

Create `app/(app)/account/page.tsx`

```
Page title: "Account"

Section 1 — Plan
  Current plan badge: Free / Pro / Lifetime
  If Free:
    Usage meter: "7 / 10 copies used this month"
    Progress bar: bg-[--bg-elevated], fill accent color
    Reset date: "Resets March 1"
    "Upgrade to Pro →" button
  If Pro:
    Subscription status + renewal date
    "Manage subscription" → Lemon Squeezy portal URL
    "Cancel subscription" → confirm then call cancel API
  If Lifetime:
    "Lifetime member" badge with accent border
    "No subscription to manage"

Section 2 — Usage stats
  This month: N copies · N assets browsed
  All time: N copies

Section 3 — Account
  Email (read-only, from Clerk)
  "Sign out" button
  "Delete account" button (danger, with confirm modal)
```

---

## PART 13 — TRACK COPY EVENT

Create `app/api/user/copy/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db/supabase-admin'
import { FREE_COPY_LIMIT } from '@/lib/auth/getUser'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  const { slug } = await req.json()
  const admin = supabaseAdmin()

  if (!userId) {
    // Anonymous copy — just log it, no limit enforcement
    await admin.from('copy_events').insert({ asset_slug: slug, plan: 'anonymous' })
    return NextResponse.json({ ok: true })
  }

  // Get current user profile
  const { data: profile } = await admin
    .from('profiles')
    .select('plan, subscription_status, copy_count, copy_reset_at')
    .eq('id', userId)
    .single()

  if (!profile) return NextResponse.json({ ok: true })

  const isPro = (profile.plan === 'pro' && profile.subscription_status === 'active')
             || profile.plan === 'lifetime'

  // Reset monthly counter if needed
  const resetAt = new Date(profile.copy_reset_at)
  const now = new Date()
  const shouldReset = now.getMonth() !== resetAt.getMonth()
    || now.getFullYear() !== resetAt.getFullYear()

  if (shouldReset) {
    await admin.from('profiles')
      .update({ copy_count: 0, copy_reset_at: now.toISOString() })
      .eq('id', userId)
  }

  const currentCount = shouldReset ? 0 : (profile.copy_count ?? 0)

  // Free tier limit check
  if (!isPro && currentCount >= FREE_COPY_LIMIT) {
    return NextResponse.json(
      { error: 'limit_reached', limit: FREE_COPY_LIMIT },
      { status: 403 }
    )
  }

  // Increment copy count for free users
  if (!isPro) {
    await admin.from('profiles')
      .update({ copy_count: currentCount + 1 })
      .eq('id', userId)
  }

  // Log event for analytics
  await admin.from('copy_events').insert({
    asset_slug: slug,
    plan: profile.plan,
  })

  return NextResponse.json({ ok: true, count: currentCount + 1 })
}
```

---

## PART 14 — API ROUTE UPDATES

### Update `app/api/assets/[slug]/route.ts`

The code field must respect pro gating:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db/supabase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { userId } = await auth()
  const admin = supabaseAdmin()

  const { data: asset } = await admin
    .from('assets')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check if user can access pro content
  let hasProAccess = false
  if (userId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('plan, subscription_status')
      .eq('id', userId)
      .single()

    hasProAccess = (profile?.plan === 'pro' && profile.subscription_status === 'active')
                || profile?.plan === 'lifetime'
  }

  // Gate code field for pro assets
  if (asset.is_pro && !hasProAccess) {
    const { code, preview_html, ...publicFields } = asset
    return NextResponse.json({ ...publicFields, code: null, locked: true })
  }

  return NextResponse.json({ ...asset, locked: false })
}
```

---

## PART 15 — SEO + METADATA

### `app/(marketing)/layout.tsx`

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  title: {
    default: 'veloxui — React UI Components, Animations & Templates',
    template: '%s | veloxui',
  },
  description: 'Copy-paste React components, animations, and templates. 500+ assets built with Framer Motion, GSAP, and Tailwind CSS. Production-ready. Searchable by feel.',
  keywords: ['react components', 'framer motion animations', 'tailwind ui', 'copy paste components', 'react animation library'],
  authors: [{ name: 'Develozy' }],
  creator: 'Develozy',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'veloxui',
    title: 'veloxui — React UI Components & Animations',
    description: '500+ production-ready React components, animations, and templates.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'veloxui' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'veloxui',
    description: '500+ React components, animations, and templates.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}
```

### `app/sitemap.ts`

```typescript
import { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/db/supabase-admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = supabaseAdmin()
  const { data: assets } = await admin
    .from('assets')
    .select('slug, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })

  const base = process.env.NEXT_PUBLIC_APP_URL!

  const staticPages = [
    { url: base,                    lastModified: new Date(), priority: 1 },
    { url: `${base}/pricing`,       lastModified: new Date(), priority: 0.9 },
    { url: `${base}/browse`,        lastModified: new Date(), priority: 0.9 },
    { url: `${base}/components`,    lastModified: new Date(), priority: 0.8 },
    { url: `${base}/changelog`,     lastModified: new Date(), priority: 0.5 },
  ]

  const assetPages = (assets ?? []).map(a => ({
    url: `${base}/asset/${a.slug}`,
    lastModified: new Date(a.updated_at),
    priority: 0.7,
  }))

  return [...staticPages, ...assetPages]
}
```

### `app/robots.ts`

```typescript
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/pipeline/', '/api/'] },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  }
}
```

---

## PART 16 — AUTH PAGES

### `app/(auth)/sign-in/[[...sign-in]]/page.tsx`

```typescript
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#080808'
    }}>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#e8ff47',
            colorBackground: '#0f0f0f',
            colorText: '#f0efec',
            colorTextSecondary: '#8a8884',
            colorInputBackground: '#161616',
            colorInputText: '#f0efec',
            borderRadius: '8px',
            fontFamily: 'Geist, system-ui, sans-serif',
          },
          elements: {
            card: 'border border-[rgba(255,255,255,0.08)] shadow-none',
            headerTitle: 'text-[#f0efec] font-medium',
            socialButtonsBlockButton: 'border-[rgba(255,255,255,0.08)] bg-[#161616]',
            formButtonPrimary: 'bg-[#e8ff47] text-black font-semibold hover:bg-[#e8ff47]/90',
          }
        }}
        redirectUrl="/browse"
        signUpUrl="/sign-up"
      />
    </div>
  )
}
```

Do the same for `sign-up` with `redirectUrl="/dashboard"` (triggers profile sync on first login).

---

## PART 17 — SYNC USER ON FIRST SIGN IN

Create `components/auth/SyncUser.tsx`

A client component that calls the sync API on mount. Mount it inside the
`(app)/layout.tsx` so it runs whenever a logged-in user loads the app.

```typescript
'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'

export default function SyncUser() {
  const { userId, isLoaded } = useAuth()

  useEffect(() => {
    if (!isLoaded || !userId) return
    // Fire and forget — creates profile if it doesn't exist
    fetch('/api/auth/sync', { method: 'POST' }).catch(() => {})
  }, [userId, isLoaded])

  return null
}
```

---

## PART 18 — UPGRADE MODAL

Create `components/app/UpgradeModal.tsx`

Shown when a free user hits their copy limit or tries to access a pro asset.

```typescript
// Modal content:
// Title: "Unlock unlimited access"
// Subtitle: "You've used N/10 free copies this month."
//            or "This component requires a Pro subscription."
//
// Two options side by side:
// Pro Monthly: $15/mo — [Upgrade now]
// Lifetime:    $199    — [Get lifetime]
//
// Below: "Free plan includes 10 copies/month · No credit card required to browse"
//
// Clicking a plan: calls POST /api/payments/checkout { plan: 'pro-monthly' | 'lifetime' }
//                  then redirects to returned checkout URL
//
// Style: modal overlay on dark backdrop
//        modal: bg-[--bg-elevated] border border-[--border-default] rounded-2xl p-6
//        Pro card: accent border
```

---

## IMPLEMENTATION ORDER

Claude Code should implement in this exact order:

1. Database migration (`supabase/migrations/002_saas.sql`)
2. `lib/db/supabase-admin.ts`
3. `lib/payments/lemon.ts`
4. `lib/auth/getUser.ts`
5. `middleware.ts`
6. Auth sync route + `SyncUser` component
7. Webhook route (`/api/payments/webhook`)
8. Checkout route (`/api/payments/checkout`)
9. Copy tracking route (`/api/user/copy`)
10. Updated asset route (pro gating)
11. Marketing layout + Navbar + Footer
12. Landing page sections (Hero → Features → Showcase → Pricing → CTA)
13. Pricing page
14. Browse page
15. Asset detail page
16. CopyButton component
17. UpgradeModal component
18. Account page
19. Auth pages (sign-in, sign-up)
20. SEO: metadata, sitemap, robots
21. `SyncUser` wired into app layout

---

## DO NOT CHANGE

- Any pipeline logic (`lib/pipeline/`, `components/pipeline/`)
- Any AI client code (`lib/ai/`)
- The existing design system tokens (colors, fonts, spacing)
- The sandbox preview system (`lib/preview/sandbox.ts`)
- Database schema from `001_initial.sql`
- Existing API routes for assets, search, preview

---

## FINAL CHECKLIST

Before marking complete, verify:

- [ ] Webhook endpoint responds 200 to Lemon Squeezy test events
- [ ] Signature verification rejects invalid webhooks
- [ ] Free user sees 10/10 limit and upgrade modal
- [ ] Pro user can copy all assets including pro-gated ones
- [ ] Pipeline routes redirect non-owners to homepage
- [ ] `/browse` works without authentication (public)
- [ ] Asset detail page blurs code for pro assets when not subscribed
- [ ] Sign-in page matches the dark design system
- [ ] `SyncUser` creates a profile row on first login
- [ ] Sitemap includes all published asset slugs
- [ ] OG image path exists at `/public/og.png`
- [ ] All marketing pages have correct `<title>` and meta description
- [ ] Annual pricing toggle works on pricing page
- [ ] Mobile navigation works on landing page
