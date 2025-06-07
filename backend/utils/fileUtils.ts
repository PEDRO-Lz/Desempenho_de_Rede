import { promises as fs } from 'fs';

export const readJsonFile = async (filePath: string): Promise<any> => {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
};

export const writeJsonFile = async (filePath: string, data: any): Promise<void> => {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonData, 'utf-8');
};