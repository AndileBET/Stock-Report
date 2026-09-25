import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export function ErrorState({ message, kind = "error" }: { message: string; kind?: "error" | "warning" | "success" }) {
  const Icon = kind === "warning" ? AlertTriangle : kind === "success" ? CheckCircle2 : Info;
  const label = kind === "warning" ? "Upload needs attention" : kind === "success" ? "Dataset ready" : "Unable to load dashboard data";
  return (
    <div className={`status-banner status-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span className="status-icon"><Icon size={18} /></span>
      <div>
        <strong>{label}</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}
