import * as dotenv from 'dotenv';
import { parseInputString, readFile } from './file.js';
import { checkIssueTransaction, login, setup } from './scraper.js';


const main = async () => {
  const { page, browser } = await setup();

  const data = await readFile();

  login(page);

  for (const row of data.trim().split("\n")) {
    const { targetCard, targetContract, hexTargetContract } = parseInputString(row);
    await checkIssueTransaction({ page, card: targetCard, contractId: targetContract, hexContractId: hexTargetContract });

  }
  await browser.close();
}

dotenv.config();
await main();
