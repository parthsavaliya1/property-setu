/** Shared marketplace and listing-form category groups. Keep API slugs unchanged. */
export const propertyCategoryGroups = [
  { key: "residential", slugs: ["house", "apartment", "villa"] },
  { key: "land", slugs: ["residential-plot", "agricultural-land"] },
  { key: "commercial", slugs: ["shop", "office", "commercial-plot", "warehouse"] },
  { key: "other", slugs: ["other-property"] },
] as const;

export function homeCategorySlugs(commercial: boolean): string[] {
  return propertyCategoryGroups
    .filter(group => commercial ? group.key === "commercial" : group.key === "residential" || group.key === "land")
    .flatMap<string>(group => [...group.slugs]);
}
