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

  // sync input text with external selection
  useEffect(() => {
    setText(selected?.name ?? "");
  }, [selected?.name]);

  // close on outside click
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
    <div
      ref={wrapRef}
      style={{
        display: "grid",
        gap: 6,
        position: "relative",
        minWidth: 0, // important in grid columns
      }}
    >
      {label ? <div style={{ fontWeight: 800 }}>{label}</div> : null}

      {/* Input row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          minWidth: 0,
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            style={{
              width: "100%",
              padding: "10px 36px 10px 10px", // place for the clear button
              borderRadius: 12,
              border: "1px solid #ddd",
              boxSizing: "border-box",
            }}
          />

          {/* clear button INSIDE input (no layout break) */}
          <button
            onClick={clear}
            type="button"
            title="Effacer"
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              width: 26,
              height: 26,
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
              fontWeight: 900,
              lineHeight: "24px",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* small preview */}
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            overflow: "hidden",
            background: "#eee",
            flex: "0 0 auto",
          }}
        >
          {selected?.image_url ? (
            <img
              src={selected.image_url}
              alt={selected.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)", // ✅ always directly under the field
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 14,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            maxHeight: 280,
            overflow: "auto",
            zIndex: 9999, // ✅ above everything
          }}
        >
          {suggestions.length ? (
            suggestions.map((c) => (
              <button
                key={c.id}
                type="button"
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
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#f2f2f2",
                    flex: "0 0 auto",
                  }}
                >
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt={c.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : null}
                </div>
                <div style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.name}
                </div>
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
