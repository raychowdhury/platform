import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./store";

export default function Protected({ children }: { children: ReactNode }) {
  const access = useAuth((s) => s.access);
  if (!access) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
