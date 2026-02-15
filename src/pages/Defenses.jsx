import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { teamKeyFromIds } from "../lib/keys";
import UploadCharacters from "../ui/UploadCharacters";
import CharacterPicker from "../ui/CharacterPicker";
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
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("wins_desc");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  // editor state
  const [d1, setD1] = useState(null);
  const [d2, setD2] = useState(null);
  const [d3, setD3] = useState(null);
  const [d1n, setD1n] = useState("");
  const [d2n, setD2n] = useState("");
  const [d3n, setD3n] = useState("");
  const [wins, setWins] = useState(0);
  const [notes, setNotes] = useState("");

  async function refreshAll() {
    const [cs, ds] = await Promise.all([loadCharacters(), loadDefenses()]);
    setCharacters(cs);
    setDefenses(ds);

    // keep selection fresh
    if (selected?.id) {
      const fresh = ds.find((x) => x.id === selected.id) || null;
      setSelected(fresh);
      if (fresh) loadIntoEditor(fresh);
    }
  }

  useEffect(() => {
    refreshAll().catch((e) => alert(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
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
    if (sort === "name_desc")
      rows = [...rows].sort((a, b) =>
        `${b.d1?.name}${b.d2?.name}${b.d3?.name}`.localeCompare(`${a.d1?.name}${a.d2?.name}${a.d3?.name}`)
      );

    return rows;
  }, [defenses, filter, sort]);

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

  async function saveDefense() {
    if (!d1 || !d2 || !d3) return alert("Choisis 3 persos.");

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

      await refreshAll();

      // reselect
      const ds = await loadDefenses();
      const re = ds.find((x) => x.defense_key === defense_key) || null;
      setDefenses(ds);
      if (re) loadIntoEditor(re);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelectedDefense() {
    if (!selected) return;
    const label = `${selected.d1?.name} / ${selected.d2?.name} / ${selected.d3?.name}`;
    if (!confirm(`Supprimer cette défense ?\n\n${label}\n\n(Les offenses liées seront supprimées aussi)`)) return;

    setBusy(true);
    try {
      const { error } = await supabase.from("defenses").delete().eq("id", selected.id);
      if (error) return alert(error.message);

      if (activeDefenseId === selected.id) setActiveDefenseId(null);
      clearEditor();
      await refreshAll();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  // +1 win defense (atomic)
  async function incSelectedDefenseWin() {
    if (!selected) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("defenses")
        .select("wins")
        .eq("id", selected.id)
        .single();

      if (error) return alert(error.message);

      const next = Number(data?.wins || 0) + 1;
      const { error: upErr } = await supabase
        .from("defenses")
        .update({ wins: next })
        .eq("id", selected.id);

      if (upErr) return alert(upErr.message);

      setWins(next);
      await refreshAll();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 14 }}>
      {/* LEFT */}
      <div style={{ display: "grid", gap: 12 }}>
        <UploadCharacters onDone={refreshAll} />

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
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

        <div style={{ display: "grid", gap: 10, maxHeight: "70vh", overflow: "auto" }}>
          {filtered.map((d) => (
            <div key={d.id} style={{ display: "grid", gap: 8 }}>
              <DefenseCard defense={d} onSelect={loadIntoEditor} />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    loadIntoEditor(d);
                    setActiveDefenseId(d.id);
                  }}
                  style={{ padding: "8px 10px", borderRadius: 12 }}
                >
                  ✅ Active
                </button>
                <button
                  onClick={() => {
                    loadIntoEditor(d);
                    setTimeout(() => deleteSelectedDefense(), 0);
                  }}
                  style={{ padding: "8px 10px", borderRadius: 12 }}
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 16, background: "#fafafa" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Défense</h2>
          <div style={{ display: "flex", gap: 10 }}>
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

            <button
              disabled={!selected || busy}
              onClick={deleteSelectedDefense}
              style={{ padding: "10px 12px", borderRadius: 12 }}
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
          <div>
            <CharacterPicker label="Perso 1" valueId={d1} onChangeId={setD1} characters={characters} />
            <input
              value={d1n}
              onChange={(e) => setD1n(e.target.value)}
              placeholder="Note perso 1"
              style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 10 }}
            />
          </div>
          <div>
            <CharacterPicker label="Perso 2" valueId={d2} onChangeId={setD2} characters={characters} />
            <input
              value={d2n}
              onChange={(e) => setD2n(e.target.value)}
              placeholder="Note perso 2"
              style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 10 }}
            />
          </div>
          <div>
            <CharacterPicker label="Perso 3" valueId={d3} onChangeId={setD3} characters={characters} />
            <input
              value={d3n}
              onChange={(e) => setD3n(e.target.value)}
              placeholder="Note perso 3"
              style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 10 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700 }}>Victoires défense</div>
          <input
            type="number"
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            style={{ width: 140, padding: 8, borderRadius: 10 }}
          />
          <button
            disabled={!selected || busy}
            onClick={incSelectedDefenseWin}
            style={{ padding: "8px 10px", borderRadius: 12 }}
          >
            +1 victoire
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Note défense</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: 10, borderRadius: 12 }}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button
            onClick={saveDefense}
            disabled={busy}
            style={{ padding: "12px 14px", borderRadius: 12, fontWeight: 800 }}
          >
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
        ) : (
          <div style={{ marginTop: 12, opacity: 0.75 }}>Sélectionne une défense à gauche, ou crée-en une nouvelle.</div>
        )}
      </div>
    </div>
  );
}
