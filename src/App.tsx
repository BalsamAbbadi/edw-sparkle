import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/AppLayout";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import Courses from "./pages/Courses";
import Students from "./pages/Students";
import Payments from "./pages/Payments";
import Notes from "./pages/Notes";
import Files from "./pages/Files";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showWelcome, setShowWelcome] = useState(() => {
    return localStorage.getItem('ibdaa-welcome') !== 'disabled';
  });

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {showWelcome && (
              <WelcomeScreen onClose={() => {
                setShowWelcome(false);
                // Don't disable permanently, just dismiss for this session
              }} />
            )}
            <BrowserRouter>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/files" element={<Files />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
