/**
 * ====================================
 * TASK MANAGER PRO
 * Advanced Task Management System
 * ====================================
 * Modern, localStorage-basiertes Task-Management
 * Mit Kategorien, Prioritäten, Fälligkeitsdaten & Speicherung
 */

class TaskManagerPro {
    constructor() {
        this.storageKey = 'WORKLOG_TASKS_V1';
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createTaskModal();
        this.attachEventListeners();
    }

    /**
     * Lade Tasks aus localStorage
     */
    loadTasks() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Fehler beim Laden von Tasks:', e);
            return [];
        }
    }

    /**
     * Speichere Tasks in localStorage
     */
    saveTasks() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
            this.updateTasksUI();
            return true;
        } catch (e) {
            console.error('Fehler beim Speichern von Tasks:', e);
            alert('Fehler beim Speichern der Task');
            return false;
        }
    }

    /**
     * Erstelle eine neue Task
     */
    createTask(data) {
        const task = {
            id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: data.title || 'Neue Task',
            description: data.description || '',
            category: data.category || 'general',
            priority: data.priority || 'medium',
            dueDate: data.dueDate || '',
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subtasks: data.subtasks || []
        };
        
        this.tasks.unshift(task);
        this.saveTasks();
        return task;
    }

    /**
     * Aktualisiere eine Task
     */
    updateTask(taskId, updates) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            Object.assign(task, updates, { updatedAt: new Date().toISOString() });
            this.saveTasks();
        }
        return task;
    }

    /**
     * Lösche eine Task
     */
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveTasks();
    }

    /**
     * Toggle Task-Completion
     */
    toggleTaskCompletion(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
        }
    }

    /**
     * Füge Subtask hinzu
     */
    addSubtask(taskId, subtaskTitle) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.subtasks.push({
                id: 'sub_' + Date.now(),
                title: subtaskTitle,
                completed: false
            });
            this.saveTasks();
        }
    }

    /**
     * Toggle Subtask
     */
    toggleSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            const subtask = task.subtasks.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
                this.saveTasks();
            }
        }
    }

    /**
     * Hauptmodal erstellen
     */
    createTaskModal() {
        const html = `
        <div class="modal" id="taskManagerModal" style="display:none; z-index:9999;">
            <div class="modal-box" style="width:95%; max-width:900px; max-height:90vh; overflow-y:auto; padding:0; backdrop-filter:blur(20px); border-radius:16px; border:1px solid rgba(168, 85, 247, 0.3); display:flex; flex-direction:column;">
                
                <!-- Header -->
                <div style="padding:24px; border-bottom:1px solid rgba(255,255,255,0.06); background:linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(16,185,129,0.05) 100%);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h2 style="margin:0; color:var(--primary); font-size:1.5rem;">📋 Task Manager</h2>
                        <button class="modal-close-x" onclick="taskManager.closeModal()" title="Schließen">×</button>
                    </div>
                    <p style="margin:8px 0 0 0; color:var(--text-muted); font-size:0.85rem;">Modern Task Management mit Kategorien & Prioritäten</p>
                </div>

                <!-- Content -->
                <div style="flex:1; overflow-y:auto; padding:24px;">
                    
                    <!-- Add New Task Section -->
                    <div style="background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.2); border-radius:12px; padding:20px; margin-bottom:24px;">
                        <h4 style="margin:0 0 16px 0; color:var(--text-main);">✨ Neue Task erstellen</h4>
                        <form id="newTaskForm" onsubmit="event.preventDefault(); taskManager.handleNewTask();">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                                <div>
                                    <input type="text" id="taskTitle" placeholder="Task Titel..." required style="width:100%; padding:10px 12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--text-main); font-size:0.9rem;" />
                                </div>
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                                    <select id="taskCategory" style="padding:10px 12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--text-main); font-size:0.9rem;">
                                        <option value="general">📌 General</option>
                                        <option value="work">💼 Arbeit</option>
                                        <option value="learning">📚 Lernen</option>
                                        <option value="project">🚀 Projekt</option>
                                        <option value="personal">🎯 Persönlich</option>
                                    </select>
                                    <select id="taskPriority" style="padding:10px 12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--text-main); font-size:0.9rem;">
                                        <option value="low">🟢 Niedrig</option>
                                        <option value="medium" selected>🟡 Mittel</option>
                                        <option value="high">🔴 Hoch</option>
                                    </select>
                                </div>
                            </div>
                            <div style="margin-bottom:12px;">
                                <textarea id="taskDescription" placeholder="Beschreibung (optional)..." style="width:100%; padding:10px 12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--text-main); font-size:0.9rem; resize:vertical; min-height:60px;"></textarea>
                            </div>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                                <input type="date" id="taskDueDate" style="padding:10px 12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--text-main); font-size:0.9rem;" />
                                <button type="submit" class="btn" style="background:var(--primary); padding:10px 16px; border:none; border-radius:8px; color:white; cursor:pointer; font-weight:600; transition:all 0.3s;">➕ Task hinzufügen</button>
                            </div>
                        </form>
                    </div>

                    <!-- Filter Buttons -->
                    <div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
                        <button onclick="taskManager.setFilter('all')" class="btn-filter" style="padding:8px 16px; background:var(--primary); color:white; border:none; border-radius:8px; cursor:pointer; font-size:0.85rem; transition:all 0.3s;">📊 Alle</button>
                        <button onclick="taskManager.setFilter('active')" class="btn-filter" style="padding:8px 16px; background:rgba(255,255,255,0.1); color:var(--text-main); border:none; border-radius:8px; cursor:pointer; font-size:0.85rem; transition:all 0.3s;">📍 Aktiv</button>
                        <button onclick="taskManager.setFilter('completed')" class="btn-filter" style="padding:8px 16px; background:rgba(255,255,255,0.1); color:var(--text-main); border:none; border-radius:8px; cursor:pointer; font-size:0.85rem; transition:all 0.3s;">✅ Erledigt</button>
                        <button onclick="taskManager.setFilter('work')" class="btn-filter" style="padding:8px 16px; background:rgba(255,255,255,0.1); color:var(--text-main); border:none; border-radius:8px; cursor:pointer; font-size:0.85rem; transition:all 0.3s;">💼 Arbeit</button>
                        <button onclick="taskManager.setFilter('learning')" class="btn-filter" style="padding:8px 16px; background:rgba(255,255,255,0.1); color:var(--text-main); border:none; border-radius:8px; cursor:pointer; font-size:0.85rem; transition:all 0.3s;">📚 Lernen</button>
                    </div>

                    <!-- Tasks Container -->
                    <div id="tasksContainer" style="display:grid; gap:12px;">
                        <!-- Tasks werden hier eingefügt -->
                    </div>

                    <!-- Empty State -->
                    <div id="emptyState" style="text-align:center; padding:40px 20px; color:var(--text-muted);">
                        <div style="font-size:2.5rem; margin-bottom:10px;">📭</div>
                        <p>Keine Tasks gefunden</p>
                        <p style="font-size:0.85rem;">Erstelle eine neue Task oben, um loszulegen!</p>
                    </div>

                </div>

            </div>
        </div>

        <!-- Subtask Input Modal -->
        <div class="modal" id="subtaskModal" style="display:none;">
            <div class="modal-box" style="width:90%; max-width:400px; padding:24px; backdrop-filter:blur(20px); border-radius:16px; border:1px solid rgba(168, 85, 247, 0.3);">
                <h3 style="margin:0 0 16px 0; color:var(--primary);">Subtask hinzufügen</h3>
                <form onsubmit="event.preventDefault(); taskManager.handleAddSubtask();">
                    <input type="text" id="subtaskInput" placeholder="Subtask eingeben..." style="width:100%; padding:12px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:var(--text-main); margin-bottom:12px;" required />
                    <div style="display:flex; gap:8px;">
                        <button type="submit" class="btn" style="flex:1; background:var(--primary); padding:10px; border:none; border-radius:8px; color:white; cursor:pointer; font-weight:600;">Hinzufügen</button>
                        <button type="button" class="btn" style="flex:1; background:rgba(255,255,255,0.1); padding:10px; border:none; border-radius:8px; color:var(--text-main); cursor:pointer;" onclick="document.getElementById('subtaskModal').style.display='none'">Abbrechen</button>
                    </div>
                </form>
            </div>
        </div>
        `;
        
        // Füge Modal zum Body hinzu, wenn nicht bereits vorhanden
        if (!document.getElementById('taskManagerModal')) {
            document.body.insertAdjacentHTML('beforeend', html);
        }
    }

    /**
     * Event Listener attachieren
     */
    attachEventListeners() {
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('taskManagerModal');
            if (modal && e.target === modal) {
                this.closeModal();
            }
        });
    }

    /**
     * Task hinzufügen Form Handler
     */
    handleNewTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const category = document.getElementById('taskCategory').value;
        const priority = document.getElementById('taskPriority').value;
        const dueDate = document.getElementById('taskDueDate').value;

        if (!title) {
            alert('Bitte einen Task Titel eingeben');
            return;
        }

        this.createTask({
            title,
            description,
            category,
            priority,
            dueDate
        });

        // Reset Form
        document.getElementById('newTaskForm').reset();
        document.getElementById('taskPriority').value = 'medium';
    }

    /**
     * Subtask Handler
     */
    handleAddSubtask() {
        const taskId = document.getElementById('subtaskModal').dataset.taskId;
        const subtaskTitle = document.getElementById('subtaskInput').value.trim();

        if (subtaskTitle) {
            this.addSubtask(taskId, subtaskTitle);
            document.getElementById('subtaskInput').value = '';
            document.getElementById('subtaskModal').style.display = 'none';
        }
    }

    /**
     * Filtere Tasks
     */
    setFilter(filter) {
        this.currentFilter = filter;
        this.updateTasksUI();

        // Update Button Styles
        document.querySelectorAll('.btn-filter').forEach(btn => {
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.color = 'var(--text-main)';
        });
        event.target.style.background = 'var(--primary)';
        event.target.style.color = 'white';
    }

    /**
     * Hole gefilterte Tasks
     */
    getFilteredTasks() {
        let filtered = this.tasks;

        switch (this.currentFilter) {
            case 'active':
                filtered = filtered.filter(t => !t.completed);
                break;
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
            case 'work':
            case 'learning':
            case 'project':
            case 'personal':
            case 'general':
                filtered = filtered.filter(t => t.category === this.currentFilter);
                break;
        }

        return filtered;
    }

    /**
     * UI aktualisieren
     */
    updateTasksUI() {
        const container = document.getElementById('tasksContainer');
        const emptyState = document.getElementById('emptyState');
        const tasks = this.getFilteredTasks();

        container.innerHTML = '';

        if (tasks.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        tasks.forEach(task => {
            container.appendChild(this.createTaskElement(task));
        });
    }

    /**
     * Erstelle Task Element
     */
    createTaskElement(task) {
        const div = document.createElement('div');
        div.style.cssText = `
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(168,85,247,0.2);
            border-radius: 12px;
            padding: 16px;
            transition: all 0.3s;
            opacity: ${task.completed ? '0.6' : '1'};
        `;

        const categoryEmoji = {
            general: '📌',
            work: '💼',
            learning: '📚',
            project: '🚀',
            personal: '🎯'
        }[task.category] || '📌';

        const priorityColor = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444'
        }[task.priority] || '#f59e0b';

        const priorityLabel = {
            low: 'Niedrig',
            medium: 'Mittel',
            high: 'Hoch'
        }[task.priority] || 'Mittel';

        const dueDateStr = task.dueDate ? new Date(task.dueDate).toLocaleDateString('de-DE') : '';
        const isDueToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString();
        const isDueOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

        let subtasksHtml = '';
        if (task.subtasks && task.subtasks.length > 0) {
            const completedSubtasks = task.subtasks.filter(s => s.completed).length;
            subtasksHtml = `
                <div style="margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0 0 8px 0; color:var(--text-muted); font-size:0.85rem;">Subtasks (${completedSubtasks}/${task.subtasks.length})</p>
                    <div style="display:grid; gap:6px;">
                        ${task.subtasks.map(sub => `
                            <div style="display:flex; align-items:center; gap:8px;">
                                <input type="checkbox" ${sub.completed ? 'checked' : ''} onchange="taskManager.toggleSubtask('${task.id}', '${sub.id}')" style="cursor:pointer;">
                                <span style="flex:1; color:var(--text-main); font-size:0.85rem; ${sub.completed ? 'text-decoration:line-through; opacity:0.6;' : ''}">${escapeHtml(sub.title)}</span>
                                <button onclick="taskManager.deleteSubtask('${task.id}', '${sub.id}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:0.8rem;">✕</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        div.innerHTML = `
            <div style="display:flex; gap:12px; align-items:start;">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="taskManager.toggleTaskCompletion('${task.id}')" style="margin-top:4px; cursor:pointer; width:20px; height:20px;">
                
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                        <span>${categoryEmoji}</span>
                        <h4 style="margin:0; color:var(--text-main); font-size:1rem; ${task.completed ? 'text-decoration:line-through; opacity:0.6;' : ''}">${escapeHtml(task.title)}</h4>
                    </div>
                    
                    ${task.description ? `<p style="margin:0 0 8px 0; color:var(--text-muted); font-size:0.9rem;">${escapeHtml(task.description)}</p>` : ''}
                    
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
                        <span style="display:inline-block; padding:4px 10px; background:${priorityColor}33; color:${priorityColor}; border-radius:6px; font-size:0.75rem; font-weight:600;">● ${priorityLabel}</span>
                        ${dueDateStr ? `
                            <span style="display:inline-block; padding:4px 10px; background:${isDueOverdue ? '#ef4444' : isDueToday ? '#f59e0b' : 'rgba(148,163,184,0.2)'}; color:${isDueOverdue ? '#fecaca' : isDueToday ? '#fcd34d' : 'var(--text-muted)'}; border-radius:6px; font-size:0.75rem; font-weight:600;">📅 ${dueDateStr}</span>
                        ` : ''}
                    </div>

                    ${subtasksHtml}
                </div>

                <div style="display:flex; flex-direction:column; gap:6px;">
                    <button onclick="taskManager.openSubtaskModal('${task.id}')" title="Subtask hinzufügen" style="background:rgba(168,85,247,0.2); border:none; padding:6px 8px; border-radius:6px; color:var(--primary); cursor:pointer; font-size:0.8rem;">+ Sub</button>
                    <button onclick="taskManager.deleteTask('${task.id}')" title="Löschen" style="background:rgba(239,68,68,0.1); border:none; padding:6px 8px; border-radius:6px; color:#ef4444; cursor:pointer; font-size:0.8rem;">🗑️</button>
                </div>
            </div>
        `;

        return div;
    }

    /**
     * Öffne Subtask Modal
     */
    openSubtaskModal(taskId) {
        document.getElementById('subtaskModal').dataset.taskId = taskId;
        document.getElementById('subtaskModal').style.display = 'flex';
        document.getElementById('subtaskInput').focus();
    }

    /**
     * Lösche Subtask
     */
    deleteSubtask(taskId, subtaskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
            this.saveTasks();
        }
    }

    /**
     * Öffne Modal
     */
    openModal() {
        document.getElementById('taskManagerModal').style.display = 'flex';
        this.updateTasksUI();
        document.getElementById('taskTitle').focus();
    }

    /**
     * Schließe Modal
     */
    closeModal() {
        document.getElementById('taskManagerModal').style.display = 'none';
    }
}

// Helper function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Globale Instanz
let taskManager;

// Initialisiere Task Manager
document.addEventListener('DOMContentLoaded', () => {
    if (!taskManager) {
        taskManager = new TaskManagerPro();
    }
});
