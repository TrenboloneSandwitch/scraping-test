import fs from 'fs/promises';
import { formatDate, decToHex } from './utils.js';

export const readFile = async () => {
  try {
    const data = await fs.readFile('./data/data.txt', { encoding: 'utf8' });
    return data;
  } catch (err) {
    console.log(err);
  }
}

export const writeFile = async (content) => {
  try {
    await fs.writeFile('./data/result.txt', content, 'utf-8');
  } catch (err) {
    console.log(err);
  }
}

export const parseInputString = (inputString) => {
  const str = inputString.toLowerCase();

  const sourceCard = str.split('karta').pop().split('přebití')[0].trim();
  const hexSourceCard = decToHex(sourceCard);

  const sourceContract = str.split('kupónu').pop().split('na')[0].trim();
  const hexSourceContract = decToHex(sourceContract);

  const targetCard = str.split('kartu').pop().split('jako')[0].trim();
  const hexTargetCard = decToHex(targetCard);

  const targetContract = str.split('kupón').pop().split('. přebito')[0].trim();
  const hexTargetContract = decToHex(targetContract);

  const whenDate = str.split('přebito').pop().split(', ')[0].trim();
  const whenTime = str.split(', ').pop().split('hod')[0].trim();

  return { sourceCard, hexSourceCard, hexTargetCard, hexTargetContract, sourceContract, hexSourceContract, targetCard, targetContract, whenDate, whenTime }
}

export const getTransactions = ({ hexSourceCard, hexSourceContract, hexTargetCard, hexTargetContract, from, to, subject, amount, whenDate, whenTime }) => {

  const parsedWhen = formatDate(`${whenDate} ${whenTime}`);

  const claim = `<claim-transaction tx-id="XXX" when="${parsedWhen}" card-id="${hexSourceCard}" medium="classic" appl-id="6196" contract-id="${hexSourceContract}" target-medium="classic" target-appl-id="6196" target-card-id="${hexTargetCard}" target-contract-id="${hexTargetContract}" amount="${amount}" valid-from="${from}" valid-to="${to}" />`;

  const contract = `<contract-issue card-id="${hexTargetCard}" medium="classic" appl-id="6196" contract-id="${hexTargetContract}" type="time" valid-from="${from}" valid-to="${to}" />`

  return { claim, contract, subject };
}
