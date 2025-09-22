# server/api.py
"""
Dieses Modul stellt die API-Endpunkte für die Anwendung bereit.
"""

import json
import sqlite3
from flask import Blueprint, jsonify, request

# KORREKTUR: Geändert von ".db" zu "server.db" für einen absoluten Import
from server.db import get_db

api_bp = Blueprint("api", __name__, url_prefix="/api")


# --- Tag Management ---
@api_bp.route("/tags", methods=["GET"])
def get_tags():
    """Gibt alle verfügbaren Tags aus der Datenbank zurück."""
    db = get_db()
    cursor = db.execute(
        "SELECT name, category, color FROM tags ORDER BY category, name"
    )
    tags_by_category = {}
    for row in cursor.fetchall():
        cat = row["category"]
        if cat not in tags_by_category:
            tags_by_category[cat] = []
        tags_by_category[cat].append({"name": row["name"], "color": row["color"]})

    categories_list = [
        {"name": cat, "tags": tags} for cat, tags in tags_by_category.items()
    ]
    return jsonify({"categories": categories_list})


@api_bp.route("/tags", methods=["POST"])
def update_tags():
    """Speichert die gesamte Tag-Struktur in der Datenbank."""
    data = request.json
    db = get_db()
    try:
        with db:
            db.execute("DELETE FROM tags")
            for category in data.get("categories", []):
                for tag in category.get("tags", []):
                    db.execute(
                        "INSERT INTO tags (name, category, color) VALUES (?, ?, ?)",
                        (tag["name"], category["name"], tag["color"]),
                    )
        return jsonify({"success": True, "message": "Tags erfolgreich gespeichert."})
    except sqlite3.Error as e:
        return (
            jsonify(
                {"success": False, "message": f"Fehler beim Speichern der Tags: {e}"}
            ),
            500,
        )


# --- Library Management ---
@api_bp.route("/library", methods=["GET"])
def get_library():
    """Gibt die gesamte Bauteil-Bibliothek aus der Datenbank zurück."""
    db = get_db()
    library = {"materials": [], "components": {}}

    # Materialien laden
    materials_cursor = db.execute("SELECT * FROM materials ORDER BY name")
    for mat_row in materials_cursor.fetchall():
        material = dict(mat_row)
        bh_cursor = db.execute(
            "SELECT b_value, h_value FROM bh_curve_points WHERE material_id = ?",
            (material["id"],),
        )
        material["bh_curve"] = [
            [row["b_value"], row["h_value"]] for row in bh_cursor.fetchall()
        ]
        del material["id"]
        library["materials"].append(material)

    # Bauteile laden
    components_cursor = db.execute("SELECT * FROM components ORDER BY type, name")
    for comp_row in components_cursor.fetchall():
        comp_type = comp_row["type"]
        if comp_type not in library["components"]:
            library["components"][comp_type] = []

        component = {
            "templateProductInformation": {
                "name": comp_row["name"],
                "productName": comp_row["productName"],
                "manufacturer": comp_row["manufacturer"],
                "manufacturerNumber": comp_row["manufacturerNumber"],
                "companyNumber": comp_row["companyNumber"],
                "uniqueNumber": comp_row["uniqueNumber"],
            },
            "specificProductInformation": json.loads(
                comp_row["specificProductInformation"] or "{}"
            ),
        }

        tags_cursor = db.execute(
            """
            SELECT t.name FROM tags t
            JOIN component_tags ct ON t.id = ct.tag_id
            WHERE ct.component_id = ?
        """,
            (comp_row["id"],),
        )
        component["templateProductInformation"]["tags"] = [
            row["name"] for row in tags_cursor.fetchall()
        ]
        library["components"][comp_type].append(component)

    return jsonify(library)


@api_bp.route("/library", methods=["POST"])
def update_library():
    """Aktualisiert oder löscht ein Bauteil oder Material in der Bibliothek."""
    data = request.json
    action = data.get("action")
    db = get_db()

    try:
        with db:  # Startet eine Transaktion
            if action == "save":
                return save_component(db, data)
            if action == "delete":
                return delete_component(db, data)
            if action == "save_material":
                return save_material(db, data)
            if action == "delete_material":
                return delete_material(db, data)

        return jsonify({"message": "Aktion nicht erfolgreich oder ungültig."}), 400

    except sqlite3.Error as e:
        return jsonify({"message": f"Ein Datenbankfehler ist aufgetreten: {e}"}), 500


def save_component(db, data):
    """Speichert ein einzelnes Bauteil."""
    comp = data.get("component", {})
    tpi = comp.get("templateProductInformation", {})
    spi = comp.get("specificProductInformation", {})
    original_name = data.get("originalName")
    comp_type = data.get("type")

    if original_name:  # Update
        comp_id_row = db.execute(
            "SELECT id FROM components WHERE name = ?", (original_name,)
        ).fetchone()
        if not comp_id_row:
            return (
                jsonify({"message": "Zu aktualisierendes Bauteil nicht gefunden."}),
                404,
            )
        comp_id = comp_id_row["id"]
        db.execute(
            """
            UPDATE components SET name=?, productName=?, manufacturer=?, manufacturerNumber=?,
                               companyNumber=?, uniqueNumber=?, specificProductInformation=?
            WHERE id=?
        """,
            (
                tpi.get("name"),
                tpi.get("productName"),
                tpi.get("manufacturer"),
                tpi.get("manufacturerNumber"),
                tpi.get("companyNumber"),
                tpi.get("uniqueNumber"),
                json.dumps(spi),
                comp_id,
            ),
        )
    else:  # Insert
        cursor = db.execute(
            """
            INSERT INTO components (type, name, productName, manufacturer, manufacturerNumber,
                                companyNumber, uniqueNumber, specificProductInformation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                comp_type,
                tpi.get("name"),
                tpi.get("productName"),
                tpi.get("manufacturer"),
                tpi.get("manufacturerNumber"),
                tpi.get("companyNumber"),
                tpi.get("uniqueNumber"),
                json.dumps(spi),
            ),
        )
        comp_id = cursor.lastrowid

    # Tags aktualisieren
    db.execute("DELETE FROM component_tags WHERE component_id = ?", (comp_id,))
    for tag_name in tpi.get("tags", []):
        tag_id_row = db.execute(
            "SELECT id FROM tags WHERE name = ?", (tag_name,)
        ).fetchone()
        if tag_id_row:
            db.execute(
                "INSERT INTO component_tags (component_id, tag_id) VALUES (?, ?)",
                (comp_id, tag_id_row["id"]),
            )

    return jsonify({"message": "Bauteil erfolgreich gespeichert."}), 200


def delete_component(db, data):
    """Löscht ein einzelnes Bauteil."""
    original_name = data.get("originalName")
    db.execute("DELETE FROM components WHERE name = ?", (original_name,))
    return jsonify({"message": f"Bauteil '{original_name}' gelöscht."}), 200


def save_material(db, data):
    """Speichert ein einzelnes Material."""
    mat = data.get("material", {})
    original_name = data.get("originalName")

    if original_name:  # Update
        mat_id_row = db.execute(
            "SELECT id FROM materials WHERE name = ?", (original_name,)
        ).fetchone()
        if not mat_id_row:
            return (
                jsonify({"message": "Zu aktualisierendes Material nicht gefunden."}),
                404,
            )
        mat_id = mat_id_row["id"]
        db.execute(
            "UPDATE materials SET name=?, is_nonlinear=?, mu_x=?, mu_y=? WHERE id=?",
            (
                mat.get("name"),
                mat.get("is_nonlinear", 0),
                mat.get("mu_x", 1),
                mat.get("mu_y", 1),
                mat_id,
            ),
        )
        db.execute("DELETE FROM bh_curve_points WHERE material_id = ?", (mat_id,))
    else:  # Insert
        cursor = db.execute(
            "INSERT INTO materials (name, is_nonlinear, mu_x, mu_y) VALUES (?, ?, ?, ?)",
            (
                mat.get("name"),
                mat.get("is_nonlinear", 0),
                mat.get("mu_x", 1),
                mat.get("mu_y", 1),
            ),
        )
        mat_id = cursor.lastrowid

    for point in mat.get("bh_curve", []):
        db.execute(
            "INSERT INTO bh_curve_points (material_id, b_value, h_value) VALUES (?, ?, ?)",
            (mat_id, point[0], point[1]),
        )

    return jsonify({"message": "Material erfolgreich gespeichert."}), 200


def delete_material(db, data):
    """Löscht ein einzelnes Material."""
    original_name = data.get("originalName")
    db.execute("DELETE FROM materials WHERE name = ?", (original_name,))
    return jsonify({"message": f"Material '{original_name}' gelöscht."}), 200
