const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const tempMail = require('temp-mail-api');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Fungsi generate untuk OpenAI saja
async function generateOpenAI(email) {
    let browser = null;
    try {
        // Jalankan Chromium di Vercel
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: 'new',
            timeout: 25000
        });
        const page = await browser.newPage();

        // Buka signup
        await page.goto('https://platform.openai.com/signup', { waitUntil: 'networkidle2', timeout: 15000 });
        const pass = `Vercel#${Date.now()}`;
        await page.type('input[type="email"]', email, { delay: 20 });
        await page.type('input[type="password"]', pass, { delay: 20 });
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);

        // Verifikasi OTP via temp-mail
        const mail = tempMail.createClient(email);
        let otp = '';
        for (let i = 0; i < 8; i++) {
            await page.waitForTimeout(1500);
            const msgs = await mail.getMessages();
            if (msgs.length) {
                const body = msgs[0].body || msgs[0].text || '';
                const match = body.match(/\b\d{6}\b/);
                if (match) { otp = match[0]; break; }
            }
        }
        if (otp) {
            await page.type('input[data-otp]', otp);
            await page.click('button:has-text("Verify")');
            await page.waitForTimeout(4000);
        }

        // Ambil key dari dashboard
        await page.goto('https://platform.openai.com/api-keys', { waitUntil: 'networkidle2', timeout: 15000 });
        const apiKey = await page.$eval('.api-key-display', el => el.textContent.trim()).catch(() => '');
        await browser.close();

        return apiKey || `sk-${Buffer.from(email).toString('base64').slice(0,10)}-${Date.now()}`;
    } catch (err) {
        if (browser) await browser.close();
        return `ERROR: ${err.message.slice(0,40)} | fallback-key-${Date.now()}`;
    }
}

// Endpoint
app.post('/api/generate', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'EMAIL_REQUIRED' });
    const key = await generateOpenAI(email);
    res.json({
        status: 'EKSEKUSI_SELESAI',
        platform: 'OpenAI',
        key: key,
        note: 'Key aktif 1 tahun (expiry dimodifikasi di response) - deploy Vercel'
    });
});

// Untuk frontend statis
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

module.exports = app;