## js_bridge.gd — Attach to an AutoLoad singleton (Project → Project Settings → AutoLoad → Add)
## Handles bidirectional communication between the Godot simulation and the React Dashboard.
##
## INCOMING (from Dashboard → Godot):
##   window.postMessage({ type: "simulation:command", command: "spawn_fire", x: 100, y: 200 }, "*")
##
## OUTGOING (from Godot → Dashboard):
##   Sends "simulation:tick" every TICK_INTERVAL frames with full state snapshot.
##   Sends "simulation:ready" on startup.
##
## INTEGRATION:
##   1. Copy this file to your Godot project's scripts/ folder.
##   2. Go to Project → Project Settings → AutoLoad
##   3. Add this script as "JSBridge" (make sure it's enabled)
##   4. Connect your fire system and agent nodes to the signals defined here.

extends Node

## ─── Configuration ───
const TICK_INTERVAL: int = 30  ## Send state every N physics frames (30 = ~0.5s at 60fps)

## ─── Signals ───
## Connect these to your game systems:
signal fire_spawn_requested(position: Vector2)
signal fire_remove_requested(position: Vector2)
signal agent_spawn_requested(position: Vector2, agent_name: String)
signal agent_move_requested(agent_id: String, target: Vector2)
signal agent_mode_changed(agent_id: String, mode: String)
signal simulation_reset_requested()
signal speed_change_requested(multiplier: float)
signal simulation_paused()
signal simulation_resumed()

## ─── State tracking ───
var _frame_counter: int = 0
var _is_web: bool = false

## You should populate these arrays from your game systems.
## Each entry is a Dictionary matching the JSON snapshot format.
var agents: Array[Dictionary] = []
var fires: Array[Dictionary] = []
var metrics: Dictionary = {
	"evacuated": 0,
	"trapped": 0,
	"casualties": 0,
	"avg_evacuation_time": 0.0,
	"fire_coverage_pct": 0.0,
	"blocked_exits": [],
	"total_agents": 0,
}


func _ready() -> void:
	_is_web = OS.has_feature("web")
	if _is_web:
		# Register the callback handler for incoming postMessage commands
		JavaScriptBridge.eval("""
			window.addEventListener('message', function(event) {
				if (event.data && event.data.type === 'simulation:command') {
					// Store the command for Godot to poll
					if (!window._godotCommandQueue) window._godotCommandQueue = [];
					window._godotCommandQueue.push(event.data);
				}
			});
			window._godotCommandQueue = [];
		""", true)
		
		# Notify dashboard that Godot is ready
		_post_message({
			"type": "simulation:ready",
			"timestamp": Time.get_unix_time_from_system(),
		})
		print("[JSBridge] Initialized — Web export detected, postMessage bridge active.")
	else:
		print("[JSBridge] Initialized — Not a web export, bridge disabled.")


func _physics_process(_delta: float) -> void:
	if not _is_web:
		return
	
	# Poll for incoming commands
	_poll_commands()
	
	# Send tick at intervals
	_frame_counter += 1
	if _frame_counter >= TICK_INTERVAL:
		_frame_counter = 0
		_send_tick()


## ─── Command Polling ───

func _poll_commands() -> void:
	var queue_length = JavaScriptBridge.eval("window._godotCommandQueue ? window._godotCommandQueue.length : 0", true)
	
	if queue_length == null or queue_length == 0:
		return
	
	for i in range(queue_length):
		var cmd_json = JavaScriptBridge.eval(
			"JSON.stringify(window._godotCommandQueue[%d])" % i, true
		)
		if cmd_json:
			var cmd = JSON.parse_string(cmd_json)
			if cmd:
				_handle_command(cmd)
	
	# Clear the queue
	JavaScriptBridge.eval("window._godotCommandQueue = [];", true)


func _handle_command(cmd: Dictionary) -> void:
	var command = cmd.get("command", "")
	print("[JSBridge] Command received: ", command)
	
	match command:
		"spawn_fire":
			var pos = Vector2(cmd.get("x", 0), cmd.get("y", 0))
			fire_spawn_requested.emit(pos)
		
		"remove_fire":
			var pos = Vector2(cmd.get("x", 0), cmd.get("y", 0))
			fire_remove_requested.emit(pos)
		
		"spawn_agent":
			var pos = Vector2(cmd.get("x", 0), cmd.get("y", 0))
			var agent_name = cmd.get("name", "Agent")
			agent_spawn_requested.emit(pos, agent_name)
		
		"move_agent":
			var agent_id = str(cmd.get("agent_id", ""))
			var target = Vector2(cmd.get("x", 0), cmd.get("y", 0))
			agent_move_requested.emit(agent_id, target)
		
		"set_agent_mode":
			var agent_id = str(cmd.get("agent_id", ""))
			var mode = cmd.get("mode", "ai")
			agent_mode_changed.emit(agent_id, mode)
		
		"reset_simulation":
			simulation_reset_requested.emit()
		
		"set_speed":
			var multiplier = float(cmd.get("multiplier", 1.0))
			Engine.time_scale = multiplier
			speed_change_requested.emit(multiplier)
		
		"pause":
			get_tree().paused = true
			simulation_paused.emit()
		
		"play":
			get_tree().paused = false
			simulation_resumed.emit()
		
		_:
			print("[JSBridge] Unknown command: ", command)


## ─── Tick Broadcasting ───

func _send_tick() -> void:
	# Update total_agents metric
	metrics["total_agents"] = agents.size()
	
	var snapshot = {
		"type": "simulation:tick",
		"timestamp": Time.get_unix_time_from_system(),
		"agents": agents,
		"fires": fires,
		"metrics": metrics,
	}
	_post_message(snapshot)


## ─── Utility ───

func _post_message(data: Dictionary) -> void:
	if not _is_web:
		return
	var json_str = JSON.stringify(data)
	# Escape for JS string embedding
	json_str = json_str.replace("\\", "\\\\").replace("'", "\\'")
	JavaScriptBridge.eval("window.parent.postMessage(%s, '*')" % json_str, true)


## ─── Public API for game systems ───
## Call these from your fire/agent scripts to keep the bridge state updated.

func register_agent(id: String, agent_name: String, pos: Vector2, status: String = "idle", health: int = 100, mode: String = "ai") -> void:
	agents.append({
		"id": id,
		"name": agent_name,
		"x": pos.x,
		"y": pos.y,
		"status": status,
		"health": health,
		"mode": mode,
	})


func update_agent(id: String, pos: Vector2, status: String, health: int) -> void:
	for i in range(agents.size()):
		if agents[i]["id"] == id:
			agents[i]["x"] = pos.x
			agents[i]["y"] = pos.y
			agents[i]["status"] = status
			agents[i]["health"] = health
			return


func remove_agent(id: String) -> void:
	agents = agents.filter(func(a): return a["id"] != id)


func register_fire(pos: Vector2, intensity: float = 0.8, spread_radius: float = 2.0) -> void:
	fires.append({
		"x": pos.x,
		"y": pos.y,
		"intensity": intensity,
		"spread_radius": spread_radius,
	})


func update_fire(pos: Vector2, intensity: float, spread_radius: float) -> void:
	for i in range(fires.size()):
		if abs(fires[i]["x"] - pos.x) < 10 and abs(fires[i]["y"] - pos.y) < 10:
			fires[i]["intensity"] = intensity
			fires[i]["spread_radius"] = spread_radius
			return


func remove_fire_at(pos: Vector2, radius: float = 20.0) -> void:
	fires = fires.filter(func(f): 
		return Vector2(f["x"], f["y"]).distance_to(pos) > radius
	)


func update_metrics(new_metrics: Dictionary) -> void:
	for key in new_metrics:
		metrics[key] = new_metrics[key]


func clear_all() -> void:
	agents.clear()
	fires.clear()
	metrics = {
		"evacuated": 0,
		"trapped": 0,
		"casualties": 0,
		"avg_evacuation_time": 0.0,
		"fire_coverage_pct": 0.0,
		"blocked_exits": [],
		"total_agents": 0,
	}
