from agentops import agent, action
from .models import FarmState, AnimalState
from typing import Optional
import random

@agent(type='farmer')
class FarmerAgent:
    def __init__(self, name: str):
        self.name = name
        self.last_fed_day: Optional[int] = None
    
    @action
    def feed_animals(self, farm_state: FarmState) -> str:
        fed = []
        for animal in farm_state.animals:
            if animal.type == 'chicken' and farm_state.resources['feed'] >= 1:
                farm_state.resources['feed'] -= 1
                animal.hunger = max(0, animal.hunger - 3)
                fed.append(f"Fed {animal.name}")
            elif animal.type == 'cow' and farm_state.resources['feed'] >= 2:
                farm_state.resources['feed'] -= 2
                animal.hunger = max(0, animal.hunger - 4)
                fed.append(f"Fed {animal.name}")
        return " | ".join(fed) if fed else "No animals fed"

    @action
    def collect_resources(self, farm_state: FarmState) -> str:
        collected = []
        if farm_state.resources['eggs'] > 0:
            collected.append(f"{farm_state.resources['eggs']} eggs")
            farm_state.resources['eggs'] = 0
        if farm_state.resources['milk'] > 0:
            collected.append(f"{farm_state.resources['milk']} milk")
            farm_state.resources['milk'] = 0
        return "Collected: " + ", ".join(collected) if collected else "Nothing to collect"

@agent(type='animal')
class ChickenAgent:
    def __init__(self, name: str):
        self.name = name
        self.egg_cooldown: int = 0
        self.hunger = 0  # It's helpful to define hunger or reference it from the farm_state's AnimalState
        self.production_rates = {
            'chicken': {'resource': 'eggs', 'base_rate': 1, 'health_factor': 0.01},
            'cow': {'resource': 'milk', 'base_rate': 2, 'health_factor': 0.01}
        }
    
    @action
    def lay_egg(self, farm_state: FarmState) -> str:
        if self.egg_cooldown > 0:
            self.egg_cooldown -= 1
            return f"{self.name} needs rest to lay eggs"
        
        if farm_state.weather == 'stormy':
            return f"{self.name} too scared to lay eggs in storm"
            
        # Find the actual AnimalState for this agent (matching name).
        # Or if you run purely from farm_state, you'd handle this differently:
        # For simplicity here, we use self.hunger, but be mindful of the difference
        # between agent attribute vs. farm_state attribute.
        if self.hunger < 5:
            farm_state.resources['eggs'] += random.randint(1, 3)
            self.egg_cooldown = 2
            return f"{self.name} laid eggs! 🥚"
        return f"{self.name} needs more food to lay eggs"

    @action
    def eat(self, farm_state: FarmState) -> str:
        if farm_state.resources['feed'] >= 1:
            farm_state.resources['feed'] -= 1
            self.hunger = max(0, self.hunger - 3)
            return f"{self.name} ate feed"
        return "No feed available"

@agent(type='animal')
class CowAgent:
    def __init__(self, name: str):
        self.name = name
        self.milk_cooldown: int = 0
        self.hunger = 0
    
    @action
    def produce_milk(self, farm_state: FarmState) -> str:
        if self.milk_cooldown > 0:
            self.milk_cooldown -= 1
            return f"{self.name} needs rest to make milk"
            
        if farm_state.weather == 'heatwave':
            return f"{self.name} too hot to produce milk"
            
        if self.hunger < 4:
            farm_state.resources['milk'] += random.randint(2, 5)
            self.milk_cooldown = 3
            return f"{self.name} produced milk! 🥛"
        return f"{self.name} needs more food for milk"

    @action
    def eat(self, farm_state: FarmState) -> str:
        if farm_state.resources['feed'] >= 2:
            farm_state.resources['feed'] -= 2
            self.hunger = max(0, self.hunger - 4)
            return f"{self.name} ate feed"
        return "Not enough feed"
