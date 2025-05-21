
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SkipToContent from "./components/SkipToContent";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Connections from "./pages/Connections";
import Articles from "./pages/Articles";
import ArticleView from "./pages/ArticleView";
import ArticleCreate from "./pages/ArticleCreate";
import ArticleEdit from "./pages/ArticleEdit";
import ArticleManage from "./pages/ArticleManage";
import Jobs from "./pages/Jobs";
import JobView from "./pages/JobView";
import JobCreate from "./pages/JobCreate";
import JobEdit from "./pages/JobEdit";
import JobManage from "./pages/JobManage";
import Events from "./pages/Events";
import EventView from "./pages/EventView";
import EventCreate from "./pages/EventCreate";
import EventEdit from "./pages/EventEdit";
import Messages from "./pages/Messages"; 
import MessageConversation from "./pages/MessageConversation";
import Moderation from "./pages/Moderation";
import ActorProfile from "./pages/ActorProfile";
import ActorOutbox from "./pages/ActorOutbox";
import ActorInbox from "./pages/ActorInbox";
import FederatedFeedPage from "./pages/FederatedFeed";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SkipToContent />
          <div id="main-content" tabIndex={-1} className="outline-none">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/profile/edit" element={<ProfileEdit />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/:slug" element={<ArticleView />} />
              <Route path="/articles/create" element={<ArticleCreate />} />
              <Route path="/articles/edit/:id" element={<ArticleEdit />} />
              <Route path="/articles/manage" element={<ArticleManage />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobView />} />
              <Route path="/jobs/create" element={<JobCreate />} />
              <Route path="/jobs/edit/:id" element={<JobEdit />} />
              <Route path="/jobs/manage" element={<JobManage />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventView />} />
              <Route path="/events/create" element={<EventCreate />} />
              <Route path="/events/edit/:id" element={<EventEdit />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:conversationId" element={<MessageConversation />} />
              <Route path="/moderation" element={<Moderation />} />
              <Route path="/feed" element={<FederatedFeedPage />} />
              <Route path="/:username/outbox" element={<ActorOutbox />} />
              <Route path="/:username/inbox" element={<ActorInbox />} />
              <Route path="/:username" element={<ActorProfile />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
