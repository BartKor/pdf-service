import express from 'express';
import puppeteer from 'puppeteer';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(helmet()); 
app.use(express.json({ limit: '10mb' }));

const SHARED_SECRET = process.env.PDF_SERVICE_API_KEY;

app.post('/generate', async (req, res) => {
    const incomingKey = req.header('X-API-KEY');
    
    if (!SHARED_SECRET || incomingKey !== SHARED_SECRET) {
        console.warn('Unauthorized access attempt blocked.');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { html } = req.body;
    if (!html) return res.status(400).json({ error: 'Missing HTML' });

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: '/usr/bin/google-chrome',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-gpu',           
                '--no-zygote'
            ]
        });

        const page = await browser.newPage();

        // SSRF PROTECTION
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            const blockedPatterns = ['169.254.169.254', 'localhost', '127.0.0.1'];
            if (blockedPatterns.some(ip => url.includes(ip))) {
                request.abort();
            } else {
                request.continue();
            }
        });

        await page.setJavaScriptEnabled(false);
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdf);

    } catch (err) {
        console.error('PDF Generation Error:', err); // Log locally
        res.status(500).json({ error: 'Internal Processing Error' });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Secure PDF service running on port ${PORT}`);
});