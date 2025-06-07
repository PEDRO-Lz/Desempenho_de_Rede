import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { readJsonFile } from './utils/fileUtils';
import { parseIperf } from './utils/iperfParser';

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: path.resolve(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });


app.post('/api/upload-multiplos', upload.array('files', 6), async (req, res) => {
  try {
    if (!req.files || !(req.files instanceof Array) || req.files.length === 0) {
      res.status(400).json({ error: 'Nenhum arquivo enviado' });
      return;
    }
    const allStats = [];
    const filenames = [];
    for (const file of req.files) {
      try {
        const data = await readJsonFile(file.path);
        const stats = parseIperf(data, file.originalname);
        allStats.push(stats);
        filenames.push(file.originalname);
      } catch (err) {
        console.error(`Erro ao processar o arquivo ${file.originalname}:`, err);
        res.status(400).json({ error: `Erro ao processar o arquivo ${file.originalname}` });
        return;
      } finally {
        try {
          await fs.unlink(file.path);
        } catch (e) {
          console.warn(`Não foi possível apagar o arquivo ${file.path}:`, e);
        }
      }
    }
    res.json({ allStats, filenames });
  } catch (err) {
    console.error('Erro interno do servidor:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.listen(3001, () => console.log('Backend rodando na porta 3001'));