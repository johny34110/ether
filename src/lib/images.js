import { supabase } from "./supabase";

export function publicCharacterUrl(image_path) {
  if (!image_path) return null;
  return supabase.storage.from("characters").getPublicUrl(image_path).data.publicUrl;
}
