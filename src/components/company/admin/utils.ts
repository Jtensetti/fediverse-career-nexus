/**
 * Format employment type enum values for display.
 * Replaces all underscores with hyphens and capitalizes.
 */
export function formatEmploymentType(type: string): string {
  const labels: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    intern: "Intern",
    freelance: "Freelance",
  };
  return labels[type] || type.replace(/_/g, "-");
}
