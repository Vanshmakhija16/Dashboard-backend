module.exports = {
  apps: [
    {
      name: "backend",
      script: "index.js",   // or server.js, whichever you run
      env: {
        PORT: 80,
        NODE_ENV: "production"
      }
    }
  ]
}
