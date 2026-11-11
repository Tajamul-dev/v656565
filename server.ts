import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '25mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.post('/api/debug-log', (req, res) => {
  console.log('DEBUG-LOG >>>', JSON.stringify(req.body));
  res.json({ ok: true });
});

app.post('/api/scan-bill', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided for bill scanning' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const isPdf = mimeType === 'application/pdf' || imageBase64.startsWith('data:application/pdf');
    const effectiveMimeType = isPdf ? 'application/pdf' : (mimeType || 'image/jpeg');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: effectiveMimeType,
            data: cleanBase64,
          },
        },
        {
          text: `You are an expert commercial logistics, procurement and warehouse inventory auditor for Global Futura Inc. (edible oils, honey, and food packaging enterprise).
Examine this bill, supplier invoice, delivery challan, goods receipt note (GRN), purchase invoice, or warehouse receiving document (image or PDF).

Extract all line items and structured bill details into a clean JSON object with this exact schema:
{
  "vendorName": string,
  "billNumber": string,
  "billDate": string,
  "documentType": "purchase_invoice" | "delivery_challan" | "goods_receipt" | "packing_slip" | "other",
  "targetContainer": string | null,
  "summary": string,
  "items": [
    {
      "itemName": string,
      "materialType": "bottle" | "cap" | "carton" | "label" | "raw_material" | "preform" | "wad" | "spout" | "sleeve" | "pallet" | "ink" | "none",
      "matchedSku": string,
      "quantity": number,
      "unit": "pcs" | "kg" | "cartons" | "ltr" | "nos",
      "unitRate": number,
      "totalAmount": number
    }
  ],
  "totalBillAmount": number
}

Rules:
1. "materialType" must be one of: "bottle", "cap", "carton", "label", "raw_material", "preform", "wad", "spout", "sleeve", "pallet", "ink", or "none".
2. If the item is edible oil or honey (e.g. Mustard Oil, Soybean Oil, Sunflower Oil, Canola Oil, Acacia Honey, Sidr Honey), classify as "raw_material".
3. "matchedSku" should match standard packaging formats if recognizable (e.g. "1 L PET", "5 L PET", "500 ml Glass", "2 KG Bucket", "3.79 L HDPE").
4. "quantity" must be positive number. Extract actual count or weight received.
5. Return ONLY pure valid JSON with no markdown formatting.`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error scanning bill with Gemini:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze bill image with Gemini AI',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Global Futura ERP server running at http://0.0.0.0:${port}`);
  });
}

startServer();
