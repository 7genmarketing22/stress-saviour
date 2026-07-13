import { ConditionBrowse } from "@/components/public/ConditionBrowse";
import { MENTAL_SYMPTOMS } from "@/lib/public/catalog";

export default function BrowseSymptomsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <ConditionBrowse
        title="All Symptoms"
        items={MENTAL_SYMPTOMS}
        type="symptom"
        viewAllHref="/doctors"
      />
    </div>
  );
}
