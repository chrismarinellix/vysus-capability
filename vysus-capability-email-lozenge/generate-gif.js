const puppeteer = require('puppeteer');
const GIFEncoder = require('gif-encoder-2');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

async function generateGif(variant = 'green') {
    const frames = 80;
    const delay = 40;

    console.log(`\nGenerating ${variant} lozenge GIF...`);

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    await page.setViewport({ width: 400, height: 120, deviceScaleFactor: 2 });

    const isNeon = variant === 'neon';
    const bgColor = isNeon ? '#00E3A9' : '#005454';
    const bgColorMid = isNeon ? '#00b88a' : '#006b6b';
    const textColor = isNeon ? '#005454' : '#ffffff';
    const shimmerColor = isNeon ? 'rgba(255,255,255,0.7)' : 'rgba(0,227,169,0.6)';

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
                gap: 6px;
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
                transform: scale(var(--lozenge-scale, 1));
            }
            .lozenge::before {
                content: '';
                position: absolute;
                top: -50%;
                left: var(--shimmer-pos, -150%);
                width: 80%;
                height: 200%;
                background: linear-gradient(
                    90deg,
                    transparent 0%,
                    ${shimmerColor} 45%,
                    rgba(255,255,255,0.9) 50%,
                    ${shimmerColor} 55%,
                    transparent 100%
                );
                transform: skewX(-20deg);
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
                font-size: 18px;
                transform: translateY(var(--hand-y, 0px)) scaleX(-1);
                filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.2));
            }
            .spark {
                position: absolute;
                right: -8px;
                top: 50%;
                transform: translateY(-50%);
                width: var(--spark-size, 0px);
                height: var(--spark-size, 0px);
                opacity: var(--spark-opacity, 0);
                pointer-events: none;
            }
            .spark::before {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, rgba(0,227,169,0.8) 0%, rgba(0,227,169,0) 70%);
                border-radius: 50%;
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
                <div class="spark" id="spark"></div>
            </div>
            <span class="hand" id="hand">👈</span>
        </div>
    </body>
    </html>`;

    await page.setContent(html);
    await page.waitForSelector('.container');

    const container = await page.$('.container');
    const box = await container.boundingBox();

    const padding = 8;
    const width = Math.ceil((box.width + padding * 2) * 2);
    const height = Math.ceil((box.height + padding * 2) * 2);

    const encoder = new GIFEncoder(width, height, 'neuquant', true);
    const outputPath = path.join(__dirname, `vysus-capability-${variant}.gif`);

    encoder.setDelay(delay);
    encoder.setRepeat(0);
    encoder.start();

    const clickFrame = 40;

    for (let i = 0; i < frames; i++) {
        const shimmerProgress = ((i / frames) * 300) - 150;

        let handY = 0;
        let lozengeScale = 1;
        let sparkSize = 0;
        let sparkOpacity = 0;

        // Click animation
        const clickWindow = 10;
        if (i >= clickFrame - 3 && i <= clickFrame + clickWindow) {
            const progress = i - clickFrame;

            if (progress < 0) {
                handY = (progress + 3) * -1.5;
            } else if (progress === 0) {
                handY = -4;
                lozengeScale = 0.97;
                sparkSize = 25;
                sparkOpacity = 1;
            } else if (progress <= clickWindow) {
                const t = progress / clickWindow;
                handY = -4 * (1 - t);
                lozengeScale = 0.97 + (0.03 * t);
                sparkSize = 25 + (progress * 5);
                sparkOpacity = Math.max(0, 1 - (progress / 5));
            }
        }

        await page.evaluate((shimmerPos, hY, lS, sS, sO) => {
            document.querySelector('.lozenge').style.setProperty('--shimmer-pos', shimmerPos + '%');
            document.querySelector('.lozenge').style.setProperty('--lozenge-scale', lS);
            document.querySelector('.hand').style.setProperty('--hand-y', hY + 'px');
            document.querySelector('.spark').style.setProperty('--spark-size', sS + 'px');
            document.querySelector('.spark').style.setProperty('--spark-opacity', sO);
        }, shimmerProgress, handY, lozengeScale, sparkSize, sparkOpacity);

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
