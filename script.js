document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = null;
    let tasks = [];
    let isLoginMode = true;

    // --- DOM Elements ---
    const landingPage = document.getElementById('landing-page');
    const landingCta = document.getElementById('landing-cta');
    const landingLoginBtn = document.getElementById('landing-login-btn');
    const appContainer = document.getElementById('app-container');
    const appNavbar = document.getElementById('app-navbar');

    const authOverlay = document.getElementById('auth-overlay');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    
    // Auth Buttons & Inputs
    const authActionBtn = document.getElementById('auth-action-btn'); 
    const authSwitchBtn = document.getElementById('auth-switch-btn');
    const authSwitchText = document.getElementById('auth-switch-text');
    const authSwitchContainer = document.getElementById('auth-switch-container');
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    // User Profile
    const userProfile = document.getElementById('user-profile');
    const logoutBtn = document.getElementById('logout-btn');
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    
    // Task Input Elements
    const todoInput = document.getElementById('todo-input');
    const tagInput = document.getElementById('tag-input');
    const assigneeInput = document.getElementById('assignee-input');
    const addTodoBtn = document.getElementById('add-todo-btn');

    // --- Initialization ---

    async function init() {
        // Check if user is already logged in
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                handleLoginSuccess({ id: data.id });
                // If logged in, fetch tasks potentially
            } else {
                // Not logged in
            }
        } catch (e) {
            console.error('Auth check failed', e);
        }
    }

    // --- Landing Page Logic ---
    if (landingPage) {
        landingPage.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth - e.pageX * 2) / 100;
            const y = (window.innerHeight - e.pageY * 2) / 100;

            const content = document.getElementById('landing-content');
            const system = document.querySelector('.orbital-system');
            
            if (content) content.style.transform = `translate(${x * 0.5}px, ${y * 0.5}px)`;
            if (system) {
                system.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
            }
        });
        
        if (landingCta) {
            landingCta.addEventListener('click', () => {
                 showAuth();
            });
        }
        
        if (landingLoginBtn) {
            landingLoginBtn.addEventListener('click', () => {
                showAuth();
            });
        }
    }

    function showAuth() {
        if(authOverlay) {
            authOverlay.classList.add('active');
            authOverlay.style.pointerEvents = 'all'; 
            authOverlay.style.opacity = '1';
        }
    }

    function hideLandingAndShowApp() {
        if (landingPage) landingPage.classList.add('hidden');
        if (authOverlay) authOverlay.classList.remove('active');
        
        if (appNavbar) {
            appNavbar.style.opacity = '1';
            appNavbar.style.pointerEvents = 'all';
        }
        if (appContainer) {
            appContainer.style.opacity = '1';
            appContainer.style.pointerEvents = 'all';
        }
    }

    function handleLoginSuccess(user) {
        console.log('object user login:', user);
        currentUser = user;
        hideLandingAndShowApp();
        if(userProfile) userProfile.style.display = 'flex';
        fetchTasks();
        fetchUser(user.id);
        switchView('dashboard');
    }

    // --- Auth Logic ---

    if (authActionBtn) {
        authActionBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username) { return alert('Email required'); }
            if (!password) { return alert('Password required'); }
            
            // Determine endpoint
            const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                // Parse JSON response safely
                let data;
                try {
                    data = await res.json();
                } catch(err) {
                    throw new Error('Server returned invalid JSON. Check server logs.');
                }

                if (res.ok) {
                    handleLoginSuccess(data.user);
                    usernameInput.value = '';
                    passwordInput.value = '';
                } else {
                    alert(data.error || 'Authentication failed');
                }
            } catch (e) {
                console.error(e);
                alert('Request failed: ' + e.message);
            }
        });
    }

    if (authSwitchBtn) {
        authSwitchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            if (isLoginMode) {
                if(authTitle) authTitle.textContent = 'Welcome Back';
                if(authActionBtn) authActionBtn.textContent = 'Log In';
                if(authSwitchText) authSwitchText.textContent = "Don't have an account?";
                if(authSwitchBtn) authSwitchBtn.textContent = 'Sign Up';
            } else {
                if(authTitle) authTitle.textContent = 'Create Account';
                if(authActionBtn) authActionBtn.textContent = 'Sign Up'; 
                if(authSwitchText) authSwitchText.textContent = 'Already have an account?';
                if(authSwitchBtn) authSwitchBtn.textContent = 'Log In';
            }
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.reload();
            } catch (e) {
                console.error(e);
            }
        });
    }

    if(deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                try {
                    await fetch('/api/auth/me', { method: 'DELETE' });
                    window.location.reload();
                } catch (e) {
                    alert('Failed to delete');
                }
            }
        });
    }

    // --- View Logic ---
    const viewDashboardBtn = document.getElementById('view-dashboard');
    const viewBoardBtn = document.getElementById('view-board');
    const dashboardView = document.getElementById('dashboard-view');
    const boardView = document.getElementById('board-view');
    
    // Greeting
    const timeGreeting = document.getElementById('time-greeting');
    const userNameDisplay = document.querySelectorAll('.user-name-display'); // Class for multiple usages if any

    if (viewDashboardBtn && viewBoardBtn) {
        viewDashboardBtn.addEventListener('click', () => switchView('dashboard'));
        viewBoardBtn.addEventListener('click', () => switchView('board'));
    }

    function switchView(viewName) {
        if (viewName === 'dashboard') {
            viewDashboardBtn.classList.add('active');
            viewBoardBtn.classList.remove('active');
            
            dashboardView.classList.add('active');
            boardView.classList.add('hidden');
            
            renderDashboard(); // Refresh stats when entering
        } else {
            viewBoardBtn.classList.add('active');
            viewDashboardBtn.classList.remove('active');
            
            dashboardView.classList.remove('active');
            boardView.classList.remove('hidden');
        }
    }

    function updateGreeting() {
        if (!timeGreeting) return;
        const hour = new Date().getHours();
        let greeting = 'Day';
        if (hour < 12) greeting = 'Morning';
        else if (hour < 18) greeting = 'Afternoon';
        else greeting = 'Evening';
        timeGreeting.textContent = greeting;
    }

    // --- Dashboard Logic ---
    function renderDashboard() {
        if (!tasks) return;
        
        // 1. Stats
        const total = tasks.length;
        const todo = tasks.filter(t => t.status === 'todo').length;
        const inProgress = tasks.filter(t => t.status === 'in-progress').length;
        const done = tasks.filter(t => t.status === 'done').length;
        const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);

        updateStat('stat-total', total);
        updateStat('stat-pending', inProgress + todo); // Pending usually means not done
        updateStat('stat-completed', done);
        updateStat('stat-rate', `${completionRate}%`);

        // 2. Priority List (Take top 5 pending tasks)
        const priorityList = document.getElementById('priority-list');
        if (priorityList) {
            priorityList.innerHTML = '';
            const pendingTasks = tasks.filter(t => t.status !== 'done').slice(0, 5);
            
            if (pendingTasks.length === 0) {
                priorityList.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 1rem;">No pending tasks. You are all caught up!</div>';
            } else {
                pendingTasks.forEach(task => {
                    const el = document.createElement('div');
                    el.className = 'priority-item';
                    el.innerHTML = `
                        <span class="priority-content">${escapeHtml(task.content)}</span>
                        <span class="priority-tag" style="background: rgba(255,255,255,0.05);">${task.tag || 'Task'}</span>
                    `;
                    el.addEventListener('click', () => {
                        // Switch to board and highlight? For now just switch.
                        switchView('board');
                    });
                    priorityList.appendChild(el);
                });
            }
        }

        // 3. Distribution Chart
        const distChart = document.getElementById('distribution-chart');
        if (distChart) {
            const getPct = num => total === 0 ? 0 : (num / total) * 100;
            distChart.innerHTML = `
                <div class="dist-row">
                    <div class="dist-header"><span>To Do</span><span>${todo}</span></div>
                    <div class="dist-bar-bg"><div class="dist-bar-fill todo" style="width: ${getPct(todo)}%"></div></div>
                </div>
                <div class="dist-row">
                    <div class="dist-header"><span>In Progress</span><span>${inProgress}</span></div>
                    <div class="dist-bar-bg"><div class="dist-bar-fill inprogress" style="width: ${getPct(inProgress)}%"></div></div>
                </div>
                <div class="dist-row">
                    <div class="dist-header"><span>Done</span><span>${done}</span></div>
                    <div class="dist-bar-bg"><div class="dist-bar-fill done" style="width: ${getPct(done)}%"></div></div>
                </div>
            `;
        }
        renderTimers();
    }

    function updateStat(id, value) {
        const el = document.getElementById(id);
        if (el) {
            // Simple animation
            el.style.opacity = '0';
            setTimeout(() => {
                el.textContent = value;
                el.style.opacity = '1';
            }, 100);
        }
    }


    // --- Task Logic (Existing) ---
    async function fetchTasks() {
        try {
            const res = await fetch('/api/tasks');
            if (res.ok) {
                tasks = await res.json();
                renderTasks();
                renderDashboard(); // Initial dashboard render
            }
        } catch (e) {
            console.error('Failed to fetch tasks', e);
        }
    }
    function removeGmailAddresses(username){
        
       
        const gmailRegex = "@gmail.com";
        
        return username.replace(gmailRegex, '');
    }


    async function fetchUser(id){
        try {
            const res = await fetch(`/api/users/${id}`)
            console.log( 'user res:', res)
            if (res.ok) {
                user = await res.json();
                const username = removeGmailAddresses(user.user.username);
                console.log('username:', username);
                
                document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();
                document.getElementById('user-name-display').textContent = username;
                renderTasks();
                renderDashboard(); // Initial dashboard render
            }
        } catch (e) {
            console.error('Failed to fetch users', e);
        }
    }

    async function saveTasks() {
        try {
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tasks)
            });
            renderDashboard(); // Update dashboard whenever saved
        } catch (e) {
            console.error('Failed to save tasks', e);
        }
    }

    function renderTasks() {
        document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');
        const counts = { todo: 0, 'in-progress': 0, done: 0 };

        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            const listId = `${task.status}-list`;
            const list = document.getElementById(listId);
            if (list) {
                list.appendChild(taskElement);
                counts[task.status]++;
            }
        });

        Object.keys(counts).forEach(status => {
            const column = document.querySelector(`[data-status="${status}"]`);
            if (column) {
                column.querySelector('.task-count').textContent = counts[status];
            }
        });

        initializeDragAndDrop();
    }

    function createTaskElement(task) {
        const div = document.createElement('div');
        div.classList.add('task-card');
        div.setAttribute('draggable', 'true');
        div.dataset.id = task.id;
        
        div.addEventListener('mousedown', () => { div.style.cursor = 'grabbing'; });
        div.addEventListener('mouseup', () => { div.style.cursor = 'grab'; });
        
        const tagClass = (task.tag || 'Design').toLowerCase();
        const assigneeHtml = task.assignee 
            ? `<div class="assignee-avatar" title="Assigned to ${task.assignee}">${getInitials(task.assignee)}</div>` 
            : '';

        const editIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        const deleteIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

        div.innerHTML = `
            <div class="task-content">${escapeHtml(task.content)}</div>
            <div class="task-meta">
                <span class="tag ${tagClass}">${task.tag || 'Task'}</span>
                <div class="task-footer">
                    ${assigneeHtml}
                    <div class="task-actions">
                        <button class="edit-btn" title="Edit">${editIcon}</button>
                        <button class="delete-btn" title="Delete">${deleteIcon}</button>
                    </div>
                </div>
            </div>
        `;

        div.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            div.style.transform = 'scale(0.8)';
            div.style.opacity = '0';
            setTimeout(() => { deleteTask(task.id); }, 300);
        });

        div.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            enableEditing(div, task);
        });

        return div;
    }

    function getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    function enableEditing(taskElement, task) {
        taskElement.setAttribute('draggable', 'false');
        
        const content = task.content;
        const tag = task.tag || 'Design';
        const assignee = task.assignee || '';

        taskElement.innerHTML = `
            <div class="edit-mode-container" style="display: flex; flex-direction: column; gap: 0.75rem; padding: 0.5rem 0;">
                <input type="text" class="task-edit-input" value="${escapeHtml(content)}" placeholder="Task content">
                <div style="display: flex; gap: 0.5rem;">
                    <select class="task-edit-select task-select">
                        <option value="Design" ${tag === 'Design' ? 'selected' : ''}>Design</option>
                        <option value="Dev" ${tag === 'Dev' ? 'selected' : ''}>Dev</option>
                        <option value="Marketing" ${tag === 'Marketing' ? 'selected' : ''}>Marketing</option>
                        <option value="Planning" ${tag === 'Planning' ? 'selected' : ''}>Planning</option>
                    </select>
                    <input type="text" class="task-edit-assignee assignee-input" value="${escapeHtml(assignee)}" placeholder="Assignee">
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="save-btn add-btn" style="width: auto; padding: 0 1rem; border-radius: var(--radius-sm); font-size: 0.8rem;">Save</button>
                    <button class="cancel-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: var(--text-secondary); padding: 0.5rem 1rem; border-radius: var(--radius-sm); cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;

        const saveBtn = taskElement.querySelector('.save-btn');
        const cancelBtn = taskElement.querySelector('.cancel-btn');
        const input = taskElement.querySelector('.task-edit-input');
        const select = taskElement.querySelector('.task-edit-select');
        const assigneeInput = taskElement.querySelector('.task-edit-assignee');

        input.focus();

        const save = (e) => {
            e?.stopPropagation(); 
            const newContent = input.value.trim();
            if (newContent) {
                task.content = newContent;
                task.tag = select.value;
                task.assignee = assigneeInput.value.trim();
                saveTasks();
                renderTasks();
            }
        };

        const cancel = (e) => { e?.stopPropagation(); renderTasks(); };

        saveBtn.addEventListener('click', save);
        cancelBtn.addEventListener('click', cancel);
        input.addEventListener('keydown', (e) => { if(e.key === 'Enter') save(); if(e.key === 'Escape') cancel(); });
        taskElement.querySelector('.edit-mode-container').addEventListener('mousedown', e => e.stopPropagation());
    }

    function addTask() {
        const content = todoInput.value.trim();
        const tag = tagInput.value;
        const assignee = assigneeInput.value.trim();

        if (content) {
            const newTask = {
                id: Date.now(),
                content: content,
                status: 'todo',
                tag: tag,
                assignee: assignee
            };
            tasks.push(newTask);
            saveTasks();
            renderTasks();
            
            setTimeout(() => {
                const newCard = document.querySelector(`[data-id="${newTask.id}"]`);
                if(newCard) {
                    newCard.style.animation = 'none';
                    newCard.offsetHeight;
                    newCard.style.animation = 'slideIn 0.3s ease-out';
                }
            }, 10);
            
            todoInput.value = '';
            assigneeInput.value = '';
        }
    }

    function deleteTask(id) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
    }

    // --- Drag and Drop Logic ---
    function initializeDragAndDrop() {
        const draggables = document.querySelectorAll('.task-card');
        const columns = document.querySelectorAll('.column');

        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', () => { draggable.classList.add('dragging'); });
            draggable.addEventListener('dragend', () => {
                draggable.classList.remove('dragging');
                updateTaskStatusAfterDrop(draggable);
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', e => {
                e.preventDefault();
                const afterElement = getDragAfterElement(column, e.clientY);
                const draggable = document.querySelector('.dragging');
                const list = column.querySelector('.task-list');
                if (draggable) {
                    if (afterElement == null) { list.appendChild(draggable); }
                    else { list.insertBefore(draggable, afterElement); }
                }
            });
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; }
            else { return closest; }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function updateTaskStatusAfterDrop(draggable) {
        const newStatus = draggable.closest('.column').dataset.status;
        const taskId = parseInt(draggable.dataset.id);
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            // Timer Logic
            if (newStatus === 'in-progress' && !task.startedAt) {
                task.startedAt = Date.now();
                delete task.completedAt;
            } else if (newStatus === 'done') {
                 if (!task.completedAt) task.completedAt = Date.now();
            } else if (newStatus === 'todo') {
                 delete task.completedAt;
                 delete task.startedAt; // Reset if moved back to todo
            }

            task.status = newStatus;
            saveTasks();
            renderTasks(); 
            setTimeout(() => {
                const el = document.querySelector(`[data-id="${taskId}"]`);
                if(el) {
                    el.animate([
                        { transform: 'scale(1)' },
                        { transform: 'scale(1.05)', backgroundColor: 'rgba(255,255,255,0.1)' },
                        { transform: 'scale(1)', backgroundColor: 'rgba(255,255,255,0.03)' }
                    ], { duration: 300, easing: 'ease-out' });
                }
            }, 0);
        }
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    if (addTodoBtn) addTodoBtn.addEventListener('click', addTask);
    if (todoInput) todoInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

    // --- Timer Logic ---
    function renderTimers() {
        const timerList = document.getElementById('timer-list');
        if (!timerList) return;
        timerList.innerHTML = '';

        const activeTasks = tasks.filter(t => t.status === 'in-progress' && t.startedAt);
        const doneTasks = tasks.filter(t => t.status === 'done' && t.completedAt && t.startedAt).slice(0, 3);

        if (activeTasks.length === 0 && doneTasks.length === 0) {
            timerList.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.9rem; padding: 0.5rem;">No active timers</div>';
            return;
        }

        // Render Active
        activeTasks.forEach(task => {
            const el = document.createElement('div');
            el.className = 'timer-item active';
            el.dataset.start = task.startedAt;
            el.style.cssText = 'background: rgba(43,210,255,0.1); padding: 0.8rem; border-radius: 12px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;';
            el.innerHTML = `
                <span style="font-size: 0.9rem; font-weight: 500; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 60%;">${escapeHtml(task.content)}</span>
                <span class="time-display" style="font-family: monospace; font-size: 1.1rem; color: #2BD2FF;">00:00</span>
            `;
            timerList.appendChild(el);
        });

        // Render Done (Static)
        doneTasks.forEach(task => {
            const duration = task.completedAt - task.startedAt;
            const el = document.createElement('div');
            el.style.cssText = 'background: rgba(43,255,136,0.1); padding: 0.8rem; border-radius: 12px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; opacity: 0.8;';
            el.innerHTML = `
                <span style="font-size: 0.9rem; font-weight: 500; text-decoration: line-through; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; max-width: 60%;">${escapeHtml(task.content)}</span>
                <span style="font-family: monospace; font-size: 1.1rem; color: #2BFF88;">${formatDuration(duration)}</span>
            `;
            timerList.appendChild(el);
        });
    }

    function formatDuration(ms) {
        if (ms < 0) ms = 0;
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
    }

    function updateLiveTimers() {
        const activeTimers = document.querySelectorAll('.timer-item.active');
        activeTimers.forEach(el => {
             const start = parseInt(el.dataset.start);
             const now = Date.now();
             const display = el.querySelector('.time-display');
             if(display) display.textContent = formatDuration(now - start);
        });
    }

    setInterval(updateLiveTimers, 1000);

    // Start
    init();
    updateGreeting();
});
