export default function OffenseList({ counters }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {counters.map(c => (
        <div key={c.id} style={{ padding: 12, border: "1px solid #e3e3e3", borderRadius: 14, background: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {[c.a1, c.a2, c.a3].map((p) => (
                <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, overflow: "hidden", background: "#f2f2f2" }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : null}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                </div>
              ))}
            </div>
            <div style={{ fontWeight: 800 }}>{c.wins}</div>
          </div>
          {c.notes ? <div style={{ marginTop: 8, opacity: 0.8 }}>{c.notes}</div> : null}
        </div>
      ))}
      {!counters.length ? <div style={{ opacity: 0.7 }}>Aucune offense enregistrée.</div> : null}
    </div>
  );
}
