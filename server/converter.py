import csv
import json
from typing import Dict


def load_csv_to_dict(filepath: str, key_column: str) -> Dict[str, Dict]:
    """
    Lädt eine CSV-Datei und wandelt sie in ein Dictionary um,
    wobei eine Spalte als Schlüssel dient.
    """
    data_dict = {}
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            # Kommas als Trennzeichen, Anführungszeichen werden korrekt behandelt
            reader = csv.DictReader(f, delimiter=",", quotechar='"')
            # Leerzeichen aus den Spaltenüberschriften entfernen
            reader.fieldnames = [name.strip() for name in reader.fieldnames]
            for row in reader:
                key = row.get(key_column)
                if key:
                    # Entferne Leerzeichen aus dem Schlüssel und den Werten
                    data_dict[key.strip()] = {
                        k.strip(): v.strip() for k, v in row.items()
                    }
    except FileNotFoundError:
        print(f"Fehler: Die Datei {filepath} wurde nicht gefunden.")
    return data_dict


def convert_csv_to_json():
    """
    Konvertiert spielraum.csv, startpositionen.csv und schrittweiten.csv
    in eine einzige, strukturierte stammdaten.json.
    """
    spielraum_data = load_csv_to_dict("spielraum.csv", "Strom")
    startpos_data = load_csv_to_dict("startpositionen.csv", "Strom")
    schrittweite_data = load_csv_to_dict("schrittweiten.csv", "Strom")

    if not all([spielraum_data, startpos_data, schrittweite_data]):
        print("Einige CSV-Dateien konnten nicht geladen werden. Abbruch.")
        return

    stammdaten = {}
    for strom_str, spielraum_row in spielraum_data.items():
        strom_int = int(strom_str)
        json_key = f"{strom_int}A"

        startpos_row = startpos_data.get(strom_str)
        schrittweite_row = schrittweite_data.get(strom_str)

        if not (startpos_row and schrittweite_row):
            print(
                f"Warnung: Fehlende Daten für Stromstärke {strom_str} A. Wird übersprungen."
            )
            continue

        stammdaten[json_key] = {
            "nennstrom": strom_int,
            "spielraum": {
                "laenge": float(spielraum_row["Länge"]),
                "breite": float(spielraum_row["Breite"]),
            },
            "startpositionen": {
                "L1": {
                    "x": float(startpos_row["x_L1"]),
                    "y": float(startpos_row["y_L1"]),
                },
                "L2": {
                    "x": float(startpos_row["x_L2"]),
                    "y": float(startpos_row["y_L2"]),
                },
                "L3": {
                    "x": float(startpos_row["x_L3"]),
                    "y": float(startpos_row["y_L3"]),
                },
            },
            "schrittweiten": {
                "Pos1": int(schrittweite_row["Pos1"]),
                "Pos2": int(schrittweite_row["Pos2"]),
                "Pos3": int(schrittweite_row["Pos3"]),
            },
        }

    output_filename = "stammdaten.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(stammdaten, f, indent=4, ensure_ascii=False)

    print(f"✅ Konvertierung erfolgreich! '{output_filename}' wurde erstellt.")


if __name__ == "__main__":
    convert_csv_to_json()
