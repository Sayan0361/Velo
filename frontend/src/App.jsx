import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./styles/global.css";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { Auth0Callback } from "./pages/Auth0Callback";
import { DashboardPage } from "./pages/DashboardPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { CampaignPage } from "./pages/CampaignPage";
import { CreateCampaignPage } from "./pages/CreateCampaignPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AppShell } from "./components/AppShell";
import { NotFoundPage } from "./pages/NotFoundPage";

function AppShellWrapper({ children }) {
    const location = useLocation();
    const navigate = useNavigate();

    // Derive sidebar page name from current path
    const path = location.pathname;
    let sidebarPage = "dashboard";
    if (path === "/profile") sidebarPage = "profile";
    else if (path === "/settings") sidebarPage = "settings";
    else if (path === "/campaigns") sidebarPage = "campaigns";
    else if (path === "/campaign") sidebarPage = "campaign";
    else if (path === "/analytics") sidebarPage = "analytics";

    console.log(path);

    const handleNavigation = (path) => {
        // Use absolute path navigation
        console.log(path);

        navigate(path);
    };

    return (
        <AppShell page={sidebarPage} navigate={navigate}>
        {/* Pass handleNavigation to children to ensure correct navigation */}
        {React.cloneElement(children, { handleNavigation })}
        </AppShell>
    );
    }

    export default function App() {
    return (
        <Router>
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/callback" element={<Auth0Callback />} />

            {/* All app pages are wrapped with AppShell */}
            <Route
            path="/dashboard"
            element={
                <AppShellWrapper>
                <DashboardPage />
                </AppShellWrapper>
            }
            />
            <Route
            path="/campaigns"
            element={
                <AppShellWrapper>
                <CampaignsPage />
                </AppShellWrapper>
            }
            />
            <Route
            path="/campaign"
            element={
                <AppShellWrapper>
                <CampaignPage />
                </AppShellWrapper>
            }
            />
            <Route
            path="/createCampaign"
            element={
                <AppShellWrapper>
                <CreateCampaignPage />
                </AppShellWrapper>
            }
            />
            <Route
            path="/profile"
            element={
                <AppShellWrapper>
                <ProfilePage />
                </AppShellWrapper>
            }
            />
            <Route
            path="/settings"
            element={
                <AppShellWrapper>
                <ProfilePage /> {/* as in original */}
                </AppShellWrapper>
            }
            />
            <Route
            path="/analytics"
            element={
                <AppShellWrapper>
                <AnalyticsPage />
                </AppShellWrapper>
            }
            />

            <Route
            path="*"
            element={
                <AppShellWrapper>
                <NotFoundPage />
                </AppShellWrapper>
            }
            />
        </Routes>
        </Router>
    );
}
