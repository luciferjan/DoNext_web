// ============================================
// APP.JS - DoNext Application Logic
// ============================================

// Global state
let tasks = [];
let currentTags = [];
let currentFilter = 'all';
let currentCategoryFilter = 'all';

// Category colors mapping
const categoryColors = {
    personal: '#6c63ff',
    work: '#00c2a8',
    shopping: '#ffa502',
    health: '#e74c3c'
};

// Tag colors (cycle through these)
const tagColors = [
    '#6c63ff', '#00c2a8', '#ffa502', '#e74c3c', 
    '#3498db', '#9b59b6', '#1abc9c', '#e67e22'
];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadTasksFromStorage();
    initializeEventListeners();
    renderTasks();
    updateStats();
});

// ============================================
// EVENT LISTENERS
// ============================================

function initializeEventListeners() {
    // Add task button
    const addBtn = document.getElementById('addTaskBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addTask);
    }

    // Task input - Enter key
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }

    // Tag input - Enter key
    const tagInput = document.getElementById('tagInput');
    if (tagInput) {
        tagInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
            }
        });
    }

    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            // Set current filter
            currentFilter = this.dataset.filter;
            renderTasks();
        });
    });

    // Category filter dropdown
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            currentCategoryFilter = this.value;
            renderTasks();
        });
    }
}

// ============================================
// TASK MANAGEMENT
// ============================================

function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskDueDate = document.getElementById('taskDueDate');
    const taskCategory = document.getElementById('taskCategory');

    const taskText = taskInput.value.trim();
    
    if (!taskText) {
        alert('Please enter a task');
        return;
    }

    // Create new task object
    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        category: taskCategory.value,
        dueDate: taskDueDate.value || null,
        tags: [...currentTags],
        createdAt: new Date().toISOString()
    };

    // Add to tasks array
    tasks.push(task);

    // Clear inputs
    taskInput.value = '';
    taskDueDate.value = '';
    currentTags = [];
    renderTagList();

    // Save and render
    saveTasksToStorage();
    renderTasks();
    updateStats();
}

function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasksToStorage();
        renderTasks();
        updateStats();
    }
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== taskId);
        saveTasksToStorage();
        renderTasks();
        updateStats();
    }
}

// ============================================
// TAG MANAGEMENT
// ============================================

function addTag() {
    const tagInput = document.getElementById('tagInput');
    const tagText = tagInput.value.trim();

    if (!tagText) return;

    // Check if tag already exists
    if (currentTags.includes(tagText)) {
        alert('Tag already added');
        return;
    }

    currentTags.push(tagText);
    tagInput.value = '';
    renderTagList();
}

function removeTag(tagText) {
    currentTags = currentTags.filter(t => t !== tagText);
    renderTagList();
}

function renderTagList() {
    const tagList = document.getElementById('tagList');
    if (!tagList) return;

    if (currentTags.length === 0) {
        tagList.innerHTML = '<span style="color: var(--text-muted); font-size: 13px;">No tags added</span>';
        return;
    }

    tagList.innerHTML = currentTags.map((tag, index) => {
        const color = tagColors[index % tagColors.length];
        return `
            <span class="tag" style="background: ${color};" onclick="removeTag('${tag}')">
                ${tag} ×
            </span>
        `;
    }).join('');
}

// ============================================
// RENDERING
// ============================================

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;

    // Filter tasks
    const filteredTasks = getFilteredTasks();

    // Show empty state if no tasks
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No tasks found</h3>
                <p>${currentFilter === 'all' ? 'Add your first task to get started!' : 'No tasks match the current filter'}</p>
            </div>
        `;
        return;
    }

    // Render tasks
    tasksList.innerHTML = filteredTasks.map(task => createTaskHTML(task)).join('');
}

function createTaskHTML(task) {
    const categoryColor = categoryColors[task.category] || '#6c63ff';
    const dueDateText = task.dueDate ? formatDate(task.dueDate) : '';

    return `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTaskComplete(${task.id})"></div>
            
            <div class="task-content">
                <div class="task-text">${escapeHtml(task.text)}</div>
                
                <div class="task-meta">
                    <span class="task-category-badge" style="background: ${categoryColor};">
                        ${task.category}
                    </span>
                    
                    ${dueDateText ? `
                        <span class="task-date-badge">
                            📅 ${dueDateText}
                        </span>
                    ` : ''}
                    
                    ${task.tags && task.tags.length > 0 ? `
                        <div class="task-tags">
                            ${task.tags.map((tag, index) => {
                                const color = tagColors[index % tagColors.length];
                                return `<span class="task-tag" style="background: ${color};">${escapeHtml(tag)}</span>`;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <button class="task-delete" onclick="deleteTask(${task.id})">Delete</button>
        </div>
    `;
}

function getFilteredTasks() {
    return tasks.filter(task => {
        // Filter by completion status
        let matchesStatus = true;
        if (currentFilter === 'active') {
            matchesStatus = !task.completed;
        } else if (currentFilter === 'completed') {
            matchesStatus = task.completed;
        }

        // Filter by category
        let matchesCategory = true;
        if (currentCategoryFilter !== 'all') {
            matchesCategory = task.category === currentCategoryFilter;
        }

        return matchesStatus && matchesCategory;
    });
}

// ============================================
// STATISTICS
// ============================================

function updateStats() {
    const totalStat = document.getElementById('stat-total');
    const activeStat = document.getElementById('stat-active');
    const completedStat = document.getElementById('stat-completed');

    if (totalStat) totalStat.textContent = tasks.length;
    if (activeStat) activeStat.textContent = tasks.filter(t => !t.completed).length;
    if (completedStat) completedStat.textContent = tasks.filter(t => t.completed).length;
}

// ============================================
// LOCAL STORAGE
// ============================================

function saveTasksToStorage() {
    try {
        localStorage.setItem('donext_tasks', JSON.stringify(tasks));
    } catch (e) {
        console.error('Error saving tasks to localStorage:', e);
    }
}

function loadTasksFromStorage() {
    try {
        const stored = localStorage.getItem('donext_tasks');
        if (stored) {
            tasks = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading tasks from localStorage:', e);
        tasks = [];
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time parts for accurate comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() === today.getTime()) {
        return 'Today';
    } else if (checkDate.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
    } else if (checkDate < today) {
        return 'Overdue';
    } else {
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// EXPORT FOR DEBUGGING (Optional)
// ============================================

// Make functions globally accessible for onclick handlers
window.toggleTaskComplete = toggleTaskComplete;
window.deleteTask = deleteTask;
window.removeTag = removeTag;