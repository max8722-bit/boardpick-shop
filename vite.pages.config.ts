import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isUserOrOrganizationPage = repositoryName.endsWith(".github.io");
const pagesBase = process.env.GITHUB_ACTIONS === "true" && repositoryName && !isUserOrOrganizationPage
  ? `/${repositoryName}/`
  : "/";

export default defineConfig({
  base: pagesBase,
  define: {
    "import.meta.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID": JSON.stringify(process.env.NEXT_PUBLIC_NAVER_PAY_CLIENT_ID ?? ""),
    "import.meta.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID": JSON.stringify(process.env.NEXT_PUBLIC_NAVER_PAY_CHAIN_ID ?? ""),
    "import.meta.env.NAVER_PAY_MODE": JSON.stringify(process.env.NAVER_PAY_MODE ?? "development"),
  },
  plugins: [react()],
  build: {
    outDir: "pages-dist",
    emptyOutDir: true,
  },
});
