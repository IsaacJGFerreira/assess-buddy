import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.fazendofisica.folha",
  appName: "Folha",
  webDir: "dist-mobile",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#fdfaf4",
  },
  plugins: {
    StatusBar: {
      backgroundColor: "#00000000",
      overlaysWebView: true,
      style: "DARK",
    },
  },
};

export default config;
