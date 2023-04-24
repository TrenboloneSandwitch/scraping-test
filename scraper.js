// Import the Chromium browser into our scraper.
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { formatDate, getCurrentDate, getOneMonthAgoDate } from './utils.js';
import moment from 'moment';

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

// Return false if card does not exist
export const searchForCard = async ({ card, page }) => {

  await page.goto('https://cards.svt.cz/in/preBalanceCardApplication.do?menuCard=cards');

  await page.waitForSelector('input[name="card_number"]');
  await page.locator('input[name="card_number"]').fill(card);
  await page.keyboard.press('Enter');

  await page.waitForTimeout(500);

  const html = await page.content()
  const $ = cheerio.load(html);

  const formError = $("#formError");
  if (formError.length) {
    console.error(`${card} does not exist!`)
    return false;
  }
  return true;
}

const FIRST_ROW_DETAIL_BUTTON = '//*[@id="itemList"]/tbody/tr[2]/td[11]/a[contains(., "Detail")]';

const getContractRow = async ({ contractId, hexContractId, page }) => {
  await page.waitForSelector("#itemList > tbody > tr:nth-child(1) > th:nth-child(2)")


  await page.waitForTimeout(500);
  const html = await page.content()
  const $ = cheerio.load(html);

  const row = $(`#itemList tbody tr:has( td:nth-child(3):contains("0x${hexContractId} (${contractId})") )`);
  return row;
}

const goToContractPage = async ({ page }) => {
  await page.waitForSelector(FIRST_ROW_DETAIL_BUTTON);
  await page.locator(FIRST_ROW_DETAIL_BUTTON).click();
}

const isContractExisting = async ({ contractId, hexContractId, page }) => {
  const contractRow = await getContractRow({ contractId, hexContractId, page })

  if (contractRow.length) {
    return true;
  }
  return false;

}

const openContractsPage = async ({ page, card }) => {
  const isCardValid = await searchForCard({ card, page });

  if (!isCardValid) {
    throw new Error("CARD NOT FOUND!")
  }


  await goToContractPage({ page });
}

export const checkIssuabilityOfTargetCard = async ({ card, contractId, hexContractId, page }) => {
  const isCardValid = await searchForCard({ card, page });
  if (!isCardValid) {
    throw new Error("CARD NOT FOUND!")
  }

  const isExist = await isContractExisting({ contractId, hexContractId, page });

  if (isExist) {
    console.error(`${card} - ${contractId} already exists!`)
    throw new Error("CONTRACT ALREADY EXISTS!");
  }
}

export const getCardData = async ({ sourceCard, sourceContract, hexSourceContract, page }) => {
  await openContractsPage({ page, card: sourceCard })


  const isExist = await isContractExisting({ contractId: sourceContract, hexContractId: hexSourceContract, page });
  if (!isExist) {
    console.error(`SOURCE: ${sourceCard} - ${sourceContract} doesn't exists!`)
    throw new Error("CONTRACT DOESNT EXISTS!");
  }

  const row = await getContractRow({ contractId: sourceContract, hexContractId: hexSourceContract, page });

  const subject = row.find("td:nth-child(4)").text().trim();
  const amountRaw = row.find("td:nth-child(8)").text().trim().split("\n")[0].replace(/ /g, '').replace(",", ".");
  const amount = parseFloat(amountRaw);
  console.log(`${sourceCard} - amount :`, amount), Number.isNaN(amount);
  if (Number.isNaN(amount)) {
    // throw new Error("Invalid amount!")
  }

  const fromRaw = row.find("td:contains('0:00:00')").text().trim()
  const toRaw = row.find("td:contains('23:59:59')").text().trim();
  const from = formatDate(fromRaw);
  const to = formatDate(toRaw);


  return { from, to, subject, amount: parseFloat(amountRaw) };
}

const changeDate = async ({ page }) => {
  await page.waitForSelector("#input_to")

  await page.locator('#input_from input[name="from"]').fill(getOneMonthAgoDate());
  await page.locator('#input_to input[name="to"]').fill(getCurrentDate());

  await page.locator('#listCardApplicationTransactionsForm input[type="submit"]').click();
  await page.waitForLoadState('networkidle');
}

// FINAL CHECK
export const checkIssueTransaction = async ({ page, card, contractId, hexContractId }) => {
  await openContractsPage({ page, card })


  const isExist = await isContractExisting({ contractId, hexContractId, page });
  if (!isExist) {
    console.error(`TARGET: ${card} ${contractId} doesn't exists!`)
    throw new Error("CONTRACT DOESNT EXISTS!");
  }

  const row = await getContractRow({ contractId, hexContractId, page });

  const link = row.find('td:nth-child(11) a:contains("Zobrazit transakce")').attr('href');
  await page.goto(`https://cards.svt.cz/in/${link}`);

  await changeDate({ page });


  const html = await page.content()
  const $ = cheerio.load(html);

  const resultCell = $(`#itemList tbody tr td:contains("cílová reklamační")`);

  const sourceLink = resultCell.find("a:contains('zdrojová')").attr('href');

  console.log(card, `, ${sourceLink.includes("javascript:showOther") ? "OK" : "FAILED"}, `, sourceLink);

}

const FIRST_ROW_EP_DETAIL_BUTTON = '//*[@id="itemList"]/tbody/tr[4]/td[11]/a[contains(., "Zobrazit transakce")]';
export const checkEP = async ({ cardId, price, page }) => {
  await searchForCard({ card: cardId, page });

  await page.waitForSelector(FIRST_ROW_EP_DETAIL_BUTTON);
  await page.locator(FIRST_ROW_EP_DETAIL_BUTTON).click();

  return await getRefundData({ page, isEp: true });

}

export const checkCoupon = async ({ cardId, price, validFrom, validTo, page }) => {
  await openContractsPage({ page, card: cardId });

  const parsedValidFrom = moment(validFrom, 'MM.DD.YYYY').format('D.M.YYYY');
  const parsedValidTo = moment(validTo, 'MM.DD.YYYY').format('D.M.YYYY');


  await page.waitForTimeout(500);
  let html = await page.content()
  let $ = cheerio.load(html);

  let wantedRow = $(`#itemList tbody tr:has( td:nth-child(5):contains("${parsedValidFrom}") )`);

  if (wantedRow.length > 1) {
    wantedRow = wantedRow.filter(`#itemList tbody tr:has( td:nth-child(6):contains("${parsedValidTo}") )`);
  }

  const link = wantedRow.find('td:nth-child(11) a:contains("Zobrazit transakce")').attr('href');
  await page.goto(`https://cards.svt.cz/in/${link}`);


  return await getRefundData({ page, isEp: false });
}


const getRefundData = async ({ page, isEp }) => {
  await page.waitForSelector("#input_to")

  let html = await page.content()
  let $ = cheerio.load(html);
  let refundRow = $(`#itemList tbody tr:has( td:nth-child(8):contains("refund") )`);


  if (!refundRow.length) {
    await changeDate({ page });
    await page.waitForSelector("#input_to");

    html = await page.content()
    $ = cheerio.load(html);
  }

  refundRow = $(`#itemList tbody tr:has( td:nth-child(8):contains("refund") )`);
  if (!refundRow.length) {
    return "!!! NO REFUND FOUND !!!"
  }

  const refundPrice = refundRow.find("td:nth-child(6)").text().trim().replace(/ /g, '').replace(",", ".");
  const status = refundRow.find("td:nth-child(13)").text().trim();

  if (isEp) {
    const detailPrice = $(`#card_detail > tbody > tr:has( td:nth-child(1):contains("Zůstatek") ) > td:nth-child(2)`).text().trim();
    return { refundPrice, status, detailPrice };

  }

  const detailPrice = $(`#card_detail > tbody > tr:has( td:nth-child(1):contains("Ceny kupónu") ) > td:nth-child(2)`)
    .text()
    .trim()
    .replace("\n\t\t\t\t\t\t\t\n\t\t\t\t\t\t\t\n\t\t\t\t\t\t\t\t\n\t\t\t\t\t\t\t\t", ", ");

  return { refundPrice, status, detailPrice };
}
