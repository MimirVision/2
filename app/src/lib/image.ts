import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type PhotoSource = 'camera' | 'library';

/** Returns a local uri, null if the user cancelled, or throws 'permission' if access was denied. */
export async function pickPhoto(source: PhotoSource): Promise<string | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('permission');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

/** Downscale to keep upload small and fast; the model doesn't need more than ~1280px. */
export async function preparePhoto(uri: string): Promise<{ uri: string; base64: string }> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1280 });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error('encode');
  return { uri: saved.uri, base64: saved.base64 };
}

const itemsDir = () => new Directory(Paths.document, 'items');

/** Moves the photo out of the cache so it survives cache clearing. */
export function persistPhoto(uri: string, id: string): string {
  const dir = itemsDir();
  if (!dir.exists) dir.create({ intermediates: true });
  const dest = new File(dir, `${id}.jpg`);
  new File(uri).copy(dest);
  return dest.uri;
}

export function deleteItemImage(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Missing files are fine.
  }
}
