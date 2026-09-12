import fs from 'fs';
import path from 'path';

const STATUS_FILE_PATH = path.join(__dirname, '../../data/shop_statuses.json');

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

export function getAllShopStatuses(): Record<string, string> {
  try {
    if (fs.existsSync(STATUS_FILE_PATH)) {
      const content = fs.readFileSync(STATUS_FILE_PATH, 'utf-8');
      return JSON.parse(content || '{}');
    }
  } catch (err) {
    console.error('Error reading shop_statuses.json:', err);
  }
  return {};
}

export function getShopStatus(shopId: string): string {
  const statuses = getAllShopStatuses();
  return statuses[shopId] || 'pending';
}

export function setShopStatus(shopId: string, status: 'approved' | 'pending'): void {
  try {
    const statuses = getAllShopStatuses();
    statuses[shopId] = status;
    ensureDirectoryExistence(STATUS_FILE_PATH);
    fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(statuses, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing shop_statuses.json:', err);
  }
}

export function deleteShopStatus(shopId: string): void {
  try {
    const statuses = getAllShopStatuses();
    if (statuses[shopId]) {
      delete statuses[shopId];
      ensureDirectoryExistence(STATUS_FILE_PATH);
      fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(statuses, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error deleting shop status:', err);
  }
}
