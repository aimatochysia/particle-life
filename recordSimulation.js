const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const RECORD_DURATION = 300 * 1000;
const FPS = 10;

async function recordSimulation() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const htmlFile = path.resolve(__dirname, 'index.html');
    await page.goto(`file://${htmlFile}`);

    await page.setViewport({
        width: 1920,
        height: 1080
    });

    const videoPath = await recordCanvas(page);

    await browser.close();
    return videoPath;
}

async function recordCanvas(page) {
    const screenshotsDir = './screenshots';
    fs.mkdirSync(screenshotsDir, { recursive: true });

    let screenshotCount = 0;
    const captureInterval = 100;

    console.log('Recording canvas...');

    const captureScreenshots = setInterval(async () => {
        screenshotCount++;
        const screenshotPath = path.join(screenshotsDir, `screenshot-${screenshotCount}.png`);
        await page.screenshot({ path: screenshotPath });
    }, captureInterval);

    await new Promise(resolve => setTimeout(resolve, RECORD_DURATION));

    clearInterval(captureScreenshots);

    console.log('Finished capturing screenshots, now converting to video...');

    const videoOutputPath = await convertToVideo(screenshotsDir, screenshotCount);
    return videoOutputPath;
}

async function convertToVideo(screenshotsDir, screenshotCount) {
    const videoOutputPath = './wallpaper.mp4';

    return new Promise((resolve, reject) => {
        const ffmpegCommand = ffmpeg();
        for (let i = 1; i <= screenshotCount; i++) {
            ffmpegCommand.input(`${screenshotsDir}/screenshot-${i}.png`);
        }

        ffmpegCommand
            .on('end', () => {
                console.log('Video has been created successfully.');
                resolve(videoOutputPath);
            })
            .on('error', err => {
                console.error('Error creating video:', err);
                reject(err);
            })
            .fps(FPS)
            .save(videoOutputPath);
    });
}

function incrementVideoName() {
    const files = fs.readdirSync('./');
    const wallpaperFiles = files.filter(file => file.startsWith('wallpaper-') && file.endsWith('.mp4'));
    const latestNumber = wallpaperFiles
        .map(file => parseInt(file.match(/wallpaper-(\d+)\.mp4/)[1], 10))
        .reduce((max, num) => (num > max ? num : max), 0);

    return `wallpaper-${latestNumber + 1}.mp4`;
}

(async () => {
    try {
        const videoPath = await recordSimulation();
        const newVideoName = incrementVideoName();
        fs.renameSync(videoPath, newVideoName);
        console.log(`Saved video as ${newVideoName}`);
    } catch (err) {
        console.error('Error:', err);
    }
})();
