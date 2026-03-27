

# Codebase Restructuring for Open-Source Readability

## Problem
The codebase has ~90 loose component files in `src/components/`, ~55 flat service files in `src/services/`, and ~60 flat page files in `src/pages/`. This makes it hard for new contributors to navigate. Some subdirectories exist (e.g. `company/`, `homepage/`, `moderation/`) but most files are dumped at the top level.

## Approach
Group files into **domain-based subdirectories** with barrel `index.ts` exports. Only file locations and import paths change — zero logic, design, or behavior changes.

---

## 1. Reorganize `src/components/` into domain folders

Move the ~90 loose files into these subdirectories (existing folders kept as-is):

| Folder | Files moved in |
|--------|---------------|
| `articles/` | ArticleCard, ArticleCardReactions, ArticleAuthors, ArticleEditor, ArticlePreviewCard, ArticleReactions, UserArticlesList |
| `posts/` | PostComposer, PostEditDialog, PostReplyDialog, PostReplyThread, UserPostsList, QuoteRepostDialog, QuotedPostPreview, QuoteCardGenerator, InlineReplyComposer, CommentEditDialog, CommentPreview |
| `reactions/` | EnhancedCommentReactions, EnhancedPostReactions, MessageReactions, ReactionUsersPopover, StackedReactionDisplay |
| `jobs/` | JobCard, JobForm, JobInquiryButton, JobSearchFilter |
| `events/` | EventForm |
| `federation/` | FederatedFeed, FederatedPostCard, FederationAnalytics, FederationFollowButton, FederationInfo, FederationMetricsOverview, FederationMetricsWidget, FediverseBadge, BatchedFederationStats, RemoteInstancesTable, ShardedQueueStats, HealthCheckStatus, OutgoingFollowsList, ServerKeyInitializer |
| `messaging/` | MessageRequestCard, DMPrivacySettings |
| `auth/` | MFAEnrollDialog, MFASettings, MFAVerifyDialog, SessionExpiryWarning, ConsentCheckbox |
| `settings/` | AccountMigrationSection, DataExportSection, DeleteAccountSection, EmailNotificationPreferences, FreelancerSettings, NetworkVisibilityToggle, ProfileVisitsToggle, SectionVisibilityToggle |
| `content/` | ContentGate, ContentWarningDisplay, ContentWarningInput, LinkPreview, PollCreator, PollDisplay, ImageCropDialog, ImageLightbox, CoverImageUpload, ProfileImageUpload, MarkdownEditor |
| `layout/` | DashboardLayout, Navbar, Footer, MobileBottomNav, MobileSearch, SkipToContent, AlertBanner, AlertManager, AriaLiveRegion, GlobalSearch, LanguageSwitcher, ModeToggle, NotificationBell |
| `social/` | FollowAuthorButton, ConnectionBadge, SkillEndorsements, RecommendationsSection, StarterPackCard, TransparencyScore, VerificationBadge, VerificationRequest, FreelancerBadge, ReferralWidget, ProfileViewsWidget, FeedSelector, SavedItemsList, NewsletterSubscribe, UserActivityList |
| `admin/` | ActorModeration, DomainModeration, ModerationActionDialog, ModerationHeader, ModerationLog, AdminFixSecurityInvoker |
| `legal/` | CodeOfConduct, InstanceGuidelines, FAQ, Features, Technology |
| `forms/` | FormErrorSummary, InlineErrorBanner, IntroTemplateSelector, MonthYearPicker, CallToAction |

Each folder gets an `index.ts` barrel export.

## 2. Reorganize `src/services/` into domain folders

| Folder | Files |
|--------|-------|
| `articles/` | articleService, articleReactionsService |
| `posts/` | postService, postBoostService, postReplyService, pollService |
| `auth/` | authService, mfaService, accountService |
| `federation/` | federationService, federationAnalyticsService, federationHealthService, federationMentionService, activityPubService, actorService, outgoingFollowsService |
| `company/` | companyService, companyAuditService, companyEmployeeService, companyFollowService, companyImageService, companyPostService, companyRolesService |
| `messaging/` | messageService, messageRequestService, jobMessagingService |
| `profile/` | profileService, profileEditService, profileCVService, profileViewService, sectionVisibilityService |
| `social/` | connectionsService, authorFollowService, endorsementService, recommendationService, referralService, starterPackService |
| `moderation/` | moderationService, reportService, blockService |
| `search/` | searchService, advancedSearchService |
| `content/` | reactionsService, reactionUsersService, savedItemsService, linkedinImportService |
| `misc/` | newsletterService, notificationService, feedPreferencesService, userActivityService, onboardingRecommendationService, freelancerService, batchDataService, eventService, jobPostsService |

Each folder gets an `index.ts` re-exporting everything for backward compatibility.

## 3. Reorganize `src/pages/` into domain folders

| Folder | Files |
|--------|-------|
| `articles/` | Articles, ArticleView, ArticleCreate, ArticleEdit, ArticleManage |
| `auth/` | Auth, AuthCallback, AuthRecovery, ConfirmEmail |
| `jobs/` | Jobs, JobView, JobCreate, JobEdit, JobManage |
| `events/` | Events, EventView, EventCreate, EventEdit |
| `company/` | Companies, CompanyProfile, CompanyCreate, CompanyEdit, CompanyAdmin |
| `federation/` | FederatedFeed, FederationGuide, Instances, AdminFederationHealth, AdminFederationMetrics, AdminInstances, ActorInbox, ActorOutbox, ActorProfile |
| `messaging/` | Messages, MessageConversation |
| `profile/` | Profile, ProfileEdit, Followers, Following, Connections |
| `social/` | StarterPacks, StarterPackView, StarterPackCreate, Freelancers, SavedItems |
| `legal/` | PrivacyPolicy, TermsOfService, CodeOfConductPage, CookiesPage, InstanceGuidelines |
| `info/` | Mission, Documentation, HelpCenter |
| *(root)* | Index, Home, Search, FeedSettings, Moderation, ModerationDashboard, Notifications, PostView, NotFound |

## 4. Update all import paths

After moving files, update every `import` statement across the codebase to point to the new locations. Barrel `index.ts` files ensure that external imports can use folder paths.

## 5. Add a CONTRIBUTING.md

Create a short contributor guide explaining the folder structure, how to run the project, and coding conventions.

---

## What does NOT change
- Zero logic, UI, or behavior changes
- No database changes
- No edge function changes
- No design/styling changes
- File contents stay identical — only locations and imports change

## Scope
~150+ files moved, ~200+ import paths updated, ~20 new `index.ts` barrel files, 1 new `CONTRIBUTING.md`.

