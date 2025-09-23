# server/json_provider.py
"""
Dieses Modul stellt einen benutzerdefinierten JSON-Provider für Flask bereit,
der in der Lage ist, NumPy-Datentypen korrekt zu serialisieren.
"""
import json
import numpy as np
from flask.json.provider import JSONProvider


class CustomJSONEncoder(json.JSONEncoder):
    """
    Ein benutzerdefinierter JSON-Encoder, der NumPy-Typen in Standard-Python-Typen umwandelt.
    """

    def default(self, obj):
        """Überschreibt die Standard-Methode, um NumPy-Typen zu behandeln."""
        if isinstance(obj, (np.integer, np.int64)):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


class CustomJSONProvider(JSONProvider):
    """
    Ein benutzerdefinierter JSON-Provider, der den CustomJSONEncoder verwendet.
    """

    def dumps(self, obj, **kwargs):
        """Serialisiert ein Objekt zu einem JSON-String."""
        return json.dumps(obj, **kwargs, cls=CustomJSONEncoder)

    def loads(self, s, **kwargs):
        """Deserialisiert einen JSON-String zu einem Objekt."""
        return json.loads(s, **kwargs)
