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
  },
  {
    id: "stress-burnout",
    label: "Stress / Burnout",
    keywords: ["stress", "burnout", "work", "pressure"],
    specialty: "Psychologist",
    icon: "flame",
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  {
    id: "sleep-issues",
    label: "Sleep Issues",
    keywords: ["sleep", "insomnia", "rest"],
    specialty: "Psychiatrist",
    icon: "moon",
    color: "text-indigo-600",
    bg: "bg-indigo-100",
  },
  {
    id: "panic-attacks",
    label: "Panic Attacks",
    keywords: ["panic", "attack", "anxiety"],
    specialty: "Psychiatrist",
    icon: "zap",
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
  {
    id: "relationship",
    label: "Relationship Issues",
    keywords: ["relationship", "marriage", "family", "couple"],
    specialty: "Psychologist",
    icon: "users",
    color: "text-pink-600",
    bg: "bg-pink-100",
  },
  {
    id: "grief",
    label: "Grief & Loss",
    keywords: ["grief", "loss", "bereavement"],
    specialty: "Psychologist",
    icon: "heart-crack",
    color: "text-rose-600",
    bg: "bg-rose-100",
  },
  {
    id: "ocd",
    label: "OCD",
    keywords: ["ocd", "obsessive", "compulsive"],
    specialty: "Psychiatrist",
    icon: "refresh-cw",
    color: "text-cyan-600",
    bg: "bg-cyan-100",
  },
  {
    id: "adhd",
    label: "ADHD",
    keywords: ["adhd", "attention", "focus", "hyperactivity"],
    specialty: "Psychiatrist",
    icon: "wind",
    color: "text-sky-600",
    bg: "bg-sky-100",
  },
];

export const MENTAL_CONDITIONS: CatalogItem[] = [
  {
    id: "depression",
    label: "Depression",
    keywords: ["depression", "depressive"],
    specialty: "Psychiatrist",
    icon: "cloud-rain",
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    id: "anxiety-disorder",
    label: "Anxiety Disorder",
    keywords: ["anxiety", "generalized", "social anxiety"],
    specialty: "Psychologist",
    icon: "shield-alert",
    color: "text-teal-600",
    bg: "bg-teal-100",
  },
  {
    id: "bipolar",
    label: "Bipolar Disorder",
    keywords: ["bipolar", "mania"],
    specialty: "Psychiatrist",
    icon: "sparkles",
    color: "text-purple-600",
    bg: "bg-purple-100",
  },
  {
    id: "ptsd",
    label: "PTSD",
    keywords: ["ptsd", "trauma", "post traumatic"],
    specialty: "Psychiatrist",
    icon: "shield-alert",
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
  {
    id: "schizophrenia",
    label: "Schizophrenia",
    keywords: ["schizophrenia", "psychosis"],
    specialty: "Psychiatrist",
    icon: "brain",
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  {
    id: "eating-disorder",
    label: "Eating Disorders",
    keywords: ["eating", "anorexia", "bulimia"],
    specialty: "Psychologist",
    icon: "heart-crack",
    color: "text-red-600",
    bg: "bg-red-100",
  },
  {
    id: "addiction",
    label: "Addiction",
    keywords: ["addiction", "substance", "alcohol", "drug"],
    specialty: "Psychiatrist",
    icon: "flame",
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  {
    id: "insomnia",
    label: "Insomnia",
    keywords: ["insomnia", "sleep disorder"],
    specialty: "Psychiatrist",
    icon: "moon",
    color: "text-indigo-600",
    bg: "bg-indigo-100",
  },
];

export const FEATURED_SPECIALTIES = SPECIALIZATIONS.filter((s) =>
  ["Psychiatrist", "Psychologist", "General Physician", "Neurologist", "Nutritionist"].includes(s)
);

export function findCatalogItem(type: "symptom" | "condition", id: string) {
  const list = type === "symptom" ? MENTAL_SYMPTOMS : MENTAL_CONDITIONS;
  return list.find((item) => item.id === id);
}
