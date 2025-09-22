# server/db.py
"""
Dieses Modul verwaltet die Datenbankverbindung für die Flask-Anwendung.
"""
import sqlite3
from flask import g

DATABASE = "database.db"


def get_db():
    """
    Stellt eine Verbindung zur Datenbank her und speichert sie im App-Kontext.
    Wenn bereits eine Verbindung für die aktuelle Anfrage besteht, wird diese wiederverwendet.
    """
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(_=None):
    """Schließt die Datenbankverbindung am Ende der Anfrage."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_app(app):
    """
    Initialisiert die Datenbank-Funktionen für die Flask-App.
    Registriert den `close_db` Befehl, damit er nach jeder Anfrage aufgerufen wird.
    """
    app.teardown_appcontext(close_db)
