// Entity Code Crossword Game
class CrosswordGame {
    constructor () {
        this.data = [];
        this.crossword = null;
        this.currentWord = null;
        this.userAnswers = {};
        this.gridSize = 15;

        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.generateNewCrossword();
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
            console.log(`Loaded ${this.data.length} SITS entities`);
            this.showMessage(`Loaded ${this.data.length} SITS entities from GitHub!`, 'success');
        } catch (error) {
            console.error('Error loading data:', error);
            // Provide fallback sample data for demo purposes
            this.loadSampleData();
            this.showMessage('Using sample data - deploy to GitHub Pages for full dataset', 'info');
        }
    }

    loadSampleData() {
        // Sample data with real SITS entity codes for demonstration when CSV can't be loaded
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
        console.log('Loaded sample SITS entities for demonstration');
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

                if (entityCode && entityCode.length >= 3 && entityCode.length <= 4) {
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
        // Clean up the description first
        const cleanDesc = this.cleanDescription(description);

        // Check if description contains the entity code (case insensitive)
        const codePattern = new RegExp(`\\b${entityCode}\\b`, 'i');
        const descriptionContainsCode = cleanDesc && codePattern.test(cleanDesc);

        // Create clue based on available data
        let clue = '';

        if (fullName && fullName !== entityCode) {
            // Use full name as primary clue
            clue = `Entity for: ${fullName}`;

            // Add description if it doesn't contain the code
            if (cleanDesc && !descriptionContainsCode && cleanDesc.length > 20) {
                // Remove entity code references from description
                const cleanedDesc = this.removeCodeReferences(cleanDesc, entityCode);
                if (cleanedDesc.length > 20) {
                    clue += `. ${cleanedDesc}`;
                }
            }
        } else if (cleanDesc && !descriptionContainsCode && cleanDesc.length > 20) {
            // Use description only if it doesn't contain the code
            clue = this.removeCodeReferences(cleanDesc, entityCode);
        } else {
            // No good clue available, skip this entry
            return null;
        }

        // Final check - make sure the clue doesn't contain the entity code
        if (new RegExp(`\\b${entityCode}\\b`, 'i').test(clue)) {
            return null;
        }

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

    generateNewCrossword() {
        this.showLoading(true);
        this.userAnswers = {};

        setTimeout(() => {
            try {
                this.crossword = this.createCrossword();
                this.renderCrossword();
                this.updateStats();
                this.showLoading(false);
                this.showMessage('New SITS crossword generated!', 'success');
            } catch (error) {
                console.error('Error generating crossword:', error);
                this.showMessage('Error generating crossword', 'error');
                this.showLoading(false);
            }
        }, 100);
    }

    createCrossword() {
        const maxWords = 8; // Reasonable number for good crossword
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
                this.placeWord(grid, word, placement.row, placement.col, placement.horizontal, wordNumber);
                placedWords.push({
                    ...word,
                    row: placement.row,
                    col: placement.col,
                    horizontal: placement.horizontal,
                    number: wordNumber
                });
                wordNumber++;
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
            const j = Math.floor(Math.random() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
        }

        // Only use 3-4 character entity codes as requested
        const validWords = words.filter(w => w.code.length >= 3 && w.code.length <= 4);

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
            const horizontal = Math.random() < 0.5;
            const maxRow = horizontal ? this.gridSize - 1 : this.gridSize - word.code.length;
            const maxCol = horizontal ? this.gridSize - word.code.length : this.gridSize - 1;

            if (maxRow >= 0 && maxCol >= 0) {
                const row = Math.floor(Math.random() * (maxRow + 1));
                const col = Math.floor(Math.random() * (maxCol + 1));
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
        input.addEventListener('input', (e) => this.handleInput(e, row, col));
        input.addEventListener('focus', () => this.highlightWord(row, col));
        input.addEventListener('keydown', (e) => this.handleKeydown(e, row, col));

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

        clue.innerHTML = `
            <span class="clue-number">${word.number}.</span>
            <span class="clue-text">${word.description}</span>
        `;

        clue.addEventListener('click', () => {
            this.highlightWordByNumber(word.number, word.horizontal);
            this.focusWordStart(word);
        });

        return clue;
    }

    highlightWord(row, col) {
        // Clear previous highlights
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('highlighted', 'current-word');
        });

        document.querySelectorAll('.clue-item').forEach(clue => {
            clue.classList.remove('active');
        });

        // Find which word this cell belongs to
        const word = this.findWordAtPosition(row, col);
        if (word) {
            this.currentWord = word;
            this.highlightWordCells(word);
            this.highlightClue(word.number, word.horizontal);
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
            }
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

        // Move to next cell
        if (value && this.currentWord) {
            this.moveToNextCell(row, col);
        }

        this.updateStats();
    }

    handleKeydown(event, row, col) {
        const input = event.target;

        switch (event.key) {
            case 'Enter':
                event.preventDefault();
                this.checkAnswers();
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
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CrosswordGame();
});
