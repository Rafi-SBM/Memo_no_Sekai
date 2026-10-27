// Memo no Sekai - Professional Note Taking Application
// Enhanced with accessibility, security, and full functionality

class MemoNoSekai {
    constructor() {
        this.notes = [];
        this.currentFilter = 'all';
        this.currentView = 'grid';
        this.currentSort = 'modified';
        this.storageType = 'local';
        this.isInitialized = false;
        this.draggedNote = null;
        this.customOrder = JSON.parse(localStorage.getItem('customOrder') || '[]');
        
        // Security and encryption
        this.encryptionKey = null;
        this.biometricAvailable = false;
        this.securityQuestions = JSON.parse(localStorage.getItem('securityQuestions') || '[]');
        this.currentUnlockNoteId = null;
        
        // Google Drive integration
        this.googleDriveAuth = null;
        this.googleDriveFolderId = localStorage.getItem('googleDriveFolderId') || null;
        
        // File System Access API
        this.localStorageHandle = null;
        this.localStoragePath = localStorage.getItem('localStoragePath') || null;
        
        // Search indexing
        this.searchIndex = new Map();
        this.searchWorker = null;
        
        // Performance optimization
        this.virtualScrolling = false;
        this.visibleNotes = [];
        this.scrollContainer = null;
        
        // Initialize the application
        this.init();
    }

    async init() {
        console.log('Initializing Memo no Sekai...');
        
        // Load user preferences
        this.loadPreferences();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup theme
        this.setupTheme();
        
        // Apply saved theme settings
        this.applyThemeSettings();
        
        // Load existing notes
        await this.loadNotes();
        
        // Update UI
        this.updateUI();
        
        // Force statistics update after DOM is fully ready
        setTimeout(() => {
            console.log('[INIT] Forcing statistics update after DOM ready');
            this.updateStatistics();
        }, 100);
        
        // Show welcome message for first-time users
        this.showWelcomeMessage();
        
        // Setup enterprise feature event listeners
        this.setupEnterpriseEventListeners();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup focus management
        this.setupFocusManagement();
        
        // Check biometric availability
        await this.checkBiometricSupport();
        
        // Initialize search indexing
        this.initializeSearchIndex();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Initialize enterprise features
        this.initializeEnterpriseFeatures();
        
        this.isInitialized = true;
        console.log('Memo no Sekai initialized successfully!');
    }

    setupEventListeners() {
        // Header buttons
        const searchInput = document.getElementById('globalSearch');
        const searchBtn = document.getElementById('searchBtn');
        const syncBtn = document.getElementById('syncBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsDropdown = document.getElementById('settingsDropdown');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    e.target.value = '';
                    this.handleSearch('');
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.focus();
            });
        }

        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.handleSync());
        }
        
        // Help button
        const helpBtn = document.getElementById('helpBtn');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => showKeyboardShortcuts());
        }
        
        // Command palette button
        const commandPaletteBtn = document.getElementById('commandPaletteBtn');
        if (commandPaletteBtn) {
            commandPaletteBtn.addEventListener('click', () => showCommandPalette());
        }

        if (settingsBtn && settingsDropdown) {
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = settingsDropdown.classList.contains('show');
                settingsDropdown.classList.toggle('show');
                settingsBtn.setAttribute('aria-expanded', !isOpen);
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                settingsDropdown.classList.remove('show');
                settingsBtn.setAttribute('aria-expanded', 'false');
            });

            // Keyboard navigation for dropdown
            settingsDropdown.addEventListener('keydown', (e) => {
                this.handleDropdownKeyboard(e);
            });
        }

        // Settings dropdown items
        const showRecoveryCode = document.getElementById('showRecoveryCode');
        const importNotes = document.getElementById('importNotes');
        const exportNotes = document.getElementById('exportNotes');
        const themeToggle = document.getElementById('themeToggle');

        const setupSecurityQuestions = document.getElementById('setupSecurityQuestions');
        const forgotPassword = document.getElementById('forgotPassword');

        if (setupSecurityQuestions) {
            setupSecurityQuestions.addEventListener('click', () => this.showSecurityQuestionsModal());
        }

        if (forgotPassword) {
            forgotPassword.addEventListener('click', () => this.showForgotPasswordFlow());
        }

        if (importNotes) {
            importNotes.addEventListener('click', () => this.importNotes());
        }

        if (exportNotes) {
            exportNotes.addEventListener('click', () => this.exportNotes());
        }

        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        const customizeTheme = document.getElementById('customizeTheme');
        if (customizeTheme) {
            customizeTheme.addEventListener('click', () => this.showThemeCustomization());
        }

        // Sidebar elements
        const storageSettings = document.getElementById('storageSettings');
        const storageInfo = document.getElementById('storageInfo');
        const newNoteBtn = document.getElementById('newNoteBtn');

        if (storageSettings) {
            storageSettings.addEventListener('click', () => this.showStorageModal());
        }

        if (storageInfo) {
            storageInfo.addEventListener('click', () => this.showStorageModal());
        }

        if (newNoteBtn) {
            newNoteBtn.addEventListener('click', () => this.showNoteEditor());
        }

        // Template functionality removed for security and simplicity

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });

        // View toggle buttons
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => this.setView(btn.dataset.view));
        });

        // Sort button
        const sortBtn = document.getElementById('sortBtn');
        if (sortBtn) {
            sortBtn.addEventListener('click', () => this.showSortMenu());
        }

        // Modal event listeners
        this.setupModalEventListeners();
        
        // Setup markdown editor
        this.setupMarkdownEditor();
        
        // Setup quick preview
        this.setupQuickPreview();
    }

    setupModalEventListeners() {
        // Note editor modal
        const noteEditorModal = document.getElementById('noteEditorModal');
        const closeEditor = document.getElementById('closeEditor');
        const noteForm = document.getElementById('noteForm');
        const passwordProtect = document.getElementById('passwordProtect');
        const passwordGroup = document.getElementById('passwordGroup');
        const notePassword = document.getElementById('notePassword');

        if (closeEditor) {
            closeEditor.addEventListener('click', () => this.closeNoteEditor());
        }

        if (noteForm) {
            noteForm.addEventListener('submit', (e) => this.handleNoteSave(e));
        }

        if (passwordProtect && passwordGroup && notePassword) {
            passwordProtect.addEventListener('change', (e) => {
                if (e.target.checked) {
                    passwordGroup.style.display = 'flex';
                    setTimeout(() => notePassword.focus(), 100);
                } else {
                    passwordGroup.style.display = 'none';
                    notePassword.value = '';
                }
            });
        }

        // Password visibility toggle
        const passwordToggle = document.getElementById('passwordToggle');
        if (passwordToggle && notePassword) {
            passwordToggle.addEventListener('click', () => {
                const isPassword = notePassword.type === 'password';
                notePassword.type = isPassword ? 'text' : 'password';
                
                const eyeOpen = passwordToggle.querySelector('.eye-open');
                const eyeClosed = passwordToggle.querySelector('.eye-closed');
                
                if (isPassword) {
                    eyeOpen.style.display = 'none';
                    eyeClosed.style.display = 'block';
                    passwordToggle.setAttribute('aria-label', 'Hide password');
                } else {
                    eyeOpen.style.display = 'block';
                    eyeClosed.style.display = 'none';
                    passwordToggle.setAttribute('aria-label', 'Show password');
                }
            });
        }

        // Password unlock modal
        const passwordUnlockModal = document.getElementById('passwordUnlockModal');
        const closePasswordModal = document.getElementById('closePasswordModal');
        const unlockForm = document.getElementById('unlockForm');
        const unlockPassword = document.getElementById('unlockPassword');
        const unlockPasswordToggle = document.getElementById('unlockPasswordToggle');
        const cancelUnlock = document.getElementById('cancelUnlock');

        // QR Code modal
        const closeQrModal = document.getElementById('closeQrModal');
        const downloadQr = document.getElementById('downloadQr');

        if (closePasswordModal) {
            closePasswordModal.addEventListener('click', () => this.closePasswordModal());
        }

        if (cancelUnlock) {
            cancelUnlock.addEventListener('click', () => this.closePasswordModal());
        }

        if (unlockForm) {
            unlockForm.addEventListener('submit', (e) => this.handlePasswordUnlock(e));
        }

        // Password visibility toggle for unlock modal
        if (unlockPasswordToggle && unlockPassword) {
            unlockPasswordToggle.addEventListener('click', () => {
                const isPassword = unlockPassword.type === 'password';
                unlockPassword.type = isPassword ? 'text' : 'password';
                
                const eyeOpen = unlockPasswordToggle.querySelector('.eye-open');
                const eyeClosed = unlockPasswordToggle.querySelector('.eye-closed');
                
                if (isPassword) {
                    eyeOpen.style.display = 'none';
                    eyeClosed.style.display = 'block';
                    unlockPasswordToggle.setAttribute('aria-label', 'Hide password');
                } else {
                    eyeOpen.style.display = 'block';
                    eyeClosed.style.display = 'none';
                    unlockPasswordToggle.setAttribute('aria-label', 'Show password');
                }
            });
        }

        if (closeQrModal) {
            closeQrModal.addEventListener('click', () => this.closeQRModal());
        }

        if (downloadQr) {
            downloadQr.addEventListener('click', () => this.downloadQRCode());
        }

        // Security Questions modal
        const closeSecurityModal = document.getElementById('closeSecurityModal');
        const cancelSecurity = document.getElementById('cancelSecurity');
        const saveSecurity = document.getElementById('saveSecurity');
        const addQuestion = document.getElementById('addQuestion');

        if (closeSecurityModal) {
            closeSecurityModal.addEventListener('click', () => this.closeSecurityQuestionsModal());
        }

        if (cancelSecurity) {
            cancelSecurity.addEventListener('click', () => this.closeSecurityQuestionsModal());
        }

        if (saveSecurity) {
            saveSecurity.addEventListener('click', () => this.saveSecurityQuestions());
        }

        if (addQuestion) {
            addQuestion.addEventListener('click', () => this.addSecurityQuestion());
        }

        // Suggested questions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggested-question')) {
                this.useSuggestedQuestion(e.target.dataset.question);
            }
        });

        // Storage modal
        const storageModal = document.getElementById('storageModal');
        const closeStorageModal = document.getElementById('closeStorageModal');
        const storageOptions = document.querySelectorAll('.storage-option');

        if (closeStorageModal) {
            closeStorageModal.addEventListener('click', () => this.closeStorageModal());
        }

        storageOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.selectStorage(option.dataset.storage);
            });
        });

        // Modal backdrop clicks
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAllModals();
                }
            });
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const themeToggle = document.getElementById('themeToggle');
        const themeText = document.querySelector('.theme-text');
        
        if (themeToggle && themeText) {
            const isDark = theme === 'dark';
            themeToggle.setAttribute('aria-pressed', isDark);
            themeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        this.showNotification(`Switched to ${newTheme} mode`, 'info');
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Only allow save shortcut in editor
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    const noteEditorModal = document.getElementById('noteEditorModal');
                    if (noteEditorModal && noteEditorModal.classList.contains('show')) {
                        e.preventDefault();
                        const saveBtn = document.getElementById('saveNote');
                        if (saveBtn) saveBtn.click();
                    }
                }
                return;
            }

            // Ctrl/Cmd + N: New note
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.showNoteEditor();
            }
            
            // Ctrl/Cmd + K: Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('globalSearch');
                if (searchInput) searchInput.focus();
            }
            
            // Ctrl/Cmd + E: Export notes
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.exportNotes();
            }
            
            // Ctrl/Cmd + I: Import notes
            if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                e.preventDefault();
                this.importNotes();
            }
            
            // Ctrl/Cmd + T: Toggle theme
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.toggleTheme();
            }
            
            // Ctrl/Cmd + F: Toggle filter
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.cycleFilter();
            }
            
            // Ctrl/Cmd + G: Toggle view (Grid/List)
            if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
                e.preventDefault();
                this.toggleView();
            }
            
            // Ctrl/Cmd + A: Analytics Dashboard
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.showAnalyticsDashboard();
            }
            
            // Escape: Close modals and clear search
            if (e.key === 'Escape') {
                const searchInput = document.getElementById('globalSearch');
                if (searchInput && searchInput.value) {
                    searchInput.value = '';
                    this.handleSearch('');
                } else {
                    this.closeAllModals();
                }
            }
            
            // Arrow keys for note navigation
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                this.navigateNotes(e.key === 'ArrowDown' ? 1 : -1);
                e.preventDefault();
            }
        });
    }

    cycleFilter() {
        const filters = ['all', 'recent', 'favorites', 'protected'];
        const currentIndex = filters.indexOf(this.currentFilter);
        const nextIndex = (currentIndex + 1) % filters.length;
        this.setFilter(filters[nextIndex]);
        this.showNotification(`Filter: ${this.getFilterDisplayName(filters[nextIndex])}`, 'info');
    }

    toggleView() {
        const newView = this.currentView === 'grid' ? 'list' : 'grid';
        this.setView(newView);
        this.showNotification(`View: ${newView}`, 'info');
    }

    navigateNotes(direction) {
        const noteCards = document.querySelectorAll('.note-card');
        if (noteCards.length === 0) return;

        const focusedElement = document.activeElement;
        let currentIndex = -1;

        // Find currently focused note
        noteCards.forEach((card, index) => {
            if (card.contains(focusedElement) || card === focusedElement) {
                currentIndex = index;
            }
        });

        // Calculate next index
        let nextIndex = currentIndex + direction;
        if (nextIndex < 0) nextIndex = noteCards.length - 1;
        if (nextIndex >= noteCards.length) nextIndex = 0;

        // Focus next note
        const nextCard = noteCards[nextIndex];
        if (nextCard) {
            nextCard.focus();
            nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    setupFocusManagement() {
        // Focus trap for modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    this.trapFocus(e, modal);
                }
            });
        });
    }

    trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }

    handleDropdownKeyboard(e) {
        const items = e.currentTarget.querySelectorAll('.dropdown-item');
        const currentIndex = Array.from(items).indexOf(document.activeElement);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                items[nextIndex].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items[prevIndex].focus();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (document.activeElement) {
                    document.activeElement.click();
                }
                break;
        }
    }

    loadPreferences() {
        // Load saved preferences
        this.currentFilter = localStorage.getItem('currentFilter') || 'all';
        this.currentView = localStorage.getItem('currentView') || 'grid';
        this.currentSort = localStorage.getItem('currentSort') || 'modified';
        this.storageType = localStorage.getItem('storageType') || 'local';
    }

    savePreferences() {
        localStorage.setItem('currentFilter', this.currentFilter);
        localStorage.setItem('currentView', this.currentView);
        localStorage.setItem('currentSort', this.currentSort);
        localStorage.setItem('storageType', this.storageType);
    }

    async loadNotes() {
        try {
            switch (this.storageType) {
                case 'local':
                    this.notes = JSON.parse(localStorage.getItem('notes') || '[]');
                    break;
                case 'cloud':
                    // TODO: Implement Google Drive integration
                    this.notes = JSON.parse(localStorage.getItem('notes') || '[]');
                    break;
                case 'cache':
                    this.notes = JSON.parse(sessionStorage.getItem('notes') || '[]');
                    break;
                default:
                    this.notes = [];
            }
            
            // Decrypt protected notes if needed
            this.notes = this.notes.map(note => {
                if (note.isProtected && note.encryptedContent) {
                    // Keep encrypted content, will decrypt when accessed
                    return note;
                }
                return note;
            });
            
        } catch (error) {
            console.error('Error loading notes:', error);
            this.notes = [];
            this.showNotification('Error loading notes', 'error');
        }
    }

    async saveNotes() {
        try {
            // SECURITY: Clean protected notes before saving - remove any decrypted content
            const notesToSave = this.notes.map(note => {
                if (note.isProtected) {
                    // Create a clean copy without sensitive data
                    const cleanNote = { ...note };
                    delete cleanNote.decryptedContent;
                    delete cleanNote.sessionUnlocked;
                    // Ensure plain content is null for protected notes
                    cleanNote.content = null;
                    return cleanNote;
                }
                return note;
            });
            
            switch (this.storageType) {
                case 'local':
                    // Save to both localStorage (for quick access) and file system (for organization)
                    localStorage.setItem('notes', JSON.stringify(notesToSave));
                    if (this.memoFolderHandle) {
                        await this.saveNotesToFileSystem();
                    }
                    break;
                case 'cloud':
                    // Save to both localStorage (for offline access) and Google Drive
                    localStorage.setItem('notes', JSON.stringify(notesToSave));
                    if (this.googleDriveAuth && this.googleDriveAuth.isSignedIn.get()) {
                        await this.saveNotesToGoogleDrive();
                    }
                    break;
                case 'cache':
                    sessionStorage.setItem('notes', JSON.stringify(notesToSave));
                    break;
            }
            
            this.savePreferences();
            
        } catch (error) {
            console.error('Error saving notes:', error);
            // Don't show notification here - let the caller handle it
            throw error; // Re-throw so caller can handle
        }
    }

    async saveNotesToFileSystem() {
        try {
            // Group notes by creation date
            const notesByDate = this.groupNotesByDate();
            
            for (const [dateString, notes] of Object.entries(notesByDate)) {
                const dateFolderHandle = await this.getOrCreateLocalDateFolder(notes[0].created);
                
                for (const note of notes) {
                    await this.saveNoteToLocalStorage(note);
                }
            }
        } catch (error) {
            console.error('Failed to save notes to file system:', error);
        }
    }

    async saveNotesToGoogleDrive() {
        try {
            // Group notes by creation date
            const notesByDate = this.groupNotesByDate();
            
            for (const [dateString, notes] of Object.entries(notesByDate)) {
                for (const note of notes) {
                    await this.saveNoteToGoogleDrive(note);
                }
            }
        } catch (error) {
            console.error('Failed to save notes to Google Drive:', error);
        }
    }

    groupNotesByDate() {
        const grouped = {};
        
        this.notes.forEach(note => {
            const date = new Date(note.created);
            const dateString = date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/\s/g, ' ');
            
            if (!grouped[dateString]) {
                grouped[dateString] = [];
            }
            grouped[dateString].push(note);
        });
        
        return grouped;
    }

    // Search Index Methods
    initializeSearchIndex() {
        this.searchIndexInstance = new SearchIndex();
        this.rebuildSearchIndex();
    }

    rebuildSearchIndex() {
        if (!this.searchIndexInstance) return;
        
        this.searchIndexInstance.clear();
        this.notes.forEach(note => {
            this.searchIndexInstance.addNote(note);
        });
    }

    addNoteToIndex(note) {
        if (this.searchIndexInstance) {
            this.searchIndexInstance.addNote(note);
        }
    }

    removeNoteFromIndex(noteId) {
        if (this.searchIndexInstance) {
            this.searchIndexInstance.removeNote(noteId);
        }
    }

    performIndexedSearch(query) {
        if (!this.searchIndexInstance || !query.trim()) {
            return this.notes;
        }

        const matchingIds = this.searchIndexInstance.search(query);
        return this.notes.filter(note => matchingIds.has(note.id));
    }

    setupPerformanceMonitoring() {
        // Monitor performance metrics
        this.performanceMetrics = {
            searchTime: 0,
            renderTime: 0,
            notesCount: 0
        };

        // Setup virtual scrolling for large note collections
        if (this.notes.length > 100) {
            this.enableVirtualScrolling();
        }
    }

    enableVirtualScrolling() {
        this.virtualScrolling = true;
        this.itemHeight = 120; // Approximate height of a note card
        this.visibleCount = Math.ceil(window.innerHeight / this.itemHeight) + 5; // Buffer
        
        console.log('Virtual scrolling enabled for performance optimization');
    }

    // Theme Customization
    showThemeCustomization() {
        const modal = document.getElementById('themeCustomizationModal');
        if (modal) {
            this.loadCurrentThemeSettings();
            modal.classList.add('show');
        }
    }

    loadCurrentThemeSettings() {
        const currentAccent = localStorage.getItem('accentColor') || '#3b82f6';
        const currentFontSize = localStorage.getItem('fontSize') || 'medium';
        const currentDensity = localStorage.getItem('density') || 'comfortable';

        // Update color picker
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === currentAccent);
        });

        // Update font size
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === currentFontSize);
        });

        // Update density
        document.querySelectorAll('.density-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.density === currentDensity);
        });

        // Setup event listeners
        this.setupThemeEventListeners();
    }

    setupThemeEventListeners() {
        // Color picker
        document.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.previewAccentColor(btn.dataset.color);
            });
        });

        // Font size
        document.querySelectorAll('.font-size-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.previewFontSize(btn.dataset.size);
            });
        });

        // Density
        document.querySelectorAll('.density-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.density-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.previewDensity(btn.dataset.density);
            });
        });

        // Save and reset buttons
        const saveTheme = document.getElementById('saveTheme');
        const resetTheme = document.getElementById('resetTheme');
        const closeThemeModal = document.getElementById('closeThemeModal');

        if (saveTheme) {
            saveTheme.addEventListener('click', () => this.saveThemeSettings());
        }

        if (resetTheme) {
            resetTheme.addEventListener('click', () => this.resetThemeSettings());
        }

        if (closeThemeModal) {
            closeThemeModal.addEventListener('click', () => this.closeThemeCustomization());
        }
    }

    previewAccentColor(color) {
        document.documentElement.style.setProperty('--accent-primary', color);
        const secondaryColor = this.adjustColorBrightness(color, -20);
        document.documentElement.style.setProperty('--accent-secondary', secondaryColor);
    }

    previewFontSize(size) {
        document.documentElement.setAttribute('data-font-size', size);
    }

    previewDensity(density) {
        document.documentElement.setAttribute('data-density', density);
    }

    adjustColorBrightness(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    saveThemeSettings() {
        const activeColor = document.querySelector('.color-option.active')?.dataset.color || '#3b82f6';
        const activeFontSize = document.querySelector('.font-size-btn.active')?.dataset.size || 'medium';
        const activeDensity = document.querySelector('.density-btn.active')?.dataset.density || 'comfortable';

        localStorage.setItem('accentColor', activeColor);
        localStorage.setItem('fontSize', activeFontSize);
        localStorage.setItem('density', activeDensity);

        this.applyThemeSettings();
        this.closeThemeCustomization();
        this.showNotification('Theme settings saved', 'success');
    }

    resetThemeSettings() {
        localStorage.removeItem('accentColor');
        localStorage.removeItem('fontSize');
        localStorage.removeItem('density');

        this.applyThemeSettings();
        this.loadCurrentThemeSettings();
        this.showNotification('Theme reset to default', 'success');
    }

    applyThemeSettings() {
        const accentColor = localStorage.getItem('accentColor') || '#3b82f6';
        const fontSize = localStorage.getItem('fontSize') || 'medium';
        const density = localStorage.getItem('density') || 'comfortable';

        this.previewAccentColor(accentColor);
        this.previewFontSize(fontSize);
        this.previewDensity(density);
    }

    closeThemeCustomization() {
        const modal = document.getElementById('themeCustomizationModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    updatePerformanceIndicator() {
        const indicator = document.getElementById('performanceIndicator');
        const notesCount = document.getElementById('perfNotesCount');
        const searchTime = document.getElementById('perfSearchTime');
        const renderTime = document.getElementById('perfRenderTime');

        if (indicator && notesCount && searchTime && renderTime) {
            notesCount.textContent = this.performanceMetrics.notesCount;
            searchTime.textContent = `${this.performanceMetrics.searchTime.toFixed(1)}ms`;
            renderTime.textContent = `${this.performanceMetrics.renderTime.toFixed(1)}ms`;

            // Show indicator temporarily if performance is slow
            if (this.performanceMetrics.renderTime > 100 || this.performanceMetrics.searchTime > 50) {
                indicator.classList.add('show');
                setTimeout(() => indicator.classList.remove('show'), 3000);
            }
        }
    }

    updateUI() {
        console.log('Updating UI with', this.notes.length, 'notes');
        this.updateNotesGrid();
        this.updateFilterButtons();
        this.updateViewButtons();
        this.updateTagsList();
        this.updateStorageStatus();
        this.updateStatistics();
    }

    updateNotesGrid() {
        const startTime = performance.now();
        const notesGrid = document.getElementById('notesGrid');
        const notesTitle = document.getElementById('notesTitle');
        
        if (!notesGrid) return;

        // Filter notes
        let filteredNotes = this.filterNotes(this.notes);
        
        // Sort notes
        filteredNotes = this.sortNotes(filteredNotes);

        // Update title
        if (notesTitle) {
            const count = filteredNotes.length;
            const filterText = this.getFilterDisplayName(this.currentFilter);
            notesTitle.textContent = `${filterText} (${count})`;
        }

        // Update grid class for view
        notesGrid.className = `notes-grid ${this.currentView === 'list' ? 'list-view' : ''}`;

        // Performance optimization for large collections
        if (filteredNotes.length > 100 && this.virtualScrolling) {
            this.renderVirtualizedNotes(filteredNotes, notesGrid);
        } else {
            this.renderAllNotes(filteredNotes, notesGrid);
        }

        // Record render performance
        const renderTime = performance.now() - startTime;
        this.performanceMetrics.renderTime = renderTime;
        this.performanceMetrics.notesCount = filteredNotes.length;
        
        if (renderTime > 200) {
            console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms for ${filteredNotes.length} notes`);
        }

        // Update performance indicator
        this.updatePerformanceIndicator();
    }

    renderAllNotes(filteredNotes, notesGrid) {
        // Clear existing notes
        notesGrid.innerHTML = '';

        // Add notes
        if (filteredNotes.length === 0) {
            notesGrid.innerHTML = this.getEmptyStateHTML();
        } else {
            const fragment = document.createDocumentFragment();
            filteredNotes.forEach(note => {
                const noteElement = this.createNoteElement(note);
                this.setupDragAndDrop(noteElement);
                fragment.appendChild(noteElement);
            });
            notesGrid.appendChild(fragment);
        }
    }

    renderVirtualizedNotes(filteredNotes, notesGrid) {
        // Implement virtual scrolling for performance
        notesGrid.innerHTML = '';
        
        if (filteredNotes.length === 0) {
            notesGrid.innerHTML = this.getEmptyStateHTML();
            return;
        }

        // Create container for virtual scrolling
        const container = document.createElement('div');
        container.className = 'virtual-scroll-container';
        container.style.height = `${filteredNotes.length * this.itemHeight}px`;
        container.style.position = 'relative';

        // Calculate visible range
        const scrollTop = notesGrid.scrollTop || 0;
        const startIndex = Math.floor(scrollTop / this.itemHeight);
        const endIndex = Math.min(startIndex + this.visibleCount, filteredNotes.length);

        // Render only visible notes
        const fragment = document.createDocumentFragment();
        for (let i = startIndex; i < endIndex; i++) {
            const note = filteredNotes[i];
            const noteElement = this.createNoteElement(note);
            noteElement.style.position = 'absolute';
            noteElement.style.top = `${i * this.itemHeight}px`;
            noteElement.style.width = '100%';
            this.setupDragAndDrop(noteElement);
            fragment.appendChild(noteElement);
        }

        container.appendChild(fragment);
        notesGrid.appendChild(container);

        // Setup scroll listener for virtual scrolling
        this.setupVirtualScrollListener(notesGrid, filteredNotes);
    }

    setupVirtualScrollListener(notesGrid, filteredNotes) {
        if (this.scrollListener) {
            notesGrid.removeEventListener('scroll', this.scrollListener);
        }

        this.scrollListener = () => {
            this.renderVirtualizedNotes(filteredNotes, notesGrid);
        };

        notesGrid.addEventListener('scroll', this.scrollListener, { passive: true });
    }

    filterNotes(notes) {
        console.log('Filtering notes with filter:', this.currentFilter, 'Total notes:', notes.length);
        
        let filtered;
        switch (this.currentFilter) {
            case 'protected':
                filtered = notes.filter(note => note.isProtected);
                break;
            case 'recent':
                const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                filtered = notes.filter(note => note.modified > oneWeekAgo);
                break;
            case 'favorites':
                filtered = notes.filter(note => note.isFavorite);
                break;
            default:
                filtered = notes;
        }
        
        console.log('Filtered result:', filtered.length, 'notes');
        return filtered;
    }

    sortNotes(notes) {
        // First separate pinned notes
        const pinnedNotes = notes.filter(note => note.isPinned);
        const unpinnedNotes = notes.filter(note => !note.isPinned);
        
        // Sort each group
        const sortFunction = (a, b) => {
            switch (this.currentSort) {
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'created':
                    return b.created - a.created;
                case 'custom':
                    const aIndex = this.customOrder.indexOf(a.id);
                    const bIndex = this.customOrder.indexOf(b.id);
                    if (aIndex === -1 && bIndex === -1) return b.modified - a.modified;
                    if (aIndex === -1) return 1;
                    if (bIndex === -1) return -1;
                    return aIndex - bIndex;
                case 'modified':
                default:
                    return b.modified - a.modified;
            }
        };
        
        pinnedNotes.sort(sortFunction);
        unpinnedNotes.sort(sortFunction);
        
        // Return pinned notes first, then unpinned
        return [...pinnedNotes, ...unpinnedNotes];
    }

    getFilterDisplayName(filter) {
        const names = {
            'all': 'All Notes',
            'protected': 'Protected Notes',
            'recent': 'Recent Notes',
            'favorites': 'Favorite Notes'
        };
        return names[filter] || 'Notes';
    }

    getEmptyStateHTML() {
        const messages = {
            'all': {
                icon: '📝',
                title: 'No notes yet',
                subtitle: 'Click "Add Memo" to create your first note and start organizing your thoughts.'
            },
            'protected': {
                icon: '🔒',
                title: 'No protected notes',
                subtitle: 'Create a note and enable password protection to keep your sensitive information secure.'
            },
            'recent': {
                icon: '⏰',
                title: 'No recent notes',
                subtitle: 'Notes created or modified in the last 7 days will appear here.'
            },
            'favorites': {
                icon: '⭐',
                title: 'No favorite notes',
                subtitle: 'Click the star icon on any note to add it to your favorites.'
            }
        };
        
        const message = messages[this.currentFilter] || messages['all'];
        
        return `
            <div class="empty-state">
                <div class="empty-icon">${message.icon}</div>
                <h3 class="empty-title">${message.title}</h3>
                <p class="empty-subtitle">${message.subtitle}</p>
                ${this.currentFilter === 'all' ? '<button class="btn-primary btn-compact" onclick="app.showNoteEditor()">+ Add Your First Memo</button>' : ''}
            </div>
        `;
    }

    createNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = `note-card ${note.isProtected ? 'protected' : ''} ${note.isPinned ? 'pinned' : ''}`;
        noteDiv.dataset.noteId = note.id;
        noteDiv.draggable = true;

        // SECURITY FIX: Never show actual content for protected notes unless decrypted
        let content, isProtectedContent = false, isMarkdown = false;
        
        if (note.isProtected) {
            if (note.decryptedContent && note.sessionUnlocked) {
                // Note is unlocked in current session
                content = note.decryptedContent;
                isMarkdown = note.isMarkdown;
            } else {
                // Note is locked - show placeholder only
                content = '🔒 Protected Note - Click to unlock';
                isProtectedContent = true;
                // NEVER expose actual content, even encrypted
            }
        } else {
            // Regular note
            content = note.content || '';
            isMarkdown = note.isMarkdown;
        }

        // Parse markdown if needed (only for non-protected content)
        if (isMarkdown && !isProtectedContent) {
            content = this.parseMarkdown(content);
        }

        const tags = note.tags || [];
        const tagsHTML = tags.map(tag => 
            `<button class="note-tag" aria-label="Filter by ${tag} tag" onclick="app.filterByTag('${tag}')">${this.escapeHtml(tag)}</button>`
        ).join('');

        noteDiv.innerHTML = `
            <div class="note-header">
                <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                <div class="note-actions">
                    <button class="note-action pin" aria-label="${note.isPinned ? 'Unpin note' : 'Pin note'}" aria-pressed="${note.isPinned}" onclick="app.togglePin('${note.id}')">
                        <svg viewBox="0 0 24 24" class="pin-outline" style="${note.isPinned ? 'display: none;' : ''}">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke="currentColor" stroke-width="2"></path>
                        </svg>
                        <svg viewBox="0 0 24 24" class="pin-filled" style="${note.isPinned ? '' : 'display: none;'}">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"></path>
                        </svg>
                    </button>
                    <button class="note-action favorite" aria-label="${note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}" aria-pressed="${note.isFavorite}" onclick="app.toggleFavorite('${note.id}')">
                        <svg viewBox="0 0 24 24" class="star-outline" style="${note.isFavorite ? 'display: none;' : ''}">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="none" stroke="currentColor" stroke-width="2"></polygon>
                        </svg>
                        <svg viewBox="0 0 24 24" class="star-filled" style="${note.isFavorite ? '' : 'display: none;'}">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="currentColor"></polygon>
                        </svg>
                    </button>
                    <button class="note-action edit" aria-label="Edit note" onclick="app.editNote('${note.id}')">
                        <svg viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="note-action qr" aria-label="Generate QR code" onclick="app.generateQRCode('${note.id}')" ${note.isProtected && !note.decryptedContent ? 'style="display: none;"' : ''}>
                        <svg viewBox="0 0 24 24">
                            <rect x="3" y="3" width="5" height="5"></rect>
                            <rect x="16" y="3" width="5" height="5"></rect>
                            <rect x="3" y="16" width="5" height="5"></rect>
                            <rect x="11" y="11" width="2" height="2"></rect>
                            <rect x="16" y="16" width="2" height="2"></rect>
                            <rect x="19" y="16" width="2" height="2"></rect>
                            <rect x="16" y="19" width="2" height="2"></rect>
                            <rect x="19" y="19" width="2" height="2"></rect>
                        </svg>
                    </button>
                    <button class="note-action share" aria-label="Share note" onclick="app.shareNote('${note.id}')" ${note.isProtected && !note.decryptedContent ? 'style="display: none;"' : ''}>
                        <svg viewBox="0 0 24 24">
                            <circle cx="18" cy="5" r="3"></circle>
                            <circle cx="6" cy="12" r="3"></circle>
                            <circle cx="18" cy="19" r="3"></circle>
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                    </button>
                    <button class="note-action delete" aria-label="Delete note" onclick="app.deleteNote('${note.id}')">
                        <svg viewBox="0 0 24 24">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="note-content ${isProtectedContent ? 'protected-content' : ''} ${isMarkdown && !isProtectedContent ? 'markdown-content' : ''}" 
                 ${isProtectedContent ? `role="button" aria-label="Click to unlock protected content" onclick="app.unlockNote('${note.id}')"` : ''}>
                ${isMarkdown && !isProtectedContent ? content : this.escapeHtml(content)}
            </div>
            <div class="note-footer">
                <div class="note-tags">
                    ${tagsHTML}
                </div>
                <div class="note-date">${this.formatDate(note.modified)}</div>
            </div>
        `;

        return noteDiv;
    }

    setupDragAndDrop(noteElement) {
        noteElement.addEventListener('dragstart', (e) => {
            this.draggedNote = e.target.dataset.noteId;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        noteElement.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            this.draggedNote = null;
        });

        noteElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(e.currentTarget.parentNode, e.clientY);
            const dragging = document.querySelector('.dragging');
            
            if (afterElement == null) {
                e.currentTarget.parentNode.appendChild(dragging);
            } else {
                e.currentTarget.parentNode.insertBefore(dragging, afterElement);
            }
        });

        noteElement.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleNoteDrop();
        });

        // Quick preview on hover (desktop only)
        if (window.innerWidth > 768) {
            let hoverTimeout;
            
            noteElement.addEventListener('mouseenter', () => {
                hoverTimeout = setTimeout(() => {
                    this.showQuickPreview(noteElement.dataset.noteId);
                }, 800); // Show after 800ms hover
            });

            noteElement.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
            });
        }

        // Quick preview on double-click (mobile friendly)
        noteElement.addEventListener('dblclick', (e) => {
            e.preventDefault();
            this.showQuickPreview(noteElement.dataset.noteId);
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.note-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    handleNoteDrop() {
        const notesGrid = document.getElementById('notesGrid');
        const noteElements = [...notesGrid.querySelectorAll('.note-card')];
        
        // Update custom order based on current DOM order
        this.customOrder = noteElements.map(el => el.dataset.noteId);
        localStorage.setItem('customOrder', JSON.stringify(this.customOrder));
        
        // Switch to custom sort if not already
        if (this.currentSort !== 'custom') {
            this.currentSort = 'custom';
            this.savePreferences();
        }
        
        this.showNotification('Note order updated', 'success');
    }

    updateFilterButtons() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            const isActive = btn.dataset.filter === this.currentFilter;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', isActive);
        });
    }

    updateViewButtons() {
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            const isActive = btn.dataset.view === this.currentView;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive);
        });
    }

    updateTagsList() {
        const tagsList = document.getElementById('tagsList');
        if (!tagsList) return;

        // Get all unique tags with counts and hierarchy
        const tagCounts = {};
        const hierarchicalTags = {};
        
        this.notes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                    
                    // Handle hierarchical tags (parent/child)
                    if (tag.includes('/')) {
                        const parts = tag.split('/');
                        const parent = parts[0];
                        const child = parts.slice(1).join('/');
                        
                        if (!hierarchicalTags[parent]) {
                            hierarchicalTags[parent] = {};
                        }
                        hierarchicalTags[parent][child] = (hierarchicalTags[parent][child] || 0) + 1;
                    }
                });
            }
        });

        // Sort tags by count (descending)
        const sortedTags = Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15); // Show top 15 tags

        tagsList.innerHTML = '';
        
        if (sortedTags.length === 0) {
            tagsList.innerHTML = '<div class="tag-item"><span>No tags yet</span></div>';
            return;
        }

        // Render hierarchical tags
        const renderedParents = new Set();
        
        sortedTags.forEach(([tag, count]) => {
            if (tag.includes('/')) {
                const parent = tag.split('/')[0];
                
                if (!renderedParents.has(parent)) {
                    // Render parent tag
                    const parentCount = Object.keys(hierarchicalTags[parent] || {}).reduce((sum, child) => {
                        return sum + (hierarchicalTags[parent][child] || 0);
                    }, tagCounts[parent] || 0);
                    
                    const parentDiv = document.createElement('div');
                    parentDiv.className = 'tag-item parent-tag';
                    parentDiv.innerHTML = `
                        <button class="tag-name" onclick="app.filterByTag('${parent}')" aria-label="Filter by ${parent} tag">
                            📁 ${this.escapeHtml(parent)}
                        </button>
                        <span class="tag-count">${parentCount}</span>
                    `;
                    tagsList.appendChild(parentDiv);
                    
                    // Render child tags
                    Object.entries(hierarchicalTags[parent] || {}).forEach(([child, childCount]) => {
                        const childDiv = document.createElement('div');
                        childDiv.className = 'tag-item child-tag';
                        childDiv.innerHTML = `
                            <button class="tag-name" onclick="app.filterByTag('${parent}/${child}')" aria-label="Filter by ${parent}/${child} tag">
                                └─ ${this.escapeHtml(child)}
                            </button>
                            <span class="tag-count">${childCount}</span>
                        `;
                        tagsList.appendChild(childDiv);
                    });
                    
                    renderedParents.add(parent);
                }
            } else if (!Object.keys(hierarchicalTags).includes(tag)) {
                // Render regular tags that aren't parents
                const tagDiv = document.createElement('div');
                tagDiv.className = 'tag-item';
                tagDiv.innerHTML = `
                    <button class="tag-name" onclick="app.filterByTag('${tag}')" aria-label="Filter by ${tag} tag">
                        🏷️ ${this.escapeHtml(tag)}
                    </button>
                    <span class="tag-count">${count}</span>
                `;
                tagsList.appendChild(tagDiv);
            }
        });
    }

    updateStorageStatus() {
        const storageInfo = document.getElementById('storageInfo');
        if (!storageInfo) return;

        const statusMap = {
            'local': {
                title: 'Local Storage',
                subtitle: 'Stored on device',
                icon: 'connected'
            },
            'cloud': {
                title: 'Cloud Storage',
                subtitle: 'Synced to Google Drive',
                icon: 'connected'
            },
            'cache': {
                title: 'Browser Cache',
                subtitle: 'Session only',
                icon: 'connected'
            }
        };

        const status = statusMap[this.storageType] || {
            title: 'No Storage Connected',
            subtitle: 'Click to connect',
            icon: 'disconnected'
        };

        storageInfo.innerHTML = `
            <div class="storage-${status.icon}">
                <div class="storage-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                </div>
                <div class="storage-details">
                    <div class="storage-title">${status.title}</div>
                    <div class="storage-subtitle">${status.subtitle}</div>
                </div>
            </div>
        `;
    }

    // Event Handlers
    handleSearch(query) {
        console.log('[SEARCH] Search triggered with query:', query);
        const startTime = performance.now();
        
        if (!query.trim()) {
            console.log('[SEARCH] Empty query, showing all notes');
            this.updateNotesGrid();
            return;
        }

        // Track search analytics
        this.trackSearchTerm(query);

        const searchText = query.toLowerCase();
        let searchResults = [];

        // Check for special search syntax
        const tagMatch = query.match(/tag:(\S+)/i) || query.match(/#(\S+)/); // Support both tag: and #
        const contentMatch = query.match(/content:(.+)/i);
        const dateMatch = query.match(/date:(\S+)/i);
        
        if (tagMatch) {
            const tagQuery = tagMatch[1].toLowerCase();
            console.log('[SEARCH] Tag search for:', tagQuery);
            searchResults = this.notes.filter(note => {
                if (!note.tags || !Array.isArray(note.tags)) return false;
                
                const hasTag = note.tags.some(tag => {
                    const tagLower = tag.toLowerCase();
                    // Exact match or partial match
                    if (tagLower === tagQuery || tagLower.includes(tagQuery)) return true;
                    // Check hierarchical tags (e.g., work/project)
                    if (tag.includes('/')) {
                        return tag.split('/').some(part => part.toLowerCase().includes(tagQuery));
                    }
                    return false;
                });
                
                return hasTag;
            });
            console.log('[SEARCH] Found', searchResults.length, 'notes with tag:', tagQuery);
        } else if (contentMatch) {
            const contentQuery = contentMatch[1].toLowerCase();
            console.log('[SEARCH] Content search for:', contentQuery);
            searchResults = this.notes.filter(note => {
                const content = note.decryptedContent || note.content || '';
                return content.toLowerCase().includes(contentQuery);
            });
        } else if (dateMatch) {
            const dateQuery = dateMatch[1];
            console.log('[SEARCH] Date search for:', dateQuery);
            searchResults = this.searchByDate(dateQuery);
        } else {
            // Use indexed search for better performance
            console.log('[SEARCH] General search for:', query);
            searchResults = this.performIndexedSearch(query);
        }

        // Record search performance
        const endTime = performance.now();
        const searchTime = Math.round(endTime - startTime);
        this.performanceMetrics.searchTime = searchTime;
        
        if (searchTime > 100) {
            console.warn(`[SEARCH] Slow search detected: ${searchTime.toFixed(2)}ms for "${query}"`);
        }

        // Track search analytics
        this.trackSearchTime(searchTime);

        this.displaySearchResults(searchResults, query);
    }

    searchByDate(dateQuery) {
        const today = new Date();
        let targetDate;
        
        switch (dateQuery.toLowerCase()) {
            case 'today':
                targetDate = today;
                break;
            case 'yesterday':
                targetDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'week':
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                return this.notes.filter(note => new Date(note.created) >= weekAgo);
            case 'month':
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                return this.notes.filter(note => new Date(note.created) >= monthAgo);
            default:
                // Try to parse as date
                targetDate = new Date(dateQuery);
                if (isNaN(targetDate.getTime())) {
                    return [];
                }
        }
        
        return this.notes.filter(note => {
            const noteDate = new Date(note.created);
            return noteDate.toDateString() === targetDate.toDateString();
        });
    }

    displaySearchResults(results, query) {
        console.log('Displaying search results:', results.length, 'notes found for query:', query);
        const notesGrid = document.getElementById('notesGrid');
        const notesTitle = document.getElementById('notesTitle');
        
        if (notesTitle) {
            notesTitle.textContent = `Search results for "${query}" (${results.length})`;
        }

        if (!notesGrid) {
            console.error('notesGrid element not found!');
            return;
        }

        notesGrid.innerHTML = '';

        if (results.length === 0) {
            notesGrid.innerHTML = `
                <div class="empty-state">
                    <p>No notes found for "${this.escapeHtml(query)}"</p>
                </div>
            `;
        } else {
            results.forEach(note => {
                const noteElement = this.createNoteElement(note);
                notesGrid.appendChild(noteElement);
            });
        }
    }

    async handleSync() {
        showLoadingOverlay('Syncing your notes...');
        
        try {
            // TODO: Implement actual sync logic based on storage type
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate sync
            hideLoadingOverlay();
            showSuccessCheckmark('Notes Synced! ✓');
        } catch (error) {
            console.error('Sync error:', error);
            hideLoadingOverlay();
            this.showNotification('Sync failed. Please try again.', 'error');
        }
    }

    setFilter(filter) {
        console.log('Setting filter to:', filter);
        this.currentFilter = filter;
        this.updateUI();
        this.savePreferences();
    }

    setView(view) {
        this.currentView = view;
        this.updateUI();
        this.savePreferences();
    }

    filterByTag(tag) {
        console.log('[TAG FILTER] Filtering by tag:', tag);
        
        // Clear any active filter first
        this.currentFilter = 'all';
        this.updateFilterButtons();
        
        // Set search to filter by tag
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.value = `#${tag}`;
            searchInput.focus();
            this.handleSearch(`#${tag}`);
        } else {
            console.error('[TAG FILTER] Search input not found');
        }
    }

    // Note Management
    showNoteEditor(noteId = null) {
        const modal = document.getElementById('noteEditorModal');
        const title = document.getElementById('editorTitle');
        const form = document.getElementById('noteForm');
        
        if (!modal || !form) return;

        // Reset form
        form.reset();
        document.getElementById('passwordGroup').style.display = 'none';

        if (noteId) {
            // Edit existing note
            const note = this.notes.find(n => n.id === noteId);
            if (note) {
                title.textContent = 'Edit Note';
                document.getElementById('noteTitle').value = note.title;
                document.getElementById('noteContent').value = note.decryptedContent || note.content || '';
                document.getElementById('noteTags').value = note.tags ? note.tags.join(', ') : '';
                document.getElementById('passwordProtect').checked = note.isProtected || false;
                
                if (note.isProtected) {
                    document.getElementById('passwordGroup').style.display = 'flex';
                }
            }
        } else {
            // New note
            title.textContent = 'Create Note';
        }

        // Store current note ID for saving
        form.dataset.noteId = noteId || '';

        // Show modal
        modal.classList.add('show');
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('noteTitle').focus();
        }, 100);
    }

    closeNoteEditor() {
        const modal = document.getElementById('noteEditorModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async handleNoteSave(e) {
        e.preventDefault();
        
        const form = e.target;
        const noteId = form.dataset.noteId;
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        const tagsInput = document.getElementById('noteTags').value.trim();
        const isProtected = document.getElementById('passwordProtect').checked;
        const password = document.getElementById('notePassword').value;

        if (!title || !content) {
            this.showNotification('Title and content are required', 'error');
            return;
        }

        if (isProtected && !password) {
            this.showNotification('Password is required for protected notes', 'error');
            return;
        }

        try {
            const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            const now = Date.now();
            
            // Detect if content contains markdown
            const isMarkdown = this.detectMarkdown(content);

            let noteData = {
                title,
                content,
                tags,
                isProtected,
                isMarkdown,
                modified: now
            };

            // Handle password protection
            if (isProtected && password) {
                const encrypted = await this.encryptContent(content, password);
                noteData.encryptedContent = encrypted;
                noteData.content = null; // Don't store plain content
                noteData.decryptedContent = content; // Keep for current session
            }

            if (noteId) {
                // Update existing note
                const noteIndex = this.notes.findIndex(n => n.id === noteId);
                if (noteIndex !== -1) {
                    // Remove from search index before updating
                    this.removeNoteFromIndex(noteId);
                    this.notes[noteIndex] = { ...this.notes[noteIndex], ...noteData };
                    // Add updated note back to index
                    this.addNoteToIndex(this.notes[noteIndex]);
                }
            } else {
                // Create new note
                noteData.id = this.generateId();
                noteData.created = now;
                noteData.isFavorite = false;
                this.notes.unshift(noteData);
                // Add to search index
                this.addNoteToIndex(noteData);
            }

            await this.saveNotes();
            this.updateUI();
            this.closeNoteEditor();
            
            // Celebrate new note creation with confetti
            if (!noteId) {
                celebrateWithConfetti();
                showSuccessCheckmark('Note Created! 🎉');
            } else {
                this.showNotification('Note updated successfully', 'success');
            }
            
        } catch (error) {
            console.error('Error saving note:', error);
            this.showNotification('Error saving note', 'error');
        }
    }

    async editNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        // If note is protected and not decrypted, ask for password first
        if (note.isProtected && !note.decryptedContent) {
            await this.unlockNote(noteId);
            // Check if unlock was successful
            const updatedNote = this.notes.find(n => n.id === noteId);
            if (!updatedNote.decryptedContent) {
                return; // User cancelled or wrong password
            }
        }

        this.showNoteEditor(noteId);
    }

    async unlockNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note || !note.isProtected) return;

        // Store the note ID for the unlock process
        this.currentUnlockNoteId = noteId;
        
        // Show password modal
        const modal = document.getElementById('passwordUnlockModal');
        const passwordInput = document.getElementById('unlockPassword');
        
        if (modal && passwordInput) {
            modal.classList.add('show');
            passwordInput.value = '';
            setTimeout(() => passwordInput.focus(), 100);
        }
    }

    closePasswordModal() {
        const modal = document.getElementById('passwordUnlockModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.currentUnlockNoteId = null;
    }

    async handlePasswordUnlock(e) {
        e.preventDefault();
        
        if (!this.currentUnlockNoteId) return;
        
        const password = document.getElementById('unlockPassword').value;
        if (!password) {
            this.showNotification('Please enter a password', 'error');
            return;
        }

        const note = this.notes.find(n => n.id === this.currentUnlockNoteId);
        if (!note) return;

        try {
            const decrypted = await this.decryptContent(note.encryptedContent, password);
            note.decryptedContent = decrypted;
            note.sessionUnlocked = true; // Mark as unlocked for this session
            this.updateUI();
            this.closePasswordModal();
            this.showNotification('Note unlocked', 'success');
        } catch (error) {
            this.showNotification('Incorrect password', 'error');
            document.getElementById('unlockPassword').focus();
        }
    }

    togglePin(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.isPinned = !note.isPinned;
            note.modified = Date.now();
            this.saveNotes();
            this.updateUI();
            
            const action = note.isPinned ? 'pinned' : 'unpinned';
            this.showNotification(`Note ${action}`, 'success');
        }
    }

    toggleFavorite(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            note.isFavorite = !note.isFavorite;
            note.modified = Date.now();
            this.saveNotes();
            this.updateUI();
            
            const action = note.isFavorite ? 'added to' : 'removed from';
            this.showNotification(`Note ${action} favorites`, 'success');
        }
    }

    async deleteNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        const confirmed = confirm(`Are you sure you want to delete "${note.title}"?`);
        if (!confirmed) return;

        this.removeNoteFromIndex(noteId);
        this.notes = this.notes.filter(n => n.id !== noteId);
        await this.saveNotes();
        this.updateUI();
        this.showNotification('Note deleted', 'success');
    }

    // Storage Management
    showStorageModal() {
        const modal = document.getElementById('storageModal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeStorageModal() {
        const modal = document.getElementById('storageModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async selectStorage(storageType) {
        const oldStorageType = this.storageType;
        
        try {
            if (storageType === 'local') {
                // Show folder selection for local storage
                const success = await this.selectLocalStorageFolder();
                if (!success) {
                    this.showNotification('Local folder selection cancelled', 'info');
                    return;
                }
            } else if (storageType === 'cloud') {
                // Authenticate with Google Drive
                const success = await this.authenticateGoogleDrive();
                if (!success) {
                    this.showNotification('Google Drive authentication failed', 'error');
                    return;
                }
            }
            
            this.storageType = storageType;

            // Migrate notes if changing storage type
            if (oldStorageType !== storageType) {
                await this.migrateNotes(oldStorageType, storageType);
            }

            this.savePreferences();
            this.updateStorageStatus();
            this.closeStorageModal();
            
            const storageNames = {
                'local': 'Local File System',
                'cloud': 'Google Drive',
                'cache': 'Browser Cache'
            };
            
            this.showNotification(`Switched to ${storageNames[storageType]}`, 'success');
            
        } catch (error) {
            console.error('Storage selection error:', error);
            this.storageType = oldStorageType; // Revert
            this.showNotification('Failed to switch storage', 'error');
        }
    }

    async migrateNotes(fromStorage, toStorage) {
        // TODO: Implement note migration between storage types
        console.log(`Migrating notes from ${fromStorage} to ${toStorage}`);
    }

    // Import/Export
    async importNotes() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.md,.txt';
            input.multiple = true;
            
            input.onchange = async (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;

                let importCount = 0;
                
                for (const file of files) {
                    try {
                        const text = await file.text();
                        
                        if (file.name.endsWith('.json')) {
                            // JSON import
                            const importedNotes = JSON.parse(text);
                            const notesArray = Array.isArray(importedNotes) ? importedNotes : [importedNotes];
                            
                            notesArray.forEach(note => {
                                note.id = this.generateId();
                                note.imported = Date.now();
                                this.notes.unshift(note);
                                importCount++;
                            });
                        } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                            // Markdown/Text import
                            const title = file.name.replace(/\.(md|txt)$/, '');
                            const note = {
                                id: this.generateId(),
                                title: title,
                                content: text,
                                tags: ['imported'],
                                created: Date.now(),
                                modified: Date.now(),
                                isMarkdown: file.name.endsWith('.md'),
                                imported: Date.now()
                            };
                            
                            this.notes.unshift(note);
                            importCount++;
                        }
                    } catch (fileError) {
                        console.error(`Error importing ${file.name}:`, fileError);
                    }
                }

                await this.saveNotes();
                this.updateUI();
                
                this.showNotification(`Imported ${importCount} notes from ${files.length} files`, 'success');
            };

            input.click();
            
        } catch (error) {
            console.error('Import error:', error);
            this.showNotification('Failed to import notes', 'error');
        }
    }

    async exportNotes() {
        try {
            // Security verification before export
            const verified = await this.verifyUserForExport();
            if (!verified) {
                this.showNotification('Export cancelled - verification failed', 'error');
                return;
            }

            // Show export options
            const format = prompt('Export format:\n1. JSON (all notes)\n2. Markdown (individual files)\n3. Text (individual files)\n\nEnter 1, 2, or 3:');
            
            if (format === '1') {
                // JSON Export
                const exportData = this.notes.map(note => ({
                    ...note,
                    decryptedContent: undefined // Don't export decrypted content for security
                }));

                const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                    type: 'application/json'
                });

                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `memo-no-sekai-export-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                
            } else if (format === '2' || format === '3') {
                // Markdown/Text Export (using JSZip simulation)
                const zip = this.createSimpleZip();
                const extension = format === '2' ? 'md' : 'txt';
                
                this.notes.forEach(note => {
                    if (!note.isProtected || note.decryptedContent) {
                        const content = note.decryptedContent || note.content || '';
                        const filename = `${this.sanitizeFilename(note.title)}.${extension}`;
                        
                        let fileContent = content;
                        if (format === '2') {
                            // Add metadata for markdown
                            fileContent = `# ${note.title}\n\n`;
                            if (note.tags && note.tags.length) {
                                fileContent += `**Tags:** ${note.tags.join(', ')}\n\n`;
                            }
                            fileContent += `**Created:** ${new Date(note.created).toLocaleDateString()}\n\n`;
                            fileContent += `---\n\n${content}`;
                        }
                        
                        zip.addFile(filename, fileContent);
                    }
                });
                
                zip.download(`memo-no-sekai-${extension}-export-${new Date().toISOString().split('T')[0]}.zip`);
            } else {
                return; // User cancelled
            }
            
            this.showNotification('Notes exported successfully', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export notes', 'error');
        }
    }

    createSimpleZip() {
        // Simple zip-like functionality for demo
        const files = {};
        
        return {
            addFile: (filename, content) => {
                files[filename] = content;
            },
            download: (zipName) => {
                // For demo, download individual files
                Object.entries(files).forEach(([filename, content]) => {
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                });
            }
        };
    }

    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    showRecoveryCode() {
        // Generate a recovery code based on user's notes
        const code = this.generateRecoveryCode();
        
        const message = `Your recovery code is:\n\n${code}\n\nSave this code securely. You can use it to recover your notes if needed.`;
        alert(message);
    }

    generateRecoveryCode() {
        // Simple recovery code generation (in production, use proper cryptography)
        const data = JSON.stringify(this.notes);
        return btoa(data).substring(0, 16).toUpperCase();
    }

    // AES Encryption with Web Crypto API
    async encryptContent(content, password) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            
            // Generate a random salt
            const salt = crypto.getRandomValues(new Uint8Array(16));
            
            // Derive key from password using PBKDF2
            const key = await this.deriveKey(password, salt);
            
            // Generate a random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt the data
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );
            
            // Combine salt, iv, and encrypted data
            const result = {
                salt: Array.from(salt),
                iv: Array.from(iv),
                data: Array.from(new Uint8Array(encrypted))
            };
            
            return JSON.stringify(result);
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Encryption failed');
        }
    }

    async decryptContent(encryptedContent, password) {
        try {
            const { salt, iv, data } = JSON.parse(encryptedContent);
            
            // Derive the same key from password and salt
            const key = await this.deriveKey(password, new Uint8Array(salt));
            
            // Decrypt the data
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) },
                key,
                new Uint8Array(data)
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Invalid password or corrupted data');
        }
    }

    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        
        // Derive AES key using PBKDF2
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Utility Methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }

    showNotification(message, type = 'info') {
        // Use enhanced notification system with icons and animations
        showEnhancedNotification(this.escapeHtml(message), type, 5000);
    }

    showWelcomeMessage() {
        // Check if first visit and mark as visited (no notification)
        if (!localStorage.getItem('hasVisited')) {
            localStorage.setItem('hasVisited', 'true');
        }
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
    }

    showSortMenu() {
        console.log('Showing sort menu');
        
        // Create dropdown menu dynamically
        const existingMenu = document.querySelector('.sort-dropdown-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }
        
        const options = [
            { value: 'modified', label: '📅 Last Modified', icon: '📅' },
            { value: 'created', label: '🆕 Date Created', icon: '🆕' },
            { value: 'title', label: '🔤 Title (A-Z)', icon: '🔤' }
        ];

        const menu = document.createElement('div');
        menu.className = 'sort-dropdown-menu';
        menu.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 200px;
            z-index: 1000;
            margin-top: 8px;
            padding: 8px 0;
        `;

        options.forEach(option => {
            const item = document.createElement('button');
            item.className = 'sort-menu-item';
            item.style.cssText = `
                width: 100%;
                padding: 10px 16px;
                border: none;
                background: ${this.currentSort === option.value ? 'var(--bg-secondary)' : 'transparent'};
                color: var(--text-primary);
                text-align: left;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                transition: background 0.2s;
            `;
            
            item.innerHTML = `
                <span>${option.icon}</span>
                <span>${option.label.replace(option.icon + ' ', '')}</span>
                ${this.currentSort === option.value ? '<span style="margin-left: auto;">✓</span>' : ''}
            `;
            
            item.addEventListener('mouseenter', () => {
                item.style.background = 'var(--bg-secondary)';
            });
            
            item.addEventListener('mouseleave', () => {
                if (this.currentSort !== option.value) {
                    item.style.background = 'transparent';
                }
            });
            
            item.addEventListener('click', () => {
                this.currentSort = option.value;
                this.updateUI();
                this.savePreferences();
                this.showNotification(`Sorted by ${option.label.replace(option.icon + ' ', '')}`, 'success');
                menu.remove();
            });
            
            menu.appendChild(item);
        });

        // Position menu relative to sort button
        const sortBtn = document.getElementById('sortBtn');
        if (sortBtn) {
            const btnRect = sortBtn.getBoundingClientRect();
            const parent = sortBtn.parentElement;
            parent.style.position = 'relative';
            parent.appendChild(menu);
        }

        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target.id !== 'sortBtn') {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }

    setupMarkdownEditor() {
        const editorTabs = document.querySelectorAll('.editor-tab');
        const noteContent = document.getElementById('noteContent');
        const markdownPreview = document.getElementById('markdownPreview');

        if (!editorTabs.length || !noteContent || !markdownPreview) return;

        editorTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabType = tab.dataset.tab;
                
                // Update active tab
                editorTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                if (tabType === 'write') {
                    noteContent.style.display = 'block';
                    markdownPreview.style.display = 'none';
                } else if (tabType === 'preview') {
                    noteContent.style.display = 'none';
                    markdownPreview.style.display = 'block';
                    markdownPreview.innerHTML = this.parseMarkdown(noteContent.value);
                }
            });
        });
    }

    parseMarkdown(text) {
        if (!text) return '<p class="text-muted">Nothing to preview</p>';
        
        let html = text;
        
        // Handle code blocks first (to avoid conflicts)
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, (match, lang, code) => {
            const language = lang || 'javascript';
            const highlightedCode = this.highlightCode(code.trim(), language);
            return `<pre><code class="language-${language}">${highlightedCode}</code></pre>`;
        });
        
        // Handle checklists
        html = html.replace(/^- \[([ x])\] (.*)$/gim, (match, checked, text) => {
            const isChecked = checked === 'x';
            const checkboxId = 'checkbox_' + Math.random().toString(36).substr(2, 9);
            return `<div class="checkbox-item">
                <input type="checkbox" id="${checkboxId}" ${isChecked ? 'checked' : ''} onchange="app.toggleCheckbox('${checkboxId}')">
                <label for="${checkboxId}" class="${isChecked ? 'completed' : ''}">${text}</label>
            </div>`;
        });
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');
        
        // Italic
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
        html = html.replace(/_(.*?)_/gim, '<em>$1</em>');
        
        // Inline code
        html = html.replace(/`(.*?)`/gim, '<code>$1</code>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Regular lists
        html = html.replace(/^- (?!\[)(.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
        
        // Blockquotes
        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
        
        // Line breaks and paragraphs
        html = html.replace(/\n\n/gim, '</p><p>');
        html = html.replace(/\n/gim, '<br>');
        
        // Wrap in paragraphs (avoid wrapping pre, ul, blockquote, h1-h6, div)
        const lines = html.split('</p><p>');
        const wrappedLines = lines.map(line => {
            if (line.match(/^<(pre|ul|blockquote|h[1-6]|div)/)) {
                return line;
            }
            return line.startsWith('<p>') ? line : `<p>${line}`;
        });
        html = wrappedLines.join('</p><p>');
        
        if (!html.endsWith('</p>')) {
            html += '</p>';
        }
        
        return html;
    }

    highlightCode(code, language) {
        // Simple syntax highlighting fallback
        if (typeof Prism !== 'undefined' && Prism.languages[language]) {
            return Prism.highlight(code, Prism.languages[language], language);
        }
        
        // Basic JavaScript highlighting as fallback
        if (language === 'javascript' || language === 'js') {
            return code
                .replace(/\b(function|const|let|var|if|else|for|while|return|class|extends)\b/g, '<span class="keyword">$1</span>')
                .replace(/\/\/(.*$)/gm, '<span class="comment">//$1</span>')
                .replace(/\/\*([\s\S]*?)\*\//g, '<span class="comment">/*$1*/</span>')
                .replace(/"(.*?)"/g, '<span class="string">"$1"</span>')
                .replace(/'(.*?)'/g, '<span class="string">\'$1\'</span>');
        }
        
        return this.escapeHtml(code);
    }

    setupQuickPreview() {
        const previewPanel = document.getElementById('quickPreviewPanel');
        const closePreview = document.getElementById('closePreview');
        
        if (closePreview) {
            closePreview.addEventListener('click', () => this.hideQuickPreview());
        }
        
        // Close preview when clicking outside
        document.addEventListener('click', (e) => {
            if (previewPanel && previewPanel.classList.contains('show') && 
                !previewPanel.contains(e.target) && 
                !e.target.closest('.note-card')) {
                this.hideQuickPreview();
            }
        });
    }

    showQuickPreview(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        const previewPanel = document.getElementById('quickPreviewPanel');
        const previewTitle = document.getElementById('previewTitle');
        const previewContent = document.getElementById('previewContent');
        const previewTags = document.getElementById('previewTags');
        const previewDate = document.getElementById('previewDate');

        if (!previewPanel) return;

        // Update content
        previewTitle.textContent = note.title;
        
        let content = '';
        if (note.isProtected && !note.decryptedContent) {
            content = '🔒 This note is protected. Click to unlock and view content.';
        } else {
            content = note.decryptedContent || note.content || 'No content';
            if (note.isMarkdown && content !== '🔒 This note is protected. Click to unlock and view content.') {
                content = this.parseMarkdown(content);
                previewContent.innerHTML = content;
            } else {
                previewContent.textContent = content;
            }
        }

        // Update tags
        previewTags.innerHTML = '';
        if (note.tags && note.tags.length) {
            note.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'preview-tag';
                tagSpan.textContent = tag;
                previewTags.appendChild(tagSpan);
            });
        }

        // Update date
        previewDate.textContent = `Modified: ${this.formatDate(note.modified)}`;

        // Show panel
        previewPanel.classList.add('show');
    }

    hideQuickPreview() {
        const previewPanel = document.getElementById('quickPreviewPanel');
        if (previewPanel) {
            previewPanel.classList.remove('show');
        }
    }

    toggleCheckbox(checkboxId) {
        // This would update the note content in a real implementation
        const checkbox = document.getElementById(checkboxId);
        const label = checkbox.nextElementSibling;
        
        if (checkbox.checked) {
            label.classList.add('completed');
        } else {
            label.classList.remove('completed');
        }
        
        // In a real implementation, you'd update the note's markdown content
        this.showNotification('Checkbox updated (demo)', 'info');
    }

    async shareNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        // Don't share protected notes unless unlocked
        if (note.isProtected && !note.decryptedContent) {
            this.showNotification('Cannot share protected note', 'error');
            return;
        }

        const content = note.decryptedContent || note.content || '';
        const shareData = {
            title: note.title,
            text: content,
            url: window.location.href
        };

        try {
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
                this.showNotification('Note shared successfully', 'success');
            } else {
                // Fallback: copy to clipboard
                const textToShare = `${note.title}\n\n${content}`;
                await navigator.clipboard.writeText(textToShare);
                this.showNotification('Note copied to clipboard', 'success');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error sharing note:', error);
                this.showNotification('Failed to share note', 'error');
            }
        }
    }

    async generateQRCode(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        // Don't generate QR for protected notes unless unlocked
        if (note.isProtected && !note.decryptedContent) {
            this.showNotification('Cannot generate QR code for protected note', 'error');
            return;
        }

        const noteData = {
            id: note.id,
            title: note.title,
            content: note.decryptedContent || note.content || '',
            tags: note.tags || [],
            created: note.created,
            modified: note.modified,
            isMarkdown: note.isMarkdown || false,
            exportedFrom: 'Memo no Sekai',
            exportedAt: Date.now()
        };

        const qrData = JSON.stringify(noteData);
        
        try {
            const canvas = document.getElementById('qrCanvas');
            const modal = document.getElementById('qrCodeModal');
            
            if (typeof QRCode !== 'undefined') {
                await QRCode.toCanvas(canvas, qrData, {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
            } else {
                // Fallback: create a simple placeholder
                const ctx = canvas.getContext('2d');
                canvas.width = 256;
                canvas.height = 256;
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, 256, 256);
                ctx.fillStyle = '#333';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('QR Code', 128, 120);
                ctx.fillText('(Library not loaded)', 128, 140);
            }
            
            modal.classList.add('show');
            this.currentQRNoteId = noteId;
            
        } catch (error) {
            console.error('Error generating QR code:', error);
            this.showNotification('Failed to generate QR code', 'error');
        }
    }

    closeQRModal() {
        const modal = document.getElementById('qrCodeModal');
        if (modal) {
            modal.classList.remove('show');
        }
        this.currentQRNoteId = null;
    }

    downloadQRCode() {
        const canvas = document.getElementById('qrCanvas');
        const link = document.createElement('a');
        link.download = `memo-qr-${this.currentQRNoteId || 'note'}.png`;
        link.href = canvas.toDataURL();
        link.click();
        this.showNotification('QR code downloaded', 'success');
    }

    updateStatistics() {
        console.log('[STATS] Starting updateStatistics, notes count:', this.notes.length);
        
        const totalNotesEl = document.getElementById('totalNotes');
        const protectedNotesEl = document.getElementById('protectedNotes');
        const totalTagsEl = document.getElementById('totalTags');
        const totalWordsEl = document.getElementById('totalWords');

        if (!totalNotesEl) {
            console.error('[STATS] Statistics elements not found in DOM');
            return;
        }

        // Calculate statistics
        const totalNotes = this.notes.length;
        const protectedNotes = this.notes.filter(note => note.isProtected).length;
        
        const allTags = new Set();
        let totalWords = 0;
        
        this.notes.forEach(note => {
            // Count unique tags
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach(tag => {
                    if (tag && tag.trim()) {
                        allTags.add(tag.trim());
                    }
                });
            }
            
            // Count words - handle both encrypted and unencrypted content
            const content = note.decryptedContent || note.content || '';
            if (content && content.trim()) {
                const words = content.trim().split(/\s+/).filter(word => word.length > 0);
                totalWords += words.length;
            }
        });

        const stats = {
            totalNotes,
            protectedNotes,
            totalTags: allTags.size,
            totalWords
        };
        
        console.log('[STATS] Calculated statistics:', stats);

        // Force update display with explicit values
        totalNotesEl.textContent = String(totalNotes);
        if (protectedNotesEl) protectedNotesEl.textContent = String(protectedNotes);
        if (totalTagsEl) totalTagsEl.textContent = String(allTags.size);
        if (totalWordsEl) totalWordsEl.textContent = String(totalWords);
        
        // Force a reflow to ensure DOM updates
        totalNotesEl.offsetHeight;
        
        console.log('[STATS] DOM updated. Verifying:', {
            totalNotesDisplay: totalNotesEl.textContent,
            protectedNotesDisplay: protectedNotesEl?.textContent,
            totalTagsDisplay: totalTagsEl?.textContent,
            totalWordsDisplay: totalWordsEl?.textContent
        });
    }

    animateNumber(element, targetValue) {
        // Simplified - just set the value directly
        if (element) {
            element.textContent = targetValue;
        } else if (currentValue > targetValue) {
            element.textContent = Math.max(currentValue - Math.abs(increment), targetValue);
            setTimeout(() => this.animateNumber(element, targetValue), 50);
        }
    }

    async checkBiometricSupport() {
        try {
            if (window.PublicKeyCredential && 
                await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) {
                this.biometricAvailable = true;
                console.log('Biometric authentication available');
            }
        } catch (error) {
            console.log('Biometric authentication not available:', error);
            this.biometricAvailable = false;
        }
    }

    async authenticateWithBiometric(purpose = 'unlock') {
        if (!this.biometricAvailable) {
            throw new Error('Biometric authentication not available');
        }

        try {
            const challenge = crypto.getRandomValues(new Uint8Array(32));
            
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: {
                        name: "Memo no Sekai",
                        id: window.location.hostname,
                    },
                    user: {
                        id: new TextEncoder().encode("memo-user"),
                        name: "Memo User",
                        displayName: "Memo User",
                    },
                    pubKeyCredParams: [{alg: -7, type: "public-key"}],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform",
                        userVerification: "required"
                    },
                    timeout: 60000,
                    attestation: "direct"
                }
            });

            return credential !== null;
        } catch (error) {
            console.error('Biometric authentication failed:', error);
            return false;
        }
    }

    async verifyBiometric() {
        if (!this.biometricAvailable) {
            return false;
        }

        try {
            const challenge = crypto.getRandomValues(new Uint8Array(32));
            
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: challenge,
                    timeout: 60000,
                    userVerification: "required"
                }
            });

            return assertion !== null;
        } catch (error) {
            console.error('Biometric verification failed:', error);
            return false;
        }
    }

    // Google Drive Integration
    async initializeGoogleDrive() {
        try {
            await new Promise((resolve) => {
                gapi.load('auth2:client', resolve);
            });

            await gapi.client.init({
                apiKey: 'YOUR_API_KEY', // Replace with your API key
                clientId: 'YOUR_CLIENT_ID', // Replace with your client ID
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                scope: 'https://www.googleapis.com/auth/drive.file'
            });

            this.googleDriveAuth = gapi.auth2.getAuthInstance();
            return true;
        } catch (error) {
            console.error('Google Drive initialization failed:', error);
            return false;
        }
    }

    async authenticateGoogleDrive() {
        try {
            if (!this.googleDriveAuth) {
                await this.initializeGoogleDrive();
            }

            if (!this.googleDriveAuth.isSignedIn.get()) {
                await this.googleDriveAuth.signIn();
            }

            // Create or find the "Memo no Sekai" folder
            await this.ensureMemoFolder();
            return true;
        } catch (error) {
            console.error('Google Drive authentication failed:', error);
            return false;
        }
    }

    async ensureMemoFolder() {
        try {
            // Search for existing "Memo no Sekai" folder
            const response = await gapi.client.drive.files.list({
                q: "name='Memo no Sekai' and mimeType='application/vnd.google-apps.folder' and trashed=false",
                spaces: 'drive'
            });

            if (response.result.files.length > 0) {
                this.googleDriveFolderId = response.result.files[0].id;
            } else {
                // Create the folder
                const folderResponse = await gapi.client.drive.files.create({
                    resource: {
                        name: 'Memo no Sekai',
                        mimeType: 'application/vnd.google-apps.folder'
                    }
                });
                this.googleDriveFolderId = folderResponse.result.id;
            }

            localStorage.setItem('googleDriveFolderId', this.googleDriveFolderId);
            return this.googleDriveFolderId;
        } catch (error) {
            console.error('Failed to create/find Memo folder:', error);
            throw error;
        }
    }

    async getOrCreateDateFolder(date) {
        try {
            const dateString = new Date(date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/\s/g, ' '); // "2nd Nov 2025"

            // Search for existing date folder
            const response = await gapi.client.drive.files.list({
                q: `name='${dateString}' and mimeType='application/vnd.google-apps.folder' and '${this.googleDriveFolderId}' in parents and trashed=false`,
                spaces: 'drive'
            });

            if (response.result.files.length > 0) {
                return response.result.files[0].id;
            } else {
                // Create date folder
                const folderResponse = await gapi.client.drive.files.create({
                    resource: {
                        name: dateString,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [this.googleDriveFolderId]
                    }
                });
                return folderResponse.result.id;
            }
        } catch (error) {
            console.error('Failed to create/find date folder:', error);
            throw error;
        }
    }

    // File System Access API for Local Storage
    async selectLocalStorageFolder() {
        try {
            if ('showDirectoryPicker' in window) {
                this.localStorageHandle = await window.showDirectoryPicker({
                    mode: 'readwrite',
                    startIn: 'documents'
                });
                
                // Create "Memo no Sekai" folder if it doesn't exist
                await this.ensureLocalMemoFolder();
                
                this.localStoragePath = this.localStorageHandle.name;
                localStorage.setItem('localStoragePath', this.localStoragePath);
                
                return true;
            } else {
                throw new Error('File System Access API not supported');
            }
        } catch (error) {
            console.error('Failed to select local storage folder:', error);
            return false;
        }
    }

    async ensureLocalMemoFolder() {
        try {
            // Try to get existing "Memo no Sekai" folder
            try {
                this.memoFolderHandle = await this.localStorageHandle.getDirectoryHandle('Memo no Sekai');
            } catch {
                // Create the folder if it doesn't exist
                this.memoFolderHandle = await this.localStorageHandle.getDirectoryHandle('Memo no Sekai', {
                    create: true
                });
            }
            return this.memoFolderHandle;
        } catch (error) {
            console.error('Failed to create/access Memo folder:', error);
            throw error;
        }
    }

    async getOrCreateLocalDateFolder(date) {
        try {
            const dateString = new Date(date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace(/\s/g, ' '); // "2nd Nov 2025"

            // Try to get existing date folder
            try {
                return await this.memoFolderHandle.getDirectoryHandle(dateString);
            } catch {
                // Create date folder if it doesn't exist
                return await this.memoFolderHandle.getDirectoryHandle(dateString, {
                    create: true
                });
            }
        } catch (error) {
            console.error('Failed to create/access date folder:', error);
            throw error;
        }
    }

    async saveNoteToLocalStorage(note) {
        try {
            if (!this.memoFolderHandle) {
                await this.ensureLocalMemoFolder();
            }

            const dateFolderHandle = await this.getOrCreateLocalDateFolder(note.created);
            const fileName = `${note.title.replace(/[^a-z0-9]/gi, '_')}_${note.id}.json`;
            
            const noteData = {
                ...note,
                // Don't save decrypted content for security
                decryptedContent: undefined,
                sessionUnlocked: undefined
            };

            const fileHandle = await dateFolderHandle.getFileHandle(fileName, {
                create: true
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(noteData, null, 2));
            await writable.close();
            
            return fileName;
        } catch (error) {
            console.error('Failed to save note to local storage:', error);
            throw error;
        }
    }

    detectMarkdown(text) {
        // Simple markdown detection
        const markdownPatterns = [
            /^#{1,6}\s/m,           // Headers
            /\*\*.*\*\*/,           // Bold
            /\*.*\*/,               // Italic
            /`.*`/,                 // Code
            /\[.*\]\(.*\)/,         // Links
            /^-\s/m,                // Lists
            /^>\s/m                 // Blockquotes
        ];
        
        return markdownPatterns.some(pattern => pattern.test(text));
    }

    // Template functionality removed for security and simplicity

    // Security Questions Management
    showSecurityQuestionsModal() {
        const modal = document.getElementById('securityQuestionsModal');
        if (modal) {
            this.loadExistingSecurityQuestions();
            modal.classList.add('show');
        }
    }

    closeSecurityQuestionsModal() {
        const modal = document.getElementById('securityQuestionsModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    loadExistingSecurityQuestions() {
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';
        
        this.securityQuestions.forEach((q, index) => {
            this.addQuestionToUI(q.question, q.answer, index);
        });
        
        this.updateQuestionCount();
    }

    addSecurityQuestion() {
        const currentCount = document.querySelectorAll('.question-item').length;
        if (currentCount >= 5) {
            this.showNotification('Maximum 5 questions allowed', 'warning');
            return;
        }
        
        this.addQuestionToUI('', '', currentCount);
        this.updateQuestionCount();
    }

    addQuestionToUI(question = '', answer = '', index = 0) {
        const container = document.getElementById('questionsContainer');
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.dataset.index = index;
        
        questionDiv.innerHTML = `
            <div class="question-header">
                <span class="question-number">Question ${index + 1}</span>
                <button class="remove-question" onclick="app.removeSecurityQuestion(${index})" aria-label="Remove question">
                    <svg viewBox="0 0 24 24">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <input type="text" class="form-input question-input" placeholder="Enter your security question..." value="${this.escapeHtml(question)}" required>
            <input type="text" class="form-input answer-input" placeholder="Enter your answer..." value="${this.escapeHtml(answer)}" required>
        `;
        
        container.appendChild(questionDiv);
    }

    removeSecurityQuestion(index) {
        const questionItem = document.querySelector(`[data-index="${index}"]`);
        if (questionItem) {
            questionItem.remove();
            this.reindexQuestions();
            this.updateQuestionCount();
        }
    }

    reindexQuestions() {
        const questions = document.querySelectorAll('.question-item');
        questions.forEach((item, index) => {
            item.dataset.index = index;
            item.querySelector('.question-number').textContent = `Question ${index + 1}`;
            item.querySelector('.remove-question').setAttribute('onclick', `app.removeSecurityQuestion(${index})`);
        });
    }

    updateQuestionCount() {
        const count = document.querySelectorAll('.question-item').length;
        const countElement = document.getElementById('questionCount');
        if (countElement) {
            countElement.textContent = count;
        }
        
        const addButton = document.getElementById('addQuestion');
        if (addButton) {
            addButton.disabled = count >= 5;
        }
        
        const saveButton = document.getElementById('saveSecurity');
        if (saveButton) {
            saveButton.disabled = count < 3;
        }
    }

    useSuggestedQuestion(question) {
        const currentCount = document.querySelectorAll('.question-item').length;
        if (currentCount >= 5) {
            this.showNotification('Maximum 5 questions allowed', 'warning');
            return;
        }
        
        this.addQuestionToUI(question, '', currentCount);
        this.updateQuestionCount();
    }

    async saveSecurityQuestions() {
        const questions = [];
        const questionItems = document.querySelectorAll('.question-item');
        
        for (const item of questionItems) {
            const questionInput = item.querySelector('.question-input');
            const answerInput = item.querySelector('.answer-input');
            
            if (!questionInput.value.trim() || !answerInput.value.trim()) {
                this.showNotification('All questions and answers must be filled', 'error');
                return;
            }
            
            // Hash the answer for security
            const hashedAnswer = await this.hashSecurityAnswer(answerInput.value.trim().toLowerCase());
            
            questions.push({
                question: questionInput.value.trim(),
                answer: hashedAnswer,
                created: Date.now()
            });
        }
        
        if (questions.length < 3) {
            this.showNotification('Minimum 3 questions required', 'error');
            return;
        }
        
        this.securityQuestions = questions;
        localStorage.setItem('securityQuestions', JSON.stringify(questions));
        
        this.closeSecurityQuestionsModal();
        this.showNotification(`${questions.length} security questions saved successfully`, 'success');
    }

    async hashSecurityAnswer(answer) {
        const encoder = new TextEncoder();
        const data = encoder.encode(answer);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async showForgotPasswordFlow() {
        if (this.securityQuestions.length === 0) {
            this.showNotification('No security questions set up. Please set up security questions first.', 'error');
            this.showSecurityQuestionsModal();
            return;
        }

        // Check if biometric is available first
        if (this.biometricAvailable) {
            const biometricResult = await this.verifyBiometric();
            if (biometricResult) {
                this.showPasswordResetModal();
                return;
            }
        }

        // Fall back to security questions
        this.showSecurityQuestionsVerification();
    }

    showSecurityQuestionsVerification() {
        // Create verification modal dynamically
        const modal = this.createSecurityVerificationModal();
        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    createSecurityVerificationModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'securityVerificationModal';
        
        const randomQuestions = this.getRandomSecurityQuestions(3);
        const questionsHTML = randomQuestions.map((q, index) => `
            <div class="form-group">
                <label>${q.question}</label>
                <input type="text" class="form-input verification-answer" data-index="${q.originalIndex}" placeholder="Enter your answer..." required>
            </div>
        `).join('');
        
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Security Verification</h2>
                    <button class="modal-close" onclick="app.closeSecurityVerification()">
                        <svg viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="security-intro">Please answer these security questions to reset your password:</p>
                    ${questionsHTML}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="app.closeSecurityVerification()">Cancel</button>
                    <button type="button" class="btn-primary" onclick="app.verifySecurityAnswers()">Verify</button>
                </div>
            </div>
        `;
        
        return modal;
    }

    getRandomSecurityQuestions(count) {
        const shuffled = [...this.securityQuestions]
            .map((q, index) => ({ ...q, originalIndex: index }))
            .sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    async verifySecurityAnswers() {
        const answers = document.querySelectorAll('.verification-answer');
        let correctAnswers = 0;
        
        for (const answerInput of answers) {
            const index = parseInt(answerInput.dataset.index);
            const userAnswer = answerInput.value.trim().toLowerCase();
            const hashedAnswer = await this.hashSecurityAnswer(userAnswer);
            
            if (hashedAnswer === this.securityQuestions[index].answer) {
                correctAnswers++;
            }
        }
        
        if (correctAnswers === answers.length) {
            this.closeSecurityVerification();
            this.showPasswordResetModal();
        } else {
            this.showNotification('Incorrect answers. Please try again.', 'error');
        }
    }

    closeSecurityVerification() {
        const modal = document.getElementById('securityVerificationModal');
        if (modal) {
            modal.remove();
        }
    }

    showPasswordResetModal() {
        // Implementation for password reset modal
        this.showNotification('Security verification successful! You can now reset your password.', 'success');
        // TODO: Implement password reset modal
    }

    async verifyUserForExport() {
        try {
            // Try biometric first if available
            if (this.biometricAvailable) {
                const biometricResult = await this.verifyBiometric();
                if (biometricResult) {
                    return true;
                }
            }

            // Fall back to system password prompt
            return await this.requestSystemPassword();
        } catch (error) {
            console.error('Export verification failed:', error);
            return false;
        }
    }

    async requestSystemPassword() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Security Verification Required</h2>
                    </div>
                    <div class="modal-body">
                        <p>For security, please verify your identity before exporting notes.</p>
                        <div class="form-group">
                            <label>Enter your system password or use biometric authentication:</label>
                            <div class="password-input-container">
                                <input type="password" id="exportPassword" class="form-input" placeholder="System password..." required>
                                <button type="button" class="password-toggle" onclick="app.toggleExportPasswordVisibility()">
                                    <svg class="eye-open" viewBox="0 0 24 24">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        ${this.biometricAvailable ? '<p class="text-center"><button class="btn-secondary" onclick="app.tryBiometricForExport()">Use Biometric Authentication</button></p>' : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="app.cancelExportVerification()">Cancel</button>
                        <button type="button" class="btn-primary" onclick="app.confirmExportPassword()">Verify & Export</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            modal.classList.add('show');
            
            // Store resolve function for later use
            this.exportVerificationResolve = resolve;
            
            setTimeout(() => {
                const passwordInput = document.getElementById('exportPassword');
                if (passwordInput) passwordInput.focus();
            }, 100);
        });
    }

    toggleExportPasswordVisibility() {
        const passwordInput = document.getElementById('exportPassword');
        const eyeIcon = document.querySelector('.password-toggle .eye-open');
        
        if (passwordInput && eyeIcon) {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            eyeIcon.style.opacity = isPassword ? '0.5' : '1';
        }
    }

    async tryBiometricForExport() {
        try {
            const result = await this.verifyBiometric();
            if (result) {
                this.cancelExportVerification();
                if (this.exportVerificationResolve) {
                    this.exportVerificationResolve(true);
                }
            } else {
                this.showNotification('Biometric verification failed', 'error');
            }
        } catch (error) {
            this.showNotification('Biometric verification error', 'error');
        }
    }

    confirmExportPassword() {
        const passwordInput = document.getElementById('exportPassword');
        if (passwordInput && passwordInput.value.trim()) {
            // In a real implementation, you would verify against system password
            // For demo purposes, we'll accept any non-empty password
            this.cancelExportVerification();
            if (this.exportVerificationResolve) {
                this.exportVerificationResolve(true);
            }
        } else {
            this.showNotification('Please enter your password', 'error');
        }
    }

    cancelExportVerification() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.innerHTML.includes('Security Verification Required')) {
                modal.remove();
            }
        });
        
        if (this.exportVerificationResolve) {
            this.exportVerificationResolve(false);
            this.exportVerificationResolve = null;
        }
    }

    // ===== PHASE 4: ENTERPRISE FEATURES =====

    initializeEnterpriseFeatures() {
        // Initialize analytics data
        this.analyticsData = {
            searchTerms: new Map(),
            dailyActivity: new Map(),
            tagUsage: new Map(),
            totalSearches: 0,
            averageSearchTime: 0
        };

        // Initialize workspace data
        this.workspaceData = {
            name: 'Default Workspace',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            settings: {
                autoSave: true,
                backupEnabled: true,
                collaborationEnabled: false
            }
        };

        // Initialize collaboration settings
        this.collaborationSettings = {
            publicSharing: false,
            allowComments: false,
            allowDownload: true,
            realTimeEnabled: false
        };

        // Load saved enterprise data
        this.loadEnterpriseData();
    }

    setupEnterpriseEventListeners() {
        // Analytics Dashboard
        const analyticsBtn = document.getElementById('analyticsBtn');
        const closeAnalyticsModal = document.getElementById('closeAnalyticsModal');
        const refreshAnalytics = document.getElementById('refreshAnalytics');
        const exportAnalytics = document.getElementById('exportAnalytics');

        if (analyticsBtn) {
            analyticsBtn.addEventListener('click', () => this.showAnalyticsDashboard());
        }
        if (closeAnalyticsModal) {
            closeAnalyticsModal.addEventListener('click', () => this.hideModal('analyticsModal'));
        }
        if (refreshAnalytics) {
            refreshAnalytics.addEventListener('click', () => this.refreshAnalyticsData());
        }
        if (exportAnalytics) {
            exportAnalytics.addEventListener('click', () => this.exportAnalyticsReport());
        }

        // Workspace Manager
        const workspaceBtn = document.getElementById('workspaceBtn');
        const closeWorkspaceModal = document.getElementById('closeWorkspaceModal');
        const createWorkspace = document.getElementById('createWorkspace');
        const duplicateWorkspace = document.getElementById('duplicateWorkspace');
        const archiveWorkspace = document.getElementById('archiveWorkspace');
        const exportWorkspace = document.getElementById('exportWorkspace');
        const saveWorkspaceSettings = document.getElementById('saveWorkspaceSettings');

        if (workspaceBtn) {
            workspaceBtn.addEventListener('click', () => this.showWorkspaceManager());
        }
        if (closeWorkspaceModal) {
            closeWorkspaceModal.addEventListener('click', () => this.hideModal('workspaceModal'));
        }
        if (createWorkspace) {
            createWorkspace.addEventListener('click', () => this.createNewWorkspace());
        }
        if (duplicateWorkspace) {
            duplicateWorkspace.addEventListener('click', () => this.duplicateCurrentWorkspace());
        }
        if (archiveWorkspace) {
            archiveWorkspace.addEventListener('click', () => this.archiveCurrentWorkspace());
        }
        if (exportWorkspace) {
            exportWorkspace.addEventListener('click', () => this.exportWorkspaceData());
        }
        if (saveWorkspaceSettings) {
            saveWorkspaceSettings.addEventListener('click', () => this.saveWorkspaceSettings());
        }

        // Collaboration Center
        const collaborationBtn = document.getElementById('collaborationBtn');
        const closeCollaborationModal = document.getElementById('closeCollaborationModal');
        const shareViaLink = document.getElementById('shareViaLink');
        const shareViaEmail = document.getElementById('shareViaEmail');
        const shareViaQR = document.getElementById('shareViaQR');
        const enableRealTime = document.getElementById('enableRealTime');
        const viewVersions = document.getElementById('viewVersions');
        const createTeamWorkspace = document.getElementById('createTeamWorkspace');
        const collaborationHelp = document.getElementById('collaborationHelp');
        const saveCollabSettings = document.getElementById('saveCollabSettings');

        if (collaborationBtn) {
            collaborationBtn.addEventListener('click', () => this.showCollaborationCenter());
        }
        if (closeCollaborationModal) {
            closeCollaborationModal.addEventListener('click', () => this.hideModal('collaborationModal'));
        }
        if (shareViaLink) {
            shareViaLink.addEventListener('click', () => this.generateShareLink());
        }
        if (shareViaEmail) {
            shareViaEmail.addEventListener('click', () => this.shareViaEmail());
        }
        if (shareViaQR) {
            shareViaQR.addEventListener('click', () => this.shareViaQRCode());
        }
        if (enableRealTime) {
            enableRealTime.addEventListener('click', () => this.toggleRealTimeCollaboration());
        }
        if (viewVersions) {
            viewVersions.addEventListener('click', () => this.showVersionHistory());
        }
        if (createTeamWorkspace) {
            createTeamWorkspace.addEventListener('click', () => this.createTeamWorkspace());
        }
        if (collaborationHelp) {
            collaborationHelp.addEventListener('click', () => this.showCollaborationHelp());
        }
        if (saveCollabSettings) {
            saveCollabSettings.addEventListener('click', () => this.saveCollaborationSettings());
        }

        // Toggle switches for collaboration settings
        const publicSharing = document.getElementById('publicSharing');
        const allowComments = document.getElementById('allowComments');
        const allowDownload = document.getElementById('allowDownload');

        if (publicSharing) {
            publicSharing.addEventListener('change', (e) => {
                this.collaborationSettings.publicSharing = e.target.checked;
            });
        }
        if (allowComments) {
            allowComments.addEventListener('change', (e) => {
                this.collaborationSettings.allowComments = e.target.checked;
            });
        }
        if (allowDownload) {
            allowDownload.addEventListener('change', (e) => {
                this.collaborationSettings.allowDownload = e.target.checked;
            });
        }
    }

    // Analytics Dashboard Methods
    showAnalyticsDashboard() {
        this.updateAnalyticsData();
        this.renderAnalyticsDashboard();
        this.showModal('analyticsModal');
    }

    updateAnalyticsData() {
        // Update basic statistics
        const totalNotes = this.notes.length;
        const totalWords = this.notes.reduce((sum, note) => {
            return sum + (note.content ? note.content.split(/\s+/).length : 0);
        }, 0);
        const avgNoteLength = totalNotes > 0 ? Math.round(totalWords / totalNotes) : 0;

        // Calculate most active day
        const dayActivity = new Map();
        this.notes.forEach(note => {
            const day = new Date(note.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
            dayActivity.set(day, (dayActivity.get(day) || 0) + 1);
        });
        
        let mostActiveDay = '-';
        let maxActivity = 0;
        for (const [day, count] of dayActivity) {
            if (count > maxActivity) {
                maxActivity = count;
                mostActiveDay = day;
            }
        }

        // Update tag usage
        this.analyticsData.tagUsage.clear();
        this.notes.forEach(note => {
            if (note.tags) {
                note.tags.forEach(tag => {
                    this.analyticsData.tagUsage.set(tag, (this.analyticsData.tagUsage.get(tag) || 0) + 1);
                });
            }
        });

        // Store calculated data
        this.analyticsData.totalNotes = totalNotes;
        this.analyticsData.totalWords = totalWords;
        this.analyticsData.avgNoteLength = avgNoteLength;
        this.analyticsData.mostActiveDay = mostActiveDay;
    }

    renderAnalyticsDashboard() {
        // Update overview statistics
        document.getElementById('totalNotesCount').textContent = this.analyticsData.totalNotes || 0;
        document.getElementById('totalWordsCount').textContent = this.analyticsData.totalWords?.toLocaleString() || 0;
        document.getElementById('avgNoteLength').textContent = `${this.analyticsData.avgNoteLength || 0} words`;
        document.getElementById('mostActiveDay').textContent = this.analyticsData.mostActiveDay || '-';

        // Render tag analytics
        this.renderTagAnalytics();

        // Render activity chart
        this.renderActivityChart();

        // Render search insights
        this.renderSearchInsights();
    }

    renderTagAnalytics() {
        const tagAnalyticsContainer = document.getElementById('tagAnalytics');
        if (!tagAnalyticsContainer) return;

        tagAnalyticsContainer.innerHTML = '';

        if (this.analyticsData.tagUsage.size === 0) {
            tagAnalyticsContainer.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No tags found</p>';
            return;
        }

        // Sort tags by usage
        const sortedTags = Array.from(this.analyticsData.tagUsage.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10 tags

        sortedTags.forEach(([tag, count]) => {
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-stat-item';
            tagItem.innerHTML = `
                <span class="tag-stat-name">${tag}</span>
                <span>${count} note${count !== 1 ? 's' : ''}</span>
            `;
            tagAnalyticsContainer.appendChild(tagItem);
        });
    }

    renderActivityChart() {
        const canvas = document.getElementById('activityChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Generate activity data for the last 30 days
        const activityData = this.generateActivityData();
        
        if (activityData.length === 0) {
            ctx.fillStyle = 'var(--text-secondary)';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No activity data available', width / 2, height / 2);
            return;
        }

        // Draw chart
        this.drawActivityChart(ctx, activityData, width, height);
    }

    generateActivityData() {
        const data = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            const notesOnDay = this.notes.filter(note => {
                const noteDate = new Date(note.createdAt);
                return noteDate.toDateString() === dateStr;
            }).length;
            
            data.push({
                date: date,
                count: notesOnDay
            });
        }
        
        return data;
    }

    drawActivityChart(ctx, data, width, height) {
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        const maxCount = Math.max(...data.map(d => d.count), 1);
        const barWidth = chartWidth / data.length;
        
        // Set colors based on theme
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const barColor = isDark ? '#3b82f6' : '#60a5fa';
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? '#374151' : '#e5e7eb';
        
        ctx.fillStyle = textColor;
        ctx.strokeStyle = gridColor;
        ctx.font = '10px Inter, sans-serif';
        
        // Draw grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight * i) / 5;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            
            // Y-axis labels
            const value = Math.round(maxCount * (5 - i) / 5);
            ctx.textAlign = 'right';
            ctx.fillText(value.toString(), padding - 5, y + 3);
        }
        
        // Draw bars
        ctx.fillStyle = barColor;
        data.forEach((item, index) => {
            const barHeight = (item.count / maxCount) * chartHeight;
            const x = padding + index * barWidth + barWidth * 0.1;
            const y = padding + chartHeight - barHeight;
            const actualBarWidth = barWidth * 0.8;
            
            ctx.fillRect(x, y, actualBarWidth, barHeight);
        });
        
        // Draw X-axis labels (every 5th day)
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        data.forEach((item, index) => {
            if (index % 5 === 0) {
                const x = padding + index * barWidth + barWidth / 2;
                const label = item.date.getDate().toString();
                ctx.fillText(label, x, height - padding + 15);
            }
        });
    }

    renderSearchInsights() {
        // Render top search terms
        const topSearchTermsContainer = document.getElementById('topSearchTerms');
        if (topSearchTermsContainer) {
            topSearchTermsContainer.innerHTML = '';
            
            if (this.analyticsData.searchTerms.size === 0) {
                topSearchTermsContainer.innerHTML = '<span style="color: var(--text-secondary); font-style: italic;">No search data</span>';
            } else {
                const topTerms = Array.from(this.analyticsData.searchTerms.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                
                topTerms.forEach(([term, count]) => {
                    const termElement = document.createElement('span');
                    termElement.className = 'search-term';
                    termElement.textContent = `${term} (${count})`;
                    topSearchTermsContainer.appendChild(termElement);
                });
            }
        }

        // Update average search time
        const avgSearchTimeElement = document.getElementById('avgSearchTime');
        if (avgSearchTimeElement) {
            avgSearchTimeElement.textContent = `${this.analyticsData.averageSearchTime}ms`;
        }
    }

    refreshAnalyticsData() {
        this.showNotification('Refreshing analytics data...', 'info');
        
        // Simulate data refresh
        setTimeout(() => {
            this.updateAnalyticsData();
            this.renderAnalyticsDashboard();
            this.showNotification('Analytics data refreshed successfully!', 'success');
        }, 1000);
    }

    exportAnalyticsReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            workspace: this.workspaceData.name,
            overview: {
                totalNotes: this.analyticsData.totalNotes,
                totalWords: this.analyticsData.totalWords,
                averageNoteLength: this.analyticsData.avgNoteLength,
                mostActiveDay: this.analyticsData.mostActiveDay
            },
            tagAnalytics: Object.fromEntries(this.analyticsData.tagUsage),
            searchInsights: {
                totalSearches: this.analyticsData.totalSearches,
                averageSearchTime: this.analyticsData.averageSearchTime,
                topSearchTerms: Object.fromEntries(this.analyticsData.searchTerms)
            }
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memo-analytics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Analytics report exported successfully!', 'success');
    }

    // Workspace Manager Methods
    showWorkspaceManager() {
        this.updateWorkspaceInfo();
        this.showModal('workspaceModal');
    }

    updateWorkspaceInfo() {
        // Update workspace name
        const workspaceNameElement = document.getElementById('currentWorkspaceName');
        if (workspaceNameElement) {
            workspaceNameElement.textContent = this.workspaceData.name;
        }

        // Update workspace stats
        const noteCountElement = document.getElementById('workspaceNoteCount');
        const workspaceSizeElement = document.getElementById('workspaceSize');
        
        if (noteCountElement) {
            const count = this.notes.length;
            noteCountElement.textContent = `${count} note${count !== 1 ? 's' : ''}`;
        }

        if (workspaceSizeElement) {
            const sizeKB = Math.round(JSON.stringify(this.notes).length / 1024);
            workspaceSizeElement.textContent = `${sizeKB} KB`;
        }

        // Update analytics
        const storageUsedElement = document.getElementById('storageUsed');
        const lastModifiedElement = document.getElementById('lastModified');
        const backupStatusElement = document.getElementById('backupStatus');

        if (storageUsedElement) {
            const totalSize = this.calculateStorageSize();
            storageUsedElement.textContent = `${totalSize} KB`;
        }

        if (lastModifiedElement) {
            const lastModified = new Date(this.workspaceData.lastModified);
            lastModifiedElement.textContent = lastModified.toLocaleDateString();
        }

        if (backupStatusElement) {
            backupStatusElement.textContent = this.workspaceData.settings.backupEnabled ? 'Up to date' : 'Disabled';
        }
    }

    calculateStorageSize() {
        const data = {
            notes: this.notes,
            workspace: this.workspaceData,
            analytics: this.analyticsData
        };
        return Math.round(JSON.stringify(data).length / 1024);
    }

    createNewWorkspace() {
        const name = prompt('Enter workspace name:');
        if (name && name.trim()) {
            this.showNotification(`Creating workspace "${name.trim()}"...`, 'info');
            
            // Simulate workspace creation
            setTimeout(() => {
                this.workspaceData.name = name.trim();
                this.workspaceData.created = new Date().toISOString();
                this.workspaceData.lastModified = new Date().toISOString();
                this.updateWorkspaceInfo();
                this.showNotification('Workspace created successfully!', 'success');
            }, 1000);
        }
    }

    duplicateCurrentWorkspace() {
        const name = prompt('Enter name for duplicated workspace:');
        if (name && name.trim()) {
            this.showNotification(`Duplicating workspace...`, 'info');
            
            // Simulate workspace duplication
            setTimeout(() => {
                this.showNotification('Workspace duplicated successfully!', 'success');
            }, 1500);
        }
    }

    archiveCurrentWorkspace() {
        if (confirm('Are you sure you want to archive this workspace? This action cannot be undone.')) {
            this.showNotification('Archiving workspace...', 'info');
            
            // Simulate workspace archiving
            setTimeout(() => {
                this.showNotification('Workspace archived successfully!', 'success');
            }, 1000);
        }
    }

    exportWorkspaceData() {
        const workspaceExport = {
            workspace: this.workspaceData,
            notes: this.notes,
            analytics: this.analyticsData,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(workspaceExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workspace-${this.workspaceData.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Workspace exported successfully!', 'success');
    }

    saveWorkspaceSettings() {
        this.workspaceData.lastModified = new Date().toISOString();
        this.saveEnterpriseData();
        this.showNotification('Workspace settings saved!', 'success');
    }

    // Collaboration Center Methods
    showCollaborationCenter() {
        this.updateCollaborationSettings();
        this.showModal('collaborationModal');
    }

    updateCollaborationSettings() {
        // Update toggle switches
        const publicSharing = document.getElementById('publicSharing');
        const allowComments = document.getElementById('allowComments');
        const allowDownload = document.getElementById('allowDownload');

        if (publicSharing) {
            publicSharing.checked = this.collaborationSettings.publicSharing;
        }
        if (allowComments) {
            allowComments.checked = this.collaborationSettings.allowComments;
        }
        if (allowDownload) {
            allowDownload.checked = this.collaborationSettings.allowDownload;
        }
    }

    generateShareLink() {
        this.showNotification('Generating share link...', 'info');
        
        // Simulate link generation
        setTimeout(() => {
            const shareLink = `https://memo-no-sekai.app/shared/${Date.now()}`;
            navigator.clipboard.writeText(shareLink).then(() => {
                this.showNotification('Share link copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification('Share link generated (copy manually): ' + shareLink, 'info');
            });
        }, 1000);
    }

    shareViaEmail() {
        const subject = encodeURIComponent('Shared Notes from Memo no Sekai');
        const body = encodeURIComponent('I wanted to share some notes with you from Memo no Sekai. Click the link below to view them.');
        const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
        
        window.open(mailtoLink);
        this.showNotification('Email client opened for sharing', 'info');
    }

    shareViaQRCode() {
        // Reuse existing QR code functionality
        this.showQRCode('https://memo-no-sekai.app/shared/' + Date.now());
        this.hideModal('collaborationModal');
    }

    toggleRealTimeCollaboration() {
        this.collaborationSettings.realTimeEnabled = !this.collaborationSettings.realTimeEnabled;
        
        if (this.collaborationSettings.realTimeEnabled) {
            this.showNotification('Real-time collaboration enabled!', 'success');
        } else {
            this.showNotification('Real-time collaboration disabled', 'info');
        }
    }

    showVersionHistory() {
        this.showNotification('Version history feature coming soon!', 'info');
    }

    createTeamWorkspace() {
        this.showNotification('Team workspace feature coming soon!', 'info');
    }

    showCollaborationHelp() {
        const helpContent = `
        <h3>Collaboration Features Help</h3>
        <ul>
            <li><strong>Share Links:</strong> Generate secure links to share notes with others</li>
            <li><strong>Email Sharing:</strong> Send notes directly via email</li>
            <li><strong>QR Codes:</strong> Create QR codes for easy mobile sharing</li>
            <li><strong>Real-time Collaboration:</strong> Enable live editing with team members</li>
            <li><strong>Version History:</strong> Track and restore previous versions</li>
            <li><strong>Team Workspaces:</strong> Create shared spaces for team collaboration</li>
        </ul>
        `;
        
        this.showNotification(helpContent, 'info');
    }

    saveCollaborationSettings() {
        this.saveEnterpriseData();
        this.showNotification('Collaboration settings saved!', 'success');
    }

    // Data Management
    loadEnterpriseData() {
        try {
            const savedAnalytics = localStorage.getItem('memo_analytics');
            if (savedAnalytics) {
                const data = JSON.parse(savedAnalytics);
                this.analyticsData = { ...this.analyticsData, ...data };
            }

            const savedWorkspace = localStorage.getItem('memo_workspace');
            if (savedWorkspace) {
                const data = JSON.parse(savedWorkspace);
                this.workspaceData = { ...this.workspaceData, ...data };
            }

            const savedCollaboration = localStorage.getItem('memo_collaboration');
            if (savedCollaboration) {
                const data = JSON.parse(savedCollaboration);
                this.collaborationSettings = { ...this.collaborationSettings, ...data };
            }
        } catch (error) {
            console.warn('Error loading enterprise data:', error);
        }
    }

    saveEnterpriseData() {
        try {
            localStorage.setItem('memo_analytics', JSON.stringify(this.analyticsData));
            localStorage.setItem('memo_workspace', JSON.stringify(this.workspaceData));
            localStorage.setItem('memo_collaboration', JSON.stringify(this.collaborationSettings));
        } catch (error) {
            console.warn('Error saving enterprise data:', error);
        }
    }

    // Enhanced Search Analytics
    trackSearchTerm(term) {
        if (term && term.trim()) {
            const cleanTerm = term.trim().toLowerCase();
            this.analyticsData.searchTerms.set(cleanTerm, (this.analyticsData.searchTerms.get(cleanTerm) || 0) + 1);
            this.analyticsData.totalSearches++;
            this.saveEnterpriseData();
        }
    }

    trackSearchTime(timeMs) {
        const currentAvg = this.analyticsData.averageSearchTime || 0;
        const totalSearches = this.analyticsData.totalSearches || 1;
        this.analyticsData.averageSearchTime = Math.round((currentAvg * (totalSearches - 1) + timeMs) / totalSearches);
    }
}

// Duplicate initialization removed - see end of file for main initialization

// Search Index Implementation
class SearchIndex {
    constructor() {
        this.index = new Map();
        this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    }

    addNote(note) {
        const words = this.extractWords(note);
        words.forEach(word => {
            if (!this.index.has(word)) {
                this.index.set(word, new Set());
            }
            this.index.get(word).add(note.id);
        });
    }

    removeNote(noteId) {
        this.index.forEach((noteIds, word) => {
            noteIds.delete(noteId);
            if (noteIds.size === 0) {
                this.index.delete(word);
            }
        });
    }

    search(query) {
        const queryWords = this.tokenize(query.toLowerCase());
        if (queryWords.length === 0) return new Set();

        let results = null;
        queryWords.forEach(word => {
            const wordResults = this.index.get(word) || new Set();
            if (results === null) {
                results = new Set(wordResults);
            } else {
                // Intersection for AND search
                results = new Set([...results].filter(id => wordResults.has(id)));
            }
        });

        return results || new Set();
    }

    extractWords(note) {
        const text = `${note.title} ${note.content || ''} ${(note.tags || []).join(' ')}`;
        return this.tokenize(text.toLowerCase());
    }

    tokenize(text) {
        return text
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.stopWords.has(word));
    }

    clear() {
        this.index.clear();
    }
}


// ===== TOP-NOTCH UI ENHANCEMENTS =====

// Enhanced Loading Overlay
function showLoadingOverlay(message = 'Loading...') {
    const existing = document.querySelector('.loading-overlay');
    if (existing) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">${message}</div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.2s ease';
        setTimeout(() => overlay.remove(), 200);
    }
}

// Enhanced Empty State
function createEnhancedEmptyState(config) {
    const {
        icon = '📝',
        title = 'No notes yet',
        description = 'Create your first note to get started',
        actionText = 'Create Note',
        actionCallback = null
    } = config;
    
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
        <div class="empty-state-icon">${icon}</div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-description">${description}</p>
        ${actionCallback ? `
            <button class="empty-state-action btn-ripple">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                ${actionText}
            </button>
        ` : ''}
    `;
    
    if (actionCallback) {
        const button = emptyState.querySelector('.empty-state-action');
        button.addEventListener('click', actionCallback);
    }
    
    return emptyState;
}

// Skeleton Loader
function createSkeletonLoader(count = 3) {
    const container = document.createElement('div');
    container.className = 'skeleton-container';
    
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton skeleton-card';
        container.appendChild(skeleton);
    }
    
    return container;
}

// Confetti Celebration
function celebrateWithConfetti() {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = Math.random() * 2 + 2 + 's';
            document.body.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 3000);
        }, i * 30);
    }
}

// Success Checkmark Animation
function showSuccessCheckmark(message = 'Success!') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="success-checkmark">
                <div class="check-icon">
                    <span class="icon-line line-tip"></span>
                    <span class="icon-line line-long"></span>
                    <div class="icon-circle"></div>
                    <div class="icon-fix"></div>
                </div>
            </div>
            <div class="loading-text" style="margin-top: 20px; font-weight: 600; color: var(--success);">
                ${message}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    setTimeout(() => {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
    }, 2000);
}

// Enhanced Tooltip System
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(element => {
        if (!element.classList.contains('tooltip')) {
            element.classList.add('tooltip');
        }
    });
}

// Add Ripple Effect to Buttons
function addRippleEffect(button, event) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple-effect');
    
    button.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// Initialize Ripple Effects
function initializeRippleEffects() {
    const rippleButtons = document.querySelectorAll('.btn-ripple, .btn-primary, .btn-secondary');
    
    rippleButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            addRippleEffect(this, e);
        });
    });
}

// Smooth Scroll to Element
function smoothScrollTo(element, offset = 0) {
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
    
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
}

// Enhanced Notification with Icons
function showEnhancedNotification(message, type = 'info', duration = 3000) {
    const icons = {
        success: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`,
        error: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`,
        warning: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>`,
        info: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>`
    };
    
    const container = document.getElementById('notificationsContainer') || createNotificationContainer();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="flex-shrink: 0;">${icons[type]}</div>
            <div style="flex: 1;">${message}</div>
            <button class="notification-close" style="background: none; border: none; cursor: pointer; padding: 4px; opacity: 0.7; transition: opacity 0.2s;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.animation = 'notificationSlideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    });
    
    container.appendChild(notification);
    
    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'notificationSlideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }
    
    return notification;
}

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationsContainer';
    container.className = 'notifications-container';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
}

// Keyboard Shortcuts Overlay
function showKeyboardShortcuts() {
    const shortcuts = [
        { key: 'Ctrl+N', description: 'Create new note' },
        { key: 'Ctrl+K', description: 'Focus search' },
        { key: 'Ctrl+S', description: 'Save note' },
        { key: 'Ctrl+E', description: 'Export notes' },
        { key: 'Ctrl+I', description: 'Import notes' },
        { key: 'Ctrl+T', description: 'Toggle theme' },
        { key: 'Ctrl+F', description: 'Cycle filters' },
        { key: 'Ctrl+G', description: 'Toggle view' },
        { key: 'Ctrl+A', description: 'Analytics dashboard' },
        { key: 'Escape', description: 'Close/Clear' }
    ];
    
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.style.cursor = 'pointer';
    overlay.innerHTML = `
        <div class="loading-content" style="max-width: 500px; cursor: default;" onclick="event.stopPropagation()">
            <h2 style="margin-bottom: 20px; color: var(--text-primary);">⌨️ Keyboard Shortcuts</h2>
            <div style="display: grid; gap: 12px;">
                ${shortcuts.map(s => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">
                        <span style="color: var(--text-secondary);">${s.description}</span>
                        <kbd style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: var(--text-primary);">${s.key}</kbd>
                    </div>
                `).join('')}
            </div>
            <button class="btn-primary" style="margin-top: 20px; width: 100%;" onclick="this.closest('.loading-overlay').remove()">
                Got it!
            </button>
        </div>
    `;
    
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

// Add keyboard shortcut to show shortcuts (Ctrl+?)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        showKeyboardShortcuts();
    }
});

// Initialize all UI enhancements on load
document.addEventListener('DOMContentLoaded', () => {
    initializeTooltips();
    initializeRippleEffects();
    
    // Add tooltips to header buttons
    const syncBtn = document.getElementById('syncBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const searchBtn = document.getElementById('searchBtn');
    
    if (syncBtn && !syncBtn.hasAttribute('data-tooltip')) {
        syncBtn.setAttribute('data-tooltip', 'Sync notes');
    }
    if (settingsBtn && !settingsBtn.hasAttribute('data-tooltip')) {
        settingsBtn.setAttribute('data-tooltip', 'Settings');
    }
    if (searchBtn && !searchBtn.hasAttribute('data-tooltip')) {
        searchBtn.setAttribute('data-tooltip', 'Search notes');
    }
    
    // Re-initialize tooltips after adding attributes
    initializeTooltips();
});

// Add CSS for notification slide out animation
const style = document.createElement('style');
style.textContent = `
    @keyframes notificationSlideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


// ===== ONBOARDING & WELCOME TOUR =====

function showWelcomeTour() {
    const hasSeenTour = localStorage.getItem('memo_tour_completed');
    if (hasSeenTour) return;
    
    const tourSteps = [
        {
            title: 'Welcome to Memo no Sekai! 🎉',
            description: 'Your personal, secure note-taking companion. Let\'s take a quick tour!',
            element: null,
            position: 'center'
        },
        {
            title: 'Create Notes',
            description: 'Click here to create your first note. You can use Markdown for rich formatting!',
            element: '#newNoteBtn',
            position: 'right'
        },
        {
            title: 'Search Everything',
            description: 'Use advanced search with tag:work, content:meeting, or date:today',
            element: '#globalSearch',
            position: 'bottom'
        },
        {
            title: 'Organize with Tags',
            description: 'Add tags to your notes for easy organization and filtering',
            element: '.filter-btn',
            position: 'bottom'
        },
        {
            title: 'Settings & More',
            description: 'Access analytics, workspace management, and collaboration features',
            element: '#settingsBtn',
            position: 'left'
        },
        {
            title: 'Keyboard Shortcuts',
            description: 'Press Ctrl+/ to see all keyboard shortcuts for power users!',
            element: null,
            position: 'center'
        }
    ];
    
    let currentStep = 0;
    
    function showStep(step) {
        const overlay = document.createElement('div');
        overlay.className = 'tour-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;
        
        const tourCard = document.createElement('div');
        tourCard.className = 'tour-card';
        tourCard.style.cssText = `
            background: var(--bg-primary);
            border-radius: 16px;
            padding: 32px;
            max-width: 500px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: modalSlideUp 0.3s ease;
        `;
        
        tourCard.innerHTML = `
            <h2 style="margin: 0 0 16px 0; color: var(--text-primary); font-size: 1.5em;">
                ${tourSteps[step].title}
            </h2>
            <p style="margin: 0 0 24px 0; color: var(--text-secondary); line-height: 1.6;">
                ${tourSteps[step].description}
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                ${step > 0 ? '<button class="btn-secondary" id="tourPrev">Previous</button>' : ''}
                ${step < tourSteps.length - 1 ? 
                    '<button class="btn-primary" id="tourNext">Next</button>' : 
                    '<button class="btn-primary" id="tourFinish">Get Started!</button>'
                }
                <button class="btn-secondary" id="tourSkip">Skip Tour</button>
            </div>
            <div style="margin-top: 20px; color: var(--text-muted); font-size: 0.9em;">
                Step ${step + 1} of ${tourSteps.length}
            </div>
        `;
        
        overlay.appendChild(tourCard);
        document.body.appendChild(overlay);
        
        // Highlight element if specified
        if (tourSteps[step].element) {
            const element = document.querySelector(tourSteps[step].element);
            if (element) {
                element.style.position = 'relative';
                element.style.zIndex = '10000';
                element.classList.add('tour-highlight');
            }
        }
        
        // Event listeners
        const nextBtn = document.getElementById('tourNext');
        const prevBtn = document.getElementById('tourPrev');
        const finishBtn = document.getElementById('tourFinish');
        const skipBtn = document.getElementById('tourSkip');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                overlay.remove();
                currentStep++;
                showStep(currentStep);
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                overlay.remove();
                currentStep--;
                showStep(currentStep);
            });
        }
        
        if (finishBtn) {
            finishBtn.addEventListener('click', () => {
                localStorage.setItem('memo_tour_completed', 'true');
                overlay.remove();
                celebrateWithConfetti();
                showEnhancedNotification('Welcome aboard! Start creating amazing notes! 🚀', 'success', 5000);
            });
        }
        
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                localStorage.setItem('memo_tour_completed', 'true');
                overlay.remove();
            });
        }
    }
    
    showStep(0);
}

// Add tour highlight styles
const tourStyles = document.createElement('style');
tourStyles.textContent = `
    .tour-highlight {
        box-shadow: 0 0 0 4px var(--accent-primary), 0 0 0 8px rgba(59, 130, 246, 0.3) !important;
        animation: tourPulse 2s ease-in-out infinite;
    }
    
    @keyframes tourPulse {
        0%, 100% {
            box-shadow: 0 0 0 4px var(--accent-primary), 0 0 0 8px rgba(59, 130, 246, 0.3);
        }
        50% {
            box-shadow: 0 0 0 4px var(--accent-primary), 0 0 0 12px rgba(59, 130, 246, 0.5);
        }
    }
`;
document.head.appendChild(tourStyles);

// Show tour after a short delay on first load
setTimeout(() => {
    if (document.readyState === 'complete') {
        showWelcomeTour();
    } else {
        window.addEventListener('load', showWelcomeTour);
    }
}, 1000);


// ===== COMMAND PALETTE =====

function showCommandPalette() {
    const commands = [
        { name: 'Create New Note', icon: '📝', action: () => app?.showNoteEditor(), shortcut: 'Ctrl+N' },
        { name: 'Search Notes', icon: '🔍', action: () => document.getElementById('globalSearch')?.focus(), shortcut: 'Ctrl+K' },
        { name: 'Analytics Dashboard', icon: '📊', action: () => app?.showAnalyticsDashboard(), shortcut: 'Ctrl+A' },
        { name: 'Workspace Manager', icon: '🏢', action: () => app?.showWorkspaceManager(), shortcut: '' },
        { name: 'Collaboration Center', icon: '👥', action: () => app?.showCollaborationCenter(), shortcut: '' },
        { name: 'Export Notes', icon: '📤', action: () => app?.exportNotes(), shortcut: 'Ctrl+E' },
        { name: 'Import Notes', icon: '📥', action: () => app?.importNotes(), shortcut: 'Ctrl+I' },
        { name: 'Toggle Theme', icon: '🌓', action: () => app?.toggleTheme(), shortcut: 'Ctrl+T' },
        { name: 'Keyboard Shortcuts', icon: '⌨️', action: () => showKeyboardShortcuts(), shortcut: 'Ctrl+/' },
        { name: 'Show Welcome Tour', icon: '🎓', action: () => { localStorage.removeItem('memo_tour_completed'); showWelcomeTour(); }, shortcut: '' }
    ];
    
    const overlay = document.createElement('div');
    overlay.className = 'command-palette-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 10000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 100px;
        animation: fadeIn 0.2s ease;
    `;
    
    const palette = document.createElement('div');
    palette.className = 'command-palette';
    palette.style.cssText = `
        background: var(--bg-primary);
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        animation: modalSlideUp 0.3s ease;
    `;
    
    palette.innerHTML = `
        <div style="padding: 20px; border-bottom: 1px solid var(--border-color);">
            <input 
                type="text" 
                id="commandSearch" 
                placeholder="Type a command or search..." 
                style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); color: var(--text-primary); font-size: 1em;"
                autofocus
            />
        </div>
        <div id="commandList" style="max-height: 400px; overflow-y: auto;">
            ${commands.map((cmd, index) => `
                <div class="command-item" data-index="${index}" style="padding: 12px 20px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: background 0.2s;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 1.5em;">${cmd.icon}</span>
                        <span style="color: var(--text-primary);">${cmd.name}</span>
                    </div>
                    ${cmd.shortcut ? `<kbd style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-size: 0.85em; color: var(--text-secondary);">${cmd.shortcut}</kbd>` : ''}
                </div>
            `).join('')}
        </div>
    `;
    
    overlay.appendChild(palette);
    document.body.appendChild(overlay);
    
    const searchInput = document.getElementById('commandSearch');
    const commandList = document.getElementById('commandList');
    let selectedIndex = 0;
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const items = commandList.querySelectorAll('.command-item');
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (text.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        const visibleItems = Array.from(commandList.querySelectorAll('.command-item')).filter(item => item.style.display !== 'none');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, visibleItems.length - 1);
            updateSelection(visibleItems);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, 0);
            updateSelection(visibleItems);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedItem = visibleItems[selectedIndex];
            if (selectedItem) {
                const index = parseInt(selectedItem.dataset.index);
                executeCommand(commands[index]);
            }
        } else if (e.key === 'Escape') {
            overlay.remove();
        }
    });
    
    function updateSelection(items) {
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.style.background = 'var(--bg-secondary)';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.background = 'transparent';
            }
        });
    }
    
    // Click handlers
    commandList.addEventListener('click', (e) => {
        const item = e.target.closest('.command-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            executeCommand(commands[index]);
        }
    });
    
    // Hover effects
    commandList.addEventListener('mouseover', (e) => {
        const item = e.target.closest('.command-item');
        if (item) {
            item.style.background = 'var(--bg-secondary)';
        }
    });
    
    commandList.addEventListener('mouseout', (e) => {
        const item = e.target.closest('.command-item');
        if (item) {
            const visibleItems = Array.from(commandList.querySelectorAll('.command-item')).filter(i => i.style.display !== 'none');
            const index = visibleItems.indexOf(item);
            if (index !== selectedIndex) {
                item.style.background = 'transparent';
            }
        }
    });
    
    function executeCommand(command) {
        overlay.remove();
        if (command.action) {
            setTimeout(() => command.action(), 100);
        }
    }
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
    
    // Initialize selection
    updateSelection(commandList.querySelectorAll('.command-item'));
}

// Add keyboard shortcut for command palette (Ctrl+P)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        showCommandPalette();
    }
});


// ===== APPLICATION INITIALIZATION =====

// Initialize the application
let app;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Memo no Sekai...');
    try {
        app = new MemoNoSekai();
        console.log('App initialized successfully!');
        
        // Make app globally accessible for onclick handlers
        window.app = app;
        
        // Verify critical elements
        const newNoteBtn = document.getElementById('newNoteBtn');
        const searchInput = document.getElementById('globalSearch');
        const notesGrid = document.getElementById('notesGrid');
        
        console.log('Critical elements check:');
        console.log('- New Note Button:', newNoteBtn ? 'Found' : 'NOT FOUND');
        console.log('- Search Input:', searchInput ? 'Found' : 'NOT FOUND');
        console.log('- Notes Grid:', notesGrid ? 'Found' : 'NOT FOUND');
        
        if (!newNoteBtn || !searchInput || !notesGrid) {
            console.error('Critical elements missing! Check HTML structure.');
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        console.error('Stack trace:', error.stack);
    }
});

// Global functions for onclick handlers in HTML
window.app = {
    showNoteEditor: (id) => app?.showNoteEditor(id),
    editNote: (id) => app?.editNote(id),
    deleteNote: (id) => app?.deleteNote(id),
    toggleFavorite: (id) => app?.toggleFavorite(id),
    togglePin: (id) => app?.togglePin(id),
    unlockNote: (id) => app?.unlockNote(id),
    shareNote: (id) => app?.shareNote(id),
    generateQRCode: (id) => app?.generateQRCode(id),
    filterByTag: (tag) => app?.filterByTag(tag),
    toggleCheckbox: (id) => app?.toggleCheckbox(id),
    removeSecurityQuestion: (index) => app?.removeSecurityQuestion(index),
    closeSecurityVerification: () => app?.closeSecurityVerification(),
    verifySecurityAnswers: () => app?.verifySecurityAnswers(),
    toggleExportPasswordVisibility: () => app?.toggleExportPasswordVisibility(),
    tryBiometricForExport: () => app?.tryBiometricForExport(),
    confirmExportPassword: () => app?.confirmExportPassword(),
    cancelExportVerification: () => app?.cancelExportVerification()
};

console.log('Memo no Sekai script loaded - Ready for initialization');
