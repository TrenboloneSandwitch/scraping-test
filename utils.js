import moment from 'moment';

export const formatDate = (date) => {
  if (!date) console.log("INVALID DATE BE CAREFULL!");
  return moment(date, 'DD.MM.YYYY hh:mm:ss').format('YYYY-MM-DD HH:mm:ss')
};

export const decToHex = (strNumber) => Number(strNumber).toString(16);

export const getCurrentDate = () => moment().format('DD.MM.YYYY');

export const getOneMonthAgoDate = () => moment().subtract(1, 'months').format('DD.MM.YYYY');
