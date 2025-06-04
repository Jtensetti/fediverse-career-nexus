# 🌐 Bondy — a Fediverse Career Nexus

A community-driven, federated job board designed for the open web.

Built with ❤️ on [Lovable.dev](https://lovable.dev), **Fediverse Career Nexus** is robust enough to scale, but still open for improvement. It’s an experiment — and a mission — to make professional discovery possible across federated networks.

> ✊ This is not just a job board — it’s a declaration of independence from centralized platforms.

*Professional networking & job board that speaks ActivityPub*

---

## 🔍 What It Does (Today)

| Feature                               | Status         | Notes                                                         |
| ------------------------------------- | -------------- | ------------------------------------------------------------- |
| Post jobs with salary/skills/location | **✅ Complete** | Form‑driven, server‑validated                                 |
| Filter & search jobs                  | **✅ Complete** | Faceted by type, location, skills, remote                     |
| ActivityPub actor & inbox             | **🟡 Beta**    | `/actor/:user`, shared `/inbox` live                          |
| ActivityPub outbox & delivery queue   | **🟡 Beta**    | Partitioned queue; signing added, strict validation WIP       |
| Follow / Accept flow                  | **🟡 Beta**    | Auto‑accept implemented, unfollow + reject pending            |
| WebFinger discovery                   | **🟡 Beta**    | Works for remote actors; auto‑generate local fallback pending |
| Job detail page                       | **✅ Complete** | `/jobs/:id` with SEO meta                                     |
| Pagination / infinite scroll          | **✅ Complete** | IntersectionObserver + Supabase range queries                 |
| Error & loading states                | **✅ Complete** | Skeletons + toasts everywhere                                 |
| Moderation (domain, actor block)      | **🟡 Beta**    | Domain block live; per‑actor block in progress                |
| Tests & CI                            | **🟡 Partial** | Jest + Deno test for Edge functions; 40 % coverage            |

Legend: **✅ finished** • **🟡 usable but incomplete**

---

## 🏗️ Architecture Snapshot

```
React (Vite) ──supabase-js──► Edge Functions (Deno)
     ▲                                │
     │ WebSocket realtime             │ POST (HTTP Sig)
     ▼                                ▼
  Postgres  ◄── RLS, policies ── federation_queue_* (partitioned)
```

* **Frontend**: React + Tailwind + ShadCN/UI
* **Backend**: Supabase (Postgres + Edge Functions)
* **Federation**: ActivityPub + HTTP Signatures
* **Auth**: Supabase email + Google/GitHub OAuth

---

## 🚀 Quick Start

```bash
# 1. Clone & install
pnpm i

# 2. Configure environment variables
cp .env.example .env
# Edit `.env` with your Supabase URL and anon key

# 3. Start Supabase + React app
supabase start
pnpm dev

# 4. Deploy Edge Functions (prod)
supabase functions deploy \
  actor inbox outbox follower-batch-processor
```

Deploy the React build to Vercel/Netlify/Cloudflare Pages. Add a proxy so `https://bondy.example/actor/:user` ↔ Edge Function.

---

## 🔒 Security & Moderation

* **Row‑Level Security** on every table
* All views converted to **SECURITY INVOKER** (no linter errors)
* **Domain blocklist** + per‑actor block (WIP)
* Inbound signatures: digest + timestamp checks enforced

---

## 🛣️ Production‑Readiness TODO 

1. WebFinger auto‑generate local actors if missing
2. Generate RSA keys at signup for every actor
3. Enforce digest + date on inbound signatures
4. Deliver Accept/Reject follow to correct inbox & update follow state
5. Handle Undo → Follow (unfollow)
6. Actor‑level moderation UI
7. Remote actor fetch for feed avatars/names
8. Increase test coverage to ≥ 80 %

---

## 🤝 Contributing

Good first issues live in **/github/projects/1** — jump in!
We welcome PRs, tests, docs, and UX polish.

---

## 📜 License

This project is [MIT Licensed](LICENSE).

---

> Let’s take back control of how we find and share opportunities.
> The Fediverse isn’t just social — it’s professional too.
