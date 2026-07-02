import { SPECIALIZATIONS } from "@/types";

export type CatalogIconKey =
  | "brain"
  | "cloud-rain"
  | "flame"
  | "heart-crack"
  | "moon"
  | "refresh-cw"
  | "shield-alert"
  | "sparkles"
  | "users"
  | "wind"
  | "zap";

export interface CatalogItem {
  id: string;
  label: string;
  keywords: string[];
  specialty?: string;
  icon: CatalogIconKey;
  color: string;
  bg: string;
  /** Optional 3D/illustration image in /public. Falls back to icon when absent. */
  image?: string;
  /** Tailwind gradient stops for the smart border ring, e.g. "from-violet-300 to-fuchsia-200". */
  ring?: string;
}

export const MENTAL_SYMPTOMS: CatalogItem[] = [
  {
    id: "anxiety-depression",
    label: "Anxiety / Depression",
    keywords: ["anxiety", "depression", "stress", "mood"],
    specialty: "Psychologist",
    icon: "cloud-rain",
    color: "text-violet-600",
    bg: "bg-violet-100",
    image: "/anxiety_depression_medical_3d.png",
    ring: "from-violet-300 to-fuchsia-200",
  },
  {
    id: "stress-burnout",
    label: "Stress / Burnout",
    keywords: ["stress", "burnout", "work", "pressure"],
    specialty: "Psychologist",
    icon: "flame",
    color: "text-orange-600",
    bg: "bg-orange-100",
    image: "/stress_burnout_3d.png",
    ring: "from-orange-300 to-amber-200",
  },
  {
    id: "sleep-issues",
    label: "Sleep Issues",
    keywords: ["sleep", "insomnia", "rest"],
    specialty: "Psychiatrist",
    icon: "moon",
    color: "text-brand-600",
    bg: "bg-brand-50",
    image: "/sleep_issues_3d.png",
    ring: "from-brand-300 to-brand-100",
  },
  {
    id: "panic-attacks",
    label: "Panic Attacks",
    keywords: ["panic", "attack", "anxiety"],
    specialty: "Psychiatrist",
    icon: "zap",
    color: "text-amber-600",
    bg: "bg-amber-100",
    image: "/panic_attacks_3d.png",
    ring: "from-amber-300 to-yellow-200",
  },
  {
    id: "relationship",
    label: "Relationship Issues",
    keywords: ["relationship", "marriage", "family", "couple"],
    specialty: "Psychologist",
    icon: "users",
    color: "text-pink-600",
    bg: "bg-pink-100",
    image: "/relationship_issues_3d.png",
    ring: "from-pink-300 to-rose-200",
  },
  {
    id: "grief",
    label: "Grief & Loss",
    keywords: ["grief", "loss", "bereavement"],
    specialty: "Psychologist",
    icon: "heart-crack",
    color: "text-rose-600",
    bg: "bg-rose-100",
    image: "/grief_loss_3d.png",
    ring: "from-rose-300 to-pink-200",
  },
  {
    id: "ocd",
    label: "OCD",
    keywords: ["ocd", "obsessive", "compulsive"],
    specialty: "Psychiatrist",
    icon: "refresh-cw",
    color: "text-brand-500",
    bg: "bg-brand-50",
    image: "/ocd_3d.png",
    ring: "from-brand-200 to-brand-50",
  },
  {
    id: "adhd",
    label: "ADHD",
    keywords: ["adhd", "attention", "focus", "hyperactivity"],
    specialty: "Psychiatrist",
    icon: "wind",
    color: "text-sky-600",
    bg: "bg-sky-100",
    image: "/adhd_3d.png",
    ring: "from-sky-300 to-brand-100",
  },
];

export const MENTAL_CONDITIONS: CatalogItem[] = [
  {
    id: "depression",
    label: "Depression",
    keywords: ["depression", "depressive"],
    specialty: "Psychiatrist",
    icon: "cloud-rain",
    color: "text-brand-500",
    bg: "bg-brand-50",
    ring: "from-brand-300 to-brand-100",
    image: "/depression_medical_3d.png",
  },
  {
    id: "anxiety-disorder",
    label: "Anxiety Disorder",
    keywords: ["anxiety", "generalized", "social anxiety"],
    specialty: "Psychologist",
    icon: "shield-alert",
    color: "text-brand-500",
    bg: "bg-brand-50",
    ring: "from-brand-200 to-brand-100",
    image: "/anxiety_disorder_medical_3d.png",
  },
  {
    id: "bipolar",
    label: "Bipolar Disorder",
    keywords: ["bipolar", "mania"],
    specialty: "Psychiatrist",
    icon: "sparkles",
    color: "text-purple-600",
    bg: "bg-purple-100",
    ring: "from-purple-300 to-violet-200",
    image: "/bipolar_disorder_medical_3d.png",
  },
  {
    id: "ptsd",
    label: "PTSD",
    keywords: ["ptsd", "trauma", "post traumatic"],
    specialty: "Psychiatrist",
    icon: "shield-alert",
    color: "text-slate-600",
    bg: "bg-slate-100",
    ring: "from-slate-300 to-slate-200",
    image: "/ptsd_medical_3d.png",
  },
  {
    id: "schizophrenia",
    label: "Schizophrenia",
    keywords: ["schizophrenia", "psychosis"],
    specialty: "Psychiatrist",
    icon: "brain",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    ring: "from-emerald-300 to-green-200",
    image: "/schizophrenia_medical_3d.png",
  },
  {
    id: "eating-disorder",
    label: "Eating Disorders",
    keywords: ["eating", "anorexia", "bulimia"],
    specialty: "Psychologist",
    icon: "heart-crack",
    color: "text-red-600",
    bg: "bg-red-100",
    ring: "from-red-300 to-rose-200",
    image: "/eating_disorders_medical_3d.png",
  },
  {
    id: "addiction",
    label: "Addiction",
    keywords: ["addiction", "substance", "alcohol", "drug"],
    specialty: "Psychiatrist",
    icon: "flame",
    color: "text-orange-600",
    bg: "bg-orange-100",
    ring: "from-orange-300 to-amber-200",
    image: "/addiction_medical_3d.png",
  },
  {
    id: "insomnia",
    label: "Insomnia",
    keywords: ["insomnia", "sleep disorder"],
    specialty: "Psychiatrist",
    icon: "moon",
    color: "text-brand-600",
    bg: "bg-brand-50",
    ring: "from-brand-400 to-brand-200",
    image: "/insomnia_medical_3d.png",
  },
];

export const FEATURED_SPECIALTIES = SPECIALIZATIONS.filter((s) =>
  ["Psychiatrist", "Psychologist", "General Physician", "Neurologist", "Nutritionist"].includes(s)
);

export function findCatalogItem(type: "symptom" | "condition", id: string) {
  const list = type === "symptom" ? MENTAL_SYMPTOMS : MENTAL_CONDITIONS;
  return list.find((item) => item.id === id);
}
