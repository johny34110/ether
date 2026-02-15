import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { teamKeyFromIds } from "../lib/keys";
import UploadCharacters from "../ui/UploadCharacters";
import CharacterAutocomplete from "../ui/CharacterAutocomplete";
import DefenseCard from "../ui/DefenseCard";

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
      id, defense_key, wins, notes, d1_note, d2_note, d3_note,
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

export default function Defenses({ activeDefenseId, setActiveDefenseId }) {
  const [characters, setCharacters] = useState([]);
  const [defenses, setDefenses] = useState([]);

  // filters
  const [filterText, setFilterText] = useState("");
  const [sort, setSort] = useState("wins_desc");

  // NEW: 2–3 character filter (orderless)
  const [f1, setF1] = useState(null);
  const [f2, setF2] = useState(null);
  const [f3, setF3] = useState(null);

  // selected defense in editor
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  // editor fields
  const [d1, setD1] = useState(null);
  const [d2, setD2] = useState(null);
  const [d3, setD3] = useState(null);
  const [d1n, setD1n] = useState("");
  const [d2n, setD2n] = useState("");
  const [d3n, setD3n] = useState("");
  const [wins, setWins] = useState(0);
  const [notes, setNotes] = useState("");

  async function refreshAll({ keepSelection = true } = {}) {
    const [cs, ds] = await Promise.all([loadCharacters(), loadDefenses()]);
    setCharacters(cs);
    setDefenses(ds);

    if (keepSelection && selected?.id) {
      const fresh = ds.find((x) => x.id === selected.id) || null;
      setSelected(fresh);
      if (fresh) loadIntoEditor(fresh);
    }
  }

  useEffect(() => {
    refreshAll().catch((e) => alert(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ filtered: text + multi-person (no order) + sort
  const filtered = useMemo(() => {
    let rows = defenses;

    const t = filterText.trim().toLowerCase();
    if (t) {
      rows = rows.filter((d) => {
        const n1 = (d.d1?.name || "").toLowerCase();
        const n2 = (d.d2?.name || "").toLowerCase();
        const n3 = (d.d3?.name || "").toLowerCase();
        return n1.startsWith(t) || n2.startsWith(t) || n3.startsWith(t);
      });
    }

    const wanted = [f1, f2, f3].filter(Boolean);
    if (wanted.length) {
      rows = rows.filter((d) => {
        const set = new Set([d.d1?.id, d.d2?.id, d.d3?.id].filter(Boolean));
        return wanted.every((id) => set.has(id));
      });
    }

    if (sort === "wins_desc") rows = [...rows].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
    if (sort === "wins_asc") rows = [...rows].sort((a, b) => (a.wins ?? 0) - (b.wins ?? 0));
    if (sort === "name_asc")
      rows = [...rows].sort((a, b) =>
        `${a.d1?.name}${a.d2?.name}${a.d3?.name}`.localeCompare(`${b.d1?.name}${b.d2?.name}${b.d3?.name}`)
      );
    if (sort === "name_desc")
      rows = [...rows].sort((a, b) =>
        `${b.d1?.name}${b.d2?.name}${b.d3?.name}`.localeCompare(`${a.d1?.name}${a.d2?.name}${a.d3?.name}`)
      );

    return rows;
  }, [defenses, filterText, sort, f1, f2, f3]);

  function loadIntoEditor(def) {
    setSelected(def);
    setD1(def.d1?.id ?? null);
    setD2(def.d2?.id ?? null);
    setD3(def.d3?.id ?? null);
    setD1n(def.d1_note || "");
    setD2n(def.d2_note || "");
    setD3n(def.d3_note || "");
    setWins(def.wins || 0);
    setNotes(def.notes || "");
  }

  function clearEditor() {
    setSelected(null);
    setD1(null);
    setD2(null);
    setD3(null);
    setD1n("");
    setD2n("");
    setD3n("");
    setWins(0);
    setNotes("");
  }

  function resetSearch() {
    setFilterText("");
    setF1(null);
    setF2(null);
    setF3(null);
  }

  async function saveDefense() {
    if (!d1 || !d2 || !d3) return alert("Choisis 3 persos.");
    if (d1 === d2 || d1 === d3 || d2 === d3) return alert("3 persos différents 🙂");

    setBusy(true);
    try {
      const defense_key = teamKeyFromIds([d1, d2, d3]);

      const payload = {
        defense_key,
        d1_id: d1,
        d2_id: d2,
        d3_id: d3,
        d1_note: d1n,
        d2_note: d2n,
        d3_note: d3n,
        wins: Number(wins || 0),
        notes,
      };

      const { error } = await supabase.from("defenses").upsert(payload, { onConflict: "defense_key" });
      if (error) return alert(error.message);

      const ds = await loadDefenses();
      setDefenses(ds);

      const re = ds.find((x) => x.defense_key === defense_key) || null;
      if (re) loadIntoEditor(re);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteDefense(def) {
    const label = `${def.d1?.name} / ${def.d2?.name} / ${def.d3?.name}`;
    if (!confirm(`Supprimer cette défense ?\n\n${label}\n\n(Les offenses liées seront supprimées aussi)`)) return;

    setBusy(true);
    try {
      const { error } = await supabase.from("defenses").delete().eq("id", def.id);
      if (error) return alert(error.message);

      if (activeDefenseId === def.id) setActiveDefenseId(null);
      if (selected?.id === def.id) clearEditor();

      await refreshAll({ keepSelection: false });
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function incDefenseWin(def) {
    setBusy(true);
    try {
      const next = Number(def.wins || 0) + 1;
      const { error } = await supabase.from("defenses").update({ wins: next }).eq("id", def.id);
      if (error) return alert(error.message);

      // update editor if it’s the same defense
      if (selected?.id === def.id) setWins(next);
      await refreshAll();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "460px 1fr", gap: 14 }}>
      {/* LEFT */}
      <div style={{ display: "grid", gap: 12 }}>
        <UploadCharacters onDone={() => refreshAll().catch((e) => alert(e.message))} />

        {/* Multi-person search */}
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 16, background: "white" }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Recherche défense (2–3 persos)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <CharacterAutocomplete label="Perso A" valueId={f1} onChangeId={setF1} characters={characters} />
            <CharacterAutocomplete label="Perso B" valueId={f2} onChangeId={setF2} characters={characters} />
            <CharacterAutocomplete label="Perso C" valueId={f3} onChangeId={setF3} characters={characters} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={resetSearch} style={{ padding: "8px 10px", borderRadius: 12 }}>
              Réinitialiser
            </button>
            <div style={{ opacity: 0.7, fontSize: 12, alignSelf: "center" }}>
              Sélectionne 2 persos → toutes les défenses qui les contiennent.
            </div>
          </div>
        </div>

        {/* Text filter + sort */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtrer (début d’un perso)…"
            style={{ flex: 1, padding: 10, borderRadius: 12 }}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: 10, borderRadius: 12 }}>
            <option value="wins_desc">Victoires ↓</option>
            <option value="wins_asc">Victoires ↑</option>
            <option value="name_asc">Nom A→Z</option>
            <option value="name_desc">Nom Z→A</option>
          </select>
        </div>

        {/* List: UI handled inside DefenseCard */}
        <div style={{ display: "grid", gap: 10, maxHeight: "64vh", overflow: "auto" }}>
          {filtered.map((d) => (
            <DefenseCard
              key={d.id}
              defense={d}
              isActive={activeDefenseId === d.id}
              onSelect={loadIntoEditor}
              onSetActive={(def) => {
                loadIntoEditor(def);
                setActiveDefenseId(def.id);
              }}
              onIncWin={(def) => incDefenseWin(def)}
              onDelete={(def) => deleteDefense(def)}
            />
          ))}

          {!filtered.length ? (
            <div style={{ padding: 14, borderRadius: 14, background: "#fff", border: "1px dashed #ddd", opacity: 0.8 }}>
              Aucun résultat.
            </div>
          ) : null}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 16, background: "#fafafa" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Défense</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={clearEditor} style={{ padding: "10px 12px", borderRadius: 12 }} disabled={busy}>
              Nouvelle
            </button>
            <button
              disabled={!selected || busy}
              onClick={() => selected && setActiveDefenseId(selected.id)}
              style={{ padding: "10px 12px", borderRadius: 12 }}
            >
              Définir active
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <CharacterAutocomplete label="Perso 1" valueId={d1} onChangeId={setD1} characters={characters} />
            <input value={d1n} onChange={(e) => setD1n(e.target.value)} placeholder="Note perso 1" style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 10 }} />
          </div>
          <div>
            <CharacterAutocomplete label="Perso 2" valueId={d2} onChangeId={setD2} characters={characters} />
            <input value={d2n} onChange={(e) => setD2n(e.target.value)} placeholder="Note perso 2" style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 10 }} />
          </div>
          <div>
            <CharacterAutocomplete label="Perso 3" valueId={d3} onChangeId={setD3} characters={characters} />
            <input value={d3n} onChange={(e) => setD3n(e.target.value)} placeholder="Note perso 3" style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 10 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>Victoires défense</div>
          <input type="number" value={wins} onChange={(e) => setWins(e.target.value)} style={{ width: 140, padding: 8, borderRadius: 10 }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Note défense</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={{ width: "100%", padding: 10, borderRadius: 12 }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <button onClick={saveDefense} disabled={busy} style={{ padding: "12px 14px", borderRadius: 12, fontWeight: 800 }}>
            {busy ? "..." : "Sauvegarder"}
          </button>
        </div>

        {selected ? (
          <div style={{ marginTop: 12, opacity: 0.85 }}>
            Défense sélectionnée:{" "}
            <b>
              {selected.d1?.name} / {selected.d2?.name} / {selected.d3?.name}
            </b>
            {activeDefenseId === selected.id ? <span> · (active)</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
