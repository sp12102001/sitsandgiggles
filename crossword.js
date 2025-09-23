// Entity Code Crossword Game
class CrosswordGame {
    constructor () {
        this.data = [];
        this.crossword = null;
        this.currentWord = null;
        this.currentCell = { row: null, col: null };
        this.userAnswers = {};
        this.gridSize = 12;
        this.maxWords = 6;
        this.inlineValidationEnabled = false;
        this.seed = this.getInitialSeed();
        this.randomGenerator = this.createRNG(this.seed);
        this.theme = this.getInitialTheme();

        this.init();
    }

    // Seeded RNG helpers
    getInitialSeed() {
        const params = new URLSearchParams(window.location.search);
        const s = params.get('seed');
        const n = s ? Number(s) : NaN;
        if (!isNaN(n)) return n;
        return Math.floor(Date.now() % 2147483647);
    }

    createRNG(seed) {
        let t = seed >>> 0;
        return function () {
            t += 0x6D2B79F5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }

    random() {
        return this.randomGenerator ? this.randomGenerator() : Math.random();
    }

    // Theme helpers
    getInitialTheme() {
        const stored = localStorage.getItem('sits_theme');
        if (stored === 'dark' || stored === 'light') return stored;
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }

    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('sits_theme', theme);
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.theme);
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.applyInitialControlsState();
        this.applyTheme(this.theme);
        if (!this.restoreFromLocalStorage()) {
            this.generateNewCrossword();
        }
    }

    // Initialize controls from URL or defaults
    applyInitialControlsState() {
        const params = new URLSearchParams(window.location.search);
        const gridParam = parseInt(params.get('grid') || '', 10);
        const wordsParam = parseInt(params.get('words') || '', 10);
        const inlineParam = params.get('inline');

        const gridSizeSelect = document.getElementById('gridSizeSelect');
        const wordCountSelect = document.getElementById('wordCountSelect');
        const inlineToggle = document.getElementById('inlineValidationToggle');

        if (!isNaN(gridParam) && gridSizeSelect) {
            gridSizeSelect.value = String(gridParam);
            this.gridSize = gridParam;
        }
        if (!isNaN(wordsParam) && wordCountSelect) {
            wordCountSelect.value = String(wordsParam);
            this.maxWords = wordsParam;
        }
        if (inlineParam && inlineToggle) {
            const enable = inlineParam === '1' || inlineParam === 'true';
            inlineToggle.checked = enable;
            this.inlineValidationEnabled = enable;
        }
        document.documentElement.style.setProperty('--cell-size', '32px');
    }

    // Autosave
    restoreFromLocalStorage() {
        try {
            const raw = localStorage.getItem('sits_crossword_autosave');
            if (!raw) return false;
            const saved = JSON.parse(raw);
            if (!saved.crossword || !saved.userAnswers) return false;
            this.seed = saved.seed || this.seed;
            this.randomGenerator = this.createRNG(this.seed);
            this.gridSize = saved.gridSize || this.gridSize;
            this.maxWords = saved.maxWords || this.maxWords;
            this.crossword = saved.crossword;
            this.userAnswers = saved.userAnswers;
            this.renderCrossword();
            this.updateStats();
            this.showMessage('Restored previous session', 'info');
            return true;
        } catch (e) {
            return false;
        }
    }

    saveToLocalStorage() {
        try {
            const payload = { seed: this.seed, gridSize: this.gridSize, maxWords: this.maxWords, crossword: this.crossword, userAnswers: this.userAnswers };
            localStorage.setItem('sits_crossword_autosave', JSON.stringify(payload));
        } catch (e) { /* ignore */ }
    }

    async loadData() {
        try {
            // When deployed on GitHub Pages, use relative path
            // When running locally, this will also work if files are in same directory
            const response = await fetch('./men_ent_cleaned.csv');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const csvText = await response.text();
            this.parseCSV(csvText);
            console.log(`Loaded ${this.data.length} letter-only SITS entities`);
            this.showMessage(`Loaded ${this.data.length} letter-only SITS entity codes!`, 'success');
        } catch (error) {
            console.error('Error loading data:', error);
            // Provide fallback sample data for demo purposes
            this.loadSampleData();
            this.showMessage('Using sample letter-only SITS codes - deploy to GitHub Pages for full dataset', 'info');
        }
    }

    loadSampleData() {
        // Sample data with real letter-only SITS entity codes for demonstration when CSV can't be loaded
        this.data = [
            { code: 'AAC', description: 'AAM Arrangement Constraint - Defines constraints for activity arrangement management.', fullName: 'AAM Arrangement Constraint' },
            { code: 'ABT', description: 'Assessment Batch - Tracks assessment batches available for module assignment and commitment status.', fullName: 'Assessment Batch' },
            { code: 'ACB', description: 'Award Confirmation Rule Body - Individual elements that make up award confirmation rules.', fullName: 'Award Confirmation Rule Body' },
            { code: 'ACE', description: 'Award Calculation Element - Defines credit minima/maxima and levels for award calculations.', fullName: 'Award Calculation Element' },
            { code: 'ACI', description: 'Activity Item - Defines individual activity items within the system.', fullName: 'Activity Item' },
            { code: 'ACM', description: 'Award Calculation Method - Rules for calculating highest possible non-discretionary student awards.', fullName: 'Award Calculation Method' },
            { code: 'ACP', description: 'Activity Pattern - Defines patterns and structures for activities.', fullName: 'Activity Pattern' },
            { code: 'ACR', description: 'Award Confirmation Rule - Additional conditions for award classification confirmation.', fullName: 'Award Confirmation Rule' },
            { code: 'ACT', description: 'Activity - Defines activity types for topic elements and room assignment.', fullName: 'Activity' },
            { code: 'ADE', description: 'Academic Standing Profile Element - Specifies academic standing calculation methods.', fullName: 'Academic Standing Profile Element' },
            { code: 'ADP', description: 'Academic Standing Profile - Associates academic standing rules with students/programmes.', fullName: 'Academic Standing Profile' },
            { code: 'ADR', description: 'Assessment Division Requirements - Materials and equipment required for assessment divisions.', fullName: 'Assessment Division Requirements' }
        ];
        console.log('Loaded sample letter-only SITS entities for demonstration');
        this.codeToEntity = {};
        this.data.forEach(item => { this.codeToEntity[item.code] = item; });
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',');

        // Find the indices for entity code, full name, and description
        const entityCodeIndex = 1; // Column B (Entity code)
        const fullNameIndex = 3; // Column D (Full name)
        const descriptionIndex = 28; // Column AC (Developer Help)

        for (let i = 1; i < lines.length; i++) {
            const columns = this.parseCSVLine(lines[i]);
            if (columns.length > descriptionIndex) {
                const entityCode = columns[entityCodeIndex]?.trim();
                const fullName = columns[fullNameIndex]?.trim();
                const description = columns[descriptionIndex]?.trim();

                if (entityCode && entityCode.length >= 3 && entityCode.length <= 4 && /^[A-Z]+$/.test(entityCode)) {
                    // Create a clue that doesn't give away the answer
                    const clue = this.createClue(entityCode, fullName, description);

                    if (clue) {
                        this.data.push({
                            code: entityCode.toUpperCase(),
                            description: clue,
                            fullName: fullName
                        });
                    }
                }
            }
        }

        // Filter out duplicates and sort by code length for better crossword generation
        this.data = this.data.filter((item, index, self) =>
            index === self.findIndex(t => t.code === item.code)
        ).sort((a, b) => b.code.length - a.code.length);

        // Build quick lookup map for alternative-entity messages
        this.codeToEntity = {};
        this.data.forEach(item => {
            this.codeToEntity[item.code] = item;
        });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    createClue(entityCode, fullName, description) {
        const clue = this.buildClueFromRaw(entityCode, fullName, description);
        if (!clue) return null;
        if (new RegExp(`\\b${entityCode}\\b`, 'i').test(clue)) return null;
        return clue.length > 10 ? clue : null;
    }

    removeCodeReferences(text, entityCode) {
        // Remove various forms of the entity code from text
        const patterns = [
            new RegExp(`\\b${entityCode}\\b`, 'gi'),
            new RegExp(`\\(${entityCode}\\)`, 'gi'),
            new RegExp(`${entityCode}_\\w+`, 'gi'),
            new RegExp(`CAM_${entityCode}`, 'gi')
        ];

        let cleaned = text;
        patterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '...');
        });

        // Clean up multiple dots and extra spaces
        cleaned = cleaned
            .replace(/\.{2,}/g, '...')
            .replace(/\s+/g, ' ')
            .trim();

        return cleaned;
    }

    cleanDescription(description) {
        // Remove quotes and clean up description
        return description
            .replace(/^"/, '')
            .replace(/"$/, '')
            .replace(/""/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Build a less-obvious clue from raw fields
    buildClueFromRaw(entityCode, fullName, description) {
        let base = this.cleanDescription(description || '');
        base = this.removeCodeReferences(base, entityCode);
        base = this.sanitizeClueText(base, entityCode, fullName);
        let snippet = this.pickClueSnippet(base);
        if (!snippet || snippet.length < 20) {
            // Fallback: very generic, avoids revealing exact names
            snippet = 'Used to manage records or rules within the system.';
        }
        // Final cleanup
        snippet = snippet.replace(/\s+/g, ' ').trim();
        return snippet;
    }

    // Remove acronyms, proper noun phrases, and words from fullName
    sanitizeClueText(text, entityCode, fullName) {
        let t = (text || '').replace(/\((?:[^)(]+|\([^)(]*\))*\)/g, ' '); // remove parentheses content
        // Remove acronyms (2+ uppercase letters)
        t = t.replace(/\b[A-Z]{2,}\b/g, '…');
        // Remove sequences of 2+ TitleCase words (likely proper names)
        t = t.replace(/(?:\b[A-Z][a-z]+\b(?:\s+|$)){2,}/g, '… ');
        // Remove words from fullName to avoid “too obvious” hints
        if (fullName) {
            const words = fullName.split(/\s+/).filter(w => /[A-Za-z]/.test(w) && w.length > 2);
            words.forEach(w => {
                const re = new RegExp(`\\b${this.escapeRegExp(w)}\\b`, 'gi');
                t = t.replace(re, '…');
            });
        }
        // Remove the code if still present
        t = this.removeCodeReferences(t, entityCode);
        // Normalize ellipses and spaces
        t = t.replace(/…{2,}/g, '…').replace(/\s*…\s*/g, ' … ').replace(/\s{2,}/g, ' ');
        return t.trim();
    }

    pickClueSnippet(text) {
        if (!text) return '';
        const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(Boolean);
        let s = sentences[0] || text;
        const words = s.split(/\s+/);
        if (words.length > 18) {
            s = words.slice(0, 18).join(' ') + '…';
        }
        return s;
    }

    escapeRegExp(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Active clue bar update
    updateActiveClueBar(word) {
        const bar = document.getElementById('activeClueBar');
        if (!bar || !word) return;
        const directionText = word.horizontal ? 'Across' : 'Down';
        bar.innerHTML = `<span class="clue-number">${word.number}</span><span class="clue-direction">${directionText}</span><span class="clue-text">${word.description}</span><span class="clue-length">(${word.code.length})</span>`;
    }

    // Membership of a cell across/down
    getCellMembership(row, col) {
        const memberships = [];
        if (!this.crossword || !this.crossword.words) return memberships;
        const across = this.crossword.words.find(w => w.horizontal && w.row === row && col >= w.col && col < w.col + w.code.length);
        if (across) {
            memberships.push({ direction: 'Across', number: across.number, length: across.code.length, index: col - across.col, row: across.row, col: across.col });
        }
        const down = this.crossword.words.find(w => !w.horizontal && w.col === col && row >= w.row && row < w.row + w.code.length);
        if (down) {
            memberships.push({ direction: 'Down', number: down.number, length: down.code.length, index: row - down.row, row: down.row, col: down.col });
        }
        return memberships;
    }

    generateNewCrossword() {
        this.showLoading(true);
        this.userAnswers = {};
        this.currentWord = null;
        this.currentCell = { row: null, col: null };

        setTimeout(() => {
            try {
                const gridSizeSelect = document.getElementById('gridSizeSelect');
                const wordCountSelect = document.getElementById('wordCountSelect');
                if (gridSizeSelect) this.gridSize = parseInt(gridSizeSelect.value, 10) || this.gridSize;
                if (wordCountSelect) this.maxWords = parseInt(wordCountSelect.value, 10) || this.maxWords;
                this.crossword = this.createCrossword();
                this.renderCrossword();
                this.updateStats();
                this.showLoading(false);
                this.showMessage('New SITS crossword generated!', 'success');
                if (this.saveToLocalStorage) this.saveToLocalStorage();
            } catch (error) {
                console.error('Error generating crossword:', error);
                this.showMessage('Error generating crossword', 'error');
                this.showLoading(false);
            }
        }, 100);
    }

    createCrossword() {
        const maxWords = this.maxWords || 6; // configurable number
        const selectedWords = this.selectWords(maxWords);
        const grid = this.initializeGrid();
        const placedWords = [];

        // Place first word in center horizontally
        if (selectedWords.length > 0) {
            const firstWord = selectedWords[0];
            const startRow = Math.floor(this.gridSize / 2);
            const startCol = Math.floor((this.gridSize - firstWord.code.length) / 2);

            this.placeWord(grid, firstWord, startRow, startCol, true, 1);
            placedWords.push({
                ...firstWord,
                row: startRow,
                col: startCol,
                horizontal: true,
                number: 1
            });
        }

        // Place remaining words
        let wordNumber = 2;
        for (let i = 1; i < selectedWords.length && placedWords.length < maxWords; i++) {
            const word = selectedWords[i];
            const placement = this.findWordPlacement(grid, word, placedWords);

            if (placement) {
                // Reuse number if starting cell already has a number
                const existing = grid[placement.row][placement.col].number;
                const n = existing > 0 ? existing : wordNumber;
                this.placeWord(grid, word, placement.row, placement.col, placement.horizontal, n);
                placedWords.push({
                    ...word,
                    row: placement.row,
                    col: placement.col,
                    horizontal: placement.horizontal,
                    number: n
                });
                if (existing === 0) wordNumber++;
            }
        }

        return {
            grid: grid,
            words: placedWords,
            size: this.gridSize
        };
    }

    selectWords(maxWords) {
        // Select words for the crossword - only use 3-4 character entity codes
        const words = [...this.data];

        // Shuffle the array
        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor((this.random ? this.random() : Math.random()) * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }

        // Only use 3-4 character entity codes without numbers
        const validWords = words.filter(w =>
            w.code.length >= 3 &&
            w.code.length <= 4 &&
            /^[A-Z]+$/.test(w.code)
        );

        // Return the first maxWords from the shuffled valid words
        return validWords.slice(0, maxWords);
    }

    initializeGrid() {
        const grid = [];
        for (let i = 0; i < this.gridSize; i++) {
            grid[i] = [];
            for (let j = 0; j < this.gridSize; j++) {
                grid[i][j] = { letter: '', number: 0, isBlack: false };
            }
        }
        return grid;
    }

    placeWord(grid, word, row, col, horizontal, number) {
        const letters = word.code.split('');

        // Mark the starting cell with the word number
        grid[row][col].number = number;

        for (let i = 0; i < letters.length; i++) {
            const cellRow = horizontal ? row : row + i;
            const cellCol = horizontal ? col + i : col;

            if (cellRow < this.gridSize && cellCol < this.gridSize) {
                grid[cellRow][cellCol].letter = letters[i];
            }
        }
    }

    findWordPlacement(grid, word, placedWords) {
        const attempts = 50; // Limit attempts to avoid infinite loops

        for (let attempt = 0; attempt < attempts; attempt++) {
            // Try to intersect with existing words
            for (const placedWord of placedWords) {
                const intersection = this.findIntersection(word.code, placedWord.code);
                if (intersection) {
                    const placement = this.calculatePlacement(
                        placedWord,
                        intersection,
                        word.code.length
                    );

                    if (placement && this.canPlaceWord(grid, word.code, placement)) {
                        return placement;
                    }
                }
            }
        }

        // If no intersection found, try random placement
        for (let attempt = 0; attempt < attempts; attempt++) {
            const horizontal = (this.random ? this.random() : Math.random()) < 0.5;
            const maxRow = horizontal ? this.gridSize - 1 : this.gridSize - word.code.length;
            const maxCol = horizontal ? this.gridSize - word.code.length : this.gridSize - 1;

            if (maxRow >= 0 && maxCol >= 0) {
                const row = Math.floor((this.random ? this.random() : Math.random()) * (maxRow + 1));
                const col = Math.floor((this.random ? this.random() : Math.random()) * (maxCol + 1));
                const placement = { row, col, horizontal };

                if (this.canPlaceWord(grid, word.code, placement)) {
                    return placement;
                }
            }
        }

        return null;
    }

    findIntersection(word1, word2) {
        for (let i = 0; i < word1.length; i++) {
            for (let j = 0; j < word2.length; j++) {
                if (word1[i] === word2[j]) {
                    return { pos1: i, pos2: j, letter: word1[i] };
                }
            }
        }
        return null;
    }

    calculatePlacement(placedWord, intersection, newWordLength) {
        const { pos1, pos2 } = intersection;

        if (placedWord.horizontal) {
            // Place new word vertically
            const intersectCol = placedWord.col + pos2;
            const newWordRow = placedWord.row - pos1;

            return {
                row: newWordRow,
                col: intersectCol,
                horizontal: false
            };
        } else {
            // Place new word horizontally
            const intersectRow = placedWord.row + pos2;
            const newWordCol = placedWord.col - pos1;

            return {
                row: intersectRow,
                col: newWordCol,
                horizontal: true
            };
        }
    }

    canPlaceWord(grid, word, placement) {
        const { row, col, horizontal } = placement;

        // Check bounds
        const endRow = horizontal ? row : row + word.length - 1;
        const endCol = horizontal ? col + word.length - 1 : col;

        if (endRow >= this.gridSize || endCol >= this.gridSize || row < 0 || col < 0) {
            return false;
        }

        // Check for conflicts
        for (let i = 0; i < word.length; i++) {
            const cellRow = horizontal ? row : row + i;
            const cellCol = horizontal ? col + i : col;
            const cellLetter = grid[cellRow][cellCol].letter;

            if (cellLetter && cellLetter !== word[i]) {
                return false;
            }
        }

        return true;
    }

    renderCrossword() {
        const gridElement = document.getElementById('crosswordGrid');
        const acrossClues = document.getElementById('acrossClues');
        const downClues = document.getElementById('downClues');

        if (!this.crossword) return;

        // Set grid layout
        gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;
        gridElement.setAttribute('role', 'grid');
        gridElement.setAttribute('aria-rowcount', String(this.gridSize));
        gridElement.setAttribute('aria-colcount', String(this.gridSize));
        gridElement.style.transformOrigin = 'top left';
        gridElement.innerHTML = '';

        // Create grid cells
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.createCell(row, col);
                gridElement.appendChild(cell);
            }
        }

        // Render clues
        this.renderClues(acrossClues, downClues);
        if (this.buildOnScreenKeyboard) this.buildOnScreenKeyboard();
    }

    createCell(row, col) {
        const cell = document.createElement('div');
        const gridCell = this.crossword.grid[row][col];
        const isPartOfWord = this.isCellPartOfWord(row, col);

        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (!isPartOfWord) {
            cell.classList.add('black');
            return cell;
        }

        // Add number if this is the start of a word
        if (gridCell.number > 0) {
            const number = document.createElement('div');
            number.className = 'cell-number';
            number.textContent = gridCell.number;
            cell.appendChild(number);
        }

        // Add input field
        const input = document.createElement('input');
        input.className = 'cell-input';
        input.type = 'text';
        input.maxLength = 1;
        input.setAttribute('inputmode', 'text');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'characters');
        input.setAttribute('spellcheck', 'false');
        input.addEventListener('input', (e) => this.handleInput(e, row, col));
        input.addEventListener('focus', () => this.highlightWord(row, col));
        input.addEventListener('keydown', (e) => this.handleKeydown(e, row, col));

        // Accessibility label
        const membership = this.getCellMembership ? this.getCellMembership(row, col) : [];
        const labelParts = [`Row ${row + 1}`, `Column ${col + 1}`];
        if (membership.length) {
            const info = membership.map(m => `${m.direction} ${m.number}, letter ${m.index + 1} of ${m.length}`).join(' | ');
            labelParts.push(info);
        }
        input.setAttribute('aria-label', labelParts.join(', '));

        // Set saved answer if exists
        const cellKey = `${row}-${col}`;
        if (this.userAnswers[cellKey]) {
            input.value = this.userAnswers[cellKey];
        }

        cell.appendChild(input);
        return cell;
    }

    isCellPartOfWord(row, col) {
        return this.crossword.words.some(word => {
            if (word.horizontal) {
                return word.row === row && col >= word.col && col < word.col + word.code.length;
            } else {
                return word.col === col && row >= word.row && row < word.row + word.code.length;
            }
        });
    }

    renderClues(acrossElement, downElement) {
        const acrossWords = this.crossword.words.filter(w => w.horizontal);
        const downWords = this.crossword.words.filter(w => !w.horizontal);

        acrossElement.innerHTML = '';
        downElement.innerHTML = '';

        acrossWords.forEach(word => {
            const clueElement = this.createClueElement(word);
            acrossElement.appendChild(clueElement);
        });

        downWords.forEach(word => {
            const clueElement = this.createClueElement(word);
            downElement.appendChild(clueElement);
        });
    }

    createClueElement(word) {
        const clue = document.createElement('div');
        clue.className = 'clue-item';
        clue.dataset.number = word.number;
        clue.dataset.horizontal = word.horizontal;

        const directionText = word.horizontal ? 'Across' : 'Down';
        clue.innerHTML = `
            <span class="clue-meta">${word.number} ${directionText}</span>
            <span class="clue-text">${word.description}</span>
            <span class="word-length">(${word.code.length})</span>
        `;

        clue.addEventListener('click', () => {
            this.highlightWordByNumber(word.number, word.horizontal);
            this.focusWordStart(word);
            if (this.updateActiveClueBar) this.updateActiveClueBar(word);
        });

        return clue;
    }

    highlightWord(row, col) {
        // Clear previous highlights
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('highlighted', 'current-word', 'word-start', 'word-end');
        });

        document.querySelectorAll('.clue-item').forEach(clue => {
            clue.classList.remove('active');
        });

        // Clear any existing word info display
        this.clearWordInfo();

        // Find which word this cell belongs to
        const word = this.findWordAtPosition(row, col);
        if (word) {
            this.currentWord = word;
            this.currentCell = { row, col };
            this.highlightWordCells(word);
            this.highlightClue(word.number, word.horizontal);
            if (this.updateActiveClueBar) this.updateActiveClueBar(word);
        }
    }

    findWordAtPosition(row, col) {
        return this.crossword.words.find(word => {
            if (word.horizontal) {
                return word.row === row && col >= word.col && col < word.col + word.code.length;
            } else {
                return word.col === col && row >= word.row && row < word.row + word.code.length;
            }
        });
    }

    highlightWordCells(word) {
        for (let i = 0; i < word.code.length; i++) {
            const cellRow = word.horizontal ? word.row : word.row + i;
            const cellCol = word.horizontal ? word.col + i : word.col;
            const cell = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"]`);
            if (cell) {
                cell.classList.add('current-word');

                // Add position-specific classes for better visual feedback
                if (i === 0) {
                    cell.classList.add('word-start');
                }
                if (i === word.code.length - 1) {
                    cell.classList.add('word-end');
                }
            }
        }

        // Disable floating overlay to avoid zoom conflicts
    }

    showWordInfo(word) { /* overlay disabled */ }

    clearWordInfo() {
        const wordInfo = document.getElementById('word-info');
        if (wordInfo) {
            wordInfo.style.display = 'none';
        }
    }

    highlightClue(number, horizontal) {
        const clue = document.querySelector(`[data-number="${number}"][data-horizontal="${horizontal}"]`);
        if (clue) {
            clue.classList.add('active');
        }
    }

    highlightWordByNumber(number, horizontal) {
        const word = this.crossword.words.find(w => w.number === number && w.horizontal === horizontal);
        if (word) {
            this.highlightWordCells(word);
            this.currentWord = word;
            if (this.updateActiveClueBar) this.updateActiveClueBar(word);
        }
    }

    focusWordStart(word) {
        const cell = document.querySelector(`[data-row="${word.row}"][data-col="${word.col}"] input`);
        if (cell) {
            cell.focus();
        }
    }

    handleInput(event, row, col) {
        const input = event.target;
        const value = input.value.toUpperCase();

        // Store the answer
        const cellKey = `${row}-${col}`;
        this.userAnswers[cellKey] = value;
        this.currentCell = { row, col };

        // Move to next cell
        if (value && this.currentWord) {
            this.moveToNextCell(row, col);
        }

        this.updateStats();
        if (this.inlineValidationEnabled && this.currentWord && this.validateWordIfComplete) {
            this.validateWordIfComplete(this.currentWord);
        }
        if (this.saveToLocalStorage) this.saveToLocalStorage();
    }

    handleKeydown(event, row, col) {
        const input = event.target;

        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                if (this.inlineValidationEnabled && this.currentWord && this.validateWordIfComplete) {
                    this.validateWordIfComplete(this.currentWord, true);
                } else {
                    this.checkAnswers();
                }
                if (this.currentWord) {
                    const typed = this.getTypedCodeForWord(this.currentWord);
                if (typed && typed.length === this.currentWord.code.length && typed !== this.currentWord.code && this.codeToEntity && this.codeToEntity[typed]) {
                    const alt = this.codeToEntity[typed];
                    if (alt && alt.fullName) {
                        this.showMessage(`No, that's ${alt.fullName}.`, 'info');
                    }
                }
                }
                break;
            case 'Backspace':
                if (!input.value) {
                    this.moveToPreviousCell(row, col);
                }
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.moveToNextCell(row, col);
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.moveToPreviousCell(row, col);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.moveToNextCell(row, col, false);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.moveToPreviousCell(row, col, false);
                break;
            case 'Tab':
                event.preventDefault();
                if (this.focusAdjacentClue) this.focusAdjacentClue(!event.shiftKey);
                break;
            case ' ': // Spacebar
                event.preventDefault();
                if (this.toggleDirection) this.toggleDirection(row, col);
                break;
        }
    }

    moveToNextCell(row, col, useCurrentWord = true) {
        if (!this.currentWord && useCurrentWord) return;

        let nextRow, nextCol;

        if (useCurrentWord && this.currentWord.horizontal) {
            nextRow = row;
            nextCol = col + 1;
        } else if (useCurrentWord && !this.currentWord.horizontal) {
            nextRow = row + 1;
            nextCol = col;
        } else {
            // Find next cell in any direction
            nextRow = row;
            nextCol = col + 1;
        }

        const nextCell = document.querySelector(`[data-row="${nextRow}"][data-col="${nextCol}"] input`);
        if (nextCell) {
            nextCell.focus();
        }
    }

    moveToPreviousCell(row, col, useCurrentWord = true) {
        if (!this.currentWord && useCurrentWord) return;

        let prevRow, prevCol;

        if (useCurrentWord && this.currentWord.horizontal) {
            prevRow = row;
            prevCol = col - 1;
        } else if (useCurrentWord && !this.currentWord.horizontal) {
            prevRow = row - 1;
            prevCol = col;
        } else {
            // Find previous cell in any direction
            prevRow = row;
            prevCol = col - 1;
        }

        const prevCell = document.querySelector(`[data-row="${prevRow}"][data-col="${prevCol}"] input`);
        if (prevCell) {
            prevCell.focus();
        }
    }

    checkAnswers() {
        let correct = 0;
        let total = 0;
        let shownAlt = false;

        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('correct', 'incorrect');
        });

        this.crossword.words.forEach(word => {
            for (let i = 0; i < word.code.length; i++) {
                const cellRow = word.horizontal ? word.row : word.row + i;
                const cellCol = word.horizontal ? word.col + i : word.col;
                const cellKey = `${cellRow}-${cellCol}`;
                const userAnswer = this.userAnswers[cellKey] || '';
                const correctAnswer = word.code[i];

                const cell = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"]`);
                total++;

                if (userAnswer === correctAnswer) {
                    correct++;
                    if (cell) cell.classList.add('correct');
                } else if (userAnswer) {
                    if (cell) cell.classList.add('incorrect');
                }
            }

            // If fully filled but wrong, and matches another entity code, show message once
            if (!shownAlt) {
                const typed = this.getTypedCodeForWord(word);
                if (typed && typed.length === word.code.length && typed !== word.code && this.codeToEntity && this.codeToEntity[typed]) {
                    const alt = this.codeToEntity[typed];
                    if (alt && alt.fullName) {
                        this.showMessage(`No, that's ${alt.fullName}.`, 'info');
                        shownAlt = true;
                    }
                }
            }
        });

        this.showMessage(`${correct}/${total} correct answers!`, correct === total ? 'success' : 'info');
    }

    showSolution() {
        this.crossword.words.forEach(word => {
            for (let i = 0; i < word.code.length; i++) {
                const cellRow = word.horizontal ? word.row : word.row + i;
                const cellCol = word.horizontal ? word.col + i : word.col;
                const cellKey = `${cellRow}-${cellCol}`;
                const correctAnswer = word.code[i];

                this.userAnswers[cellKey] = correctAnswer;

                const input = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"] input`);
                if (input) {
                    input.value = correctAnswer;
                }
            }
        });

        this.updateStats();
        this.showMessage('Solution revealed!', 'info');
        if (this.saveToLocalStorage) this.saveToLocalStorage();
    }

    updateStats() {
        let correct = 0;
        let total = 0;
        let filled = 0;

        this.crossword.words.forEach(word => {
            for (let i = 0; i < word.code.length; i++) {
                const cellRow = word.horizontal ? word.row : word.row + i;
                const cellCol = word.horizontal ? word.col + i : word.col;
                const cellKey = `${cellRow}-${cellCol}`;
                const userAnswer = this.userAnswers[cellKey] || '';
                const correctAnswer = word.code[i];

                total++;
                if (userAnswer) filled++;
                if (userAnswer === correctAnswer) correct++;
            }
        });

        document.getElementById('correctCount').textContent = correct;
        document.getElementById('totalCount').textContent = total;
        document.getElementById('accuracy').textContent = total > 0 ? Math.round((correct / total) * 100) + '%' : '0%';
    }

    saveGame() {
        const gameData = {
            crossword: this.crossword,
            userAnswers: this.userAnswers,
            timestamp: new Date().toISOString()
        };

        const dataStr = JSON.stringify(gameData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `crossword-save-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();

        URL.revokeObjectURL(url);
        this.showMessage('Game saved!', 'success');
    }

    loadGame() {
        const fileInput = document.getElementById('fileInput');
        fileInput.click();

        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const gameData = JSON.parse(e.target.result);
                        this.crossword = gameData.crossword;
                        this.userAnswers = gameData.userAnswers || {};
                        this.renderCrossword();
                        this.updateStats();
                        this.showMessage('Game loaded!', 'success');
                    } catch (error) {
                        this.showMessage('Error loading game file', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
    }

    exportToPDF() {
        // Create a simplified view for printing
        const printWindow = window.open('', '_blank');
        const crosswordHTML = this.generatePrintHTML();

        printWindow.document.write(crosswordHTML);
        printWindow.document.close();
        printWindow.print();

        this.showMessage('Print dialog opened!', 'info');
    }

    generatePrintHTML() {
        const words = this.crossword.words;
        const across = words.filter(w => w.horizontal);
        const down = words.filter(w => !w.horizontal);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Entity Code Crossword</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .grid { display: grid; grid-template-columns: repeat(${this.gridSize}, 30px); gap: 1px; margin: 20px 0; }
                    .cell { width: 30px; height: 30px; border: 1px solid #333; position: relative; }
                    .cell.black { background: #333; }
                    .number { font-size: 10px; position: absolute; top: 2px; left: 2px; }
                    .clues { display: flex; gap: 40px; }
                    .clue-section h3 { margin-bottom: 10px; }
                    .clue { margin-bottom: 5px; }
                </style>
            </head>
            <body>
                <h1>Entity Code Crossword</h1>
                <div class="grid">${this.generateGridHTML()}</div>
                <div class="clues">
                    <div class="clue-section">
                        <h3>Across</h3>
                        ${across.map(w => `<div class="clue">${w.number}. ${w.description}</div>`).join('')}
                    </div>
                    <div class="clue-section">
                        <h3>Down</h3>
                        ${down.map(w => `<div class="clue">${w.number}. ${w.description}</div>`).join('')}
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    generateGridHTML() {
        let html = '';
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const isPartOfWord = this.isCellPartOfWord(row, col);
                const gridCell = this.crossword.grid[row][col];
                const cellClass = isPartOfWord ? 'cell' : 'cell black';
                const number = gridCell.number > 0 ? `<div class="number">${gridCell.number}</div>` : '';
                html += `<div class="${cellClass}">${number}</div>`;
            }
        }
        return html;
    }

    showLoading(show) {
        const loadingElement = document.getElementById('loadingMessage');
        const gridElement = document.getElementById('crosswordGrid');

        if (show) {
            loadingElement.style.display = 'block';
            gridElement.style.display = 'none';
        } else {
            loadingElement.style.display = 'none';
            gridElement.style.display = 'grid';
        }
    }

    showMessage(text, type = 'info') {
        // Remove existing messages
        document.querySelectorAll('.message').forEach(msg => msg.remove());

        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        if (type === 'error') {
            message.setAttribute('role', 'alert');
            message.setAttribute('aria-live', 'assertive');
        } else {
            message.setAttribute('role', 'status');
            message.setAttribute('aria-live', 'polite');
        }
        document.body.appendChild(message);

        // Show message
        setTimeout(() => message.classList.add('show'), 100);

        // Hide message after 3 seconds
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => message.remove(), 300);
        }, 3000);
    }

    setupEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => this.generateNewCrossword());
        document.getElementById('checkAnswersBtn').addEventListener('click', () => this.checkAnswers());
        document.getElementById('showSolutionBtn').addEventListener('click', () => this.showSolution());
        document.getElementById('saveGameBtn').addEventListener('click', () => this.saveGame());
        document.getElementById('loadGameBtn').addEventListener('click', () => this.loadGame());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToPDF());
        const inlineToggle = document.getElementById('inlineValidationToggle');
        if (inlineToggle) inlineToggle.addEventListener('change', (e) => { this.inlineValidationEnabled = e.target.checked; });
        // Zoom slider removed per request; default size set in CSS variable
        const gridSizeSelect = document.getElementById('gridSizeSelect');
        const wordCountSelect = document.getElementById('wordCountSelect');
        if (gridSizeSelect) gridSizeSelect.addEventListener('change', () => this.generateNewCrossword());
        if (wordCountSelect) wordCountSelect.addEventListener('change', () => this.generateNewCrossword());
        const clearWordBtn = document.getElementById('clearWordBtn');
        const revealLetterBtn = document.getElementById('revealLetterBtn');
        const revealWordBtn = document.getElementById('revealWordBtn');
        if (clearWordBtn) clearWordBtn.addEventListener('click', () => this.clearCurrentWord && this.clearCurrentWord());
        if (revealLetterBtn) revealLetterBtn.addEventListener('click', () => this.revealLetter && this.revealLetter());
        if (revealWordBtn) revealWordBtn.addEventListener('click', () => this.revealWord && this.revealWord());
        const shareLinkBtn = document.getElementById('shareLinkBtn');
        if (shareLinkBtn) shareLinkBtn.addEventListener('click', () => this.copyShareLink && this.copyShareLink());
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme && this.toggleTheme());
    }

    // Initialize controls from URL or defaults
    applyInitialControlsState() {
        const params = new URLSearchParams(window.location.search);
        const gridParam = parseInt(params.get('grid') || '', 10);
        const wordsParam = parseInt(params.get('words') || '', 10);
        const inlineParam = params.get('inline');

        const gridSizeSelect = document.getElementById('gridSizeSelect');
        const wordCountSelect = document.getElementById('wordCountSelect');
        const inlineToggle = document.getElementById('inlineValidationToggle');
        const zoomSlider = document.getElementById('zoomSlider');

        if (!isNaN(gridParam) && gridSizeSelect) {
            gridSizeSelect.value = String(gridParam);
            this.gridSize = gridParam;
        }
        if (!isNaN(wordsParam) && wordCountSelect) {
            wordCountSelect.value = String(wordsParam);
            this.maxWords = wordsParam;
        }
        if (inlineParam && inlineToggle) {
            const enable = inlineParam === '1' || inlineParam === 'true';
            inlineToggle.checked = enable;
            this.inlineValidationEnabled = enable;
        }
        document.documentElement.style.setProperty('--cell-size', '32px');
    }

    // Active clue bar update
    updateActiveClueBar(word) {
        const bar = document.getElementById('activeClueBar');
        if (!bar || !word) return;
        const directionText = word.horizontal ? 'Across' : 'Down';
        bar.innerHTML = `<span class="clue-number">${word.number}</span><span class="clue-direction">${directionText}</span><span class="clue-text">${word.description}</span><span class="clue-length">(${word.code.length})</span>`;
    }

    // Membership of a cell across/down
    getCellMembership(row, col) {
        const memberships = [];
        if (!this.crossword || !this.crossword.words) return memberships;
        const across = this.crossword.words.find(w => w.horizontal && w.row === row && col >= w.col && col < w.col + w.code.length);
        if (across) {
            memberships.push({ direction: 'Across', number: across.number, length: across.code.length, index: col - across.col, row: across.row, col: across.col });
        }
        const down = this.crossword.words.find(w => !w.horizontal && w.col === col && row >= w.row && row < w.row + w.code.length);
        if (down) {
            memberships.push({ direction: 'Down', number: down.number, length: down.code.length, index: row - down.row, row: down.row, col: down.col });
        }
        return memberships;
    }

    // Toggle direction at current cell
    toggleDirection(row, col) {
        if (row == null || col == null) {
            row = this.currentCell.row;
            col = this.currentCell.col;
        }
        if (row == null || col == null) return;
        const options = this.getCellMembership(row, col);
        if (!options.length) return;
        if (!this.currentWord) {
            const initial = options.find(o => o.direction === 'Across') || options[0];
            this.highlightWordByNumber(initial.number, initial.direction === 'Across');
            this.focusWordStart(this.currentWord);
            return;
        }
        const other = options.find(o => (this.currentWord.horizontal ? o.direction === 'Down' : o.direction === 'Across'));
        if (other) {
            this.highlightWordByNumber(other.number, other.direction === 'Across');
            // Focus same index position within new word
            const newRow = other.direction === 'Across' ? other.row : other.row + other.index;
            const newCol = other.direction === 'Across' ? other.col + other.index : other.col;
            const input = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"] input`);
            if (input) input.focus();
        }
    }

    // Inline validation when a word is complete
    validateWordIfComplete(word, force = false) {
        let filled = 0;
        for (let i = 0; i < word.code.length; i++) {
            const cellRow = word.horizontal ? word.row : word.row + i;
            const cellCol = word.horizontal ? word.col + i : word.col;
            const key = `${cellRow}-${cellCol}`;
            if ((this.userAnswers[key] || '').length === 1) filled++;
        }
        if (!force && filled !== word.code.length) return;
        // Clear marks
        for (let i = 0; i < word.code.length; i++) {
            const cellRow = word.horizontal ? word.row : word.row + i;
            const cellCol = word.horizontal ? word.col + i : word.col;
            const cell = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"]`);
            if (cell) cell.classList.remove('correct', 'incorrect');
        }
        // Apply marks
        for (let i = 0; i < word.code.length; i++) {
            const cellRow = word.horizontal ? word.row : word.row + i;
            const cellCol = word.horizontal ? word.col + i : word.col;
            const key = `${cellRow}-${cellCol}`;
            const userAnswer = this.userAnswers[key] || '';
            const correctAnswer = word.code[i];
            const cell = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"]`);
            if (userAnswer === correctAnswer) {
                if (cell) cell.classList.add('correct');
            } else if (userAnswer) {
                if (cell) cell.classList.add('incorrect');
            }
        }
    }

    // Tab navigation between clues
    focusAdjacentClue(forward = true) {
        if (!this.crossword || !this.crossword.words.length) return;
        const ordered = [...this.crossword.words].sort((a, b) => a.number - b.number || (a.horizontal === b.horizontal ? 0 : a.horizontal ? -1 : 1));
        let idx = 0;
        if (this.currentWord) {
            const curIdx = ordered.findIndex(w => w.number === this.currentWord.number && w.horizontal === this.currentWord.horizontal);
            idx = curIdx === -1 ? 0 : curIdx;
        }
        const nextIdx = (idx + (forward ? 1 : -1) + ordered.length) % ordered.length;
        const nextWord = ordered[nextIdx];
        this.highlightWordByNumber(nextWord.number, nextWord.horizontal);
        this.focusWordStart(nextWord);
        this.updateActiveClueBar(nextWord);
    }

    // Editing helpers
    clearCurrentWord() {
        if (!this.currentWord) return;
        for (let i = 0; i < this.currentWord.code.length; i++) {
            const cellRow = this.currentWord.horizontal ? this.currentWord.row : this.currentWord.row + i;
            const cellCol = this.currentWord.horizontal ? this.currentWord.col + i : this.currentWord.col;
            const key = `${cellRow}-${cellCol}`;
            this.userAnswers[key] = '';
            const input = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"] input`);
            const cell = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"]`);
            if (input) input.value = '';
            if (cell) cell.classList.remove('correct', 'incorrect');
        }
        this.updateStats();
        this.saveToLocalStorage();
    }

    revealLetter() {
        if (!this.currentWord) return;
        for (let i = 0; i < this.currentWord.code.length; i++) {
            const cellRow = this.currentWord.horizontal ? this.currentWord.row : this.currentWord.row + i;
            const cellCol = this.currentWord.horizontal ? this.currentWord.col + i : this.currentWord.col;
            const key = `${cellRow}-${cellCol}`;
            const correctAnswer = this.currentWord.code[i];
            if (!(this.userAnswers[key] || '')) {
                this.userAnswers[key] = correctAnswer;
                const input = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"] input`);
                if (input) input.value = correctAnswer;
                break;
            }
        }
        this.updateStats();
        if (this.inlineValidationEnabled) this.validateWordIfComplete(this.currentWord);
        this.saveToLocalStorage();
    }

    revealWord() {
        if (!this.currentWord) return;
        for (let i = 0; i < this.currentWord.code.length; i++) {
            const cellRow = this.currentWord.horizontal ? this.currentWord.row : this.currentWord.row + i;
            const cellCol = this.currentWord.horizontal ? this.currentWord.col + i : this.currentWord.col;
            const key = `${cellRow}-${cellCol}`;
            const correctAnswer = this.currentWord.code[i];
            this.userAnswers[key] = correctAnswer;
            const input = document.querySelector(`[data-row="${cellRow}"][data-col="${cellCol}"] input`);
            if (input) input.value = correctAnswer;
        }
        this.updateStats();
        if (this.inlineValidationEnabled) this.validateWordIfComplete(this.currentWord, true);
        this.saveToLocalStorage();
    }

    // Build typed code for a word
    getTypedCodeForWord(word) {
        let s = '';
        for (let i = 0; i < word.code.length; i++) {
            const cellRow = word.horizontal ? word.row : word.row + i;
            const cellCol = word.horizontal ? word.col + i : word.col;
            const key = `${cellRow}-${cellCol}`;
            s += (this.userAnswers[key] || '');
        }
        return s;
    }

    // On-screen keyboard
    buildOnScreenKeyboard() {
        const osk = document.getElementById('onScreenKeyboard');
        if (!osk) return;
        osk.innerHTML = '';
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (!isTouch) {
            osk.classList.remove('active');
            return;
        }
        osk.classList.add('active');
        const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        keys.forEach(k => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = k;
            btn.addEventListener('click', () => {
                const active = document.querySelector('.cell-input:focus');
                if (active) {
                    active.value = k;
                    const row = parseInt(active.parentElement.getAttribute('data-row'), 10);
                    const col = parseInt(active.parentElement.getAttribute('data-col'), 10);
                    this.userAnswers[`${row}-${col}`] = k;
                    this.moveToNextCell(row, col);
                    this.updateStats();
                    if (this.inlineValidationEnabled && this.currentWord) this.validateWordIfComplete(this.currentWord);
                    this.saveToLocalStorage();
                }
            });
            osk.appendChild(btn);
        });
        const back = document.createElement('button');
        back.type = 'button';
        back.textContent = '⌫';
        back.title = 'Backspace';
        back.addEventListener('click', () => {
            const active = document.querySelector('.cell-input:focus');
            if (active) {
                const row = parseInt(active.parentElement.getAttribute('data-row'), 10);
                const col = parseInt(active.parentElement.getAttribute('data-col'), 10);
                if (active.value) {
                    active.value = '';
                    this.userAnswers[`${row}-${col}`] = '';
                } else {
                    this.moveToPreviousCell(row, col);
                }
                this.updateStats();
                this.saveToLocalStorage();
            }
        });
        osk.appendChild(back);
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.textContent = '⇄';
        toggle.title = 'Toggle Across/Down';
        toggle.addEventListener('click', () => this.toggleDirection());
        osk.appendChild(toggle);
    }

    // Shareable link
    copyShareLink() {
        const params = new URLSearchParams(window.location.search);
        params.set('seed', String(this.seed));
        params.set('grid', String(this.gridSize));
        params.set('words', String(this.maxWords));
        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        navigator.clipboard.writeText(url).then(() => this.showMessage('Share link copied!', 'success'));
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CrosswordGame();
});
