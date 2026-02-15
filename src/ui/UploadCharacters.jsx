import { useState } from "react";
import { supabase } from "../lib/supabase";

function fileBaseName(filename) {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(0, dot) : filename;
}

export default function UploadCharacters({ onDone }) {
  const [busy, setBusy] = useState(false);

  async function handleFiles(files) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        const name = fileBaseName(f.name).trim();
        if (!name) continue;

        const path = `${name}${f.name.includes(".") ? f.name.slice(f.name.lastIndexOf(".")) : ""}`;
        // upload (upsert true so you can replace)
        const { error: upErr } = await supabase.storage
          .from("characters")
          .upload(path, f, { upsert: true });

        if (upErr) throw upErr;

        // upsert in DB
        const { error: dbErr } = await supabase
          .from("characters")
          .upsert({ name, image_path: path }, { onConflict: "name" });

        if (dbErr) throw dbErr;
      }
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 14, border: "1px dashed #bbb", borderRadius: 14 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Importer des personnages (images)</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(e) => handleFiles([...e.target.files])}
        />
        {busy ? <span>Upload...</span> : <span style={{ opacity: 0.7 }}>Nom fichier = nom perso</span>}
      </div>
    </div>
  );
}
