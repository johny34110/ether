import { useEffect, useMemo, useRef, useState } from "react";

export default function CharacterAutocomplete({
  label,
  characters,
  valueId,
  onChangeId,
  placeholder = "Tape un nom…",
}) {
  const selected = useMemo(
    () => characters.find((c) => c.id === valueId) || null,
    [characters, valueId]
  );

  const [text, setText] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    setText(selected?.name ?? "");
  }, [selected?.name]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return characters.slice(0, 12);

    const starts = [];
    const contains = [];
    for (const c of characters) {
      const n = (c.name || "").toLowerCase();
      if (n.startsWith(q)) starts.push(c);
      else if (n.includes(q)) contains.push(c);
      if (starts.length >= 12) break;
    }
    return [...starts, ...contains].slice(0, 12);
  }, [characters, text]);

  function pick(c) {
    onChangeId(c.id);
    setText(c.name);
    setOpen(false);
  }

  function clear() {
    onChangeId(null);
    setText("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ display: "grid", gap: 6, position: "relative" }}>
      {label ? <div style={{ fontWeight: 800 }}>{label}</div> : null}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{ flex: 1, padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
        />

        {selected?.image_url ? (
          <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", background: "#eee" }}>
            <img src={selected.image_url} alt={selected.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eee" }} />
        )}

        <button onClick={clear} style={{ padding: "8px 10px", borderRadius: 12 }}>
          ✕
        </button>
      </div>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: label ? 70 : 46,
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 14,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            maxHeight: 320,
            overflow: "auto",
            zIndex: 30,
          }}
        >
          {suggestions.length ? (
            suggestions.map((c) => (
              <button
                key={c.id}
                onClick={() => pick(c)}
                style={{
                  width: "100%",
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 10, overflow: "hidden", background: "#f2f2f2" }}>
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
                <div style={{ fontWeight: 800 }}>{c.name}</div>
              </button>
            ))
          ) : (
            <div style={{ padding: 12, opacity: 0.7 }}>Aucun résultat</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
