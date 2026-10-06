export function fill(template: string, values: Record<string, string | number>) {
  let text = template;
  for (const key in values) text = text.replaceAll(`{${key}}`, String(values[key]));
  return text;
}
