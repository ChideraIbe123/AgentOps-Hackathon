import random
from datetime import datetime, timedelta
from typing import Dict, List

try:
    from agentops import record
    AGENTOPS_AVAILABLE = True
except ImportError:
    # Create a dummy record function that does nothing
    def record(event_type, data=None):
        pass
    AGENTOPS_AVAILABLE = False

from .models import FarmState, AnimalState

class FarmSimulation:
    def __init__(self):
        # Initialize with proper market prices for all resources
        initial_market_prices = {
            'eggs': 1.5,
            'milk': 3.0,
            'feed': 0.75
        }
        
        self.state = FarmState(
            resources={
                'eggs': 5,     # start with 5 eggs
                'milk': 2,     # start with 2 milk
                'feed': 100,   # start with 100 feed
                'money': 200,  # start with more money
            },
            animals=[
                AnimalState(type='chicken', name='Clucky', hunger=0, health=100, age=0),
                AnimalState(type='cow', name='Bessie', hunger=0, health=100, age=0)
            ],
            weather='sunny',
            market_prices=initial_market_prices,
            achievements=[],
            diseases=[],
            market_history=[initial_market_prices],
            total_days=0
        )
        # the rest of your init code...

        self.weather_patterns = {
            'sunny': {'weight': 60, 'impact': {'feed': 1.0}},
            'rainy': {'weight': 25, 'impact': {'milk': 0.8}},
            'stormy': {'weight': 10, 'impact': {'egg': 0.5}},
            'heatwave': {'weight': 5,  'impact': {'feed': 1.5}}
        }
        self.last_update = datetime.now()
        self.breeding_cooldowns: Dict[str, int] = {}

        # Animal production rates
        self.production_rates = {
            'chicken': {'resource': 'eggs', 'base_rate': 3, 'health_factor': 0.02},
            'cow': {'resource': 'milk', 'base_rate': 4, 'health_factor': 0.02}
        }

    def get_state(self) -> Dict:
        return self.state.dict()

    def handle_action(self, action: str, args: List) -> Dict:
        """Generic entrypoint if you want to handle actions from outside."""
        handler = getattr(self, f"handle_{action}", None)
        return handler(*args) if handler else {"error": "Invalid action"}

    def update_weather(self):
        total_weight = sum(w['weight'] for w in self.weather_patterns.values())
        r = random.uniform(0, total_weight)
        current = 0
        for weather, data in self.weather_patterns.items():
            if current + data['weight'] >= r:
                if weather != self.state.weather:
                    record('WeatherChange', {
                        'from': self.state.weather,
                        'to': weather,
                        'day': self.state.total_days
                    })
                self.state.weather = weather
                break
            current += data['weight']

    def produce_resources(self):
        """Have animals produce resources based on their type and health"""
        for animal in self.state.animals:
            if animal.hunger >= 8:  # Only stop production when very hungry
                continue
                
            production_info = self.production_rates.get(animal.type)
            if production_info:
                # Calculate production amount based on health and hunger
                health_bonus = animal.health * production_info['health_factor']
                hunger_penalty = max(0, animal.hunger - 5) * 0.1  # Only apply penalty when hunger > 5
                production = max(1, production_info['base_rate'] + health_bonus - hunger_penalty)  # Minimum 1 resource
                
                # Add produced resources
                resource = production_info['resource']
                self.state.resources[resource] += production
                
                record('ResourceProduced', {
                    'animal': animal.name,
                    'resource': resource,
                    'amount': production
                })

    def spread_diseases(self):
        # Very rare disease chance
        if random.random() < 0.03 + (len(self.state.diseases) * 0.02):  # Reduced from 0.08 to 0.03
            disease = random.choice(['avian_flu', 'hoof_rot', 'swine_fever'])
            # Only very weak animals get sick
            eligible_animals = [a for a in self.state.animals if a.hunger > 5 or a.health < 40]  # More forgiving thresholds
            if eligible_animals:
                animal = random.choice(eligible_animals)
                self.state.diseases.append({
                    'type': disease,
                    'animal': animal.name,
                    'start_day': self.state.total_days
                })
                record('DiseaseOutbreak', {'disease': disease, 'animal': animal.name})

        # Progress existing diseases
        for disease in self.state.diseases.copy():
            animal = next((a for a in self.state.animals if a.name == disease['animal']), None)
            if not animal:
                self.state.diseases.remove(disease)
                continue

            # Very mild health damage from diseases
            animal.health -= 1  # Reduced from 3 to 1
            
            # Easy recovery
            if animal.hunger <= 3 and animal.health >= 50:  # Much easier to recover
                if random.random() < 0.4:  # Increased from 0.25 to 0.4
                    self.state.diseases.remove(disease)
                    record('AnimalRecovered', {
                        'name': animal.name,
                        'type': animal.type,
                        'disease': disease['type']
                    })
                    continue

            # Only die when extremely unhealthy
            if animal.health <= 15:  # Reduced from 35 to 15
                self.state.animals.remove(animal)
                self.state.diseases.remove(disease)
                record('AnimalDied', {
                    'name': animal.name,
                    'type': animal.type,
                    'cause': disease['type']
                })

    def update_market(self):
        for item in self.state.market_prices:
            # Special handling for feed - price increases more aggressively over time
            if item == 'feed':
                # More aggressive time-based inflation
                time_factor = min(5.0, 1.0 + (self.state.total_days / 30))  # Max 5x multiplier, reaches max in 120 days
                change = random.uniform(-0.05, 0.25) * time_factor  # Much more upward pressure
                
                # Minimum price increases more rapidly
                min_price = 0.75 * (1 + (self.state.total_days / 20))  # Base price increases 5% per day
                
                # Apply both the random change and ensure minimum price
                self.state.market_prices[item] = max(
                    min_price,
                    self.state.market_prices[item] * (1 + change)
                )
            else:
                # Normal fluctuation for other items
                change = random.uniform(-0.25, 0.35)
                self.state.market_prices[item] = max(0.5, 
                    self.state.market_prices[item] * (1 + change))
        
        self.state.market_history.append(self.state.market_prices.copy())
        if len(self.state.market_history) > 30:
            self.state.market_history.pop(0)
        record('MarketUpdate', self.state.market_prices)

    def handle_buy_feed(self, amount: int):
        cost = int(amount) * self.state.market_prices['feed']
        if self.state.resources['money'] >= cost:
            self.state.resources['money'] -= cost
            self.state.resources['feed'] += int(amount)
            record('FeedPurchased', {'amount': amount, 'cost': cost})
            self.check_achievement('farmer')
            return {"success": f"Bought {amount} feed for ${cost:.2f}"}
        return {"error": f"Need ${cost:.2f} to buy feed"}

    def handle_feed_animals(self):
        """Feed all animals that are hungry"""
        if self.state.resources['feed'] <= 0:
            return {"error": "No feed available"}

        fed_animals = []
        for animal in self.state.animals:
            if animal.hunger > 0 and self.state.resources['feed'] > 0:
                feed_amount = min(animal.hunger, self.state.resources['feed'])
                self.state.resources['feed'] -= feed_amount
                animal.hunger = max(0, animal.hunger - feed_amount)
                # Feeding now provides more health benefits
                health_gain = feed_amount * 2  # Each feed point gives 2 health
                animal.health = min(100, animal.health + health_gain)
                fed_animals.append(animal.name)

        if fed_animals:
            record('AnimalsFed', {'animals': fed_animals})
            return {"success": f"Fed animals: {', '.join(fed_animals)}"}
        return {"error": "No hungry animals to feed"}

    def handle_sell(self, item: str, quantity: int):
        if item not in self.state.market_prices:
            return {"error": f"Invalid item: {item}"}
        if self.state.resources.get(item, 0) < quantity:
            return {"error": f"Not enough {item}"}

        earnings = quantity * self.state.market_prices[item]
        self.state.resources[item] -= quantity
        self.state.resources['money'] += earnings
        record('ItemSold', {'item': item, 'quantity': quantity, 'earnings': earnings})
        self.check_achievement('farmer')
        return {"success": f"Sold {quantity} {item} for ${earnings:.2f}"}

    def handle_breed(self, animal1_name: str, animal2_name: str):
        # Find the animals
        try:
            animal1 = next(a for a in self.state.animals if a.name == animal1_name)
            animal2 = next(a for a in self.state.animals if a.name == animal2_name)
        except StopIteration:
            return {"error": "One or both animals not found"}
        
        if animal1.type != animal2.type:
            return {"error": "Different species can't breed"}
        if animal1.hunger > 3 or animal2.hunger > 3:
            return {"error": "Animals too hungry to breed"}
        if self.breeding_cooldowns.get(animal1.name, 0) > 0:
            return {"error": f"{animal1.name} needs rest"}
        
        baby = AnimalState(
            type=animal1.type,
            name=f"Baby_{animal1.type}_{len(self.state.animals)+1}",
            hunger=0,
            health=100,
            age=0
        )
        self.state.animals.append(baby)
        self.breeding_cooldowns[animal1.name] = 5  # e.g. 5 day cooldown
        self.breeding_cooldowns[animal2.name] = 5
        record('AnimalBred', {
            'parent1': animal1.name,
            'parent2': animal2.name,
            'baby': baby.name
        })
        self.check_achievement('breeder')
        return {"success": f"New {baby.type} born: {baby.name}"}

    def spread_time_effects(self):
        """A helper you might call each 'day' to increase hunger, age, etc."""
        for animal in self.state.animals:
            animal.age += 1
            # Very slow hunger increase
            animal.hunger += random.randint(1, 2)  # Reduced from 2-4 to 1-2
            
            # Minimal health loss from hunger
            if animal.hunger > 5:  # Changed from 3 to 5
                health_loss = (animal.hunger - 4) * 0.5  # Much reduced health loss
                animal.health = max(0, animal.health - health_loss)
            
            # Better health recovery
            if animal.hunger <= 2:  # Easier to recover health
                animal.health = min(100, animal.health + 3)  # Increased from 2 to 3

            # Only die in extreme cases
            if animal.hunger >= 15 or animal.health <= 10:  # Much more forgiving thresholds
                self.state.animals.remove(animal)
                record('AnimalDied', {
                    'name': animal.name,
                    'type': animal.type,
                    'cause': 'starvation' if animal.hunger >= 15 else 'poor_health'
                })

        # Decrement breeding cooldowns
        for name in list(self.breeding_cooldowns.keys()):
            self.breeding_cooldowns[name] -= 1
            if self.breeding_cooldowns[name] <= 0:
                del self.breeding_cooldowns[name]

        # Have animals produce resources
        self.produce_resources()

    def advance_time(self):
        """
        Advance the simulation by one day.
        """
        self.state.total_days += 1
        self.update_weather()
        self.spread_diseases()
        self.update_market()
        self.spread_time_effects()
        self.last_update = datetime.now()
        record('DailyUpdate', self.state.dict())
        return True

    def check_achievement(self, category: str):
        achievements_map = {
            'farmer': [
                ('feed_purchased', self.state.resources.get('feed', 0) >= 100),
                ('millionaire', self.state.resources['money'] >= 1000)
            ],
            'breeder': [
                ('prolific', len(self.state.animals) >= 10)
            ]
        }
        
        for name, condition in achievements_map.get(category, []):
            if condition and name not in self.state.achievements:
                self.state.achievements.append(name)
                record('AchievementUnlocked', {'name': name})

    def handle_buy_animal(self, animal_type: str, name: str) -> Dict:
        """Buy a new animal for the farm"""
        # Define costs for different animal types
        costs = {
            'chicken': 50,
            'cow': 200
        }
        
        if animal_type not in costs:
            return {"error": f"Invalid animal type: {animal_type}"}
            
        cost = costs[animal_type]
        if self.state.resources['money'] < cost:
            return {"error": f"Not enough money. Need ${cost}"}
            
        # Check if name is already taken
        if any(animal.name == name for animal in self.state.animals):
            return {"error": f"An animal named {name} already exists"}
            
        # Create new animal
        new_animal = AnimalState(
            type=animal_type,
            name=name,
            hunger=0,
            health=100,
            age=0
        )
        
        # Add animal and deduct money
        self.state.animals.append(new_animal)
        self.state.resources['money'] -= cost
        
        record('AnimalPurchased', {
            'type': animal_type,
            'name': name,
            'cost': cost
        })
        
        return {"success": f"Bought {animal_type} named {name} for ${cost}"}
