import { buildApp } from "./app.ts"

const { app } = await buildApp();

app.listen({ port: 8080 }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
});