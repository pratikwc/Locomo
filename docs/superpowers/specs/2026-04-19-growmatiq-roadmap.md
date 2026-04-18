# Growmatiq — Master Product Roadmap

**Last updated:** 2026-04-19  
**Status:** Living document — update as phases complete

---

## The Vision

**Growmatiq** is an AI autopilot that runs a local business's entire Google presence on autopilot, so they rank higher on Google without lifting a finger.

**The Problem:** Local business owners (salons, restaurants, clinics, gyms) know they should be posting on Google, replying to reviews, keeping their profile updated — but they're too busy running their business. So they do nothing. Competitors who are more active rank above them.

**The Answer:** Connect Google once. The AI handles everything from that point forward.

---

## What the Product Does (Full Vision)

### 1. Content Autopilot
- Auto-generates and publishes 2 posts per week to Google Business Profile
- Every post includes a professional AI-generated image (photos get 3x more clicks)
- Posts naturally include local search keywords for that business category
- Rotates post types (Updates, Offers, Events) — exactly what Google rewards

### 2. Review Management
- Automatically replies to 4-5★ reviews within hours
- Flags 1-2★ reviews for owner review with a drafted reply ready
- Tracks reply rate (Google measures this as a ranking signal)

### 3. Profile Intelligence
- Audits profile completeness — missing hours, photos, services, description
- Auto-suggests or fills gaps
- Monitors website NAP consistency (Name, Address, Phone must match exactly)
- Keeps special/holiday hours current

### 4. Keyword & Ranking Tracking
- Tracks which search terms the business ranks for
- Monitors competitor keywords and activity nearby
- Shows rank movement over time ("you moved from #4 → #2 for 'hair salon near me'")

### 5. Analytics Dashboard
- Pulls GMB Insights: impressions, clicks, calls, direction requests
- Shows what's working and what needs attention

### 6. Weekly Owner Digest
- "Your autopilot ran this week — here's what happened"
- 2 posts published, 5 reviews replied to, rank improved for 3 keywords
- Owner stays informed without doing any work

### 7. Competitor Intelligence
- Nearby competitor monitoring
- Alerts: "A competitor opened 0.3 miles away" or "Competitors have Christmas posts, you have none"

---

## Core Differentiator

Most GMB tools are dashboards — they show you data and you still do the work.

**Growmatiq is the opposite** — it's an autonomous agent that acts, not just reports. The intelligence is in the category-specific best practices baked into every AI decision:
- A salon post sounds different from a dentist post
- Keywords are specific to the business type and city
- Image style matches the post purpose
- Reply tone matches the review sentiment

---

## Feature Status

| Feature | Status |
|---------|--------|
| Phone OTP login | ✅ Done |
| Google OAuth connect | ✅ Done |
| AI post generation (text) | ✅ Done |
| AI image generation (Gemini) | ✅ Done |
| Publish posts to Google | ✅ Done |
| Auto-reply to reviews | ✅ Done |
| AI recommendations panel | ✅ Done |
| Settings (auto-reply config) | ✅ Done |
| GMB Analytics (impressions, clicks) | ❌ Phase 2 |
| Profile completeness audit | ❌ Phase 2 |
| Website health monitor | ❌ Phase 2 |
| Weekly owner digest | ❌ Phase 2 |
| Posting scheduler (weekly autopilot) | ❌ Phase 3 |
| Q&A automation | ❌ Phase 3 |
| Smart keyword injection | ❌ Phase 3 |
| Keyword & rank tracking | ❌ Phase 4 |
| Competitor monitoring | ❌ Phase 4 |
| Multi-location / agency mode | ❌ Phase 4 |

---

## Execution Order

### Phase 2 — Owner Dashboard
*Goal: Give a business owner immediate visible value on day one.*

Build order (sequential — each unlocks the next):

1. **GMB Insights sync** — pull impressions, clicks, calls, direction requests from GMB API and store weekly snapshots. This is the data foundation for analytics.
2. **Analytics dashboard** — visualise GMB Insights with trend charts, week-over-week comparisons, and a top-level health score.
3. **Profile completeness audit** — score every missing GMB field, rank by ranking impact, surface as actionable cards.
4. **Weekly digest** — in-app (and optionally email) summary: posts published, reviews replied, rank change, top insight.

**Spec:** `docs/superpowers/specs/YYYY-MM-DD-phase2-owner-dashboard.md` *(to be written)*  
**Unlocks:** Owner can see their GMB performance and profile gaps without leaving the app.

---

### Phase 3 — Autopilot Engine
*Goal: Make the core product promise real — "set it and forget it."*

Build order:

1. **Posting scheduler** — weekly autopilot cycle: Mon analysis, Tue generate (text + image), Wed/Fri publish. Configurable frequency and topics. Uses existing AI post + image generation.
2. **Q&A automation** — detect new questions on GMB profile, generate answers using business context, queue for owner approval or auto-post.
3. **Smart keyword injection** — category-specific keyword library (e.g. "salon" → ["balayage", "haircut near me", "best salon in {city}"]). Inject 2-3 terms naturally into every AI-generated post.

**Spec:** `docs/superpowers/specs/YYYY-MM-DD-phase3-autopilot-engine.md` *(to be written)*  
**Unlocks:** The product runs without owner input. This is the demo moment.

---

### Phase 4 — Intelligence Layer
*Goal: Build the competitive moat — intelligence no other GMB tool has.*

Build order:

1. **Keyword & rank tracking** — track which search terms the business ranks for, store weekly snapshots, show movement over time on a ranking chart.
2. **Competitor monitoring** — scan nearby businesses in same category, detect new competitors, alert when competitor post activity spikes or new reviews appear.
3. **Multi-location / agency mode** — workspace-level management of multiple business locations, aggregate dashboard, bulk autopilot config.

**Spec:** `docs/superpowers/specs/YYYY-MM-DD-phase4-intelligence-layer.md` *(to be written)*  
**Unlocks:** Defensible product with data competitors can't replicate. Agency upsell path.

---

## How to Execute Each Phase

Each phase follows this cycle:

1. **Brainstorm** → run `/superpowers:brainstorming` on the first sub-feature of the phase
2. **Spec** → saved to `docs/superpowers/specs/`
3. **Plan** → `/superpowers:writing-plans` produces task-by-task implementation plan
4. **Build** → `/superpowers:executing-plans` or `/superpowers:subagent-driven-development`
5. **Review** → `/superpowers:requesting-code-review` before merging
6. **Ship** → `/superpowers:finishing-a-development-branch`

Start Phase 2 by saying: **"let's build Phase 2 — start with GMB Insights sync"**
