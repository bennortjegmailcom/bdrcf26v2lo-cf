import 'dotenv/config';
import { enableLocalDatabase } from './db/local';
enableLocalDatabase();
import app from './app';
import { requestContext } from './context/requestContext';

const PORT = process.env.PORT || 3000;

app.use((req: any, res: any, next: any) => {
  requestContext.run({ env: process.env }, () => {
    next();
  });
});

app.listen(PORT, () => {
  console.log(`BDR API v1 server listening on port ${PORT} (Cloudflare D1 & JWT ready)`);
});
