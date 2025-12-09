// ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: "samo-backend",
      cwd: "C:/Users/ESZarapin/Desktop/SamoSaboi/backend",
      script: "dist/main.js",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "samo-frontend",
      cwd: "C:/Users/ESZarapin/Desktop/SamoSaboi/frontend",
      script: "node_modules/next/dist/bin/next",
      interpreter: "node",
      args: "start -p 3001",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
