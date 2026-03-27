# Contributing to Samverkan

Thank you for your interest in contributing to Samverkan — a federated, open-source professional networking platform.

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Project Structure

```
src/
├── components/          # Reusable UI components, grouped by domain
│   ├── admin/           # Moderation & admin tools
│   ├── articles/        # Article cards, editor, reactions
│   ├── auth/            # MFA, session management, consent
│   ├── common/          # Shared utilities: EmptyState, ErrorBoundary, SEOHead, etc.
│   ├── company/         # Company pages, roles, employees
│   ├── content/         # Content creation: polls, image crops, markdown, link previews
│   ├── editor/          # TipTap rich text editor components
│   ├── events/          # Event forms
│   ├── federation/      # ActivityPub federation UI: feeds, badges, analytics
│   ├── feed/            # Feed empty states
│   ├── forms/           # Form helpers: error summaries, date pickers
│   ├── homepage/        # Landing page sections
│   ├── jobs/            # Job cards, forms, search filters
│   ├── layout/          # Navbar, Footer, DashboardLayout, MobileBottomNav
│   ├── legal/           # Code of conduct, FAQ, instance guidelines
│   ├── LinkedInImport/  # LinkedIn data import flow
│   ├── messaging/       # Message requests, DM settings
│   ├── moderation/      # Flagged content, bans, moderator management
│   ├── onboarding/      # Onboarding flow, interest selector
│   ├── posts/           # Post composer, edit/reply dialogs, quote reposts
│   ├── profile/         # Profile banner, stats, share card
│   ├── reactions/       # Reaction displays and popovers
│   ├── settings/        # Account settings: data export, email prefs, visibility
│   ├── social/          # Follow buttons, badges, endorsements, referrals
│   └── ui/              # shadcn/ui primitives (Button, Dialog, Card, etc.)
│
├── contexts/            # React contexts (AuthContext)
├── hooks/               # Custom hooks
├── i18n/                # Internationalization (English + Swedish)
├── integrations/        # Auto-generated Supabase client & types (do not edit)
├── lib/                 # Utility functions
│
├── pages/               # Route-level page components, grouped by domain
│   ├── articles/        # Article CRUD pages
│   ├── auth/            # Login, signup, recovery, email confirmation
│   ├── company/         # Company pages
│   ├── events/          # Event pages
│   ├── federation/      # Federation admin, feeds, actor pages
│   ├── info/            # Mission, documentation, help center
│   ├── jobs/            # Job CRUD pages
│   ├── legal/           # Privacy policy, terms, cookies
│   ├── messaging/       # Messages & conversations
│   ├── profile/         # Profile, edit, followers, connections
│   └── social/          # Starter packs, freelancers, saved items
│
├── services/            # API/data layer, grouped by domain
│   ├── articles/        # Article & reaction services
│   ├── auth/            # Auth, MFA, account services
│   ├── company/         # Company CRUD, roles, employees
│   ├── content/         # Reactions, saved items, LinkedIn import
│   ├── federation/      # ActivityPub, federation health, analytics
│   ├── messaging/       # Messages, requests, job messaging
│   ├── misc/            # Newsletter, notifications, events, jobs, etc.
│   ├── moderation/      # Moderation, reports, blocks
│   ├── profile/         # Profile CRUD, CV, views
│   ├── search/          # Search & advanced search
│   └── social/          # Connections, follows, endorsements, referrals
│
└── App.tsx              # Root component with routing

supabase/
├── functions/           # Edge functions (auto-deployed)
├── config.toml          # Supabase configuration
└── migrations/          # Database migrations (do not edit manually)
```

## Key Conventions

- **Imports**: Use the `@/` alias (e.g., `import { Button } from "@/components/ui/button"`)
- **Styling**: Use Tailwind CSS with semantic design tokens from `index.css` — never hardcode colors
- **State**: React Query for server state, React context for auth
- **i18n**: All user-facing text goes through `react-i18next` (`useTranslation` hook)
- **Types**: Database types are auto-generated in `src/integrations/supabase/types.ts` — do not edit

## Do Not Edit

These files are auto-generated and will be overwritten:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`

## Running Tests

```bash
npm test
```

## License

See [LICENSE](./LICENSE) for details.
