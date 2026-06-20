import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Libs de geração de arquivos rodam só no servidor e leem assets via fs;
  // mantê-las externas evita problemas de bundling (ex.: fontes do pdfkit).
  serverExternalPackages: ["pdfkit", "exceljs"],
};

export default nextConfig;
