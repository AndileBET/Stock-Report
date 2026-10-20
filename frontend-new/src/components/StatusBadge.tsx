export function StatusBadge({ status }: { status: string }) { const tone = status.toLowerCase(); return <span className={`status-badge ${tone}`}>{status}</span>; }
