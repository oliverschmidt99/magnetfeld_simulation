import pandas as pd
import numpy as np
import plotly.graph_objects as go
import os
from flask import Blueprint, jsonify

measurement_bp = Blueprint("measurement_bp", __name__)

DATA_DIR = "data"


def get_plot_data():
    try:
        start_df = pd.read_csv(
            os.path.join(DATA_DIR, "1_startpositionen.csv")
        ).set_index("Strom")
        spielraum_df = pd.read_csv(os.path.join(DATA_DIR, "2_spielraum.csv"))
        bewegungen_df = pd.read_csv(os.path.join(DATA_DIR, "3_bewegungen.csv"))
        schrittweite_df = pd.read_csv(
            os.path.join(DATA_DIR, "4_schrittweiten.csv")
        ).set_index("Strom")
        wandler_df = pd.read_csv(
            os.path.join(DATA_DIR, "5_wandler_abmessungen.csv")
        ).set_index("Strom")
    except FileNotFoundError as e:
        return {"error": f"Datendatei nicht gefunden: {e.filename}"}

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
    grenzen = spielraum_df.iloc[0]

    for strom in start_df.index:
        start_pos, schritte, wandler_dims = (
            start_df.loc[strom],
            schrittweite_df.loc[strom],
            wandler_df.loc[strom],
        )
        for index, bewegung in bewegungen_df.iterrows():
            pos_gruppe_name = bewegung["PosGruppe"]
            pos_num_y = int(pos_gruppe_name[-1])
            schritt = schritte[f"Pos{pos_num_y}"]
            zeilen_ergebnis = {"Strom": strom, "PosGruppe": pos_gruppe_name}
            for i in range(1, 4):
                richtung = bewegung[f"L{i}"]
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
                zeilen_ergebnis[f"Kollision_L{i}"] = "Kollision" if kollision else "OK"
            ergebnisse.append(zeilen_ergebnis)

    ergebnis_df = pd.DataFrame(ergebnisse)

    stromstaerken = sorted(ergebnis_df["Strom"].unique())
    pos_color_map = {1: "blue", 2: "red", 3: "green"}
    kollision_symbol_map = {"OK": "circle", "Kollision": "diamond-open"}

    plots_json = []

    for gruppen_nr_x in range(1, 5):
        fig = go.Figure()
        strom_pro_spur = []

        for strom in stromstaerken:
            gruppen_filter = ergebnis_df["PosGruppe"].str.startswith(
                f"Pos{gruppen_nr_x}"
            )
            strom_filter = ergebnis_df["Strom"] == strom
            df_plot = ergebnis_df[gruppen_filter & strom_filter]
            startpos = start_df.loc[strom]
            wandler_dims = wandler_df.loc[strom]

            for i in range(1, 4):
                fig.add_trace(
                    go.Scatter(
                        x=[startpos[f"x{i}_in"] + startpos["X"]],
                        y=[startpos[f"y{i}_in"] + startpos["Y"]],
                        mode="markers",
                        marker=dict(color="black", size=12, symbol="x"),
                        name="Startposition",
                        legendgroup="Startposition",
                        showlegend=bool(strom == stromstaerken[0]),
                    )
                )
                strom_pro_spur.append(strom)

            for index, row in df_plot.iterrows():
                pos_num_y = int(row["PosGruppe"][-1])
                pos_farbe = pos_color_map[pos_num_y]
                for i in range(1, 4):
                    kollision = row[f"Kollision_L{i}"]
                    symbol = kollision_symbol_map[kollision]
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
                            showlegend=bool(
                                i == 1
                                and index == df_plot.index[0]
                                and strom == stromstaerken[0]
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
                            showlegend=bool(i == 1 and strom == stromstaerken[0]),
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
        initial_visibility = [s == stromstaerken[0] for s in strom_pro_spur]
        for i, trace in enumerate(fig.data):
            if not trace.visible == "legendonly":
                trace.visible = initial_visibility[i]

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
            legend_title="Anzeigeoptionen",
            legend=dict(traceorder="grouped"),
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

    return plots_json


@measurement_bp.route("/measurement/data")
def measurement_data():
    return jsonify(get_plot_data())
