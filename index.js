import * as dotenv from 'dotenv';
import { getTransactions, parseInputString, readFile, writeFile } from './file.js';
import { getCardData, login, setup } from './scraper.js';


const main = async () => {
  const { page, browser } = await setup();
  login(page);

  const data = await readFile();

  const res = {};

  for (const row of data.trim().split("\n")) {
    const parsedInput = parseInputString(row);
    const cardData = await getCardData({ ...parsedInput, page });
    const result = getTransactions({ ...parsedInput, ...cardData });

    res[result.subject] = { transactions: [...(res[result.subject]?.transactions || []), result.claim], contracts: [...(res[result.subject]?.contracts || []), result.contract], }
  }

  writeFile(JSON.stringify(res, null, 2));
  await browser.close();
}

dotenv.config();
await main();
