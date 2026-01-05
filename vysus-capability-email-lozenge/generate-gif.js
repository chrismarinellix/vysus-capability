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
                gap: 8px;
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
            .hand {
                font-size: 24px;
                position: relative;
                z-index: 2;
                transform: translateX(var(--hand-x, 0px)) translateY(var(--hand-y, 0px));
                filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.3));
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
            <span class="hand" id="hand">👆</span>
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
        // Shimmer sweeps across the lozenge
        const shimmerProgress = (i / frames) * 200 - 100;

        // Hand has a subtle bounce/click animation
        let handX = 0;
        let handY = 0;

        // Click animation around frame 30
        if (i >= 28 && i < 32) {
            handY = 2; // hand presses down
        } else if (i >= 32 && i < 36) {
            handY = -1; // slight bounce back
        }

        await page.evaluate((shimmerPos, hX, hY) => {
            document.querySelector('.lozenge').style.setProperty('--shimmer-pos', shimmerPos + '%');
            document.querySelector('.hand').style.setProperty('--hand-x', hX + 'px');
            document.querySelector('.hand').style.setProperty('--hand-y', hY + 'px');
        }, shimmerProgress, handX, handY);

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
