const puppeteer = require('puppeteer');
const GIFEncoder = require('gif-encoder-2');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

async function generateGif(variant = 'green') {
    const frames = 60;
    const delay = 50;

    console.log(`\nGenerating ${variant} lozenge GIF...`);

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    await page.setViewport({ width: 450, height: 150, deviceScaleFactor: 2 });

    const isNeon = variant === 'neon';
    const bgColor = isNeon ? '#00E3A9' : '#005454';
    const bgColorMid = isNeon ? '#00b88a' : '#006b6b';
    const textColor = isNeon ? '#005454' : '#ffffff';
    const shimmerColor = isNeon ? 'rgba(255,255,255,0.5)' : 'rgba(0,227,169,0.4)';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            * { margin: 0; padding: 0; }
            body {
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                padding: 20px;
            }
            .container {
                display: flex;
                align-items: center;
                position: relative;
            }
            .lozenge {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, ${bgColor} 0%, ${bgColorMid} 50%, ${bgColor} 100%);
                color: ${textColor};
                font-family: Arial, sans-serif;
                font-size: 14px;
                font-weight: bold;
                padding: 12px 24px;
                border-radius: 50px;
                position: relative;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0, 84, 84, 0.3);
                transform: scale(var(--scale, 1));
            }
            .lozenge::before {
                content: '';
                position: absolute;
                top: 0;
                left: var(--shimmer-pos, -100%);
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%);
            }
            .icon {
                width: 16px;
                height: 18px;
                position: relative;
                z-index: 1;
            }
            .text {
                position: relative;
                z-index: 1;
            }
            .cursor {
                position: absolute;
                right: var(--cursor-x, -40px);
                top: 50%;
                transform: translateY(-40%);
                font-size: 20px;
                opacity: var(--cursor-opacity, 0);
                filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
            }
        </style>
    </head>
    <body>
        <div class="container" id="container">
            <div class="lozenge" id="lozenge">
                <svg class="icon" viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0 L38.7 112.2 L85 112.2 L46.2 0 Z" fill="currentColor"/>
                    <path d="M86.2 2.8 L74.8 10.9 L67.6 22.6 L65.7 36.1 L68.5 48.1 L76.9 59.8 L88.2 66.6 L100 68.6 L100 0 Z" fill="currentColor"/>
                </svg>
                <span class="text">Vysus Capability</span>
            </div>
            <span class="cursor" id="cursor">🖱️</span>
        </div>
    </body>
    </html>`;

    await page.setContent(html);
    await page.waitForSelector('.container');

    const container = await page.$('.container');
    const box = await container.boundingBox();

    const padding = 10;
    const width = Math.ceil((box.width + padding * 2) * 2);
    const height = Math.ceil((box.height + padding * 2) * 2);

    const encoder = new GIFEncoder(width, height, 'neuquant', true);
    const outputPath = path.join(__dirname, `vysus-capability-${variant}.gif`);

    encoder.setDelay(delay);
    encoder.setRepeat(0);
    encoder.start();

    for (let i = 0; i < frames; i++) {
        const shimmerProgress = (i / frames) * 200 - 100;

        // Cursor animation - slides in, clicks, slides out
        let cursorX = -40;
        let cursorOpacity = 0;
        let scale = 1;

        // Frames 10-20: cursor slides in
        // Frames 25-30: click
        // Frames 35-45: cursor slides out

        if (i >= 10 && i < 20) {
            const t = (i - 10) / 10;
            cursorX = -40 + (t * 35); // moves from -40 to -5
            cursorOpacity = t;
        } else if (i >= 20 && i < 25) {
            cursorX = -5;
            cursorOpacity = 1;
        } else if (i >= 25 && i < 30) {
            cursorX = -5;
            cursorOpacity = 1;
            // Click effect
            if (i === 26 || i === 27) {
                scale = 0.97;
            }
        } else if (i >= 30 && i < 35) {
            cursorX = -5;
            cursorOpacity = 1;
        } else if (i >= 35 && i < 45) {
            const t = (i - 35) / 10;
            cursorX = -5 - (t * 35); // moves from -5 to -40
            cursorOpacity = 1 - t;
        }

        await page.evaluate((shimmerPos, cX, cO, s) => {
            document.querySelector('.lozenge').style.setProperty('--shimmer-pos', shimmerPos + '%');
            document.querySelector('.lozenge').style.setProperty('--scale', s);
            document.querySelector('.cursor').style.setProperty('--cursor-x', cX + 'px');
            document.querySelector('.cursor').style.setProperty('--cursor-opacity', cO);
        }, shimmerProgress, cursorX, cursorOpacity, scale);

        const screenshot = await page.screenshot({
            type: 'png',
            clip: {
                x: box.x - padding,
                y: box.y - padding,
                width: box.width + padding * 2,
                height: box.height + padding * 2
            }
        });

        const png = PNG.sync.read(screenshot);
        encoder.addFrame(png.data);
        process.stdout.write(`\rFrame ${i + 1}/${frames}`);
    }

    encoder.finish();
    const buffer = encoder.out.getData();
    fs.writeFileSync(outputPath, buffer);

    await browser.close();

    console.log(`\nSaved: ${outputPath}`);
    return outputPath;
}

async function main() {
    try {
        await generateGif('green');
        await generateGif('neon');
        console.log('\n✓ Done! GIF files created:');
        console.log('  - vysus-capability-green.gif');
        console.log('  - vysus-capability-neon.gif');
    } catch (err) {
        console.error('Error:', err.message);
    }
}

main();
