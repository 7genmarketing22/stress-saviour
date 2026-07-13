import { ConditionBrowse } from "@/components/public/ConditionBrowse";
import { MENTAL_CONDITIONS } from "@/lib/public/catalog";

export default function BrowseConditionsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <ConditionBrowse
        title="All Conditions"
        items={MENTAL_CONDITIONS}
        type="condition"
        viewAllHref="/doctors"
      />
    </div>
  );
}
