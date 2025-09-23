// Entity Code Crossword Game (Static, deterministic, no generic fallback clues)
class CrosswordGame {
    constructor () {
        // Core state
        this.data = [];
        this.codeToEntity = {};
        this.crossword = null;
        this.currentWord = null;
        this.currentCell = { row: null, col: null };
        this.userAnswers = {};

        // Fixed layout
        this.gridSize = 12;
        this.maxWords = 6;

        // UX
        this.inlineValidationEnabled = false;
        this.theme = this.getInitialTheme();

        // Deterministic seed
        this.seed = this.getStableSeed();
        this.randomGenerator = this.createRNG(this.seed);

        // Init
        this.init();
    }

    /* -------------------- Seed / RNG -------------------- */

    getStableSeed() {
        const params = new URLSearchParams(window.location.search);
        const s = params.get('seed');
        const fromUrl = s ? Number(s) : NaN;
        if (!isNaN(fromUrl)) return fromUrl;

        const stored = localStorage.getItem('sits_static_seed');
        if (stored && !isNaN(Number(stored))) return Number(stored);

        const fallback = Math.floor(Date.now() % 2147483647);
        localStorage.setItem('sits_static_seed', String(fallback));
        return fallback;
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

    /* -------------------- Theme -------------------- */

    getInitialTheme() {
        const stored = localStorage.getItem('sits_theme');
        if (stored === 'dark' || stored === 'light') return stored;
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }

    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('sits_theme', theme);
        const grid = document.getElementById('crosswordGrid');
        if (grid) {
            grid.style.transformOrigin = 'top left';
            grid.style.transform = 'none';
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.theme);
    }

    /* -------------------- Init -------------------- */

    async init() {
        this.applyFixedControls();
        await this.loadData();

        const restored = this.restoreFromLocalStorage();
        if (!restored) {
            this.crossword = this.createCrossword();
            this.renderCrossword();
            this.updateStats();
            this.saveToLocalStorage();
        }

        this.setupEventListeners();
        this.applyTheme(this.theme);
        this.buildOnScreenKeyboard();
    }

    applyFixedControls() {
        this.gridSize = 12;
        this.maxWords = 6;
        this.inlineValidationEnabled = false;
        document.documentElement.style.setProperty('--cell-size', '32px');
    }

    /* -------------------- Persistence -------------------- */

    restoreFromLocalStorage() {
        try {
            const raw = localStorage.getItem('sits_crossword_autosave');
            if (!raw) return false;
            const saved = JSON.parse(raw);
            if (!saved.crossword || !saved.userAnswers) return false;

            this.crossword = saved.crossword;
            this.userAnswers = saved.userAnswers || {};

            if (saved.seed && !isNaN(Number(saved.seed))) {
                this.seed = Number(saved.seed);
                this.randomGenerator = this.createRNG(this.seed);
            }

            this.renderCrossword();
            this.updateStats();
            return true;
        } catch {
            return false;
        }
    }

    saveToLocalStorage() {
        try {
            const payload = {
                seed: this.seed,
                gridSize: this.gridSize,
                maxWords: this.maxWords,
                crossword: this.crossword,
                userAnswers: this.userAnswers
            };
            localStorage.setItem('sits_crossword_autosave', JSON.stringify(payload));
        } catch { /* ignore */ }
    }

    /* -------------------- Data loading -------------------- */

    async loadData() {
        try {
            const response = await fetch('./men_ent_cleaned.csv');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();
            this.parseCSV(csvText);
        } catch (error) {
            console.warn('Falling back to sample data:', error);
            this.loadSampleData();
        }
    }

    loadSampleData() {
        this.data = [
            { code: 'AAC', description: 'Constrains how activities are arranged within schedules…', fullName: 'AAM Arrangement Constraint' },
            { code: 'ABT', description: 'Groups assessments into batches for processing…', fullName: 'Assessment Batch' },
            { code: 'ACB', description: 'Component elements that form confirmation rules…', fullName: 'Award Confirmation Rule Body' },
            { code: 'ACE', description: 'Parameters for credit minima, maxima and levels…', fullName: 'Award Calculation Element' },
            { code: 'ACM', description: 'Method used to calculate final awards…', fullName: 'Award Calculation Method' },
            { code: 'ACT', description: 'Defines activity types used by topics and rooms…', fullName: 'Activity' },
            { code: 'ACP', description: 'Reusable patterns for structuring activities…', fullName: 'Activity Pattern' },
            { code: 'ACR', description: 'Additional conditions to confirm classifications…', fullName: 'Award Confirmation Rule' },
            { code: 'ADE', description: 'Defines the calculation for academic standing…', fullName: 'Academic Standing Profile Element' },
            { code: 'ADP', description: 'Associates standing rules to students/programmes…', fullName: 'Academic Standing Profile' },
            { code: 'ADR', description: 'Lists materials and equipment for assessment divisions…', fullName: 'Assessment Division Requirements' }
        ];
        this.codeToEntity = {};
        this.data.forEach(item => { this.codeToEntity[item.code] = item; });
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        // Indices: B = code(1), D = full name(3), AC = description(28)
        const entityCodeIndex = 1;
        const fullNameIndex = 3;
        const descriptionIndex = 28;

        for (let i = 1; i < lines.length; i++) {
            const columns = this.parseCSVLine(lines[i]);
            if (columns.length > descriptionIndex) {
                const entityCode = columns[entityCodeIndex]?.trim();
                const fullName = columns[fullNameIndex]?.trim();
                const rawDesc = columns[descriptionIndex]?.trim();

                if (entityCode && entityCode.length >= 3 && entityCode.length <= 4 && /^[A-Z]+$/.test(entityCode)) {
                    const clue = this.createClue(entityCode, fullName, rawDesc);
                    if (clue) {
                        this.data.push({
                            code: entityCode.toUpperCase(),
                            description: clue,
                            fullName: fullName || ''
                        });
                    }
                }
            }
        }

        // unique codes, prefer longer first (for intersections)
        this.data = this.data
            .filter((item, idx, arr) => idx === arr.findIndex(t => t.code === item.code))
            .sort((a, b) => b.code.length - a.code.length);

        this.codeToEntity = {};
        this.data.forEach(item => { this.codeToEntity[item.code] = item; });
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            const next = line[i + 1];
            if (ch === '"') {
                if (inQuotes && next === '"') { current += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (ch === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current);
        return result;
    }

    /* -------------------- Clue building (no generic fallback) -------------------- */

    createClue(code, fullName, description) {
        const clue = this.buildClueFromRaw(code, fullName, description);
        if (!clue) return null;
        if (new RegExp(`\\b${code}\\b`, 'i').test(clue)) return null;
        return clue.length > 10 ? clue : null;
    }

    cleanDescription(description) {
        return (description || '')
            .replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"')
            .replace(/\s+/g, ' ').trim();
    }

    removeCodeReferences(text, code) {
        const patterns = [
            new RegExp(`\\b${code}\\b`, 'gi'),
            new RegExp(`\\(${code}\\)`, 'gi'),
            new RegExp(`${code}_\\w+`, 'gi'),
            new RegExp(`CAM_${code}`, 'gi')
        ];
        let cleaned = text || '';
        patterns.forEach(p => cleaned = cleaned.replace(p, '…'));
        return cleaned.replace(/…{2,}/g, '…').replace(/\s{2,}/g, ' ').trim();
    }

    sanitizeClueText(text, code, fullName) {
        let t = (text || '').replace(/\((?:[^)(]+|\([^)(]*\))*\)/g, ' ');
        t = t.replace(/\b[A-Z]{2,}\b/g, '…');
        t = t.replace(/(?:\b[A-Z][a-z]+\b(?:\s+|$)){2,}/g, '… ');
        if (fullName) {
            const words = fullName.split(/\s+/).filter(w => /[A-Za-z]/.test(w) && w.length > 2);
            for (const w of words) {
                const re = new RegExp(`\\b${this.escapeRegExp(w)}\\b`, 'gi');
                t = t.replace(re, '…');
            }
        }
        t = this.removeCodeReferences(t, code);
        return t.replace(/…{2,}/g, '…').replace(/\s*…\s*/g, ' … ').replace(/\s{2,}/g, ' ').trim();
    }

    pickClueSnippet(text) {
        if (!text) return '';
        const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(Boolean);
        let s = sentences[0] || text;
        const words = s.split(/\s+/);
        if (words.length > 18) s = words.slice(0, 18).join(' ') + '…';
        return s;
    }

    buildClueFromRaw(code, fullName, description) {
        let base = this.cleanDescription(description || '');
        base = this.removeCodeReferences(base, code);
        base = this.sanitizeClueText(base, code, fullName);
        const snippet = this.pickClueSnippet(base);

        // Important: no generic fallback. If unusable, skip.
        if (!snippet || snippet.length < 20) return null;

        return snippet.replace(/\s+/g, ' ').trim();
    }

    escapeRegExp(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /* -------------------- Crossword generation -------------------- */

    createCrossword() {
        const selectedWords = this.selectWords(this.maxWords);
        const grid = this.initializeGrid();
        const placedWords = [];

        if (selectedWords.length > 0) {
            const firstWord = selectedWords[0];
            const startRow = Math.floor(this.gridSize / 2);
            const startCol = Math.floor((this.gridSize - firstWord.code.length) / 2);
            this.placeWord(grid, firstWord, startRow, startCol, true, 1);
            placedWords.push({ ...firstWord, row: startRow, col: startCol, horizontal: true, number: 1 });
        }

        let wordNumber = 2;
        for (let i = 1; i < selectedWords.length; i++) {
            const word = selectedWords[i];
            const placement = this.findWordPlacement(grid, word, placedWords);
            if (placement) {
                const existing = grid[placement.row][placement.col].number;
                const n = existing > 0 ? existing : wordNumber;
                this.placeWord(grid, word, placement.row, placement.col, placement.horizontal, n);
                placedWords.push({ ...word, row: placement.row, col: placement.col, horizontal: placement.horizontal, number: n });
                if (existing === 0) wordNumber++;
            }
        }

        return { grid, words: placedWords, size: this.gridSize };
    }

    selectWords(maxWords) {
        const valid = this.data.filter(w => w.code.length >= 3 && w.code.length <= 4 && /^[A-Z]+$/.test(w.code));
        const words = [...valid];
        for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }
        return words.slice(0, maxWords);
    }

    initializeGrid() {
        return Array.from({ length: this.gridSize }, () =>
            Array.from({ length: this.gridSize }, () => ({ letter: '', number: 0, isBlack: false }))
        );
    }

    placeWord(grid, word, row, col, horizontal, number) {
        const letters = word.code.split('');
        grid[row][col].number = number;
        for (let i = 0; i < letters.length; i++) {
            const r = horizontal ? row : row + i;
            const c = horizontal ? col + i : col;
            if (r < this.gridSize && c < this.gridSize) grid[r][c].letter = letters[i];
        }
    }

    findWordPlacement(grid, word, placedWords) {
        for (const placed of placedWords) {
            const inter = this.findIntersection(word.code, placed.code);
            if (inter) {
                const placement = this.calculatePlacement(placed, inter, word.code.length);
                if (placement && this.canPlaceWord(grid, word.code, placement)) return placement;
            }
        }
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const horiz = { row: r, col: c, horizontal: true };
                const vert  = { row: r, col: c, horizontal: false };
                if (this.canPlaceWord(grid, word.code, horiz)) return horiz;
                if (this.canPlaceWord(grid, word.code, vert)) return vert;
            }
        }
        return null;
    }

    findIntersection(a, b) {
        for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < b.length; j++) {
                if (a[i] === b[j]) return { pos1: i, pos2: j, letter: a[i] };
            }
        }
        return null;
    }

    calculatePlacement(placedWord, intersection) {
        const { pos1, pos2 } = intersection;
        if (placedWord.horizontal) {
            const col = placedWord.col + pos2;
            const row = placedWord.row - pos1;
            return { row, col, horizontal: false };
        } else {
            const row = placedWord.row + pos2;
            const col = placedWord.col - pos1;
            return { row, col, horizontal: true };
        }
    }

    canPlaceWord(grid, word, placement) {
        const { row, col, horizontal } = placement;
        const endRow = horizontal ? row : row + word.length - 1;
        const endCol = horizontal ? col + word.length - 1 : col;
        if (endRow >= this.gridSize || endCol >= this.gridSize || row < 0 || col < 0) return false;

        for (let i = 0; i < word.length; i++) {
            const r = horizontal ? row : row + i;
            const c = horizontal ? col + i : col;
            const existing = grid[r][c].letter;
            if (existing && existing !== word[i]) return false;
        }
        return true;
    }

    /* -------------------- Rendering -------------------- */

    renderCrossword() {
        if (!this.crossword) return;

        const gridElement = document.getElementById('crosswordGrid');
        const acrossClues = document.getElementById('acrossClues');
        const downClues = document.getElementById('downClues');

        gridElement.style.gridTemplateColumns = `repeat(${this.gridSize}, var(--cell-size))`;
        gridElement.setAttribute('role', 'grid');
        gridElement.setAttribute('aria-rowcount', String(this.gridSize));
        gridElement.setAttribute('aria-colcount', String(this.gridSize));
        gridElement.style.transformOrigin = 'top left';
        gridElement.style.transform = 'none';
        gridElement.innerHTML = '';

        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const cell = this.createCell(row, col);
                gridElement.appendChild(cell);
            }
        }

        this.renderClues(acrossClues, downClues);
        this.updateActiveClueBar(null);
    }

    isCellPartOfWord(row, col) {
        return this.crossword.words.some(w => {
            if (w.horizontal) return w.row === row && col >= w.col && col < w.col + w.code.length;
            return w.col === col && row >= w.row && row < w.row + w.code.length;
        });
    }

    createCell(row, col) {
        const cell = document.createElement('div');
        const g = this.crossword.grid[row][col];
        const isPart = this.isCellPartOfWord(row, col);

        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (!isPart) {
            cell.classList.add('black');
            return cell;
        }

        if (g.number > 0) {
            const number = document.createElement('div');
            number.className = 'cell-number';
            number.textContent = g.number;
            cell.appendChild(number);
        }

        const input = document.createElement('input');
        input.className = 'cell-input';
        input.type = 'text';
        input.maxLength = 1;
        input.setAttribute('inputmode', 'latin');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'characters');
        input.setAttribute('spellcheck', 'false');
        input.addEventListener('input', (e) => this.handleInput(e, row, col));
        input.addEventListener('focus', () => this.highlightWord(row, col));
        input.addEventListener('keydown', (e) => this.handleKeydown(e, row, col));

        const membership = this.getCellMembership(row, col);
        const labelParts = [`Row ${row + 1}`, `Column ${col + 1}`];
        if (membership.length) {
            const info = membership.map(m => `${m.direction} ${m.number}, letter ${m.index + 1} of ${m.length}`).join(' | ');
            labelParts.push(info);
        }
        input.setAttribute('aria-label', labelParts.join(', '));

        const key = `${row}-${col}`;
        if (this.userAnswers[key]) input.value = this.userAnswers[key];

        cell.appendChild(input);
        return cell;
    }

    renderClues(acrossElement, downElement) {
        const across = this.crossword.words.filter(w => w.horizontal);
        const down = this.crossword.words.filter(w => !w.horizontal);
        acrossElement.innerHTML = '';
        downElement.innerHTML = '';

        across.forEach(w => acrossElement.appendChild(this.createClueElement(w)));
        down.forEach(w => downElement.appendChild(this.createClueElement(w)));
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
            this.updateActiveClueBar(word);
        });

        return clue;
    }

    updateActiveClueBar(word) {
        const bar = document.getElementById('activeClueBar');
        if (!bar) return;
        if (!word) { bar.textContent = ''; return; }
        const directionText = word.horizontal ? 'Across' : 'Down';
        bar.innerHTML = `<span class="clue-number">${word.number}</span><span class="clue-direction">${directionText}</span><span class="clue-text">${word.description}</span><span class="clue-length">(${word.code.length})</span>`;
    }

    /* -------------------- Cell/Word helpers -------------------- */

    getCellMembership(row, col) {
        const memberships = [];
        if (!this.crossword || !this.crossword.words) return memberships;
        const across = this.crossword.words.find(w => w.horizontal && w.row === row && col >= w.col && col < w.col + w.code.length);
        if (across) memberships.push({ direction: 'Across', number: across.number, length: across.code.length, index: col - across.col, row: across.row, col: across.col });
        const down = this.crossword.words.find(w => !w.horizontal && w.col === col && row >= w.row && row < w.row + w.code.length);
        if (down) memberships.push({ direction: 'Down', number: down.number, length: down.code.length, index: row - down.row, row: down.row, col: down.col });
        return memberships;
    }

    highlightWord(row, col) {
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('highlighted', 'current-word', 'word-start', 'word-end'));
        document.querySelectorAll('.clue-item').forEach(c => c.classList.remove('active'));

        const word = this.findWordAtPosition(row, col);
        if (word) {
            this.currentWord = word;
            this.currentCell = { row, col };
            this.highlightWordCells(word);
            this.highlightClue(word.number, word.horizontal);
            this.updateActiveClueBar(word);
        }
    }

    findWordAtPosition(row, col) {
        return this.crossword.words.find(w => {
            if (w.horizontal) return w.row === row && col >= w.col && col < w.col + w.code.length;
            return w.col === col && row >= w.row && row < w.row + w.code.length;
        });
    }

    highlightWordCells(word) {
        for (let i = 0; i < word.code.length; i++) {
            const r = word.horizontal ? word.row : word.row + i;
            const c = word.horizontal ? word.col + i : word.col;
            const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add('current-word');
                if (i === 0) cell.classList.add('word-start');
                if (i === word.code.length - 1) cell.classList.add('word-end');
            }
        }
    }

    highlightClue(number, horizontal) {
        const clue = document.querySelector(`[data-number="${number}"][data-horizontal="${horizontal}"]`);
        if (clue) clue.classList.add('active');
    }

    highlightWordByNumber(number, horizontal) {
        const word = this.crossword.words.find(w => w.number === number && w.horizontal === horizontal);
        if (word) {
            document.querySelectorAll('.cell').forEach(c => c.classList.remove('highlighted', 'current-word', 'word-start', 'word-end'));
            document.querySelectorAll('.clue-item').forEach(c => c.classList.remove('active'));
            this.highlightWordCells(word);
            this.currentWord = word;
            this.updateActiveClueBar(word);
        }
    }

    focusWordStart(word) {
        const cell = document.querySelector(`[data-row="${word.row}"][data-col="${word.col}"] input`);
        if (cell) cell.focus();
    }

    /* -------------------- Input / Navigation -------------------- */

    handleInput(event, row, col) {
        const input = event.target;
        const value = (input.value || '').toUpperCase().slice(0, 1);
        input.value = value;

        const key = `${row}-${col}`;
        this.userAnswers[key] = value;
        this.currentCell = { row, col };

        if (value && this.currentWord) this.moveToNextCell(row, col);

        this.updateStats();
        this.saveToLocalStorage();
    }

    handleKeydown(event, row, col) {
        const input = event.target;
        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                break;
            case 'Backspace':
                if (!input.value) this.moveToPreviousCell(row, col);
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
                this.focusAdjacentClue(!event.shiftKey);
                break;
            case ' ':
                event.preventDefault();
                this.toggleDirection(row, col);
                break;
        }
    }

    moveToNextCell(row, col, useCurrentWord = true) {
        if (!this.currentWord && useCurrentWord) return;
        let r, c;
        if (useCurrentWord && this.currentWord.horizontal) { r = row; c = col + 1; }
        else if (useCurrentWord && !this.currentWord.horizontal) { r = row + 1; c = col; }
        else { r = row; c = col + 1; }
        const el = document.querySelector(`[data-row="${r}"][data-col="${c}"] input`);
        if (el) el.focus();
    }

    moveToPreviousCell(row, col, useCurrentWord = true) {
        if (!this.currentWord && useCurrentWord) return;
        let r, c;
        if (useCurrentWord && this.currentWord.horizontal) { r = row; c = col - 1; }
        else if (useCurrentWord && !this.currentWord.horizontal) { r = row - 1; c = col; }
        else { r = row; c = col - 1; }
        const el = document.querySelector(`[data-row="${r}"][data-col="${c}"] input`);
        if (el) el.focus();
    }

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
            const newRow = other.direction === 'Across' ? other.row : other.row + other.index;
            const newCol = other.direction === 'Across' ? other.col + other.index : other.col;
            const input = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"] input`);
            if (input) input.focus();
        }
    }

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

    /* -------------------- Checking / Stats -------------------- */

    checkAnswers() {
        let shownAlt = false;

        document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('correct', 'incorrect'));

        this.crossword.words.forEach(word => {
            for (let i = 0; i < word.code.length; i++) {
                const r = word.horizontal ? word.row : word.row + i;
                const c = word.horizontal ? word.col + i : word.col;
                const key = `${r}-${c}`;
                const userAnswer = this.userAnswers[key] || '';
                const correctAnswer = word.code[i];
                const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (userAnswer === correctAnswer) {
                    if (cell) cell.classList.add('correct');
                } else if (userAnswer) {
                    if (cell) cell.classList.add('incorrect');
                }
            }

            if (!shownAlt) {
                const typed = this.getTypedCodeForWord(word);
                if (typed && typed.length === word.code.length && typed !== word.code && this.codeToEntity[typed]) {
                    const alt = this.codeToEntity[typed];
                    if (alt && alt.fullName) shownAlt = true; // silent; no toast to avoid layout shifts
                }
            }
        });

        this.updateStats();
        this.saveToLocalStorage();
    }

    showSolution() {
        this.crossword.words.forEach(word => {
            for (let i = 0; i < word.code.length; i++) {
                const r = word.horizontal ? word.row : word.row + i;
                const c = word.horizontal ? word.col + i : word.col;
                const key = `${r}-${c}`;
                const ch = word.code[i];
                this.userAnswers[key] = ch;
                const input = document.querySelector(`[data-row="${r}"][data-col="${c}"] input`);
                if (input) input.value = ch;
            }
        });
        this.updateStats();
        this.saveToLocalStorage();
    }

    updateStats() {
        let correct = 0;
        let total = 0;

        this.crossword.words.forEach(word => {
            for (let i = 0; i < word.code.length; i++) {
                const r = word.horizontal ? word.row : word.row + i;
                const c = word.horizontal ? word.col + i : word.col;
                const key = `${r}-${c}`;
                const userAnswer = this.userAnswers[key] || '';
                const correctAnswer = word.code[i];
                total++;
                if (userAnswer === correctAnswer) correct++;
            }
        });

        const correctEl = document.getElementById('correctCount');
        const totalEl = document.getElementById('totalCount');
        const accEl = document.getElementById('accuracy');
        if (correctEl) correctEl.textContent = correct;
        if (totalEl) totalEl.textContent = total;
        if (accEl) accEl.textContent = total > 0 ? Math.round((correct / total) * 100) + '%' : '0%';
    }

    getTypedCodeForWord(word) {
        let s = '';
        for (let i = 0; i < word.code.length; i++) {
            const r = word.horizontal ? word.row : word.row + i;
            const c = word.horizontal ? word.col + i : word.col;
            const key = `${r}-${c}`;
            s += (this.userAnswers[key] || '');
        }
        return s;
    }

    /* -------------------- File ops -------------------- */

    saveGame() {
        const gameData = {
            crossword: this.crossword,
            userAnswers: this.userAnswers,
            seed: this.seed,
            timestamp: new Date().toISOString()
        };
        const dataStr = JSON.stringify(gameData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `crossword-save-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    loadGame() {
        const fileInput = document.getElementById('fileInput');
        fileInput.click();
        fileInput.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const gameData = JSON.parse(e.target.result);
                    this.crossword = gameData.crossword;
                    this.userAnswers = gameData.userAnswers || {};
                    if (gameData.seed && !isNaN(Number(gameData.seed))) {
                        this.seed = Number(gameData.seed);
                        this.randomGenerator = this.createRNG(this.seed);
                    }
                    this.renderCrossword();
                    this.updateStats();
                } catch {
                    // ignore
                }
            };
            reader.readAsText(file);
        };
    }

    exportToPDF() {
        const win = window.open('', '_blank');
        const html = this.generatePrintHTML();
        win.document.write(html);
        win.document.close();
        win.print();
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
</html>`;
    }

    generateGridHTML() {
        let html = '';
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const isPart = this.isCellPartOfWord(row, col);
                const g = this.crossword.grid[row][col];
                const cls = isPart ? 'cell' : 'cell black';
                const number = g.number > 0 ? `<div class="number">${g.number}</div>` : '';
                html += `<div class="${cls}">${number}</div>`;
            }
        }
        return html;
    }

    /* -------------------- Misc UI -------------------- */

    showLoading(show) {
        const loading = document.getElementById('loadingMessage');
        const grid = document.getElementById('crosswordGrid');
        if (!loading || !grid) return;
        if (show) { loading.style.display = 'block'; grid.style.display = 'none'; }
        else { loading.style.display = 'none'; grid.style.display = 'grid'; }
    }

    setupEventListeners() {
        const btnNew = document.getElementById('newGameBtn');
        if (btnNew) btnNew.addEventListener('click', () => {
            const params = new URLSearchParams(window.location.search);
            const s = params.get('seed');
            if (s && !isNaN(Number(s))) {
                this.seed = Number(s);
                localStorage.setItem('sits_static_seed', String(this.seed));
            }
            this.randomGenerator = this.createRNG(this.seed);
            this.userAnswers = {};
            this.currentWord = null;
            this.currentCell = { row: null, col: null };
            this.crossword = this.createCrossword();
            this.renderCrossword();
            this.updateStats();
            this.saveToLocalStorage();
        });

        const btnCheck = document.getElementById('checkAnswersBtn');
        if (btnCheck) btnCheck.addEventListener('click', () => this.checkAnswers());

        const btnSolve = document.getElementById('showSolutionBtn');
        if (btnSolve) btnSolve.addEventListener('click', () => this.showSolution());

        const btnSave = document.getElementById('saveGameBtn');
        if (btnSave) btnSave.addEventListener('click', () => this.saveGame());

        const btnLoad = document.getElementById('loadGameBtn');
        if (btnLoad) btnLoad.addEventListener('click', () => this.loadGame());

        const btnExport = document.getElementById('exportBtn');
        if (btnExport) btnExport.addEventListener('click', () => this.exportToPDF());

        const inlineToggle = document.getElementById('inlineValidationToggle');
        if (inlineToggle) inlineToggle.addEventListener('change', (e) => { this.inlineValidationEnabled = e.target.checked; });

        const clearWordBtn = document.getElementById('clearWordBtn');
        const revealLetterBtn = document.getElementById('revealLetterBtn');
        const revealWordBtn = document.getElementById('revealWordBtn');
        if (clearWordBtn) clearWordBtn.addEventListener('click', () => this.clearCurrentWord());
        if (revealLetterBtn) revealLetterBtn.addEventListener('click', () => this.revealLetter());
        if (revealWordBtn) revealWordBtn.addEventListener('click', () => this.revealWord());

        const shareLinkBtn = document.getElementById('shareLinkBtn');
        if (shareLinkBtn) shareLinkBtn.addEventListener('click', () => this.copyShareLink());

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    clearCurrentWord() {
        if (!this.currentWord) return;
        for (let i = 0; i < this.currentWord.code.length; i++) {
            const r = this.currentWord.horizontal ? this.currentWord.row : this.currentWord.row + i;
            const c = this.currentWord.horizontal ? this.currentWord.col + i : this.currentWord.col;
            const key = `${r}-${c}`;
            this.userAnswers[key] = '';
            const input = document.querySelector(`[data-row="${r}"][data-col="${c}"] input`);
            const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (input) input.value = '';
            if (cell) cell.classList.remove('correct', 'incorrect');
        }
        this.updateStats();
        this.saveToLocalStorage();
    }

    revealLetter() {
        if (!this.currentWord) return;
        for (let i = 0; i < this.currentWord.code.length; i++) {
            const r = this.currentWord.horizontal ? this.currentWord.row : this.currentWord.row + i;
            const c = this.currentWord.horizontal ? this.currentWord.col + i : this.currentWord.col;
            const key = `${r}-${c}`;
            const ans = this.currentWord.code[i];
            if (!(this.userAnswers[key] || '')) {
                this.userAnswers[key] = ans;
                const input = document.querySelector(`[data-row="${r}"][data-col="${c}"] input`);
                if (input) input.value = ans;
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
            const r = this.currentWord.horizontal ? this.currentWord.row : this.currentWord.row + i;
            const c = this.currentWord.horizontal ? this.currentWord.col + i : this.currentWord.col;
            const key = `${r}-${c}`;
            const ans = this.currentWord.code[i];
            this.userAnswers[key] = ans;
            const input = document.querySelector(`[data-row="${r}"][data-col="${c}"] input`);
            if (input) input.value = ans;
        }
        this.updateStats();
        if (this.inlineValidationEnabled) this.validateWordIfComplete(this.currentWord, true);
        this.saveToLocalStorage();
    }

    validateWordIfComplete(word, force = false) {
        let filled = 0;
        for (let i = 0; i < word.code.length; i++) {
            const r = word.horizontal ? word.row : word.row + i;
            const c = word.horizontal ? word.col + i : word.col;
            const key = `${r}-${c}`;
            if ((this.userAnswers[key] || '').length === 1) filled++;
        }
        if (!force && filled !== word.code.length) return;

        for (let i = 0; i < word.code.length; i++) {
            const r = word.horizontal ? word.row : word.row + i;
            const c = word.horizontal ? word.col + i : word.col;
            const key = `${r}-${c}`;
            const ua = this.userAnswers[key] || '';
            const ca = word.code[i];
            const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.remove('correct', 'incorrect');
                if (ua === ca) cell.classList.add('correct');
                else if (ua) cell.classList.add('incorrect');
            }
        }
    }

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
        const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
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

    copyShareLink() {
        const params = new URLSearchParams(window.location.search);
        params.set('seed', String(this.seed));
        params.set('grid', String(this.gridSize));
        params.set('words', String(this.maxWords));
        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        navigator.clipboard.writeText(url);
    }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
    new CrosswordGame();
});
