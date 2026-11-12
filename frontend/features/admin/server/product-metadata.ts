export function parseProductTags(raw: unknown): string[] | null {
  if (raw === null || raw === undefined || raw === "") return [];
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > 20 || parsed.some((tag) => typeof tag !== "string")) return null;
  const tags = parsed.map((tag: string) => tag.trim()).filter(Boolean);
  if (tags.some((tag) => tag.length > 80)) return null;
  const uniqueTags = new Map<string, string>();
  for (const tag of tags) {
    const key = tag.toLocaleLowerCase();
    if (!uniqueTags.has(key)) uniqueTags.set(key, tag);
  }
  return [...uniqueTags.values()];
}

export function normalizeCategoryInput(nameInput: unknown, slugInput: unknown):
  | { ok: true; name: string; slug: string | null }
  | { ok: false; error: string } {
  if (typeof nameInput !== "string") return { ok: false, error: "Enter a category name up to 120 characters." };
  const name = nameInput.trim().replace(/\s+/g, " ");
  if (!name || name.length > 120) return { ok: false, error: "Enter a category name up to 120 characters." };
  const slugValue = typeof slugInput === "string" ? slugInput.trim().toLowerCase() : "";
  if (slugValue && (slugValue.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugValue))) {
    return { ok: false, error: "Use a category slug containing lowercase letters, numbers, and single hyphens." };
  }
  return { ok: true, name, slug: slugValue || null };
}
