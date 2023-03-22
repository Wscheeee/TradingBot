const puppeteer = require('puppeteer');
const fs = require('fs');
const { compare } = require('./compare');

exports.scrape = async function scrape() {
    (async function main() {
        const browser = await puppeteer.launch({ headless: true });
        const [page] = await browser.pages();

        await page.goto('https://www.binance.com/en/futures-activity/leaderboard/user?encryptedUid=FAD84AAFD6E43900BF15E06B21857715', { waitUntil: 'networkidle0' });
        // Get every title
        const titles = await page.evaluate(() => {
            let titles = [];
            let elements = document.querySelectorAll('table > tbody.bn-table-tbody > tr');
            let i = 0;
            for (var element of elements) {
                if (i != 0) {
                    let title = {};
                    title.pair = element.querySelector('.symbol-info.css-vurnku .symbol-name.css-1c82c04').innerText.replaceAll(' Perpetual', '');
                    title.type = element.querySelector('div.symbol-detail.css-4cffwv :nth-child(1)').innerText;
                    title.leverage = element.querySelector('div.css-mx5ldy').innerText;
                    title.size = element.querySelector('td:nth-child(2)').innerText;
                    title.entryprice = element.querySelector('td:nth-child(3)').innerText;
                    title.markprice = element.querySelector('td:nth-child(4)').innerText;
                    title.time = element.querySelector('td:nth-child(6)').innerText;
                    titles.push(title);
                }
                i++;
            }
            return titles;
        });
        console.log(titles.length);
        fs.writeFileSync('./JSON/NewData.json', JSON.stringify(titles, null, 4));
        await browser.close();
        compare();
    })();
};