import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./auth/Login";
import Signup from "./auth/Signup";
import Protected from "./auth/Protected";
import MarketPage from "./chart/MarketPage";
import PlansPage from "./billing/PlansPage";
import MfaPage from "./me/MfaPage";
import MultiChartPage from "./chart/MultiChartPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Protected><MarketPage /></Protected>} />
        <Route path="/plans" element={<Protected><PlansPage /></Protected>} />
        <Route path="/me/mfa" element={<Protected><MfaPage /></Protected>} />
        <Route path="/multi" element={<Protected><MultiChartPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
