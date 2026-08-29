import { env } from './env'
import { app } from './app'

app.listen(env.port, () => {
  console.log(`Heygotchu API listening on http://localhost:${env.port}`)
})
