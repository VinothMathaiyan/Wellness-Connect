import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';

export interface SelectionCardOption {
  id: string;
  label: string;
  Icon: LucideIcon;
  description?: string;
}

interface SelectionCardProps {
  options: SelectionCardOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  error?: string;
  columns?: number;
}

export default function SelectionCard({
  options,
  selected,
  onChange,
  error,
  columns = 3,
}: SelectionCardProps) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter(x => x !== id)
        : [...selected, id]
    );
  };

  const gridClass =
    columns === 2
      ? 'grid grid-cols-2 gap-3'
      : columns === 4
      ? 'grid grid-cols-4 gap-2'
      : 'grid grid-cols-3 gap-3';

  return (
    <div>
      <div className={gridClass}>
        {options.map(({ id, label, Icon, description }) => {
          const isSelected = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`relative flex flex-col items-center gap-2.5 px-3 py-4 rounded-2xl border-2 transition-all active:scale-[0.97] ${
                isSelected
                  ? 'border-primary bg-green-light/40 shadow-sm shadow-primary/10'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-primary flex items-center justify-center">
                  <Check size={9} strokeWidth={3} className="text-white" />
                </div>
              )}

              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-primary' : 'bg-gray-100'
                }`}
              >
                <Icon
                  size={20}
                  className={isSelected ? 'text-white' : 'text-gray-500'}
                />
              </div>

              <span
                className={`text-[12px] font-semibold text-center leading-tight ${
                  isSelected ? 'text-primary' : 'text-text-primary'
                }`}
              >
                {label}
              </span>

              {description && (
                <span className="text-[10px] text-text-secondary text-center leading-snug">
                  {description}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-red text-[11px] mt-2">{error}</p>
      )}
    </div>
  );
}
