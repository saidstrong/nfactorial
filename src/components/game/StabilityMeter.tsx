type StabilityMeterProps = {
  stability: number;
};

export function StabilityMeter({ stability }: StabilityMeterProps) {
  const tone = getStabilityTone(stability);

  return (
    <div className="border border-cyan-300/15 bg-black/25 p-4">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-200/55">
            Grid Stability
          </p>
          <p className="mt-1 text-4xl font-black text-white">{stability}%</p>
        </div>
        <span className={["text-xs font-black uppercase tracking-[0.18em]", tone.text].join(" ")}>
          {tone.label}
        </span>
      </div>
      <div className="h-3 overflow-hidden bg-[#0f2027]">
        <div
          className={["h-full transition-all", tone.bar].join(" ")}
          style={{ width: `${stability}%` }}
        />
      </div>
    </div>
  );
}

function getStabilityTone(stability: number): {
  label: string;
  text: string;
  bar: string;
} {
  if (stability <= 25) {
    return {
      label: "critical",
      text: "text-red-200",
      bar: "bg-red-400",
    };
  }

  if (stability <= 55) {
    return {
      label: "strained",
      text: "text-amber-200",
      bar: "bg-amber-300",
    };
  }

  return {
    label: "nominal",
    text: "text-emerald-200",
    bar: "bg-emerald-300",
  };
}
