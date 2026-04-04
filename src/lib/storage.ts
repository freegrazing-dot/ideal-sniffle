import { supabase } from './supabase';

export type ImageBucket = 'property-images' | 'activity-images' | 'hero-images';

export async function uploadImage(
  file: File,
  bucket: ImageBucket,
  path?: string
): Promise<{ url: string; path: string; error?: string } | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = path || `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrl, path: data.path };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return { url: '', path: '', error: error.message || 'Upload failed' };
  }
}

export async function deleteImage(bucket: ImageBucket, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

export function getImageUrl(bucket: ImageBucket, path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return publicUrl;
}
