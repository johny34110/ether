import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { teamKeyFromIds } from "../lib/keys";
import CharacterAutocomplete from "../ui/CharacterAutocomplete";

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

function Img({ src, alt, size = 34 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        overflow: "hidden",
        background: "#f2f2f2",
        flex: "0 0 auto",
      }}
    >
      {src ? <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
    </div>
  );
}

export default function Offenses({ activeDefenseId, setActiveDefenseId }) {
  const [characters, setCharacters] = useState([]);
  const [defenses, setDefenses] = useState([]);
  const [counters, setCounters] = useState([]);

  // left filters
  const [filterText, setFilterText] = useState("");
  const [sort, setSort] = useState("wins_desc");
  const [df1, setDf1] = useState(null);
  const [df2, setDf2] = useState(null);
  const [df3, setDf3] = useState(null);

  // add offense editor (right)
  const [a1, setA1] = useState(null);
  const [a2, setA2] = useState(null);
  const [a3, setA3] = useState(null);
  const [owins, setOwins] = useState(0);
  const [onotes, setOnotes] = useState("");

  const [busy, setBusy] = useState(false);

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

  function resetDefenseSearch() {
    setFilterText("");
    setDf1(null);
    setDf2(null);
    setDf3(null);
  }

  const filteredDefenses = useMemo(() => {
    let rows = defenses;

    // optional text filter
    const t = filterText.trim().toLowerCase();
    if (t) {
      rows = rows.filter((d) => {
        const n1 = (d.d1?.name || "").toLowerCase();
        const n2 = (d.d2?.name || "").toLowerCase();
        const n3 = (d.d3?.name || "").toLowerCase();
        return n1.startsWith(t) || n2.startsWith(t) || n3.startsWith(t);
      });
    }

    // orderless 2–3 character filter
    const wanted = [df1, df2, df3].filter(Boolean);
    if (wanted.length) {
      rows = rows.filter((d) => {
        const set = new Set([d.d1?.id, d.d2?.id, d.d3?.id].filter(Boolean));
        return wanted.every((id) => set.has(id));
      });
    }

    // sort
    if (sort === "wins_desc") rows = [...rows].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
    if (sort === "wins_asc") rows = [...rows].sort((a, b) => (a.wins ?? 0) - (b.wins ?? 0));
    if (sort === "name_asc")
      rows = [...rows].sort((a, b) =>
        `${a.d1?.name}${a.d2?.name}${a.d3?.name}`.localeCompare(`${b.d1?.name}${b.d2?.name}${b.d3?.name}`)
      );

    return rows;
  }, [defenses, filterText, sort, df1, df2, df3]);

  async function saveCounter() {
    if (!activeDefenseId) return alert("Sélectionne une défense.");
    if (!a1 || !a2 || !a3) return alert("Choisis 3 persos.");
    if (a1 === a2 || a1 === a3 || a2 === a3) return alert("3 persos différents 🙂");

    setBusy(true);
    try {
      const attack_key = teamKeyFromIds([a1, a2, a3]);

      const payload = {
        defense_id: activeDefenseId,
        attack_key,
        a1_id: a1,
        a2_id: a2,
        a3_id: a3,
        wins: Number(owins || 0),
        notes: onotes,
      };

      const { error } = await supabase.from("counters").upsert(payload, {
        onConflict: "defense_id,attack_key",
      });
      if (error) return alert(error.message);

      // reset form
      setA1(null);
      setA2(null);
      setA3(null);
      setOwins(0);
      setOnotes("");

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
      const row = counters.find((x) => x.id === counterId);
      const next = Number(row?.wins || 0) + 1;

      const { error } = await supabase.from("counters").update({ wins: next }).eq("id", counterId);
      if (error) return alert(error.message);

      await refreshCounters();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr 420px", gap: 14 }}>
      {/* LEFT: defense search + list */}
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 16, background: "white" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Recherche défense (2–3 persos)</div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
            <CharacterAutocomplete label="Perso A" valueId={df1} onChangeId={setDf1} characters={characters} />
            <CharacterAutocomplete label="Perso B" valueId={df2} onChangeId={setDf2} characters={characters} />
            <CharacterAutocomplete label="Perso C" valueId={df3} onChangeId={setDf3} characters={characters} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={resetDefenseSearch} style={{ padding: "8px 10px", borderRadius: 12 }}>
              Réinitialiser
            </button>

            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: 10, borderRadius: 12 }}>
              <option value="wins_desc">Victoires ↓</option>
              <option value="wins_asc">Victoires ↑</option>
              <option value="name_asc">Nom A→Z</option>
            </select>
          </div>

          <div style={{ marginTop: 10 }}>
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="(Option) filtre texte…"
              style={{ width: "100%", padding: 10, borderRadius: 12 }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, maxHeight: "72vh", overflow: "auto" }}>
          {filteredDefenses.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDefenseId(d.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: 12,
                borderRadius: 14,
                border: "1px solid #ddd",
                background: activeDefenseId === d.id ? "#f0f7ff" : "white",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <Img src={d.d1?.image_url} alt={d.d1?.name} />
                  <Img src={d.d2?.image_url} alt={d.d2?.name} />
                  <Img src={d.d3?.image_url} alt={d.d3?.name} />
                  <div style={{ fontWeight: 800 }}>
                    {d.d1?.name} / {d.d2?.name} / {d.d3?.name}
                  </div>
                </div>
                <div style={{ fontWeight: 800 }}>{d.wins ?? 0}</div>
              </div>

              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                {d.d1_note || "—"} · {d.d2_note || "—"} · {d.d3_note || "—"}
              </div>
            </button>
          ))}

          {!filteredDefenses.length ? (
            <div style={{ padding: 14, borderRadius: 14, background: "#fff", border: "1px dashed #ddd", opacity: 0.8 }}>
              Aucun résultat.
            </div>
          ) : null}
        </div>
      </div>

      {/* CENTER: active defense + counters */}
      <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 16, background: "#fafafa" }}>
        <h2 style={{ marginTop: 0 }}>Défense active</h2>

        {activeDefense ? (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Img src={activeDefense.d1?.image_url} alt={activeDefense.d1?.name} size={56} />
              <Img src={activeDefense.d2?.image_url} alt={activeDefense.d2?.name} size={56} />
              <Img src={activeDefense.d3?.image_url} alt={activeDefense.d3?.name} size={56} />

              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {activeDefense.d1?.name} / {activeDefense.d2?.name} / {activeDefense.d3?.name}
              </div>

              <div style={{ marginLeft: "auto", fontWeight: 900 }}>Victoires: {activeDefense.wins ?? 0}</div>
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
                    style={{
                      padding: 12,
                      border: "1px solid #e3e3e3",
                      borderRadius: 14,
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <Img src={c.a1?.image_url} alt={c.a1?.name} />
                        <div style={{ fontWeight: 800 }}>{c.a1?.name}</div>

                        <Img src={c.a2?.image_url} alt={c.a2?.name} />
                        <div style={{ fontWeight: 800 }}>{c.a2?.name}</div>

                        <Img src={c.a3?.image_url} alt={c.a3?.name} />
                        <div style={{ fontWeight: 800 }}>{c.a3?.name}</div>
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ fontWeight: 900 }}>{c.wins ?? 0}</div>
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

      {/* RIGHT: add offense */}
      <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 16, background: "white" }}>
        <h2 style={{ marginTop: 0 }}>Ajouter une offense</h2>

        <div style={{ display: "grid", gap: 12 }}>
          <CharacterAutocomplete label="Perso 1" valueId={a1} onChangeId={setA1} characters={characters} />
          <CharacterAutocomplete label="Perso 2" valueId={a2} onChangeId={setA2} characters={characters} />
          <CharacterAutocomplete label="Perso 3" valueId={a3} onChangeId={setA3} characters={characters} />

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>Victoires</div>
            <input
              type="number"
              value={owins}
              onChange={(e) => setOwins(e.target.value)}
              style={{ width: 140, padding: 8, borderRadius: 10 }}
            />
          </div>

          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Note offense</div>
            <textarea
              value={onotes}
              onChange={(e) => setOnotes(e.target.value)}
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
            Astuce: choisis la défense à gauche puis ajoute les teams qui passent.
          </div>
        </div>
      </div>
    </div>
  );
}
