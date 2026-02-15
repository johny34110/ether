export default function DefenseCard({ defense, onSelect }) {
  return (
    <button
      onClick={() => onSelect(defense)}
      style={{
        width: "100%", textAlign: "left", padding: 12, borderRadius: 14,
        border: "1px solid #ddd", background: "white", cursor: "pointer"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>
          {defense.d1.name} / {defense.d2.name} / {defense.d3.name}
        </div>
        <div style={{ fontWeight: 800 }}>{defense.wins}</div>
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
        {defense.d1_note || "—"} · {defense.d2_note || "—"} · {defense.d3_note || "—"}
      </div>
    </button>
  );
}
