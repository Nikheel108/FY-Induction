"""
Database bootstrap helpers.

Keeps the SQLAlchemy instance in a single place so ``app.py`` and ``models.py``
can import it without creating circular imports.
"""

from flask_sqlalchemy import SQLAlchemy

# Single SQLAlchemy extension instance shared by the whole application.
db = SQLAlchemy()
