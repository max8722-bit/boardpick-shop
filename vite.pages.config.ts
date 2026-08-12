import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isUserOrOrganizationPage = repositoryName.endsWith(".github.io");
const pagesBase = process.env.GITHUB_ACTIONS === "true" && repositoryName && !isUserOrOrganizationPage
  ? `/${repositoryName}/`
  : "/";

export default defineConfig({
  base: pagesBase,
  plugins: [react()],
  build: {
    outDir: "pages-dist",
    emptyOutDir: true,
  },
});
