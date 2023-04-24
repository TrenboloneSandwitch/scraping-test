import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import ffs from 'fs/promises';
import { Readable } from 'stream';
import { checkCoupon, checkEP, login, setup } from './scraper.js';


XLSX.set_fs(fs);
XLSX.stream.set_readable(Readable);

const HEADER = {
  card: "SNR karty",
  validFrom: "Platnost od",
  validTo: "Platnost do",
  couponPrice: "Kupon cena",
  epPrice: "EP cena",
  foundPrice: "V SVT nalezeno (Kč)",
}

const parse = () => {
  const excelData = XLSX.readFile("./data/soubor.xlsx");
  const name = Object.keys(excelData.Sheets)[0]

  return XLSX.utils.sheet_to_json(excelData.Sheets[name], { raw: false });
}



const main = async () => {
  const { page, browser } = await setup();
  login(page);

  const rows = parse();
  const resultRows = [];
  for (const row of rows) {

    const newRow = { [HEADER.card]: row[HEADER.card], [HEADER.epPrice]: row[HEADER.epPrice], [HEADER.couponPrice]: row[HEADER.couponPrice] }
    const isEP = !!row[HEADER.epPrice];

    if (isEP) {
      const { refundPrice, status, detailPrice } = await checkEP({ cardId: row[HEADER.card], price: row[HEADER.epPrice], page });
      newRow["Status: "] = status;
      newRow["Detailni cena: "] = detailPrice;
      newRow["Cena kuponu v SVT: "] = refundPrice;
      console.log('EP :', row[HEADER.card], "|", refundPrice, "|", status, "|", detailPrice);
    } else {
      const { refundPrice, status, detailPrice } = await checkCoupon({
        cardId: row[HEADER.card],
        price: row[HEADER.epPrice],
        validFrom: row[HEADER.validFrom],
        validTo: row[HEADER.validTo],
        page
      });

      newRow["Status: "] = status;
      newRow["Detailni cena: "] = detailPrice;
      newRow["Cena kuponu v SVT: "] = refundPrice;
      console.log('KUPON :', row[HEADER.card], "|", refundPrice, "|", status, "|", detailPrice);
    }

    resultRows.push(newRow);

  }

  try {
    ffs.writeFile('./data/result_EXCEL.txt', resultRows.map(item => JSON.stringify(item, null, 4)).join("\n"));

  } catch (err) {
    console.log(err);
  }

  await browser.close();
}

dotenv.config();
main()
