// Import the Chromium browser into our scraper.
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { formatDate } from './utils.js';

export const setup = async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://cards.svt.cz/in/preBalanceCardApplication.do?menuCard=cards');

  return { page, browser };
}

export const login = async (page) => {
  await page.fill("#input_subject_code > input[type=text]", 'SVT');
  await page.fill("#input_subjectUser_username > input[type=text]", process.env.USERNAME);
  await page.fill("#input_subjectUser_password > input[type=password]", process.env.PASS);
  await page.click('input[type="submit"]');
  console.log("Logged in");
}

export const getCardData = async ({ sourceCard, sourceContract, hexSourceContract, page }) => {
  await page.goto('https://cards.svt.cz/in/preBalanceCardApplication.do?menuCard=cards');

  await page.waitForSelector('input[name="card_number"]');
  await page.locator('input[name="card_number"]').fill(sourceCard);
  await page.keyboard.press('Enter');

  await page.waitForSelector('//*[@id="itemList"]/tbody/tr[2]/td[11]/a[contains(., "Detail")]');
  await page.locator('//*[@id="itemList"]/tbody/tr[2]/td[11]/a[contains(., "Detail")]').click();

  await page.waitForSelector("#itemList > tbody > tr:nth-child(1) > th:nth-child(2)")
  await page.locator("#itemList > tbody > tr:nth-child(1) > th:nth-child(2)");

  const html = await page.content()
  const $ = cheerio.load(html);
  const row = $(`#itemList tbody tr:has( td:nth-child(3):contains("0x${hexSourceContract} (${sourceContract})") )`);

  const subject = row.find("td:nth-child(4)").text().trim();
  const amountRaw = row.find("td:nth-child(8)").text().trim().split("\n")[0].replace(/ /g, '').replace(",", ".");
  const amount = parseFloat(amountRaw);
  console.log('amount :', amount), Number.isNaN(amount);
  if (Number.isNaN(amount)) {
    throw new Error("Invalid amount!")
  }

  const fromRaw = row.find("td:contains('0:00:00')").text().trim()
  const toRaw = row.find("td:contains('23:59:59')").text().trim();
  const from = formatDate(fromRaw);
  const to = formatDate(toRaw);


  return { from, to, subject, amount: parseFloat(amountRaw) };
}
