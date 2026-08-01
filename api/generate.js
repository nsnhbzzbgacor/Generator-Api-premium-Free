const express = require('express');
const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');
const tempMail = require('temp-mail-api');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

async function generateOpenAI(email) {
    let browser = null;
    try {
        // Chromium path untuk Vercel
        const executablePath = await chromium.executablePath || '/usr/bin/chromium-browser';
        browser = await puppeteer.launch({
            args: chromium.args || ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: executablePath,
            headless: 'new',
            timeout: 25000
        });
        const page = await browser.newPage();
        // ... sisanya sama seperti sebelumnya
        // ... (proses signup, OTP, ambil key)
        // jika gagal, fallback key
        return resultKey;
    } catch (err) {
        if (browser) await browser.close();
        return `ERROR: ${err.message.slice(0,50)} | fallback-${Date.now()}`;
    }
}