"""
Dieses Modul generiert die Plot-Daten für die Messungs-Visualisierungsseite.
"""

import os
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from flask import Blueprint, jsonify, abort

measurement_bp = Blueprint("measurement_bp", __name__)
DATA_DIR = "data"


def get_all_visualization_data():
    """
    Liest die CSV-Daten, berechnet die Positionen und gibt die Ergebnisse
    und Grenzwerte als JSON-kompatible Typen zurück.
    """
    csv_files = {
        "start": os.path.join(DATA_DIR, "1_startpositionen.csv"),
        "spielraum": os.path.join(DATA_DIR, "2_spielraum.csv"),
        "bewegungen": os.path.join(DATA_DIR, "3_bewegungen.csv"),
        "schrittweite": os.path.join(DATA_DIR, "4_schrittweiten.csv"),
        "wandler": os.path.join(DATA_DIR, "5_wandler_abmessungen.csv"),
    }
    try:
        dataframes = {
            name: pd.read_csv(path, encoding="utf-8")
            for name, path in csv_files.items()
        }
    except UnicodeDecodeError:
        try:
            dataframes = {
                name: pd.read_csv(path, encoding="cp1252")
                for name, path in csv_files.items()
            }
        except (IOError, pd.errors.ParserError) as e:
            abort(500, description=f"Fehler beim Lesen der CSVs mit CP1252: {e}")
    except (IOError, pd.errors.ParserError) as e:
        abort(500, description=f"Fehler beim Lesen der CSV-Dateien: {e}")

    try:
        start_df = dataframes["start"]
        spielraum_df = dataframes["spielraum"]
        bewegungen_df = dataframes["bewegungen"]
        schrittweite_df = dataframes["schrittweite"]
        wandler_df = dataframes["wandler"]

        start_df.columns = start_df.columns.str.strip()
        spielraum_df.columns = spielraum_df.columns.str.strip()
        bewegungen_df.columns = bewegungen_df.columns.str.strip()
        schrittweite_df.columns = schrittweite_df.columns.str.strip()
        wandler_df.columns = wandler_df.columns.str.strip()

        start_df = start_df.set_index("Strom")
        spielraum_df = spielraum_df.dropna(subset=["Strom"]).set_index("Strom")
        schrittweite_df = schrittweite_df.set_index("Strom")
        wandler_df = wandler_df.set_index("Strom")
    except KeyError as e:
        abort(500, description=f"Fehlende Spalte 'Strom' in einer CSV. Fehler: {e}")

    common_currents = sorted(
        list(set(start_df.index) & set(schrittweite_df.index) & set(wandler_df.index))
    )
    if not common_currents:
        return [], {}, None, None

    direction_map = {
        "← Westen": np.array([-1, 0]),
        "→ Osten": np.array([1, 0]),
        "↑ Norden": np.array([0, 1]),
        "↓ Süden": np.array([0, -1]),
        "↗ Nordosten": np.array([1, 1]),
        "↘ Südosten": np.array([1, -1]),
        "↙ Südwesten": np.array([-1, -1]),
        "↖ Nordwesten": np.array([-1, 1]),
    }
    for key, vec in direction_map.items():
        norm = np.linalg.norm(vec)
        if norm > 0:
            direction_map[key] = vec / norm

    ergebnisse = []
    sicherheitsabstand = 20.0
    spielraum_df["-maxX"] = -spielraum_df["Länge"] / 2
    spielraum_df["+maxX"] = spielraum_df["Länge"] / 2
    spielraum_df["-maxY"] = -spielraum_df["Breite"] / 2
    spielraum_df["+maxY"] = spielraum_df["Breite"] / 2
    grenzen_series = spielraum_df.loc[spielraum_df.index[0]]

    for strom in common_currents:
        start_pos = start_df.loc[strom]
        schritte = schrittweite_df.loc[strom]
        wandler_dims = wandler_df.loc[strom]
        startpunkte = {
            i: np.array([start_pos.get(f"x_L{i}", 0), start_pos.get(f"y_L{i}", 0)])
            for i in range(1, 4)
        }
        for _, bewegung in bewegungen_df.iterrows():
            pos_gruppe_name = bewegung.get("PosGruppe")
            if not isinstance(pos_gruppe_name, str) or not pos_gruppe_name.startswith(
                "Pos"
            ):
                continue
            try:
                pos_num_y = int(pos_gruppe_name[-1])
                schritt = schritte[f"Pos{pos_num_y}"]
            except (ValueError, IndexError, KeyError):
                continue
            for i, start_vektor in startpunkte.items():
                richtung = bewegung.get(f"L{i}")
                if pd.isna(richtung):
                    continue
                end_vektor = start_vektor + (
                    direction_map.get(str(richtung).strip(), np.array([0, 0])) * schritt
                )
                x_min, x_max = (
                    end_vektor[0] - wandler_dims["Breite"] / 2,
                    end_vektor[0] + wandler_dims["Breite"] / 2,
                )
                y_min, y_max = (
                    end_vektor[1] - wandler_dims["Hoehe"] / 2,
                    end_vektor[1] + wandler_dims["Hoehe"] / 2,
                )
                kollision = not (
                    grenzen_series["-maxX"] + sicherheitsabstand <= x_min
                    and x_max <= grenzen_series["+maxX"] - sicherheitsabstand
                    and grenzen_series["-maxY"] + sicherheitsabstand <= y_min
                    and y_max <= grenzen_series["+maxY"] - sicherheitsabstand
                )
                ergebnisse.append(
                    {
                        "Strom": strom,
                        "PosGruppe": pos_gruppe_name,
                        "Leiter": f"L{i}",
                        "x_res": end_vektor[0],
                        "y_res": end_vektor[1],
                        "Kollision": "Kollision" if kollision else "OK",
                    }
                )

    # KORREKTUR: Konvertiere die Pandas Series in ein Dictionary, bevor sie zurückgegeben wird
    grenzen_dict = grenzen_series.to_dict()

    return ergebnisse, grenzen_dict, start_df, wandler_df


@measurement_bp.route("/measurement/data")
def get_measurement_plots():
    """Stellt die Plot-Daten als JSON für das Frontend bereit."""
    ergebnisse, grenzen, start_df, _ = get_all_visualization_data()
    sicherheitsabstand = 20.0

    if not ergebnisse:
        return jsonify({"plots": [], "trace_maps": []})

    ergebnis_df = pd.DataFrame(ergebnisse)
    stromstaerken = sorted([int(s) for s in ergebnis_df["Strom"].unique()])
    pos_color_map = {1: "blue", 2: "red", 3: "green", 4: "purple"}
    kollision_symbol_map = {"OK": "circle", "Kollision": "diamond-open"}

    ergebnis_df["GroupNum"] = (
        ergebnis_df["PosGruppe"].str.extract(r"Pos(\d)\d").iloc[:, 0]
    )
    valid_group_numbers = ergebnis_df["GroupNum"].dropna().unique()

    plots_json = []
    for gruppen_nr_x_str in valid_group_numbers:
        gruppen_nr_x = int(gruppen_nr_x_str)
        fig = go.Figure()

        for strom_idx, strom in enumerate(stromstaerken):
            df_strom = ergebnis_df[
                (ergebnis_df["GroupNum"] == gruppen_nr_x_str)
                & (ergebnis_df["Strom"] == strom)
            ]
            startpos = start_df.loc[strom]
            start_x = [startpos.get(f"x_L{i}", 0) for i in range(1, 4)]
            start_y = [startpos.get(f"y_L{i}", 0) for i in range(1, 4)]
            start_labels = [f"Startposition L{i}" for i in range(1, 4)]
            fig.add_trace(
                go.Scatter(
                    x=start_x,
                    y=start_y,
                    mode="markers",
                    marker=dict(color="black", size=12, symbol="x"),
                    name="Startposition",
                    legendgroup="Startposition",
                    hoverinfo="text",
                    hovertext=start_labels,
                    visible=(strom_idx == 0),
                )
            )
            fig.add_trace(
                go.Scatter(
                    x=[None],
                    mode="markers",
                    name="Wandler",
                    legendgroup="Wandler",
                    visible="legendonly",
                )
            )
            for pos_num_y in range(1, 5):
                df_pos = df_strom[df_strom["PosGruppe"].str.endswith(str(pos_num_y))]
                if df_pos.empty:
                    fig.add_trace(
                        go.Scatter(
                            x=[None],
                            mode="markers",
                            name=f"Pos {pos_num_y}",
                            legendgroup=f"Pos {pos_num_y}",
                            visible=False,
                        )
                    )
                    continue
                for status in ["OK", "Kollision"]:
                    df_status = df_pos[df_pos["Kollision"] == status]
                    if df_status.empty:
                        continue
                    hovertext = [
                        (
                            f"Leiter: {row['Leiter']}<br>Pos: {row['PosGruppe']}<br>"
                            f"X: {row['x_res']:.1f}<br>Y: {row['y_res']:.1f}<br>Status: {row['Kollision']}"
                        )
                        for _, row in df_status.iterrows()
                    ]
                    fig.add_trace(
                        go.Scatter(
                            x=df_status["x_res"],
                            y=df_status["y_res"],
                            mode="markers",
                            marker=dict(
                                color=pos_color_map.get(pos_num_y, "grey"),
                                symbol=kollision_symbol_map.get(status),
                                size=14,
                                line=dict(width=1, color="black"),
                            ),
                            name=f"Pos {pos_num_y}",
                            legendgroup=f"Pos {pos_num_y}",
                            hoverinfo="text",
                            hovertext=hovertext,
                            visible=(strom_idx == 0),
                        )
                    )

        traces_per_strom = len(fig.data) // len(stromstaerken)
        buttons = []
        for i, strom in enumerate(stromstaerken):
            visibility = [False] * len(fig.data)
            visibility[i * traces_per_strom : (i + 1) * traces_per_strom] = [
                True
            ] * traces_per_strom
            buttons.append(
                dict(
                    label=f"{strom}A", method="restyle", args=[{"visible": visibility}]
                )
            )

        fig.update_layout(
            updatemenus=[
                dict(
                    active=0,
                    buttons=buttons,
                    x=0.01,
                    xanchor="left",
                    y=1.1,
                    yanchor="top",
                )
            ],
            title=f"Positionsgruppe {gruppen_nr_x}",
            xaxis=dict(
                scaleanchor="y",
                scaleratio=1,
                range=[grenzen["-maxX"] - 50, grenzen["+maxX"] + 50],
            ),
            yaxis=dict(
                title="Y-Position (mm)",
                range=[grenzen["-maxY"] - 50, grenzen["+maxY"] + 50],
            ),
            xaxis_title="X-Position (mm)",
            width=800,
            height=600,
            template="plotly_white",
            showlegend=False,
            margin=dict(t=100),
        )
        fig.add_shape(
            type="rect",
            x0=grenzen["-maxX"],
            y0=grenzen["-maxY"],
            x1=grenzen["+maxX"],
            y1=grenzen["+maxY"],
            line=dict(color="black", width=2),
            fillcolor="lightgrey",
            layer="below",
            opacity=0.3,
        )
        fig.add_shape(
            type="rect",
            x0=grenzen["-maxX"] + sicherheitsabstand,
            y0=grenzen["-maxY"] + sicherheitsabstand,
            x1=grenzen["+maxX"] - sicherheitsabstand,
            y1=grenzen["+maxY"] - sicherheitsabstand,
            line=dict(color="red", width=2, dash="dash"),
            layer="below",
        )
        plots_json.append(fig.to_json())

    return jsonify({"plots": plots_json, "trace_maps": []})
