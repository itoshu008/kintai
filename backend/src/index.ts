import express from 'express';
import cors from 'cors';
import { ensureDir, readJson } from './utils/dataStore';
import { mountAdminMaster } from './routes/adminMaster';
import { mountEmployees } from './routes/employees';
import { DATA_DIR } from './config';

ensureDir();
const app = express();
app.use(cors());
app.use(express.json());

// ヘルス & 情報
app.get('/api/admin/health', (_req,res)=> res.json({ ok:true, status:'healthy', version:'1.0.0', environment:process.env.NODE_ENV }));
app.get('/api/admin/_info',  (_req,res)=> res.json({ ok:true, env:process.env.NODE_ENV, data_dir: DATA_DIR, now: new Date().toISOString() }));

mountAdminMaster(app);
mountEmployees(app);

const PORT = Number(process.env.PORT || 8001);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend server running on http://127.0.0.1:${PORT}`);
});