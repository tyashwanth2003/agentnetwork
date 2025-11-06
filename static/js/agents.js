// Agent Controller - Handles communication with backend
let currentSessionId = null;
let isProcessing = false;

document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start-btn');
    const taskInput = document.getElementById('task-input');
    
    startBtn.addEventListener('click', startCollaboration);
    
    // Enable Enter key in textarea
    taskInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            startCollaboration();
        }
    });
});

async function startCollaboration() {
    if (isProcessing) return;
    
    const taskInput = document.getElementById('task-input');
    const task = taskInput.value.trim();
    
    if (!task) {
        alert('Please enter a task description');
        return;
    }
    
    // Get assigned roles
    const roles = {
        agent1: document.getElementById('role1').value,
        agent2: document.getElementById('role2').value,
        agent3: document.getElementById('role3').value
    };
    
    isProcessing = true;
    updateButtonState(true);
    clearActivityLog();
    clearOutput();
    
    try {
        // 1. Initialize task
        addActivityLog('System', 'Initializing task and session...', 'system');
        
        const initResponse = await fetch('/api/start-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task, roles })
        });
        
        const initData = await initResponse.json();
        
        if (!initData.success) {
            throw new Error(initData.error || 'Failed to initialize task');
        }
        
        currentSessionId = initData.session_id;
        addActivityLog('System', 'Task initialized. Agents are moving to the conference table.', 'system');
        
        // 2. Animate agents moving (scene.js function)
        moveAgentToTable('agent1', 0);
        setTimeout(() => moveAgentToTable('agent2', 1), 500);
        setTimeout(() => moveAgentToTable('agent3', 2), 1000);
        
        // Wait for agents to reach table
        await sleep(3500); 

        // Agents say Hi (Initial check-in)
        showAgentMessage('agent1', `Hello team! Task: ${truncateText(task, 40)}`);
        await sleep(1500);
        showAgentMessage('agent2', 'Research will be key here.');
        await sleep(1500);
        showAgentMessage('agent3', "Understood. I'll focus on the presentation.");
        await sleep(2000);

        hideAgentMessages();
        
        updateAgentStatus('agent1', `${roles.agent1} - Ready`);
        updateAgentStatus('agent2', `${roles.agent2} - Ready`);
        updateAgentStatus('agent3', `${roles.agent3} - Ready`);
        
        addActivityLog('System', 'Agents seated. Starting collaboration stream...', 'system');
        
        // 3. Concurrently run the stream execution and the simulated chat
        const streamPromise = streamExecution(currentSessionId, roles);
        const chatPromise = runSimulatedConversation(roles);
        
        await Promise.all([streamPromise, chatPromise]);
        
    } catch (error) {
        console.error('Error:', error);
        addActivityLog('System', `Error: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        updateButtonState(false);
        updateAgentStatus('agent1', 'Idle');
        updateAgentStatus('agent2', 'Idle');
        updateAgentStatus('agent3', 'Idle');
        // Ensure all messages are hidden
        if (window.hideAgentMessages) window.hideAgentMessages(); 
    }
}


// --- NEW SIMULATED CONVERSATION FUNCTION ---
async function runSimulatedConversation(roles) {
    const chatSequence = [
        // Phase 1: Task Analysis (Happens concurrently)
        { id: 'agent1', message: `Manager: I'm breaking this down into deliverables now.`, delay: 1000 },
        { id: 'agent2', message: `Researcher: Starting my information gathering, looking for key data points.`, delay: 2500 },
        { id: 'agent3', message: `Designer: Aligning the visual structure with the task requirements.`, delay: 3000 },
        
        // Phase 2: Discussion and Refinement
        { id: 'agent1', message: `Manager: Researcher, are your dependencies clear?`, delay: 4000 },
        { id: 'agent2', message: `Researcher: Yes, focusing on feasibility and constraints.`, delay: 2000 },
        { id: 'agent3', message: `Designer: Manager, I suggest a component-based approach.`, delay: 3500 },

        // Phase 3: Execution (Longest phase, more frequent check-ins)
        { id: 'agent2', message: `Researcher: Found some critical data! Processing...`, delay: 5000 },
        { id: 'agent1', message: `Manager: Keep the momentum up, team! We're making good progress.`, delay: 4000 },
        { id: 'agent3', message: `Designer: Draft complete. Adding final styling touches.`, delay: 6000 },
        { id: 'agent2', message: `Researcher: Finalizing my report structure. Almost done.`, delay: 3000 },

        // Phase 4: Review and Finalize
        { id: 'agent3', message: `Designer: Reviewing the Manager's proposed solution. Looks solid.`, delay: 5000 },
        { id: 'agent1', message: `Manager: Sending my review notes to the Researcher now.`, delay: 2000 },
        { id: 'agent2', message: `Researcher: Incorporating feedback on the data accuracy.`, delay: 3500 },

        // Phase 5: Final Compilation
        { id: 'agent1', message: `Manager: Compiling all deliverables into the final report.`, delay: 6000 } // Wait until near end
    ];
    
    let isStreamActive = true;
    
    // Check if the stream has finished every 500ms
    const checkStreamStatus = setInterval(() => {
        // The resolve() in streamExecution will implicitly stop this loop's purpose.
        // We'll rely on the main `finally` block to stop all activity.
        // We just need a way to stop the chat sequence if the stream ends prematurely.
        if (!isProcessing) {
             clearInterval(checkStreamStatus);
        }
    }, 500);

    for (const chat of chatSequence) {
        if (!isProcessing) break; // Stop if the main collaboration is finished (or errored)

        // Show the message in the 3D scene
        showAgentMessage(chat.id, chat.message); 
        
        // Wait for the specified delay
        await sleep(chat.delay);
        
        // Hide the message after the delay (optional, but makes it less cluttered)
        hideAgentMessages();
    }
}
// --- END NEW SIMULATED CONVERSATION FUNCTION ---


// NEW FUNCTION: streamExecution
function streamExecution(sessionId, roles) {
    return new Promise((resolve, reject) => {
        // Use EventSource for Server-Sent Events
        const eventSource = new EventSource(`/api/stream-task/${sessionId}`);

        eventSource.onmessage = async function(event) {
            const data = JSON.parse(event.data);
            
            // NOTE: Removed phase_start/phase_complete events as requested in previous step
            
            if (data.event === 'agent_result') {
                const role = roles[data.id];
                
                updateAgentStatus(data.id, `${role} - ${data.status}`);
                
                // Show a brief status message (e.g., "Working...") while the console logs the full result
                showAgentMessage(data.id, `Working on: ${data.phase_name}...`);

                // Log the result
                addActivityLog(
                    `Agent ${data.id.slice(-1)} (${role}) - ${data.status}`,
                    truncateText(data.output, 200),
                    data.id
                );
                
                // Add a slight pause to visually show activity, then hide the status message
                await sleep(500); 
                hideAgentMessages();

            } else if (data.event === 'final_output') {
                addActivityLog('System', '--- FINAL OUTPUT GENERATED ---', 'system');
                displayFinalOutput(data.output);
                
            } else if (data.event === 'end') {
                addActivityLog('System', 'Collaboration stream closed successfully. Finalizing...', 'system');
                eventSource.close();
                resolve(); // Resolve the promise when stream ends
                
            } else if (data.event === 'error') {
                addActivityLog('System', `Collaboration Error: ${data.message}`, 'error');
                eventSource.close();
                reject(new Error(data.message)); // Reject the promise on error
            }
        };

        eventSource.onerror = function(err) {
            console.error('EventSource failed:', err);
            eventSource.close();
            reject(new Error('Connection error during collaboration stream.'));
        };
    });
}

function updateAgentStatus(agentId, status) {
// ... (rest of the helper functions are unchanged)
    const statusElement = document.getElementById(`${agentId}-status`);
    if (statusElement) {
        const agentNumber = agentId.slice(-1);
        statusElement.textContent = `Agent ${agentNumber}: ${status}`;
    }
}

function addActivityLog(agent, message, type = '') {
    const activityLog = document.getElementById('activity-log');
    const item = document.createElement('div');
    item.className = `activity-item ${type}`;
    
    const header = document.createElement('div');
    header.className = 'activity-header';
    header.textContent = agent;
    
    const content = document.createElement('div');
    content.className = 'activity-content';
    content.textContent = message;
    
    item.appendChild(header);
    item.appendChild(content);
    activityLog.appendChild(item);
    
    // Auto-scroll to bottom
    activityLog.scrollTop = activityLog.scrollHeight;
}

// Function to render Markdown in the final output box
// NOTE: Using a simple regex approach here, but Marked.js should be used for robustness.
function displayFinalOutput(output) {
    const outputBox = document.getElementById('final-output');
    outputBox.classList.remove('placeholder-content');
    outputBox.classList.add('has-content');

    // Use marked.js if available, otherwise fall back to simple conversion
    if (window.marked) {
        outputBox.innerHTML = marked.parse(output);
    } else {
        // Fallback for code blocks and line breaks
        let htmlContent = output;
        htmlContent = htmlContent.replace(/```(\w+)?\n([\s\S]+?)\n```/g, function(match, lang, code) {
             const language = lang || 'plaintext';
             const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
             return `<div class="code-block"><pre><code class="language-${language}">${escapedCode}</code></pre></div>`;
        });
        htmlContent = htmlContent.replace(/\n\s*\n/g, '</p><p>').replace(/\n/g, '<br>');
        outputBox.innerHTML = `<p>${htmlContent}</p>`;
    }
}


function clearActivityLog() {
    const activityLog = document.getElementById('activity-log');
    activityLog.innerHTML = '';
}

function clearOutput() {
    const outputBox = document.getElementById('final-output');
    outputBox.classList.remove('has-content');
    outputBox.classList.add('placeholder-content');
    outputBox.innerHTML = '<p class="placeholder">The collaborative result will appear here...</p>';
}

function updateButtonState(processing) {
    const startBtn = document.getElementById('start-btn');
    if (processing) {
        startBtn.disabled = true;
        startBtn.innerHTML = '<span class="loading"></span> Collaborating...';
    } else {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Collaboration';
    }
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '... (See log for full output)';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Global functions for scene.js to call
window.showAgentMessage = function(agentId, message) {
    const agent = agents.find(a => a.userData.id === agentId);
    if (agent) {
        agent.userData.message = message;
        agent.userData.messageTime = Date.now();
        agent.userData.showMessage = true;
    }
}

window.hideAgentMessages = function() {
    agents.forEach(agent => {
        agent.userData.showMessage = false;
        agent.userData.message = null;
    });
}