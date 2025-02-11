import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';

export async function uploadToVercelBlob(file: File, prefix: string = '') {
  try {
    const filename = `${prefix}${nanoid()}_${file.name}`;
    const { url } = await put(filename, file, {
      access: 'public',
      token: "vercel_blob_rw_PTd2cskof6fsoEDH_fJieVearLfgx4xdNnfctsKiIWIHDEy"
    });
    return url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw error;
  }
} 