from pydantic import BaseModel
from typing import Dict, List, Optional

class AnimalState(BaseModel):
    type: str
    name: str
    hunger: int
    health: int
    age: int
    last_breeding_day: Optional[int] = None

class FarmState(BaseModel):
    resources: Dict[str, float]
    animals: List[AnimalState]
    weather: str
    market_prices: Dict[str, float]
    achievements: List[str]
    diseases: List[Dict]
    market_history: List[Dict]
    total_days: int
