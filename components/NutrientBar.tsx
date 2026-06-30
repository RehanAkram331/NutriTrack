interface NutrientRowProps {
  label: string
  value: number
  target: number
  unit: string
  color: string
}

export function NutrientRow({ label, value, target, unit, color }: NutrientRowProps) {
  const pct = Math.min((value / target) * 100, 100)
  const over = value > target

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1.5 items-center">
        <span className="text-[13px] font-medium text-slate-300">{label}</span>
        <span className={`text-xs font-semibold ${over ? 'text-red-400' : 'text-slate-400'}`}>
          <span className={over ? 'text-red-400' : 'text-slate-100'}>{value.toFixed(0)}</span>
          <span className="text-slate-600">/{target}{unit}</span>
        </span>
      </div>
      <div className="nutrient-bar">
        <div className="nutrient-bar-fill" style={{ width: `${pct}%`, background: over ? '#f87171' : color }} />
      </div>
    </div>
  )
}

interface CircleProgressProps {
  value: number
  target: number
  label: string
  unit: string
  color: string
  size?: number
}

export function CircleProgress({ value, target, label, unit, color, size = 90 }: CircleProgressProps) {
  const pct = Math.min((value / target) * 100, 100)
  const r = (size / 2) - 8
  const circumference = 2 * Math.PI * r
  const strokeDashoffset = circumference - (pct / 100) * circumference
  const over = value > target

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={6} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={over ? '#f87171' : color} strokeWidth={6}
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold leading-none ${size > 80 ? 'text-[15px]' : 'text-xs'} ${over ? 'text-red-400' : 'text-slate-100'}`}>
            {value.toFixed(0)}
          </span>
          <span className="text-[9px] text-slate-500 font-semibold">{unit}</span>
        </div>
      </div>
      <span className="text-[11px] text-slate-400 font-semibold text-center">{label}</span>
    </div>
  )
}
