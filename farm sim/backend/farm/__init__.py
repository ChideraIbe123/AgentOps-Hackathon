# backend/farm/__init__.py
# This file makes the farm directory a proper Python package 
from .simulation import FarmSimulation
from .models import FarmState, AnimalState

__all__ = ['FarmSimulation', 'FarmState', 'AnimalState'] 