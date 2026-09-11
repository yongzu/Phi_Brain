import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { coursesRouter } from './routes/courses';
import { journalsRouter } from './routes/journals';
import { fragmentsRouter } from './routes/fragments';
import { futureItemsRouter } from './routes/futureItems';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/courses', coursesRouter);
app.use('/api/journals', journalsRouter);
app.use('/api/fragments', fragmentsRouter);
app.use('/api/future-items', futureItemsRouter);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Phi Brain server listening on http://localhost:${port}`);
  console.log(`LLM provider: ${process.env.LLM_PROVIDER || 'mock'}${process.env.LLM_FALLBACK_PROVIDER ? ` (fallback: ${process.env.LLM_FALLBACK_PROVIDER})` : ''}`);
});
