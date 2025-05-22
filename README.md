# 🌐 Fediverse Career Nexus (aka Bondy)

A community-driven, federated job board designed for the open web.

Built with ❤️ on [Lovable.dev](https://lovable.dev), **Fediverse Career Nexus** is robust enough to scale, but still open for improvement. It’s an experiment — and a mission — to make professional discovery possible across federated networks.

> ✊ This is not just a job board — it’s a declaration of independence from centralized platforms.

---

## 🔍 What It Does

- ✅ Post jobs (with salaries, skills, types, and remote settings)
- ✅ Filter and search jobs by type, location, skills, and remote allowance
- 🟡 Federates via ActivityPub (prototype inbox/outbox working)
- 🟡 Allows form-driven job submissions (with validation)
- 🟡 Renders modern, accessible components with Tailwind + ShadCN
- 🔴 Missing full job detail page, pagination, moderation tools

---

## 📊 Current Project Health

| Feature Area                  | Status          | Notes                                                                 |
|------------------------------|------------------|-----------------------------------------------------------------------|
| 🧱 Job UI (Form/Card/Filter)  | 🟢 **Complete**   | Reusable and production-grade                                        |
| 🔎 Job Detail View            | 🔴 **Missing**    | Needs `/jobs/:id` page                                               |
| 📡 ActivityPub Federation     | 🟡 **In Progress**| Basic actor/inbox/outbox working                                     |
| 🔐 Security (RLS, Views)      | 🟡 **Mostly Done**| Linter may falsely flag SECURITY DEFINER, but DB uses INVOKER        |
| ⚠️ Error Handling             | 🔴 **Missing**    | No loading or error UI states                                        |
| 🔁 Pagination / Infinite Feed | 🔴 **Missing**    | Currently fetches all results at once                                |
| 🧪 Testing Coverage           | 🔴 **None Yet**   | Needs both unit + integration tests                                  |
| 🛠️ DevOps / CI/CD            | 🟡 **Basic**      | Edge Functions deployable; CI config needed                          |

---

## 🎯 Project Vision

We believe job discovery shouldn’t be owned by a handful of tech monopolies.

### Imagine a hiring system that:
- Lets candidates and organizations post and discover jobs on the **Fediverse**
- Uses **ActivityPub** for job delivery to Mastodon, Lemmy, and others
- Can be run by **any community**, from cooperatives to DAOs

This project is **yours** as much as it is mine.

---

## 👨‍💻 Contribute

We welcome contributions of all kinds:

### Good first issues
- [ ] Build a `/jobs/:id` detail page with route
- [ ] Improve `jobPostsService` for pagination + error handling
- [ ] Harden signature validation for inbox handling
- [ ] Implement proper WebFinger discovery
- [ ] Add content moderation (e.g. domain blocking)
- [ ] Write tests (Zod, Edge Functions, UI components)

---

## 🧠 Tech Stack

- ⚛️ React + TypeScript
- 💅 ShadCN UI + TailwindCSS
- ⚡ Supabase (Postgres + Edge Functions)
- 🧬 ActivityPub (Inbox/Outbox proto)
- 🦕 Deno (Edge Runtime)

---

## 🛠️ Getting Started

Clone and run locally:

```bash
git clone https://github.com/Jtensetti/fediverse-career-nexus.git
cd fediverse-career-nexus
pnpm install
pnpm dev
````

To deploy an Edge Function:

```bash
supabase functions deploy inbox --project-ref <your-project>
```

---

## 🛣️ Roadmap

Planned additions:

* ✅ ActivityPub actor support (inbox, outbox, HTTP signatures)
* ⏳ Federated feed merging (remote/local UNION)
* ⏳ Job moderation (badging, blocking)
* ⏳ Federated follow/followers logic
* ⏳ Analytics for federation health

Check the [GitHub Project Board](https://github.com/Jtensetti/fediverse-career-nexus/projects) for more.

---

## 📬 Contact

If you have questions, ideas, or want to contribute:

* 🐘 Mastodon: [@jtensetti@mastodon.nu](https://mastodon.nu/@jtensetti)
* 📧 Email: [jtensetti@protonmail.com](mailto:jtensetti@protonmail.com)
* 🐙 Open a GitHub Issue: [GitHub Issues](https://github.com/Jtensetti/fediverse-career-nexus/issues)

---

## 🧭 License

This project is [MIT Licensed](LICENSE).

---

> Let’s take back control of how we find and share opportunities.
> The Fediverse isn’t just social — it’s professional too.
