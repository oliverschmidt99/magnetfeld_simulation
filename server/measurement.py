"""
Dieses Modul ist für die Erstellung der Plots für die Messungs-Seite zuständig.
Es lädt die Konfiguration und berechnet die Positionen der Wandler.
"""

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from flask import Blueprint, jsonify, abort

from .measurement_config import get_config
from .utils import load_data, LIBRARY_FILE

measurement_bp = Blueprint("measurement_bp", __name__)


def get_plot_data():
    """Erstellt die Plot-Daten für die Messungs-Seite."""
    config = get_config()
    if "error" in config:
        abort(500, description=config["error"])

    # Fehler korrigiert: Der Funktion load_data wurde ein leerer Dictionary als
    # Standardwert für 'default_data' hinzugefügt.
    library = load_data(LIBRARY_FILE, {})

    # Konvertiere Konfigurationslisten in DataFrames für einfachere Handhabung
    start_df = pd.DataFrame(config["startpositionen"]).set_index("Strom")
    spielraum_df = pd.DataFrame(config["spielraum"]).set_index("Strom")

    direction_map = {
        "↑ Norden": np.array([0, 1]),
        "→ Osten": np.array([1, 0]),
        "↓ Süden": np.array([0, -1]),
        "← Westen": np.array([-1, 0]),
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

    for gruppe in config["positionsgruppen"]:
        bewegungen_df = pd.DataFrame(gruppe["bewegungen"])
        schrittweite_df = pd.DataFrame(gruppe["schrittweiten"]).set_index("Strom")

        # Finde den zugehörigen Wandler in der Library
        wandler_name = gruppe.get("wandler")
        wandler_obj = next(
            (item for item in library.get("Wandler", []) if item["id"] == wandler_name),
            None,
        )

        if not wandler_obj:
            # Wenn kein Wandler gefunden wird, überspringe diese Gruppe
            continue

        wandler_dims = {
            "Breite": wandler_obj["abmessungen"]["breite"],
            "Hoehe": wandler_obj["abmessungen"]["hoehe"],
        }

        for strom in start_df.index:
            if strom not in schrittweite_df.index or strom not in spielraum_df.index:
                continue

            start_pos = start_df.loc[strom]
            schritte = schrittweite_df.loc[strom]
            grenzen = spielraum_df.loc[strom]

            for _, bewegung in bewegungen_df.iterrows():
                pos_gruppe_name = bewegung["PosGruppe"]
                pos_num_y_str = pos_gruppe_name.split("_")[-1]
                pos_num_y = int(pos_num_y_str)

                schritt_key = f"Pos{pos_num_y}"
                if schritt_key not in schritte:
                    continue

                schritt = schritte[schritt_key]
                zeilen_ergebnis = {
                    "Strom": strom,
                    "PosGruppe": pos_gruppe_name,
                    "GroupName": gruppe["name"],
                }

                for i in range(1, 4):
                    richtung = bewegung.get(f"L{i}")
                    if not richtung:
                        continue

                    start_vektor = np.array(
                        [
                            start_pos[f"x{i}_in"] + start_pos["X"],
                            start_pos[f"y{i}_in"] + start_pos["Y"],
                        ]
                    )
                    end_vektor = start_vektor + (
                        direction_map.get(richtung, np.array([0, 0])) * schritt
                    )
                    zeilen_ergebnis[f"x{i}_res"], zeilen_ergebnis[f"y{i}_res"] = (
                        end_vektor[0],
                        end_vektor[1],
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
                        grenzen["-maxX"] + sicherheitsabstand <= x_min
                        and x_max <= grenzen["+maxX"] - sicherheitsabstand
                        and grenzen["-maxY"] + sicherheitsabstand <= y_min
                        and y_max <= grenzen["+maxY"] - sicherheitsabstand
                    )
                    zeilen_ergebnis[f"Kollision_L{i}"] = (
                        "Kollision" if kollision else "OK"
                    )
                ergebnisse.append(zeilen_ergebnis)

    if not ergebnisse:
        return (
            []
        )  # Leere Liste zurückgeben, wenn keine Ergebnisse berechnet werden konnten

    ergebnis_df = pd.DataFrame(ergebnisse)
    stromstaerken = sorted(ergebnis_df["Strom"].unique())
    pos_color_map = {1: "blue", 2: "red", 3: "green"}
    kollision_symbol_map = {"OK": "circle", "Kollision": "diamond-open"}

    plots_json = []

    for gruppen_name in ergebnis_df["GroupName"].unique():
        fig = go.Figure()
        strom_pro_spur = []

        for strom in stromstaerken:
            gruppen_filter = ergebnis_df["GroupName"] == gruppen_name
            strom_filter = ergebnis_df["Strom"] == strom
            df_plot = ergebnis_df[gruppen_filter & strom_filter]
            if df_plot.empty:
                continue

            startpos = start_df.loc[strom]
            grenzen = spielraum_df.loc[strom]

            # Finde den Wandler für diese Gruppe wieder
            gruppe_config = next(
                (g for g in config["positionsgruppen"] if g["name"] == gruppen_name),
                None,
            )
            wandler_obj = next(
                (
                    item
                    for item in library.get("Wandler", [])
                    if item["id"] == gruppe_config["wandler"]
                ),
                None,
            )
            wandler_dims = (
                {
                    "Breite": wandler_obj["abmessungen"]["breite"],
                    "Hoehe": wandler_obj["abmessungen"]["hoehe"],
                }
                if wandler_obj
                else {"Breite": 0, "Hoehe": 0}
            )

            for i in range(1, 4):
                fig.add_trace(
                    go.Scatter(
                        x=[startpos[f"x{i}_in"] + startpos["X"]],
                        y=[startpos[f"y{i}_in"] + startpos["Y"]],
                        mode="markers",
                        marker=dict(color="black", size=12, symbol="x"),
                        name="Startposition",
                        legendgroup="Startposition",
                        showlegend=(strom == stromstaerken[0]),
                    )
                )
                strom_pro_spur.append(strom)

            for _, row in df_plot.iterrows():
                pos_num_y = int(row["PosGruppe"].split("_")[-1])
                pos_farbe = pos_color_map.get(pos_num_y, "grey")
                for i in range(1, 4):
                    if f"Kollision_L{i}" not in row:
                        continue
                    kollision = row[f"Kollision_L{i}"]
                    symbol = kollision_symbol_map.get(kollision, "circle")
                    wx, wy = row[f"x{i}_res"], row[f"y{i}_res"]
                    w, h = wandler_dims["Breite"], wandler_dims["Hoehe"]

                    fig.add_trace(
                        go.Scatter(
                            x=[
                                wx - w / 2,
                                wx + w / 2,
                                wx + w / 2,
                                wx - w / 2,
                                wx - w / 2,
                            ],
                            y=[
                                wy - h / 2,
                                wy - h / 2,
                                wy + h / 2,
                                wy + h / 2,
                                wy - h / 2,
                            ],
                            mode="lines",
                            fill="toself",
                            fillcolor=pos_farbe,
                            opacity=0.2,
                            line=dict(color="rgba(0,0,0,0)"),
                            name="Wandler",
                            legendgroup="Wandler",
                            showlegend=(
                                i == 1
                                and strom == stromstaerken[0]
                                and row.name == df_plot.index[0]
                            ),
                            hoverinfo="none",
                            visible="legendonly",
                        )
                    )
                    strom_pro_spur.append(strom)

                    fig.add_trace(
                        go.Scatter(
                            x=[wx],
                            y=[wy],
                            mode="markers",
                            marker=dict(
                                color=pos_farbe,
                                symbol=symbol,
                                size=14,
                                line=dict(width=1, color="black"),
                            ),
                            name=f"Pos {pos_num_y}",
                            legendgroup=f"Pos {pos_num_y}",
                            showlegend=(i == 1 and strom == stromstaerken[0]),
                            hoverinfo="text",
                            hovertext=f"Leiter: L{i}<br>Pos: {row['PosGruppe']}<br>X: {wx:.1f}<br>Y: {wy:.1f}<br>Status: {kollision}",
                        )
                    )
                    strom_pro_spur.append(strom)

        buttons = [
            dict(
                label=f"{s}A",
                method="update",
                args=[{"visible": [sp == s for sp in strom_pro_spur]}],
            )
            for s in stromstaerken
        ]
        if not strom_pro_spur:
            continue  # Überspringe, wenn keine Daten für den Plot vorhanden sind

        initial_visibility = [s == stromstaerken[0] for s in strom_pro_spur]
        for i, trace in enumerate(fig.data):
            if trace.visible != "legendonly":
                trace.visible = initial_visibility[i]

        # Nimm die Grenzen der ersten Stromstärke als Referenz für den Plot-Bereich
        ref_grenzen = spielraum_df.loc[stromstaerken[0]]
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
            title=f"Positionsgruppe '{gruppen_name}'",
            xaxis=dict(
                scaleanchor="y",
                scaleratio=1,
                range=[ref_grenzen["-maxX"] - 50, ref_grenzen["+maxX"] + 50],
            ),
            yaxis=dict(
                title="Y-Position (mm)",
                range=[ref_grenzen["-maxY"] - 50, ref_grenzen["+maxY"] + 50],
            ),
            xaxis_title="X-Position (mm)",
            width=800,
            height=600,
            template="plotly_white",
            legend_title="Anzeigeoptionen",
            legend=dict(traceorder="grouped"),
        )
        fig.add_shape(
            type="rect",
            x0=ref_grenzen["-maxX"],
            y0=ref_grenzen["-maxY"],
            x1=ref_grenzen["+maxX"],
            y1=ref_grenzen["+maxY"],
            line=dict(color="black", width=2),
            fillcolor="lightgrey",
            layer="below",
            opacity=0.3,
        )
        fig.add_shape(
            type="rect",
            x0=ref_grenzen["-maxX"] + sicherheitsabstand,
            y0=ref_grenzen["-maxY"] + sicherheitsabstand,
            x1=ref_grenzen["+maxX"] - sicherheitsabstand,
            y1=ref_grenzen["+maxY"] - sicherheitsabstand,
            line=dict(color="red", width=2, dash="dash"),
            layer="below",
        )

        plots_json.append(fig.to_json())

    return plots_json


@measurement_bp.route("/measurement/data")
def measurement_data():
    """Stellt die Plot-Daten als JSON für das Frontend bereit."""
    return jsonify(get_plot_data())
