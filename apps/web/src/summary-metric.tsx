export function SummaryMetric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="summary-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
