interface MultiSelectChipsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  error?: string;
}

export default function MultiSelectChips({
  options,
  selected,
  onChange,
  error,
}: MultiSelectChipsProps) {
  const toggle = (item: string) => {
    onChange(
      selected.includes(item)
        ? selected.filter(x => x !== item)
        : [...selected, item]
    );
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {options.map(item => {
          const isSelected = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              className={`px-4 py-2 rounded-full text-[12px] font-medium transition-all ${
                isSelected
                  ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                  : 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]/50 hover:border-gray-300'
              }`}
            >
              {item}
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
