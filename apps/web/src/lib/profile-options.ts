// Choices shown during onboarding. Shared by the form (client) and validation (server).

export const BRANCHES = [
  "Computer Science",
  "Information Technology",
  "AI / Data Science",
  "Electronics & Communication",
  "Electrical",
  "Mechanical",
  "Civil",
  "Chemical",
  "Mathematics & Computing",
  "Other",
] as const;

export const GOALS = [
  { value: "internship", label: "Internship", detail: "Land a summer internship" },
  { value: "placements", label: "Placements", detail: "Crack campus placements" },
  { value: "faang", label: "Big tech", detail: "Aim for FAANG-level interviews" },
  { value: "cp", label: "Competitive programming", detail: "Climb contest ratings" },
] as const;

export const COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "Apple",
  "Adobe",
  "Atlassian",
  "Uber",
  "Flipkart",
  "Goldman Sachs",
  "JP Morgan",
  "D. E. Shaw",
  "Oracle",
  "Salesforce",
  "Walmart",
  "Zomato",
  "Swiggy",
  "PhonePe",
  "Razorpay",
  "CRED",
  "TCS",
  "Infosys",
  "Accenture",
] as const;

export const LANGUAGES = [
  "C++",
  "Java",
  "Python",
  "JavaScript",
  "Go",
  "C#",
  "Kotlin",
  "Rust",
  "C",
] as const;

export const DAILY_GOALS = [30, 60, 90, 120] as const;
/** Choices for the daily revision cap (Settings). */
export const REVIEW_CAPS = [3, 5, 8, 10, 15, 20] as const;

export const CURRENT_YEARS = [
  { value: 1, label: "1st year" },
  { value: 2, label: "2nd year" },
  { value: 3, label: "3rd year" },
  { value: 4, label: "4th year" },
  { value: 5, label: "5th year" },
  { value: 0, label: "Graduated" },
] as const;

export function gradYearOptions(now = new Date()): number[] {
  const y = now.getFullYear();
  return Array.from({ length: 8 }, (_, i) => y - 2 + i);
}

export const HANDLE_PATTERN = /^[a-z0-9_]{3,20}$/;
