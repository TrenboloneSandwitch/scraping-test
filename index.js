import * as dotenv from 'dotenv';
import { getTransactions, parseInputString, readFile, writeFile } from './file.js';
import fs from 'fs/promises';

import { getCardData, checkIssuabilityOfTargetCard, login, setup } from './scraper.js';


const main = async () => {
  const { page, browser } = await setup();
  login(page);

  const data = await readFile();

  const res = {};

  for (const row of data.trim().split("\n")) {
    const parsedInput = parseInputString(row);
    await checkIssuabilityOfTargetCard({ card: parsedInput.targetCard, contractId: parsedInput.targetContract, hexContractId: parsedInput.hexTargetContract, page })
    const cardData = await getCardData({ ...parsedInput, page });
    const result = getTransactions({ ...parsedInput, ...cardData });

    res[result.subject] = { transactions: [...(res[result.subject]?.transactions || []), result.claim], contracts: [...(res[result.subject]?.contracts || []), result.contract], }
  }


  try {
    await fs.writeFile('./data/result.txt', JSON.stringify(res, null, 4).replace(/\\/g, ''));

  } catch (err) {
    console.log(err);
  }
  await browser.close();
}



dotenv.config();
await main();
