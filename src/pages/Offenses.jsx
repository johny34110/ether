import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { teamKeyFromIds } from "../lib/keys";
import CharacterPicker from "../ui/CharacterPicker";

async function loadCharacters() {
  const { data, error } = await supabase.from("characters").select("*").order("name");
  if (error) throw error;
  return data.map((row) => ({
    ...row,
    image_url: row.image_path
      ? supabase.storage.from("characters").getPublicUrl(row.image_path).data.publicUrl
      : null,
  }));
}

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

  return data.map((d) => ({
    ...d,
    d1: {
      ...d.d1,
      image_url: d.d1?.image_path
        ? supabase.storage.from("characters").getPublicUrl(d.d1.image_path).data.publicUrl
        : null,
    },
    d2: {
      ...d.d2,
      image_url: d.d2?.image_path
        ? supabase.storage.from("characters").getPublicUrl(d.d2.image_path).data.publicUrl
        : null,
    },
    d3: {
      ...d.d3,
      image_url: d.d3?.image_path
        ? supabase.storage.from("characters").getPublicUrl(d.d3.image_path).data.publicUrl
        : null,
    },
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

  return data.map((c) => ({
    ...c,
    a1: {
      ...c.a1,
      image_url: c.a1?.image_path
        ? supabase.storage.from("characters").getPublicUrl(c.a1.image_path).data.publicUrl
        : null,
    },
    a2: {
      ...c.a2,
      image_url: c.a2?.image_path
        ? supabase.storage.from("characters").getPublicUrl(c.a2.image_path).data.publicUrl
        : null,
    },
    a3: {
      ...c.a3,
      image_url: c.a3?.image_path
        ? supabase.storage.from("characters").getPublicUrl(c.a3.image_path).data.publicUrl
        : null,
    },
  }));
}

export default function Offenses({ activeDefenseId, setActiveDefenseId }) {
  const [characters, setCharacters] = useState([]);
  const [defenses, setDefenses] = useState([]);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("wins_desc");
  const [counters, setCounters] = useState([]);
  const [busy, setBusy] = useState(false);

  // add counter editor
  const [a1, setA1] = useState(null);
  const [a2, setA2] = useState(null);
  const [a3, setA3] = useState(null);
  const [wins, setWins] = useState(0);
  const [notes, setNotes] = useState("");

  async function refreshAll() {
    const [cs, ds] = await Promise.all([loadCharacters(), loadDefenses()]);
    setCharacters(cs);
    setDefenses(ds);
  }

  async function refreshCounters() {
    setCounters(await loadCounters(activeDefenseId));
  }

  useEffect(() => {
    refreshAll().catch((e) => alert(e.message));
  }, []);

  useEffect(() => {
    refreshCounters().catch((e) => alert(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDefenseId]);

  const activeDefense = useMemo(
    () => defenses.find((d) => d.id === activeDefenseId) || null,
    [defenses, activeDefenseId]
  );

  const filteredDefenses = useMemo(() => {
    const f = filter.trim().toLowerCase();
    let rows = defenses;

    if (f) {
      rows = rows.filter(
        (d) =>
          d.d1?.name?.toLowerCase().startsWith(f) ||
          d.d2?.name?.toLowerCase().startsWith(f) ||
          d.d3?.name?.toLowerCase().startsWith(f)
      );
    }

    if (sort === "wins_desc") rows = [...rows].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
    if (sort === "wins_asc") rows = [...rows].sort((a, b) => (a.wins ?? 0) - (b.wins ?? 0));
    if (sort === "name_asc")
      rows = [...rows].sort((a, b) =>
        `${a.d1?.name}${a.d2?.name}${a.d3?.name}`.localeCompare(`${b.d1?.name}${b.d2?.name}${b.d3?.name}`)
      );

    return rows;
  }, [defenses, filter, sort]);

  async function saveCounter() {
    if (!activeDefenseId) return alert("Sélectionne une défense.");
    if (!a1 || !a2 || !a3) return alert("Choisis 3 persos.");

    setBusy(true);
    try {
      const attack_key = teamKeyFromIds([a1, a2, a3]);

      const payload = {
        defense_id: activeDefenseId,
        attack_key,
        a1_id: a1,
        a2_id: a2,
        a3_id: a3,
        wins: Number(wins || 0),
        notes,
      };

      const { error } = await supabase.from("counters").upsert(payload, {
        onConflict: "defense_id,attack_key",
      });

      if (error) return alert(error.message);

      setA1(null);
      setA2(null);
      setA3(null);
      setWins(0);
      setNotes("");

      await refreshCounters();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteCounter(counterId) {
    if (!confirm("Supprimer cette offense ?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("counters").delete().eq("id", counterId);
      if (error) return alert(error.message);
      await refreshCounters();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function incCounterWin(counterId) {
    setBusy(true);
    try {
      const { data, error } = await supabase.from("counters").select("wins").eq("id", counterId).single();
      if (error) return alert(error.message);

      const next = Number(data?.wins || 0) + 1;
      const { error: upErr } = await supabase.from("counters").update({ wins: next }).eq("id", counterId);
      if (upErr) return alert(upErr.message);

      await refreshCounters();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr 420px", gap: 14 }}>
      {/* LEFT: defenses list */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Recherche défense (début perso)…"
            style={{ flex: 1, padding: 10, borderRadius: 12 }}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: 10, borderRadius: 12 }}>
            <option value="wins_desc">Victoires ↓</option>
            <option value="wins_asc">Victoires ↑</option>
            <option value="name_asc">Nom A→Z</option>
          </select>
        </div>

        <div style={{ display: "grid", gap: 10, maxHeight: "75vh", overflow: "auto" }}>
          {filteredDefenses.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDefenseId(d.id)}
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid #ddd",
                background: activeDefenseId === d.id ? "#f0f7ff" : "white",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 800 }}>
                  {d.d1?.name} / {d.d2?.name} / {d.d3?.name}
                </div>
                <div style={{ fontWeight: 800 }}>{d.wins}</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                {d.d1_note || "—"} · {d.d2_note || "—"} · {d.d3_note || "—"}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER: active defense + counters */}
      <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 16, background: "#fafafa" }}>
        <h2 style={{ marginTop: 0 }}>Défense active</h2>

        {activeDefense ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {[activeDefense.d1, activeDefense.d2, activeDefense.d3].map((p) => (
                <div
                  key={p.id}
                  style={{ width: 56, height: 56, borderRadius: 14, overflow: "hidden", background: "#eee" }}
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : null}
                </div>
              ))}
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {activeDefense.d1?.name} / {activeDefense.d2?.name} / {activeDefense.d3?.name}
              </div>
              <div style={{ marginLeft: "auto", fontWeight: 900 }}>Victoires: {activeDefense.wins}</div>
            </div>

            <div style={{ marginTop: 10, opacity: 0.8 }}>
              {activeDefense.d1?.name}: {activeDefense.d1_note || "—"} · {activeDefense.d2?.name}:{" "}
              {activeDefense.d2_note || "—"} · {activeDefense.d3?.name}: {activeDefense.d3_note || "—"}
            </div>

            {activeDefense.notes ? <div style={{ marginTop: 10 }}>{activeDefense.notes}</div> : null}

            <div style={{ marginTop: 16 }}>
              <h3 style={{ margin: 0 }}>Offenses gagnantes</h3>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {!counters.length ? <div style={{ opacity: 0.7 }}>Aucune offense enregistrée.</div> : null}

                {counters.map((c) => (
                  <div
                    key={c.id}
                    style={{ padding: 12, border: "1px solid #e3e3e3", borderRadius: 14, background: "white" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        {[c.a1, c.a2, c.a3].map((p) => (
                          <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                overflow: "hidden",
                                background: "#f2f2f2",
                              }}
                            >
                              {p.image_url ? (
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                />
                              ) : null}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ fontWeight: 800 }}>{c.wins}</div>
                        <button
                          onClick={() => incCounterWin(c.id)}
                          disabled={busy}
                          style={{ padding: "8px 10px", borderRadius: 12 }}
                        >
                          +1
                        </button>
                        <button
                          onClick={() => deleteCounter(c.id)}
                          disabled={busy}
                          style={{ padding: "8px 10px", borderRadius: 12 }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {c.notes ? <div style={{ marginTop: 8, opacity: 0.8 }}>{c.notes}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ opacity: 0.75 }}>Sélectionne une défense à gauche.</div>
        )}
      </div>

      {/* RIGHT: add counter */}
      <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 16, background: "#fff" }}>
        <h2 style={{ marginTop: 0 }}>Ajouter une offense</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <CharacterPicker label="Perso 1" valueId={a1} onChangeId={setA1} characters={characters} />
          <CharacterPicker label="Perso 2" valueId={a2} onChangeId={setA2} characters={characters} />
          <CharacterPicker label="Perso 3" valueId={a3} onChangeId={setA3} characters={characters} />

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>Victoires</div>
            <input
              type="number"
              value={wins}
              onChange={(e) => setWins(e.target.value)}
              style={{ width: 140, padding: 8, borderRadius: 10 }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Note offense</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{ width: "100%", padding: 10, borderRadius: 12 }}
            />
          </div>

          <button
            onClick={saveCounter}
            disabled={busy}
            style={{ padding: "12px 14px", borderRadius: 12, fontWeight: 900 }}
          >
            {busy ? "..." : "Enregistrer offense"}
          </button>

          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Astuce: sélectionne une défense à gauche puis ajoute des offenses gagnantes ici.
          </div>
        </div>
      </div>
    </div>
  );
}
