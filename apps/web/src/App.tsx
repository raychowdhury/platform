import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import ForgotPassword from "./auth/ForgotPassword";
import Protected from "./auth/Protected";
import MarketPage from "./chart/MarketPage";
import PlansPage from "./billing/PlansPage";
import MfaPage from "./me/MfaPage";
import ApiKeysPage from "./me/ApiKeysPage";
import MultiChartPage from "./chart/MultiChartPage";
import AdminPage from "./admin/AdminPage";
import LandingPage from "./landing/LandingPage";
import AboutPage from "./pages/AboutPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import SecurityPage from "./pages/SecurityPage";
import StatusPage from "./pages/StatusPage";
import ApiDocsPage from "./pages/ApiDocsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/api-docs" element={<ApiDocsPage />} />
        {/* Protected */}
        <Route path="/app" element={<Protected><MarketPage /></Protected>} />
        <Route path="/plans" element={<Protected><PlansPage /></Protected>} />
        <Route path="/me/mfa" element={<Protected><MfaPage /></Protected>} />
        <Route path="/me/api-keys" element={<Protected><ApiKeysPage /></Protected>} />
        <Route path="/multi" element={<Protected><MultiChartPage /></Protected>} />
        <Route path="/admin" element={<Protected><AdminPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
