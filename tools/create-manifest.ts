import fs from "node:fs";
import path from "node:path";
import { description, name, version } from "../package.json";

const manifest = {
  name,
  action: {
    default_title: "Toggle image maps",
  },
  manifest_version: 3,
  version,
  description,
  icons: {
    "16": "images/icon-16.png",
    "32": "images/icon-32.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png",
  },
  permissions: ["activeTab", "scripting"],
  background: {
    service_worker: "background.js",
  },
};
const destination = path.join(__dirname, "..", "./dist");

if (!fs.existsSync(destination)) {
  fs.mkdirSync(destination);
}

fs.writeFileSync(
  path.join(destination, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);
