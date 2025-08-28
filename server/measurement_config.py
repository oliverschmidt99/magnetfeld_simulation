import json
import os
import pandas as pd

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
        json.dump(config_data, f, indent=2)


def create_config_from_csv():
    """Erstellt eine initiale Konfigurations-JSON aus den CSV-Dateien."""
    try:
        start_df = pd.read_csv(os.path.join(DATA_DIR, "1_startpositionen.csv"))
        spielraum_df = pd.read_csv(os.path.join(DATA_DIR, "2_spielraum.csv"))
        bewegungen_df = pd.read_csv(os.path.join(DATA_DIR, "3_bewegungen.csv"))
        schrittweite_df = pd.read_csv(os.path.join(DATA_DIR, "4_schrittweiten.csv"))
        wandler_df = pd.read_csv(os.path.join(DATA_DIR, "5_wandler_abmessungen.csv"))
    except FileNotFoundError:
        return {
            "error": "CSV-Dateien nicht gefunden. Konnte keine Konfiguration erstellen."
        }

    config = {
        "startpositionen": start_df.to_dict(orient="records"),
        "spielraum": [],
        "positionsgruppen": [],
    }

    # Spielraum für jede Stromstärke erstellen
    ströme = start_df["Strom"].unique()
    for strom in ströme:
        spielraum_eintrag = spielraum_df.iloc[0].to_dict()
        spielraum_eintrag["Strom"] = strom
        config["spielraum"].append(spielraum_eintrag)

    # Positionsgruppen aus Bewegungen-CSV ableiten
    gruppen_namen = (
        bewegungen_df["PosGruppe"].str.extract(r"(Pos\d+)_").iloc[:, 0].unique()
    )

    for name in gruppen_namen:
        if pd.isna(name):
            continue

        gruppen_bewegungen = bewegungen_df[
            bewegungen_df["PosGruppe"].str.startswith(name)
        ]

        # Annahme: Schrittweiten und Wandler sind für alle Gruppen gleich in den CSVs
        # und werden hier als Vorlage für die erste Gruppe verwendet.
        # Du kannst dies später in der UI für jede Gruppe individuell anpassen.
        config["positionsgruppen"].append(
            {
                "name": name,
                "bewegungen": gruppen_bewegungen.to_dict(orient="records"),
                "schrittweiten": schrittweite_df.to_dict(orient="records"),
                "wandler": wandler_df.iloc[0][
                    "Strom"
                ],  # Platzhalter, nimm ersten Strom als Wandlername
            }
        )

    save_config(config)
    return config
