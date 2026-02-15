import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import OffenseList from "../ui/OffenseList";

async function loadDefenses() {
  const { data, error } = await supabase
    .from("defenses")
    .select(`
      id, wins, notes, d1_note, d2_note, d3_note,
      d1:characters!defenses_d1_id_fkey(id,name,image_path),
      d2:characters!defenses_d2_id_fkey(id,name,image_path),
      d3:characters!defenses_d3_id_fkey(id,name,image_path)
    `);
  if (error) throw error;

  return data.map(d => ({
    ...d,
    d1: { ...d.d1, image_url: d.d1.image_path ? supabase.storage.from("characters").getPublicUrl(d.d1.image_path).data.publicUrl : null },
    d2: { ...d.d2, image_url: d.d2.image_path ? supabase.storage.from("characters").getPublicUrl(d.d2.image_path).data.publicUrl : null },
    d3: { ...d.d3, image_url: d.d3.image_path ? supabase.storage.from("characters").getPublicUrl(d.d3.image_path).data.publicUrl : null },
  }));
}

async function loadCounters(defenseId) {
  if (!defenseId) return [];
  const { data, error } = await supabase
    .from("counters")
    .select(`
      id, wins, notes,
      a1:characters!counters_a1_id_fkey(id,name,image_path),
      a2:characters!counters_a2_id_fkey(id,name,image_path),
      a3:characters!counters_a3_id_fkey(id,name,image_path)
    `)
    .eq("defense_id", defenseId)
    .order("wins", { ascending: false });

  if (error) throw error;
  return data.map(c => ({
    ...c,
    a1: { ...c.a1, image_url: c.a1.image_path ? supabase.storage.from("characters").getPublicUrl(c.a1.image_path).data.publicUrl : null },
    a2: { ...c.a2, image_url: c.a2.image_path ? supabase.storage.from("characters").getPublicUrl(c.a2.image_path).data.publicUrl : null },
    a3: { ...c.a3, image_url: c.a3.image_path ? supabase.storage.from("characters").getPublicUrl(c.a3.image_path).data.publicUrl : null },
  }));
}

export default function Search({ setActiveDefenseId }) {
  const [defenses, setDefenses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [counters, setCounters] = useState([]);

  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [sort, setSort] = useState("wins_desc");

  useEffect(() => {
    (async () => setDefenses(await loadDefenses()))();
  }, []);

  useEffect(() => {
    (async () => setCounters(await loadCounters(selected?.id)))();
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const qs = [q1, q2, q3].map(s => s.trim().toLowerCase()).filter(Boolean);
    let rows = defenses;

    if (qs.length) {
      rows = rows.filter(d => {
        const names = [d.d1.name, d.d2.name, d.d3.name].map(x => x.toLowerCase());
        return qs.every(q => names.some(n => n.startsWith(q)));
      });
    }

    if (sort === "wins_desc") rows = [...rows].sort((a,b) => b.wins - a.wins);
    if (sort === "wins_asc") rows = [...rows].sort((a,b) => a.wins - b.wins);
    if (sort === "name_asc") rows = [...rows].sort((a,b) => (a.d1.name+a.d2.name+a.d3.name).localeCompare(b.d1.name+b.d2.name+b.d3.name));
    if (sort === "name_desc") rows = [...rows].sort((a,b) => (b.d1.name+b.d2.name+b.d3.name).localeCompare(a.d1.name+a.d2.name+a.d3.name));

    return rows;
  }, [defenses, q1, q2, q3, sort]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 14 }}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 16, background: "#fff" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Filtres (préfixes)</div>
          <div style={{ display: "grid", gap: 10 }}>
            <input value={q1} onChange={(e)=>setQ1(e.target.value)} placeholder="Perso 1 (début)…" style={{ padding: 10, borderRadius: 12 }} />
            <input value={q2} onChange={(e)=>setQ2(e.target.value)} placeholder="Perso 2 (début)…" style={{ padding: 10, borderRadius: 12 }} />
            <input value={q3} onChange={(e)=>setQ3(e.target.value)} placeholder="Perso 3 (début)…" style={{ padding: 10, borderRadius: 12 }} />
            <select value={sort} onChange={(e)=>setSort(e.target.value)} style={{ padding: 10, borderRadius: 12 }}>
              <option value="wins_desc">Victoires ↓</option>
              <option value="wins_asc">Victoires ↑</option>
              <option value="name_asc">Nom A→Z</option>
              <option value="name_desc">Nom Z→A</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, maxHeight: "74vh", overflow: "auto" }}>
          {filtered.map(d => (
            <button key={d.id}
              onClick={() => setSelected(d)}
              style={{
                padding: 12, borderRadius: 14, border: "1px solid #ddd", background: selected?.id === d.id ? "#f0f7ff" : "white",
                cursor: "pointer", textAlign: "left"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>{d.d1.name} / {d.d2.name} / {d.d3.name}</div>
                <div style={{ fontWeight: 800 }}>{d.wins}</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                {d.d1_note || "—"} · {d.d2_note || "—"} · {d.d3_note || "—"}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 16, background: "#fafafa" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Détails</h2>
          <button
            disabled={!selected}
            onClick={() => selected && setActiveDefenseId(selected.id)}
            style={{ padding: "10px 12px", borderRadius: 12 }}
          >
            Définir active
          </button>
        </div>

        {selected ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
              {[selected.d1, selected.d2, selected.d3].map(p => (
                <div key={p.id} style={{ width: 56, height: 56, borderRadius: 14, overflow: "hidden", background: "#eee" }}>
                  {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                </div>
              ))}
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {selected.d1.name} / {selected.d2.name} / {selected.d3.name}
              </div>
              <div style={{ marginLeft: "auto", fontWeight: 900 }}>Victoires: {selected.wins}</div>
            </div>

            <div style={{ marginTop: 10, opacity: 0.8 }}>
              {selected.d1.name}: {selected.d1_note || "—"} · {selected.d2.name}: {selected.d2_note || "—"} · {selected.d3.name}: {selected.d3_note || "—"}
            </div>

            {selected.notes ? <div style={{ marginTop: 10 }}>{selected.notes}</div> : null}

            <div style={{ marginTop: 16 }}>
              <h3 style={{ margin: 0 }}>Offenses gagnantes</h3>
              <div style={{ marginTop: 10 }}>
                <OffenseList counters={counters} />
              </div>
            </div>
          </>
        ) : (
          <div style={{ opacity: 0.75, marginTop: 12 }}>Sélectionne une défense dans la liste.</div>
        )}
      </div>
    </div>
  );
}
