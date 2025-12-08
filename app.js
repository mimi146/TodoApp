// Todo App with Pomodoro Timer
class TodoApp {
    constructor() {
        this.todos = this.loadTodos();
        this.currentFilter = 'all';
        this.timerInterval = null;

        // Load timer state from localStorage
        const timerState = this.loadTimerState();
        this.timeRemaining = timerState.timeRemaining;
        this.totalTime = timerState.totalTime;
        this.isRunning = false;

        this.initializeElements();
        this.attachEventListeners();
        this.renderTodos();

        // Set the minutes input to match loaded state
        this.pomodoroMinutesInput.value = Math.floor(this.totalTime / 60);
        this.updateTimer();
        this.updateProgressRing();

        // Auto-resume timer if it was running
        if (timerState.wasRunning) {
            // Calculate elapsed time since last save
            const now = Date.now();
            const elapsed = Math.floor((now - timerState.timestamp) / 1000);
            this.timeRemaining = Math.max(0, this.timeRemaining - elapsed);

            if (this.timeRemaining > 0) {
                this.updateTimer();
                this.updateProgressRing();
                // Auto-resume the timer
                setTimeout(() => this.startTimer(), 100);
            } else {
                // Timer completed while page was closed
                this.timeRemaining = 0;
                this.updateTimer();
                this.updateProgressRing();
            }
        }
    }

    initializeElements() {
        // Todo elements
        this.todoForm = document.getElementById('todoForm');
        this.todoInput = document.getElementById('todoInput');
        this.prioritySelect = document.getElementById('prioritySelect');
        this.todoList = document.getElementById('todoList');
        this.todoCount = document.getElementById('todoCount');
        this.clearCompletedBtn = document.getElementById('clearCompleted');
        this.filterButtons = document.querySelectorAll('.filter-btn');

        // Timer elements
        this.timerDisplay = document.getElementById('timer');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.pomodoroMinutesInput = document.getElementById('pomodoroMinutes');
        this.pomodoroSound = document.getElementById('pomodoroSound');
        this.progressRingActive = document.querySelector('.progress-ring-circle-active');
    }

    attachEventListeners() {
        // Todo event listeners
        this.todoForm.addEventListener('submit', (e) => this.handleAddTodo(e));
        this.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());

        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Timer event listeners
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.pauseTimer());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        this.pomodoroMinutesInput.addEventListener('change', () => this.updatePomodoroTime());
        this.pomodoroMinutesInput.addEventListener('blur', () => this.updatePomodoroTime());
    }

    // ========== TODO METHODS ==========

    handleAddTodo(e) {
        e.preventDefault();
        const text = this.todoInput.value.trim();
        const priority = this.prioritySelect.value;

        if (text === '') return;

        const todo = {
            id: Date.now(),
            text: text,
            priority: priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.push(todo);
        this.saveTodos();
        this.renderTodos();
        this.todoInput.value = '';
        this.prioritySelect.value = 'medium';
    }

    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveTodos();
        this.renderTodos();
    }

    toggleTodo(id) {
        const todo = this.todos.find(todo => todo.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.renderTodos();
        }
    }

    clearCompleted() {
        this.todos = this.todos.filter(todo => !todo.completed);
        this.saveTodos();
        this.renderTodos();
    }

    handleFilterChange(e) {
        this.filterButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.renderTodos();
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(todo => !todo.completed);
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            default:
                return this.todos;
        }
    }

    renderTodos() {
        const filteredTodos = this.getFilteredTodos();

        // Sort by priority (high -> medium -> low) and then by creation date
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const sortedTodos = filteredTodos.sort((a, b) => {
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        this.todoList.innerHTML = '';

        sortedTodos.forEach(todo => {
            const li = document.createElement('li');
            li.className = `todo-item priority-${todo.priority}${todo.completed ? ' completed' : ''}`;
            li.setAttribute('data-id', todo.id);

            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                <span class="priority-badge ${todo.priority}">${todo.priority}</span>
                <button class="delete-btn">Delete</button>
            `;

            // Add event listeners
            const checkbox = li.querySelector('.todo-checkbox');
            checkbox.addEventListener('change', () => this.toggleTodo(todo.id));

            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => this.deleteTodo(todo.id));

            this.todoList.appendChild(li);
        });

        this.updateTodoCount();
    }

    updateTodoCount() {
        const activeTodos = this.todos.filter(todo => !todo.completed).length;
        this.todoCount.textContent = `${activeTodos} task${activeTodos !== 1 ? 's' : ''} remaining`;
    }

    // ========== POMODORO TIMER METHODS ==========

    startTimer() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;

        // Play start beep
        this.playStartBeep();

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.saveTimerState();
            this.updateTimer();
            this.updateProgressRing();

            if (this.timeRemaining <= 0) {
                this.timerComplete();
            }
        }, 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        clearInterval(this.timerInterval);
    }

    resetTimer() {
        this.pauseTimer();
        this.timeRemaining = this.totalTime;
        this.saveTimerState();
        this.updateTimer();
        this.updateProgressRing();
    }

    updatePomodoroTime() {
        const minutes = parseInt(this.pomodoroMinutesInput.value) || 25;
        this.totalTime = minutes * 60;
        this.timeRemaining = this.totalTime;
        this.saveTimerState();
        this.updateTimer();
        this.updateProgressRing();
    }

    updateTimer() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        this.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateProgressRing() {
        const circumference = 2 * Math.PI * 64; // radius is 64
        const progress = (this.totalTime - this.timeRemaining) / this.totalTime;
        const offset = circumference * (1 - progress);
        this.progressRingActive.style.strokeDashoffset = offset;
    }

    timerComplete() {
        this.pauseTimer();
        this.playSound();
        this.showNotification();
        this.resetTimer();
    }

    playSound() {
        // Try to play the sound
        if (this.pomodoroSound) {
            this.pomodoroSound.play().catch(err => {
                console.log('Could not play sound:', err);
                // Fallback: try to use Web Audio API for a beep
                this.playBeep();
            });
        } else {
            this.playBeep();
        }
    }

    playBeep() {
        // Create a completion beep sound (lower pitch, longer)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 600; // Lower pitch for completion
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.8);
        } catch (err) {
            console.log('Could not create beep sound:', err);
        }
    }

    playStartBeep() {
        // Create a start beep sound (higher pitch, shorter)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 1000; // Higher pitch for start
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (err) {
            console.log('Could not create start beep sound:', err);
        }
    }

    showNotification() {
        // Show browser notification if supported and permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro Complete! 🎉', {
                body: 'Time for a break!',
                icon: '📝'
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('Pomodoro Complete! 🎉', {
                        body: 'Time for a break!',
                        icon: '📝'
                    });
                }
            });
        }

        // Visual notification
        alert('🎉 Pomodoro Complete! Time for a break!');
    }

    // ========== STORAGE METHODS ==========

    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    loadTodos() {
        const stored = localStorage.getItem('todos');
        return stored ? JSON.parse(stored) : [];
    }

    saveTimerState() {
        const timerState = {
            timeRemaining: this.timeRemaining,
            totalTime: this.totalTime,
            wasRunning: this.isRunning,
            timestamp: Date.now()
        };
        localStorage.setItem('timerState', JSON.stringify(timerState));
    }

    loadTimerState() {
        const stored = localStorage.getItem('timerState');
        if (stored) {
            return JSON.parse(stored);
        }
        // Default state
        return {
            timeRemaining: 25 * 60,
            totalTime: 25 * 60,
            wasRunning: false,
            timestamp: Date.now()
        };
    }

    // ========== UTILITY METHODS ==========

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TodoApp();
});
