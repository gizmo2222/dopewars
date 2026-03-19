"""
DreamHost Passenger entry point.
Passenger looks for an 'application' object in this file.
"""
import sys
import os

# Use the virtual environment's Python interpreter
VENV = os.path.join(os.path.dirname(__file__), 'venv')
INTERP = os.path.join(VENV, 'bin', 'python3')

if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

sys.path.insert(0, os.path.dirname(__file__))

from app import app as application
