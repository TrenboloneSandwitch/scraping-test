import moment from 'moment';

export const formatDate = (date) => moment(date, 'DD.MM.YYYY hh:mm:ss').format('YYYY-MM-DD HH:mm:ss');

export const decToHex = (strNumber) => Number(strNumber).toString(16);
