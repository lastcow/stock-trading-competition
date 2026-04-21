import { useEffect, useRef, useState } from 'react';
import CountUp from 'react-countup';

interface StatCardProps {
  label: string;
  value: number | string;
  valuePrefix?: string;
  valueSuffix?: string;
  decimals?: number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  subtext?: string;
}

export default function StatCard({
  label,
  value,
  valuePrefix = '',
  valueSuffix = '',
  decimals = 0,
  change,
  changeLabel,
  icon,
  subtext,
}: StatCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const isValidNumber = !isNaN(numericValue);

  return (
    <div
      ref={cardRef}
      className="relative flex flex-col gap-1 rounded-2xl border p-6 transition-all duration-300 hover:shadow-card-hover"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(226, 232, 240, 0.8)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02)',
      }}
    >
      {icon && (
        <div className="absolute right-4 top-4 opacity-20">{icon}</div>
      )}
      <span
        className="text-xs font-medium uppercase"
        style={{ color: '#94A3B8', letterSpacing: '0.05em' }}
      >
        {label}
      </span>
      <div className="mt-1">
        {isValidNumber && isVisible ? (
          <CountUp
            start={0}
            end={numericValue}
            duration={0.8}
            decimals={decimals}
            prefix={valuePrefix}
            suffix={valueSuffix}
            separator=","
            className="text-2xl font-bold"
            style={{ color: '#0F172A', letterSpacing: '-0.03em' }}
          />
        ) : (
          <span
            className="text-2xl font-bold"
            style={{ color: '#0F172A', letterSpacing: '-0.03em' }}
          >
            {valuePrefix}
            {value}
            {valueSuffix}
          </span>
        )}
      </div>
      {change !== undefined && (
        <div className="mt-1 flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{
              background: change >= 0 ? '#ECFDF5' : '#FEF2F2',
              color: change >= 0 ? '#059669' : '#DC2626',
            }}
          >
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}%
          </span>
          {changeLabel && <span className="text-xs" style={{ color: '#94A3B8' }}>{changeLabel}</span>}
        </div>
      )}
      {subtext && (
        <span className="mt-1 text-sm" style={{ color: '#475569' }}>
          {subtext}
        </span>
      )}
    </div>
  );
}
