# server/api.py
"""
Dieses Modul stellt die API-Endpunkte für die Anwendung bereit.
"""

import json
import sqlite3
import os
import re
import tempfile
from collections import defaultdict
import femm
import pythoncom

from flask import Blueprint, jsonify, request

from server.db import get_db

api_bp = Blueprint("api", __name__, url_prefix="/api")


# --- FEMM Material Import Endpunkte ---


@api_bp.route("/femm_materials", methods=["GET"])
def get_femm_materials():
    """Gibt eine strukturierte Liste der Materialien aus der matlib.dat zurück."""
    femm_lib_path = "C:\\femm42\\bin\\matlib.dat"

    if not os.path.exists(femm_lib_path):
        return (
            jsonify(
                {"error": f"FEMM Materialbibliothek nicht gefunden: {femm_lib_path}"}
            ),
            404,
        )

    materials_by_folder = defaultdict(list)
    try:
        with open(femm_lib_path, "r", encoding="latin-1") as f:
            content = f.read()

        name_matches = re.findall(r"<BlockName>\s*=\s*\"(.*?)\"", content)

        for name in sorted(list(set(name_matches))):
            if "\\" in name:
                folder, material_name = name.split("\\", 1)
                materials_by_folder[folder].append(material_name)
            else:
                materials_by_folder["Uncategorized"].append(name)

        structured_list = [
            {"folder": folder, "materials": sorted(mats)}
            for folder, mats in materials_by_folder.items()
        ]

        structured_list.sort(
            key=lambda x: x["folder"] if x["folder"] != "Uncategorized" else " "
        )

        return jsonify(structured_list)
    except (IOError, RuntimeError) as e:
        return jsonify({"error": f"Fehler beim Lesen der matlib.dat: {e}"}), 500


@api_bp.route("/femm_material_details/<string:material_name>", methods=["GET"])
def get_femm_material_details(material_name):
    """Holt die detaillierten Eigenschaften eines Materials aus der FEMM-Bibliothek."""
    temp_fd, temp_path = tempfile.mkstemp(suffix=".fem")
    os.close(temp_fd)

    try:
        pythoncom.CoInitializeEx(pythoncom.COINIT_APARTMENTTHREADED)
        femm.openfemm(True)
        femm.newdocument(0)
        femm.mi_getmaterial(material_name)
        femm.mi_saveas(temp_path)
        femm.closefemm()

        with open(temp_path, "r", encoding="latin-1") as f:
            content = f.read()

        props = parse_fem_material_properties(content, material_name)
        return jsonify(props)

    except (IOError, RuntimeError, FileNotFoundError, AttributeError) as e:
        try:
            femm.closefemm()
        except (IOError, RuntimeError):
            pass
        return (
            jsonify(
                {
                    "error": f"Details für '{material_name}' konnten nicht geholt werden: {e}"
                }
            ),
            500,
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def parse_fem_material_properties(fem_content, material_name):
    """Parst die Materialeigenschaften aus dem Inhalt einer .fem-Datei."""
    props = {"name": material_name, "is_nonlinear": False, "bh_curve": []}

    mat_regex = re.compile(
        f'<BeginBlock>.*?<BlockName>\\s*=\\s*"{re.escape(material_name)}".*?<EndBlock>',
        re.DOTALL,
    )
    match = mat_regex.search(fem_content)
    if not match:
        return props

    block = match.group(0)

    try:
        props["mu_x"] = float(
            re.search(r"<Mu_x>\s*=\s*([0-9eE\.\+-]+)", block).group(1)
        )
        props["mu_y"] = float(
            re.search(r"<Mu_y>\s*=\s*([0-9eE\.\+-]+)", block).group(1)
        )
        props["hc"] = float(re.search(r"<H_c>\s*=\s*([0-9eE\.\+-]+)", block).group(1))
        props["sigma"] = float(
            re.search(r"<Sigma>\s*=\s*([0-9eE\.\+-]+)", block).group(1)
        )

        num_bh_points_match = re.search(r"<BHPoints>\s*=\s*(\d+)", block)
        if not num_bh_points_match:
            return props

        num_bh_points = int(num_bh_points_match.group(1))
        if num_bh_points > 0:
            props["is_nonlinear"] = True

            lines = block.split("\n")
            start_index = -1
            for i, line in enumerate(lines):
                if "<BHPoints>" in line:
                    start_index = i + 1
                    break

            if start_index != -1:
                bh_lines = lines[start_index : start_index + num_bh_points]
                for line in bh_lines:
                    try:
                        parts = line.strip().split()
                        if len(parts) >= 2:
                            b, h = map(float, parts[0:2])
                            props["bh_curve"].append([b, h])
                    except (ValueError, IndexError):
                        continue

    except (AttributeError, ValueError) as e:
        print(f"Parsing error for material {material_name}: {e}")

    return props


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

    components_cursor = db.execute("SELECT * FROM components ORDER BY type, name")
    for comp_row in components_cursor.fetchall():
        comp_type = comp_row["type"]
        if comp_type not in library["components"]:
            library["components"][comp_type] = []
        component = {
            "id": comp_row["id"],  # ID hinzufügen für leichtere Zuordnung
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
            (
                "SELECT t.name FROM tags t JOIN component_tags ct "
                "ON t.id = ct.tag_id WHERE ct.component_id = ?"
            ),
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
        with db:
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
    """Speichert ein einzelnes Bauteil in der Datenbank."""
    comp = data.get("component", {})
    tpi = comp.get("templateProductInformation", {})
    spi = comp.get("specificProductInformation", {})
    original_name = data.get("originalName")
    comp_type = data.get("type")

    # Stelle sicher, dass die neuen Felder im JSON-Objekt sind, bevor es gespeichert wird
    if comp_type == "transformers" and "electrical" in spi:
        spi["electrical"]["ratedBurdenVA"] = spi["electrical"].get("ratedBurdenVA")
        spi["electrical"]["accuracyClass"] = spi["electrical"].get("accuracyClass")

    if original_name:
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
            """UPDATE components SET name=?, productName=?, manufacturer=?,
               manufacturerNumber=?, companyNumber=?, uniqueNumber=?,
               specificProductInformation=? WHERE id=?""",
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
    else:
        cursor = db.execute(
            """INSERT INTO components (type, name, productName, manufacturer,
               manufacturerNumber, companyNumber, uniqueNumber,
               specificProductInformation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
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
    """Löscht ein einzelnes Bauteil aus der Datenbank."""
    original_name = data.get("originalName")
    db.execute("DELETE FROM components WHERE name = ?", (original_name,))
    return jsonify({"message": f"Bauteil '{original_name}' gelöscht."}), 200


def save_material(db, data):
    """Speichert ein einzelnes Material in der Datenbank."""
    mat = data.get("material", {})
    original_name = data.get("originalName")
    new_name = mat.get("name")

    if not new_name:
        return jsonify({"message": "Materialname darf nicht leer sein."}), 400

    existing_material_row = db.execute(
        "SELECT id, name FROM materials WHERE name = ?", (new_name,)
    ).fetchone()

    if original_name:
        mat_id_row = db.execute(
            "SELECT id FROM materials WHERE name = ?", (original_name,)
        ).fetchone()
        if not mat_id_row:
            return (
                jsonify({"message": f"Material '{original_name}' nicht gefunden."}),
                404,
            )

        mat_id = mat_id_row["id"]

        if new_name != original_name and existing_material_row:
            return (
                jsonify(
                    {
                        "message": f"Ein anderes Material mit dem Namen '{new_name}' existiert bereits."
                    }
                ),
                409,
            )

        db.execute(
            """UPDATE materials SET name=?, is_nonlinear=?, mu_x=?, mu_y=?, hc=?,
               sigma=?, j=?, lamination_type=?, lam_thickness=?, lam_fill_factor=?
               WHERE id=?""",
            (
                new_name,
                mat.get("is_nonlinear", 0),
                mat.get("mu_x", 1),
                mat.get("mu_y", 1),
                mat.get("hc", 0),
                mat.get("sigma", 0),
                mat.get("j", 0),
                mat.get("lamination_type", 0),
                mat.get("lam_thickness", 0),
                mat.get("lam_fill_factor", 1),
                mat_id,
            ),
        )
        db.execute("DELETE FROM bh_curve_points WHERE material_id = ?", (mat_id,))

    else:
        if existing_material_row:
            return (
                jsonify(
                    {
                        "message": f"Ein Material mit dem Namen '{new_name}' existiert bereits."
                    }
                ),
                409,
            )

        cursor = db.execute(
            """INSERT INTO materials (name, is_nonlinear, mu_x, mu_y, hc, sigma, j,
               lamination_type, lam_thickness, lam_fill_factor)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                new_name,
                mat.get("is_nonlinear", 0),
                mat.get("mu_x", 1),
                mat.get("mu_y", 1),
                mat.get("hc", 0),
                mat.get("sigma", 0),
                mat.get("j", 0),
                mat.get("lamination_type", 0),
                mat.get("lam_thickness", 0),
                mat.get("lam_fill_factor", 1),
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
    """Löscht ein einzelnes Material aus der Datenbank."""
    original_name = data.get("originalName")
    db.execute("DELETE FROM materials WHERE name = ?", (original_name,))
    return jsonify({"message": f"Material '{original_name}' gelöscht."}), 200
