// react-ui components/_shared/icons/IconWrapper.tsx without React.
//
// A name resolves through upstream's own lookup, compiled from the pin
// (dynamicIconImports.ts: exact key, PascalCase/camelCase → kebab candidates,
// word permutations, shorter prefixes). A miss falls back to the category's
// icon, then to circle-dot (categoryFallbacks.ts), as upstream does. The
// answer is a lucide SVG file name; the host says where those files live.
import { getFallbackIconName } from "openui-icon-fallbacks";
import { getIconImport } from "openui-icons";

function file(name: string): string | null {
  const thunk = getIconImport(name);
  return thunk ? String(thunk()) : null;
}

/** The lucide SVG file upstream would draw for `name` (and `category`). */
export function iconFile(name: string, category?: string): string {
  return file(name) ?? file(getFallbackIconName(category)) ?? "circle-dot";
}
