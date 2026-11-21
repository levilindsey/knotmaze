import { register } from "node:module";
import { pathToFileURL } from "node:url";
register(pathToFileURL(new URL("./remap_hook.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")).href);
