import { Sparkles, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RemovableChip } from "@/components/ui/chip";
import type { AiParser } from "@/lib/api/types";
import { activeFilterChips, type SearchState } from "../filters";

interface AiSearchSummaryProps {
  state: SearchState;
  onChange: (next: SearchState) => void;
  explanation?: string;
  parser?: AiParser;
  onClearAll?: () => void;
}

/** AI explanation + parser badge, followed by every active filter as a removable chip. */
export function AiSearchSummary({ state, onChange, explanation, parser, onClearAll }: AiSearchSummaryProps) {
  const chips = activeFilterChips(state);
  if (!explanation && chips.length === 0) return null;

  return (
    <div className="space-y-2">
      {explanation && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-700">
          {parser === "AI" ? (
            <Badge variant="brand" title="Understood by the AI search assistant">
              <Sparkles aria-hidden /> AI
            </Badge>
          ) : (
            <Badge variant="info" title="Understood by rule-based parsing">
              <Wand2 aria-hidden /> Smart rules
            </Badge>
          )}
          <p>{explanation}</p>
        </div>
      )}
      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {chips.map((chip) => (
            <li key={chip.id}>
              <RemovableChip label={chip.label} onRemove={() => onChange(chip.remove(state))} />
            </li>
          ))}
          {onClearAll && chips.length > 1 && (
            <li>
              <button
                type="button"
                onClick={onClearAll}
                className="px-2 text-xs font-medium text-zinc-600 hover:underline"
              >
                Clear all
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
