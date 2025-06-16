
# 🌐 Nolto — a Fediverse Career Nexus

A community-driven, federated job board designed for the open web.

Built with ❤️ on [Lovable.dev](https://lovable.dev), **Fediverse Career Nexus** is robust enough to scale, but still open for improvement. It's an experiment — and a mission — to make professional discovery possible across federated networks.

> ✊ This is not just a job board — it's a declaration of independence from centralized platforms.

*Professional networking & job board that speaks ActivityPub*

---

## 🔍 What It Does (Today)

| Feature                               | Status         | Notes                                                         |
| ------------------------------------- | -------------- | ------------------------------------------------------------- |
| Post jobs with salary/skills/location | **✅ Complete** | Form‑driven, server‑validated                                 |
| Filter & search jobs                  | **✅ Complete** | Faceted by type, location, skills, remote                     |
| ActivityPub actor & inbox             | **✅ Complete** | `/actor/:user`, shared `/inbox` with signature checks; local actors auto‑generate |
| ActivityPub outbox & delivery queue   | **✅ Complete** | Partitioned queue with HTTP signing and strict validation      |
| Follow / Accept flow                  | **✅ Complete** | Accept/Reject & Undo‑Follow fully handled                     |
| WebFinger discovery                   | **✅ Complete** | Auto‑creates local actors, caches remote actors               |
| Job detail page                       | **✅ Complete** | `/jobs/:id` with SEO meta                                     |
| Pagination / infinite scroll          | **✅ Complete** | IntersectionObserver + Supabase range queries                 |
| Error & loading states                | **✅ Complete** | Skeletons + toasts everywhere                                 |
| Moderation (domain, actor block)      | **✅ Complete** | Domain and actor blocklists enforced                            |
| Tests & CI                            | **✅ Complete** | Jest + Deno tests with CI workflow (40 % coverage)            |

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
* **Backend**: Supabase (Postgres + Edge Functions)
* **Federation**: ActivityPub + HTTP Signatures
* **Auth**: Supabase email + Google/GitHub OAuth

---

## 🚀 Quick Start

```bash
# 1. Clone & install
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit `.env` with your Supabase URL and anon key

# 3. Start Supabase + React app
supabase start
npm run dev

# 4. Deploy Edge Functions (prod)
supabase functions deploy \
  actor inbox outbox follower-batch-processor
```

Deploy the React build to Vercel/Netlify/Cloudflare Pages. Add a proxy so `https://nolto.example/actor/:user` ↔ Edge Function.

---

## 🔒 Security & Moderation

* **Row‑Level Security** on every table
* All views converted to **SECURITY INVOKER** (no linter errors)
* **Domain blocklist** + per‑actor block (WIP)
* Inbound signatures: digest + timestamp checks enforced

---

## 🛣️ Production‑Readiness TODO 

1. ~~WebFinger auto‑generate local actors if missing~~ ✅ Implemented
2. Generate RSA keys at signup for every actor
3. ~~Enforce digest + date on inbound signatures~~ ✅ Implemented
4. ~~Deliver Accept/Reject follow to correct inbox & update follow state~~ ✅ Implemented
5. ~~Handle Undo → Follow (unfollow)~~ ✅ Implemented
6. Actor‑level moderation UI
7. ~~Remote actor fetch for feed avatars/names~~ ✅ Implemented
8. Increase test coverage to ≥ 80 %

---

## 🤝 Contributing

Good first issues live in **/github/projects/1** — jump in!
We welcome PRs, tests, docs, and UX polish.

---

## 📜 License

This project is [MIT Licensed](LICENSE).

---

> Let's take back control of how we find and share opportunities.
> The Fediverse isn't just social — it's professional too.
```
