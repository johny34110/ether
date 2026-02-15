import { useMemo } from "react";

export default function CharacterPicker({ label, valueId, onChangeId, characters }) {
  const selected = useMemo(
    () => characters.find(c => c.id === valueId) || null,
    [characters, valueId]
  );

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <select
          value={valueId || ""}
          onChange={(e) => onChangeId(e.target.value || null)}
          style={{ flex: 1, padding: 8, borderRadius: 10 }}
        >
          <option value="">—</option>
          {characters.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div style={{
          width: 52, height: 52, borderRadius: 12, overflow: "hidden",
          background: "#f2f2f2", display: "grid", placeItems: "center"
        }}>
          {selected?.image_url ? (
            <img src={selected.image_url} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 12, opacity: 0.6 }}>no img</span>
          )}
        </div>
      </div>
    </div>
  );
}
