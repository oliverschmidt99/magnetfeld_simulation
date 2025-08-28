import json
import os
import pandas as pd
from .utils import load_data, LIBRARY_FILE

CONFIG_FILE = "measurement_config.json"
DATA_DIR = "data"


def get_config():
    """Lädt die Konfiguration aus der JSON-Datei oder erstellt eine neue aus den CSVs."""
    if not os.path.exists(CONFIG_FILE):
        return create_config_from_csv()
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_config(config_data):
    """Speichert die Konfiguration in der JSON-Datei."""
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)


def create_config_from_csv():
    """Erstellt eine initiale Konfigurations-JSON aus den alten CSV-Dateien."""
    try:
        start_df = pd.read_csv(
            os.path.join(DATA_DIR, "1_startpositionen.csv"), encoding="utf-8"
        )
        spielraum_df = pd.read_csv(
            os.path.join(DATA_DIR, "2_spielraum.csv"), encoding="utf-8"
        )
        bewegungen_df = pd.read_csv(
            os.path.join(DATA_DIR, "3_bewegungen.csv"), encoding="utf-8"
        )
        schrittweite_df = pd.read_csv(
            os.path.join(DATA_DIR, "4_schrittweiten.csv"), encoding="utf-8"
        )
    except Exception:
        # Fallback für Windows-Kodierung
        start_df = pd.read_csv(
            os.path.join(DATA_DIR, "1_startpositionen.csv"), encoding="cp1252"
        )
        spielraum_df = pd.read_csv(
            os.path.join(DATA_DIR, "2_spielraum.csv"), encoding="cp1252"
        )
        bewegungen_df = pd.read_csv(
            os.path.join(DATA_DIR, "3_bewegungen.csv"), encoding="cp1252"
        )
        schrittweite_df = pd.read_csv(
            os.path.join(DATA_DIR, "4_schrittweiten.csv"), encoding="cp1252"
        )

    library = load_data(LIBRARY_FILE, {})
    first_transformer = (library.get("components", {}).get("transformers") or [{}])[0]
    first_transformer_id = (
        first_transformer.get("templateProductInformation") or {}
    ).get("uniqueNumber") or (
        first_transformer.get("templateProductInformation") or {}
    ).get(
        "name"
    )

    config = {
        "startpositionen": start_df.to_dict(orient="records"),
        "spielraum": [],
        "positionsgruppen": [],
    }

    ströme = start_df["Strom"].unique()
    for strom in ströme:
        spielraum_eintrag = spielraum_df.iloc[0].to_dict()
        spielraum_eintrag["Strom"] = int(strom)
        config["spielraum"].append(spielraum_eintrag)

    schrittweite_records = schrittweite_df.to_dict(orient="records")
    for record in schrittweite_records:
        record["enabled"] = True

    bewegungen_records = bewegungen_df.to_dict(orient="records")
    neue_bewegungen = []
    for record in bewegungen_records:
        new_record = {"PosGruppe": record.get("PosGruppe")}
        for leiter in ["L1", "L2", "L3"]:
            richtung = record.get(leiter)
            if pd.notna(richtung):
                new_record[leiter] = {"richtung": richtung, "faktor": 1.0}
        neue_bewegungen.append(new_record)

    gruppen_namen = (
        bewegungen_df["PosGruppe"].str.extract(r"(Pos\d)\d").iloc[:, 0].unique()
    )
    for name in gruppen_namen:
        if pd.isna(name):
            continue

        gruppen_bewegungen = [
            b for b in neue_bewegungen if b.get("PosGruppe", "").startswith(name)
        ]

        config["positionsgruppen"].append(
            {
                "name": name,
                "bewegungen": gruppen_bewegungen,
                "schrittweiten": schrittweite_records,
                "wandler": first_transformer_id,
            }
        )

    save_config(config)
    return config
