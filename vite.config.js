import { defineConfig } from "vite";
export default defineConfig({
  base:"/gytt/",
  build:{target:"es2022",sourcemap:false,chunkSizeWarningLimit:1200},
  server:{host:true,port:5173},
  preview:{host:true,port:4173}
});
