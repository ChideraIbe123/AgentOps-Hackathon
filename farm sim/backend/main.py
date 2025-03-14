from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import os
import sys
import traceback
import asyncio
from typing import Dict, Any, Set
from datetime import datetime

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables and configuration
active_connections: Set[WebSocket] = set()
TIME_INTERVAL = 10  # 1 second per day
BROADCAST_BATCH = 3  # Advance time by 3 days in each update

print("Starting server initialization...")
print(f"Game speed: {BROADCAST_BATCH} days every {TIME_INTERVAL} seconds")

# Initialize AgentOps
try:
    import agentops
    api_key = os.environ.get("AGENTOPS_API_KEY")
    if api_key:
        agentops.init(api_key=api_key)
        print("AgentOps initialized successfully")
    else:
        print("No AgentOps API key found, skipping initialization")
except Exception as e:
    print(f"Error initializing AgentOps: {e}")

# Load farm simulation
print("Loading farm simulation...")
try:
    from farm import FarmSimulation
    farm = FarmSimulation()
    initial_state = farm.get_state()
    print("Farm simulation loaded successfully")
    print(f"Initial state: {json.dumps(initial_state, indent=2)}")
except Exception as e:
    print(f"Error loading farm simulation: {e}")
    traceback.print_exc()
    sys.exit(1)

async def broadcast_state():
    """Broadcast the current state to all connected clients"""
    if not active_connections:
        return
    
    state = farm.get_state()
    for connection in active_connections:
        try:
            await connection.send_json({
                "type": "state_update",
                "state": state
            })
        except Exception as e:
            print(f"Error broadcasting to {connection.client.host}:{connection.client.port}: {e}")
            active_connections.remove(connection)

@app.get("/")
async def root():
    """Health check endpoint"""
    return JSONResponse({
        "status": "ok",
        "message": "Farm simulation backend is running",
        "timestamp": datetime.now().isoformat()
    })

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    client_id = f"{websocket.client.host}:{websocket.client.port}"
    print(f"WebSocket connection accepted from {client_id}")
    last_state_broadcast = datetime.now()
    
    # Send initial state immediately after connection
    try:
        initial_state = farm.get_state()
        print(f"Sending initial state to {client_id}")
        await websocket.send_json({
            "type": "initial_state",
            "state": initial_state
        })
    except Exception as e:
        print(f"Error sending initial state to {client_id}: {e}")
        return
    
    try:
        while True:
            # Check if we need to advance time and broadcast state
            now = datetime.now()
            if (now - last_state_broadcast).total_seconds() >= TIME_INTERVAL:
                # Advance time multiple days at once
                for _ in range(BROADCAST_BATCH):
                    farm.advance_time()
                await broadcast_state()
                last_state_broadcast = now
            
            try:
                # Wait for messages with a shorter timeout
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                print(f"Received message from {client_id}: {data}")
                
                try:
                    message = json.loads(data)
                    action = message.get("action")
                    print(f"Processing action from {client_id}: {action}")
                    response = None
                    
                    if action == "get_state":
                        response = {"type": "state_update", "state": farm.get_state()}
                    
                    elif action == "buy_feed":
                        amount = int(message.get("amount", 10))
                        print(f"Buying feed: {amount}")
                        result = farm.handle_buy_feed(amount)
                        response = {**result, "type": "action_result", "state": farm.get_state()}
                    
                    elif action == "feed_animals":
                        print("Feeding animals")
                        result = farm.handle_feed_animals()
                        response = {**result, "type": "action_result", "state": farm.get_state()}
                    
                    elif action == "sell":
                        item = message.get("item")
                        quantity = int(message.get("quantity", 1))
                        print(f"Selling {quantity} {item}")
                        result = farm.handle_sell(item, quantity)
                        response = {**result, "type": "action_result", "state": farm.get_state()}
                    
                    elif action == "breed":
                        animal1 = message.get("animal1")
                        animal2 = message.get("animal2")
                        print(f"Breeding {animal1} with {animal2}")
                        result = farm.handle_breed(animal1, animal2)
                        response = {**result, "type": "action_result", "state": farm.get_state()}
                    
                    elif action == "buy_animal":
                        animal_type = message.get("type")
                        name = message.get("name")
                        print(f"Buying new {animal_type} named {name}")
                        result = farm.handle_buy_animal(animal_type, name)
                        response = {**result, "type": "action_result", "state": farm.get_state()}
                    
                    else:
                        print(f"Unknown action received from {client_id}: {action}")
                        response = {
                            "type": "error",
                            "error": f"Unknown action: {action}",
                            "state": farm.get_state()
                        }
                    
                    print(f"Sending response to {client_id}")
                    await websocket.send_json(response)
                    await broadcast_state()  # Broadcast state after any action
                    
                except json.JSONDecodeError:
                    print(f"Invalid JSON received from {client_id}: {data}")
                    await websocket.send_json({
                        "type": "error",
                        "error": "Invalid JSON",
                        "state": farm.get_state()
                    })
                except Exception as e:
                    print(f"Error processing message from {client_id}: {e}")
                    traceback.print_exc()
                    await websocket.send_json({
                        "type": "error",
                        "error": str(e),
                        "state": farm.get_state()
                    })
            
            except asyncio.TimeoutError:
                # This is normal, just continue the loop
                continue
            except Exception as e:
                print(f"Error receiving message from {client_id}: {e}")
                break
    
    except WebSocketDisconnect:
        print(f"WebSocket disconnected from {client_id}")
    except Exception as e:
        print(f"WebSocket error for {client_id}: {e}")
        traceback.print_exc()
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True
    )
