// Herdr's icon writer (src/render/lucide.ts): each lucide icon a pane draws becomes a file
// under ~/.config/herdr-app/opengpui/icons/ the first time any pane draws it. `svg()` resolves
// paths against the Herdr home. File names change with the content, so a file once written is
// right for every later build that draws the same icon.
import { exists, mkdir, writeFile } from "fs/promises";
import { appHome } from "herdr";
import { join } from "path";
import type { IconWriter } from "../../src/index.ts";

const DIR = "opengpui/icons";
/** One write per icon per tab, however many views ask while it runs. */
const writes = new Map<string, Promise<string>>();

export const herdrIcons: IconWriter = (name, svg) => {
  let write = writes.get(name);
  if (!write) {
    write = (async () => {
      const path = `${DIR}/${name}.svg`;
      const file = join(appHome(), path);
      if (await exists(file)) return path;
      await mkdir(join(appHome(), DIR), { recursive: true });
      // Another tab (or window) writing the same icon at once can make this write fail
      // after its own has landed: the file is there either way.
      await writeFile(file, svg).catch(async (e) => {
        if (!(await exists(file))) throw e;
      });
      return path;
    })();
    writes.set(name, write);
    write.catch(() => writes.delete(name));
  }
  return write;
};
