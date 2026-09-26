/** "Pronated, Supinated, AND Active hang" → "pronated_supinated_and_active_hang" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’'‘"“”]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
