# 🌐 Nolto — Federated Professional Network

A community-driven, federated professional networking platform for the open web.

Built with ❤️ on [Lovable.dev](https://lovable.dev), **Nolto** combines the professional networking features of LinkedIn with the decentralized philosophy of the Fediverse.

> ✊ This is not just a job board — it's a declaration of independence from centralized platforms.

*Professional networking & job board that speaks ActivityPub*

---

## ✨ Features

### Professional Networking
| Feature | Status | Notes |
|---------|--------|-------|
| User profiles with experience & education | ✅ Complete | Full CV/resume builder |
| Skills with endorsements | ✅ Complete | Peer endorsement system |
| Professional connections | ✅ Complete | Connect with other professionals |
| Direct messaging | ✅ Complete | Private conversations |
| Recommendations | ✅ Complete | Give and receive professional recommendations |
| Profile verification | ✅ Complete | Verified badge system |

### Job Board
| Feature | Status | Notes |
|---------|--------|-------|
| Post jobs with salary/skills/location | ✅ Complete | Form-driven, server-validated |
| Filter & search jobs | ✅ Complete | Faceted by type, location, skills, remote |
| Job detail pages | ✅ Complete | `/jobs/:id` with SEO meta |

### Content & Community
| Feature | Status | Notes |
|---------|--------|-------|
| Articles/blog posts | ✅ Complete | Markdown editor with reactions |
| Events with RSVPs | ✅ Complete | Online & in-person events |
| Federated posts feed | ✅ Complete | ActivityPub-compatible posts |
| Reactions & replies | ✅ Complete | Engage with content |
| Boosts/reshares | ✅ Complete | Amplify content |

### Federation (ActivityPub)
| Feature | Status | Notes |
|---------|--------|-------|
| ActivityPub actor & inbox | ✅ Complete | `/actor/:user`, shared `/inbox` with signature checks |
| ActivityPub outbox & delivery queue | ✅ Complete | Partitioned queue with HTTP signing |
| Follow / Accept / Reject flow | ✅ Complete | Full follow lifecycle |
| Undo Follow (unfollow) | ✅ Complete | Clean unfollow handling |
| WebFinger discovery | ✅ Complete | Auto-creates local actors, caches remote |
| Remote actor fetch | ✅ Complete | Feed avatars/names from remote instances |
| Domain & actor moderation | ✅ Complete | Blocklists enforced |

### Platform
| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ Complete | Email + OAuth (Google/GitHub) |
| Notifications | ✅ Complete | Real-time notification system |
| Global search | ✅ Complete | Search across content types |
| Achievements/gamification | ✅ Complete | Badges and progress tracking |
| Referral system | ✅ Complete | Invite friends |
| Dark/light mode | ✅ Complete | Theme switcher |
| Internationalization | ✅ Complete | English & Swedish |
| Mobile responsive | ✅ Complete | Bottom nav on mobile |

---

## 🏗️ Architecture

```
React (Vite) ──supabase-js──► Edge Functions (Deno)
     ▲                                │
     │ WebSocket realtime             │ POST (HTTP Sig)
     ▼                                ▼
  Postgres  ◄── RLS, policies ── federation_queue_* (partitioned)
```

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Postgres + Edge Functions)
- **Federation**: ActivityPub + HTTP Signatures
- **Auth**: Supabase Auth (email + Google/GitHub OAuth)
- **State**: TanStack Query (React Query)
- **Animations**: Framer Motion

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/nolto/nolto.git
cd nolto
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit `.env` with your Supabase URL and anon key

# 3. Start Supabase + React app
supabase start
npm run dev

# 4. Deploy Edge Functions (prod)
supabase functions deploy
```

Deploy the React build to Vercel/Netlify/Cloudflare Pages. Add a proxy so `https://nolto.example/actor/:user` ↔ Edge Function.

---

## 🔒 Security & Moderation

- **Row-Level Security** on every table
- All views use **SECURITY INVOKER** (no privilege escalation)
- **Domain blocklist** + per-actor blocking
- Inbound HTTP signature verification with digest + timestamp checks
- Content reporting system with moderation queue

---

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── common/          # Shared components (buttons, cards, etc.)
│   ├── homepage/        # Landing page components
│   ├── onboarding/      # User onboarding flow
│   ├── profile/         # Profile-related components
│   └── ui/              # shadcn/ui components
├── contexts/            # React contexts (Auth)
├── hooks/               # Custom React hooks
├── i18n/                # Internationalization
├── pages/               # Route components
├── services/            # API service layer
└── integrations/        # Supabase client & types

supabase/
├── functions/           # Edge Functions (Deno)
│   ├── actor/           # ActivityPub actor endpoint
│   ├── inbox/           # ActivityPub inbox
│   ├── outbox/          # ActivityPub outbox
│   ├── webfinger/       # WebFinger discovery
│   └── ...              # Other functions
└── migrations/          # Database migrations
```

---

## 🌍 Federation Guide

Nolto implements the ActivityPub protocol for federation with other Fediverse instances (Mastodon, Pleroma, etc.).

### Endpoints
- `/.well-known/webfinger` — WebFinger discovery
- `/.well-known/nodeinfo` — NodeInfo for instance metadata
- `/actor/:username` — ActivityPub actor profile
- `/inbox` — Shared inbox for receiving activities
- `/actor/:username/outbox` — User's outbox
- `/actor/:username/followers` — Followers collection
- `/actor/:username/following` — Following collection

### Supported Activities
- **Create** — Posts, articles
- **Follow** / **Accept** / **Reject** — Follow relationships
- **Undo** — Undo follows
- **Like** — Reactions
- **Announce** — Boosts/reshares

---

## 🛣️ Roadmap

- [ ] Generate RSA keys at signup for every actor
- [ ] Actor-level moderation UI enhancements
- [ ] Increase test coverage to ≥ 80%
- [ ] Mobile app (React Native)
- [ ] Enhanced analytics dashboard
- [ ] Stripe integration for premium features

---

## 🤝 Contributing

We welcome contributions! Check out our issues for good first tasks.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is [MIT Licensed](LICENSE).

---

## 🔗 Links

- [Documentation](docs/)
- [API Spec](docs/openapi.yaml)
- [Code of Conduct](CODE_OF_CONDUCT.md)

---

> Let's take back control of how we find and share opportunities.  
> The Fediverse isn't just social — it's professional too.
