from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
import asyncio
import json
import traceback

# --- Agent imports ---
try:
    from agents.gemini_agent import GeminiAgent
    from agents.deepseek_agent import DeepSeekAgent
    from agents.groq_agent import GroqAgent
except Exception as e:
    print(f"⚠️ Agent import error: {e}")

# --- Flask app setup ---
app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# --- Initialize agents safely ---
print("🚀 Initializing agents...")
def safe_init(agent_class, name):
    try:
        instance = agent_class()
        print(f"✅ {name} initialized")
        return instance
    except Exception as e:
        print(f"❌ {name} failed: {e}")
        return None

gemini_agent = safe_init(GeminiAgent, "Gemini Agent")
deepseek_agent = safe_init(DeepSeekAgent, "DeepSeek Agent")
groq_agent = safe_init(GroqAgent, "Groq Agent")

print("✨ All agents ready!\n")

# --- Store active sessions ---
active_sessions = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health():
    return jsonify({"status": "ok"}), 200


# --- Start task route ---
@app.route('/api/start-task', methods=['POST'])
def start_task():
    print("\n📥 Received start-task request")
    try:
        data = request.json
        task = data.get('task')
        roles = data.get('roles', {})

        session_id = str(len(active_sessions) + 1)

        agent_mapping = {
            'agent1': {'agent': gemini_agent, 'role': roles.get('agent1', 'manager'), 'color': 'red'},
            'agent2': {'agent': deepseek_agent, 'role': roles.get('agent2', 'researcher'), 'color': 'blue'},
            'agent3': {'agent': groq_agent, 'role': roles.get('agent3', 'designer'), 'color': 'green'}
        }

        active_sessions[session_id] = {
            'task': task,
            'agents': agent_mapping,
            'status': 'initialized'
        }

        print(f"✅ Session {session_id} created\n")
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'Task initialized'
        })
    except Exception as e:
        print(f"❌ Error in start-task: {e}\n")
        return jsonify({'success': False, 'error': str(e)}), 500


# --- SSE Streaming Endpoint ---
@app.route('/api/stream-task/<session_id>', methods=['GET'])
def stream_task(session_id):
    if session_id not in active_sessions:
        return jsonify({'success': False, 'error': 'Session not found'}), 404

    session = active_sessions[session_id]
    task = session['task']
    agents = session['agents']

    def generate():
        print(f"\n📡 Streaming session {session_id}")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            results_generator = execute_agent_collaboration_stream(task, agents)

            async def run_and_yield():
                async for chunk in results_generator:
                    yield f"data: {json.dumps(chunk)}\n\n"
                yield "data: {\"event\": \"end\"}\n\n"

            for chunk in loop.run_until_complete(run_and_collect(run_and_yield())):
                yield chunk

        except Exception as e:
            print(f"❌ Streaming error: {e}")
            traceback.print_exc()
            yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"

    async def run_and_collect(async_gen):
        results = []
        async for item in async_gen:
            results.append(item)
        return results

    return Response(generate(), mimetype='text/event-stream')


# --- Async Collaboration Logic ---
async def execute_agent_collaboration_stream(task, agents):
    """Execute the full agent collaboration workflow and yield phase results."""
    print("🤝 Starting collaboration phases (Streaming)...")
    agent_list = list(agents.items())

    # Helpers
    def yield_phase_start(name): return {'event': 'phase_start', 'name': name}
    def yield_phase_complete(name): return {'event': 'phase_complete', 'name': name}
    def yield_agent_result(phase, id, role, status, output):
        return {'event': 'agent_result', 'phase_name': phase, 'id': id, 'role': role, 'status': status, 'output': output}

    async def safe_generate(agent, prompt):
        if not agent:
            return "⚠️ Agent unavailable."
        try:
            return await agent.generate(prompt)
        except Exception as e:
            return f"⚠️ Error generating response: {e}"

    # ---- PHASE 1: Task Analysis ----
    phase = "Task Analysis"
    yield yield_phase_start(phase)
    print(f"\n📋 {phase}")
    phase1_results = []

    for agent_id, agent_data in agent_list:
        agent, role = agent_data['agent'], agent_data['role']
        prompt = f"You are a {role} working on: {task}. Describe your 3 main responsibilities and deliverables."
        response = await safe_generate(agent, prompt)
        result = {'id': agent_id, 'role': role, 'status': 'analyzed', 'output': response}
        phase1_results.append(result)
        yield yield_agent_result(phase, **result)
    yield yield_phase_complete(phase)

    # ---- PHASE 2: Discussion ----
    phase = "Team Discussion"
    yield yield_phase_start(phase)
    print(f"\n💬 {phase}")
    discussion_context = "\n\n".join([f"{a['role']}: {a['output']}" for a in phase1_results])
    phase2_results = []

    for agent_id, agent_data in agent_list:
        agent, role = agent_data['agent'], agent_data['role']
        prompt = f"As the {role}, give short feedback on the team's analysis:\n{discussion_context}"
        response = await safe_generate(agent, prompt)
        result = {'id': agent_id, 'role': role, 'status': 'discussed', 'output': response}
        phase2_results.append(result)
        yield yield_agent_result(phase, **result)
    yield yield_phase_complete(phase)

    # ---- PHASE 3: Execution ----
    phase = "Execution"
    yield yield_phase_start(phase)
    print(f"\n⚙️ {phase}")
    feedback_context = "\n\n".join([f"{a['role']} feedback: {a['output']}" for a in phase2_results])
    phase3_results = []

    for i, (agent_id, agent_data) in enumerate(agent_list):
        agent, role = agent_data['agent'], agent_data['role']
        prompt = f"Task: {task}\nAnalysis: {phase1_results[i]['output']}\nFeedback: {feedback_context}\nNow act as {role} and deliver a detailed result."
        response = await safe_generate(agent, prompt)
        result = {'id': agent_id, 'role': role, 'status': 'executed', 'output': response}
        phase3_results.append(result)
        yield yield_agent_result(phase, **result)
    yield yield_phase_complete(phase)

    # ---- PHASE 4: Review ----
    phase = "Final Review"
    yield yield_phase_start(phase)
    print(f"\n🔍 {phase}")
    work_outputs = "\n\n".join([f"{a['role']}'s work:\n{a['output']}" for a in phase3_results])
    phase4_results = []

    for agent_id, agent_data in agent_list:
        agent, role = agent_data['agent'], agent_data['role']
        prompt = f"Review all outputs below as the {role}. Suggest final improvements:\n{work_outputs}"
        response = await safe_generate(agent, prompt)
        result = {'id': agent_id, 'role': role, 'status': 'reviewed', 'output': response}
        phase4_results.append(result)
        yield yield_agent_result(phase, **result)
    yield yield_phase_complete(phase)

    # ---- PHASE 5: Compilation ----
    phase = "Final Compilation"
    yield yield_phase_start(phase)
    print(f"\n📦 {phase}")
    manager_agent = next((a['agent'] for _, a in agent_list if a['role'].lower() == 'manager'), None)
    manager_role = "Manager"

    final_review = "\n".join([f"{a['role']}: {a['output']}" for a in phase4_results])
    final_prompt = f"Task: {task}\n\nTeam outputs and reviews:\n{final_review}\n\nCompile everything into one clear, markdown-formatted final result."
    final_output = await safe_generate(manager_agent, final_prompt)
    yield {'event': 'final_output', 'output': final_output}
    yield yield_phase_complete(phase)

    print("🎉 Collaboration complete!")


# --- Run mode handling ---
if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("🌐 Starting AgentNetwork.ai server (local mode)...")
    print("=" * 50 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
else:
    # Required for Vercel
    application = app
