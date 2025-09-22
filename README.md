# 🎯 Entity Code Crossword

A dynamic crossword puzzle game that generates random crosswords based on entity codes and their descriptions from your database. Players guess entity codes based on descriptive clues.

## 🚀 Features

- **Random Crossword Generation**: Creates new puzzles using entity codes and descriptions
- **Interactive Grid**: Click and type to fill in answers
- **Smart Navigation**: Use keyboard arrows or click clues to navigate
- **Answer Checking**: Instantly verify your answers
- **Solution Reveal**: Show complete solution when needed
- **Save/Load Progress**: Export and import your game state
- **Print/Export**: Generate PDF-ready version for offline solving
- **Responsive Design**: Works on desktop and mobile devices

## 🎮 How to Play

1. **Generate a New Crossword**: Click "Generate New Crossword" to create a random puzzle
2. **Read the Clues**: View descriptions in the "Across" and "Down" sections
3. **Enter Answers**: Click on numbered cells and type the entity codes
4. **Navigate**: Use arrow keys or click clues to move between words
5. **Check Progress**: Use "Check Answers" to see correct/incorrect entries
6. **Get Help**: Use "Show Solution" if you're stuck
7. **Save Your Game**: Export your progress to continue later

## 📁 Files

- `index.html` - Main game interface
- `styles.css` - Game styling and responsive design
- `crossword.js` - Game logic and crossword generation
- `men_ent_cleaned.csv` - Entity data (codes and descriptions)
- `README.md` - This documentation

## 🌐 GitHub Pages Setup

### Quick Setup
1. **Fork or Clone**: Copy these files to a new GitHub repository
2. **Enable Pages**: Go to Settings → Pages → Source → Deploy from branch → main
3. **Visit Your Site**: Access at `https://yourusername.github.io/repositoryname`

### Detailed Steps
1. Create a new GitHub repository
2. Upload all files (`index.html`, `styles.css`, `crossword.js`, `men_ent_cleaned.csv`)
3. Go to repository Settings
4. Scroll to "Pages" section
5. Select "Deploy from a branch" under Source
6. Choose "main" branch and "/ (root)" folder
7. Click Save
8. Wait a few minutes for deployment
9. Visit the provided URL

## 🛠️ Technical Details

### Data Format
The game reads from `men_ent_cleaned.csv` with the following structure:
- Column B (index 1): Entity Code (e.g., "AA1", "ABT", "ACM")
- Column AC (index 28): Description/Developer Help text

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- JavaScript ES6+ support required
- Local file access needed for CSV loading

### Performance
- Optimized for ~900 entity records
- Generates 6-8 word crosswords for optimal playability
- Responsive grid layout adapts to screen size

## 🎯 Game Mechanics

### Crossword Generation Algorithm
1. **Word Selection**: Chooses 6-8 entity codes of varying lengths
2. **Grid Placement**: Places first word horizontally in center
3. **Intersection Finding**: Attempts to intersect subsequent words with placed words
4. **Conflict Resolution**: Ensures no letter conflicts in shared cells
5. **Fallback Placement**: Random placement if intersection fails

### Scoring System
- **Correct Answers**: Green highlighting for correct letters
- **Incorrect Answers**: Red highlighting for wrong letters
- **Accuracy Tracking**: Real-time percentage calculation
- **Progress Stats**: Shows correct/total answers

## 🎨 Customization

### Styling
Modify `styles.css` to change:
- Color scheme (update CSS custom properties)
- Grid size and cell dimensions
- Typography and spacing
- Animation effects

### Data Source
Replace `men_ent_cleaned.csv` with your own data:
- Ensure proper CSV formatting
- Update column indices in `crossword.js` if needed
- Maintain entity code and description structure

### Difficulty
Adjust game parameters in `crossword.js`:
- `maxWords`: Number of words per crossword (default: 8)
- `gridSize`: Grid dimensions (default: 15x15)
- Word length filtering in `selectWords()` method

## 📱 Mobile Support

The game is fully responsive and includes:
- Touch-friendly interface
- Optimized cell sizes for mobile
- Scrollable clues section
- Landscape/portrait orientation support

## 🔧 Troubleshooting

### Common Issues
1. **CSV not loading**: Ensure file is in same directory and properly formatted
2. **Blank crossword**: Check browser console for JavaScript errors
3. **No clues showing**: Verify CSV column indices match data structure
4. **Mobile display issues**: Check viewport meta tag in HTML

### Development Mode
To test locally:
1. Use a local web server (not file:// protocol)
2. Python: `python -m http.server 8000`
3. Node.js: `npx serve .`
4. Access via `http://localhost:8000`

## 📄 License

This project is open source. Feel free to modify and distribute according to your needs.

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Enhanced crossword generation algorithms
- Additional export formats
- Multiplayer features
- Hint systems
- Custom themes

---

**Enjoy solving entity code crosswords!** 🧩
