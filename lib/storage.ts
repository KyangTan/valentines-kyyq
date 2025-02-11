import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';

export async function uploadToVercelBlob(file: File, prefix: string = '') {
  try {
    const filename = `${prefix}${nanoid()}_${file.name}`;
    const { url } = await put(filename, file, {
      access: 'public',
    });
    return url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw error;
  }
} 