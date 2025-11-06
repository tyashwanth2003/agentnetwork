// Three.js Scene Setup
let scene, camera, renderer;
let agents = [];
let table;
let chairs = [];
let controls; 

// Define the global moveAgentToTable function here for agents.js access
window.moveAgentToTable = moveAgentToTable;

// Constants
const AGENT_COLORS = {
    agent1: 0xff4444,
    agent2: 0x4444ff,
    agent3: 0x44ff44
};

// HTML element for message display (created dynamically)
const messageContainer = document.createElement('div');
messageContainer.style.position = 'absolute';
// CRITICAL FIX: Ensure the container is positioned relative to the THREE container, not the body
const threeContainer = document.getElementById('three-container'); 
if (threeContainer) {
    threeContainer.style.position = 'relative'; // Ensure the three-container is positioned
    threeContainer.appendChild(messageContainer);
    messageContainer.style.width = '100%';
    messageContainer.style.height = '100%';
    messageContainer.style.top = '0';
    messageContainer.style.left = '0';
    messageContainer.style.pointerEvents = 'none'; 
}


function initScene() {
    const container = document.getElementById('three-container');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    scene.fog = new THREE.Fog(0xf0f0f0, 10, 50);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(5, 10, 15);
    camera.lookAt(0, 1, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Create round table
    createTable();
    
    // Create agents (Lego-style dolls)
    createAgents();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

function createTable() {
    // Table top
    const tableGeometry = new THREE.CylinderGeometry(3, 3, 0.2, 32);
    const tableMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4e342e, // Posh: Darker wood
        roughness: 0.5,
        metalness: 0.1
    });
    table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = 1.5;
    table.castShadow = true;
    table.receiveShadow = true;
    scene.add(table);
    
    // Table leg
    const legGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16);
    const leg = new THREE.Mesh(legGeometry, tableMaterial);
    leg.position.y = 0.75;
    leg.castShadow = true;
    scene.add(leg);
    
    // Create chairs around the table
    const chairPositions = [
        // Pos 0: Manager (front/center)
        { x: 0, z: 3.5, rotation: Math.PI }, 
        // Pos 1: Researcher (right)
        { x: -3, z: -1.5, rotation: Math.PI * 0.33 }, 
        // Pos 2: Designer (left)
        { x: 3, z: -1.5, rotation: -Math.PI * 0.33 }
    ];
    
    chairPositions.forEach(pos => {
        const chair = createChair();
        chair.position.set(pos.x, 0, pos.z);
        chair.rotation.y = pos.rotation;
        chairs.push(chair);
        scene.add(chair);
    });
}

function createChair() {
    const chairGroup = new THREE.Group();
    const chairMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x795548, // Posh: Medium brown leather look
        roughness: 0.7
    });
    
    // Seat
    const seatGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.8);
    const seat = new THREE.Mesh(seatGeometry, chairMaterial);
    seat.position.y = 0.8;
    seat.castShadow = true;
    chairGroup.add(seat);
    
    // Backrest
    const backGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.1);
    const back = new THREE.Mesh(backGeometry, chairMaterial);
    back.position.set(0, 1.3, -0.35);
    back.castShadow = true;
    chairGroup.add(back);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const legPositions = [
        [-0.3, 0.4, 0.3],
        [0.3, 0.4, 0.3],
        [-0.3, 0.4, -0.3],
        [0.3, 0.4, -0.3]
    ];
    
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, chairMaterial);
        leg.position.set(...pos);
        leg.castShadow = true;
        chairGroup.add(leg);
    });
    
    return chairGroup;
}

function createAgents() {
    const startPositions = [
        { x: -8, z: 5 }, // Red
        { x: -8, z: 0 }, // Blue
        { x: -8, z: -5 } // Green
    ];
    
    const agentIds = ['agent1', 'agent2', 'agent3'];
    
    agentIds.forEach((id, index) => {
        const agent = createLegoAgent(AGENT_COLORS[id]);
        agent.position.set(startPositions[index].x, 0, startPositions[index].z);
        agent.userData = {
            id: id,
            targetPosition: null,
            isWalking: false,
            isSeated: false,
            // New messaging fields
            showMessage: false,
            message: null,
            messageDiv: createMessageDiv(id) // Attach HTML div
        };
        agents.push(agent);
        scene.add(agent);
    });
}

function createLegoAgent(color) {
    const agentGroup = new THREE.Group();
    
    // Body (rectangular like Lego)
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.6,
        metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.2;
    body.castShadow = true;
    agentGroup.add(body);
    
    // Head
    const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffdbac,
        roughness: 0.8
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2; // Position Y: 2
    head.castShadow = true;
    agentGroup.add(head);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-0.4, 1.2, 0);
    leftArm.castShadow = true;
    agentGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(0.4, 1.2, 0);
    rightArm.castShadow = true;
    agentGroup.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.15, 0.35, 0);
    leftLeg.castShadow = true;
    agentGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.15, 0.35, 0);
    rightLeg.castShadow = true;
    agentGroup.add(rightLeg);
    
    return agentGroup;
}

// --- MESSAGE FUNCTIONS (Updated for correct positioning) ---
function createMessageDiv(agentId) {
    const div = document.createElement('div');
    div.id = `msg-${agentId}`;
    div.style.position = 'absolute';
    div.style.background = 'rgba(255, 255, 255, 0.95)';
    div.style.border = '2px solid var(--primary-color)';
    div.style.borderRadius = '10px';
    div.style.padding = '8px 12px';
    div.style.maxWidth = '150px';
    div.style.textAlign = 'center';
    div.style.fontSize = '12px';
    div.style.color = 'var(--primary-color)';
    div.style.zIndex = '10';
    div.style.visibility = 'hidden';
    div.style.opacity = '0';
    div.style.transition = 'opacity 0.5s, visibility 0.5s';
    messageContainer.appendChild(div);
    return div;
}

function updateAgentMessages() {
    const vector = new THREE.Vector3();
    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;

    agents.forEach(agent => {
        const { messageDiv, showMessage, message } = agent.userData;
        
        if (showMessage && message) {
            // Get screen position of the agent's head
            // The head is the second child (index 1) and its position is Y=2 relative to the agentGroup
            const headMesh = agent.children.find(child => child.position.y === 2); 
            if (!headMesh) return;

            headMesh.getWorldPosition(vector);
            vector.project(camera);

            // Convert normalized device coordinates (-1 to 1) to pixel coordinates (0 to width/height)
            const x = (vector.x * 0.5 + 0.5) * width;
            const y = (-vector.y * 0.5 + 0.5) * height;

            messageDiv.style.visibility = 'visible';
            messageDiv.style.opacity = '1';
            // Adjust position relative to the messageContainer (which is relative to the three-container)
            messageDiv.style.left = `${x - messageDiv.clientWidth / 2}px`;
            messageDiv.style.top = `${y - messageDiv.clientHeight - 20}px`; // 20px above head
            messageDiv.innerHTML = message;

        } else {
            messageDiv.style.visibility = 'hidden';
            messageDiv.style.opacity = '0';
        }
    });
}
// --- END MESSAGE FUNCTIONS ---

function moveAgentToTable(agentId, seatIndex) {
    const agent = agents.find(a => a.userData.id === agentId);
    if (!agent || agent.userData.isSeated) return;
    
    const chair = chairs[seatIndex];
    const targetPos = chair.position.clone();
    
    agent.userData.targetPosition = targetPos;
    agent.userData.isWalking = true;
    agent.userData.seatIndex = seatIndex;
}

function updateAgents() {
    agents.forEach(agent => {
        if (agent.userData.isWalking && agent.userData.targetPosition) {
            const target = agent.userData.targetPosition;
            const current = agent.position;
            
            // Smoother Movement
            current.lerp(target, 0.05); 
            
            // Rotate agent to face movement direction
            const targetRotation = Math.atan2(target.x - current.x, target.z - current.z);
            agent.rotation.y += (targetRotation - agent.rotation.y) * 0.1;
            
            // Check if reached target
            const distance = current.distanceTo(target);
            if (distance < 0.2) {
                agent.userData.isWalking = false;
                agent.userData.isSeated = true;
                agent.position.set(target.x, 0, target.z);
                
                // Final face the table rotation
                const tablePos = table.position;
                const angleToTable = Math.atan2(
                    tablePos.x - current.x,
                    tablePos.z - current.z
                );
                agent.rotation.y = angleToTable;
            }
        } else if (agent.userData.isSeated) {
            // Subtle breathing/thinking animation while seated
            agent.position.y = Math.sin(Date.now() * 0.002 + agent.userData.seatIndex) * 0.01;
        }
    });
}

function onWindowResize() {
    const container = document.getElementById('three-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    updateAgents();
    updateAgentMessages(); // Update message positions
    
    // Gentle camera rotation
    const time = Date.now() * 0.00005;
    camera.position.x = 5 + Math.sin(time) * 1;
    camera.position.z = 15 + Math.cos(time) * 1;
    camera.lookAt(0, 1, 0);
    
    renderer.render(scene, camera);
}

// Initialize scene when page loads
window.addEventListener('DOMContentLoaded', initScene);