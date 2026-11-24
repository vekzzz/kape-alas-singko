import { CLOSING_TIME, OPENING_TIME, formatTime } from './time';

export const SHOP_ADDRESS = 'Magsaysay Avenue, Naga City, Camarines Sur';
export const SHOP_HOURS = `Every day, ${formatTime(OPENING_TIME)} to ${formatTime(CLOSING_TIME)}`;
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Kapé Alas-Singko, ${SHOP_ADDRESS}`)}`;
