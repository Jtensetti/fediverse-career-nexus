# 🌐 Nolto — Federated Professional Network

[![Codeberg](https://img.shields.io/badge/Codeberg-2185D0?logo=codeberg&logoColor=white)](https://codeberg.org/Tensetti/Nolto)
[![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github&logoColor=white)](https://github.com/Jtensetti/fediverse-career-nexus)

Nolto was an experimental federated professional networking platform built on ActivityPub.

It combined profile-based networking, job listings, and long-form content with Fediverse interoperability. The public instance has been shut down, but the code remains available for transparency, learning, and further development.

---

## Project Status

The hosted instance is permanently offline.

Before shutdown, users were provided with:
- A GDPR Article 20 structured data export
- An ActivityPub-compatible export (including following list)

All hosted user data has been deleted.

---

## Features (Implemented)

- CV-style professional profiles
- Skills, endorsements, and recommendations
- Professional connections and messaging
- Structured job board
- Articles and events
- ActivityPub federation (actors, inbox/outbox, follow flow)
- WebFinger discovery
- HTTP signature verification
- Domain and actor moderation

---

## Tech Stack

- React 18 + TypeScript + Vite  
- Tailwind CSS + shadcn/ui  
- Supabase (Postgres + Edge Functions)  
- ActivityPub + HTTP Signatures  
- Supabase Auth  
- TanStack Query  

---

## AI-Assisted Development

Parts of the codebase were developed using AI-assisted tooling.

Architecture, data modeling, federation logic, and infrastructure decisions were manual.

AI reduced implementation time. Responsibility remained human.

---

## License

This project is [MIT Licensed](LICENSE).

---

## 🔗 Links

- [Documentation](docs/)
- [API Spec](docs/openapi.yaml)
- [Code of Conduct](CODE_OF_CONDUCT.md)

---

> To everyone who joined, tested, or supported the project in good faith, thank you. It meant more than you know.
