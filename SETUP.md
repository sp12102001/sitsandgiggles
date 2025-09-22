# SITS Crossword - Setup Instructions

## 🚀 GitHub Pages Deployment

### Step 1: Create GitHub Repository
1. Create a new repository called `sitscrossword`
2. Upload all project files to the repository

### Step 2: Enable GitHub Pages
1. Go to Settings → Pages
2. Select "Deploy from a branch"
3. Choose "main" branch and "/ (root)" folder
4. Save and wait for deployment

### Step 3: Test Your Site
Visit: `https://yourusername.github.io/sitscrossword`

## 📁 Required Files
- `index.html` - Main game interface
- `styles.css` - Clean white theme styling
- `crossword.js` - Game logic with GitHub integration
- `men_ent_cleaned.csv` - SITS entity data
- `README.md` - Project documentation

## 🎯 Features
✅ **Clean White Design** - Professional interface
✅ **SITS Branded** - Student Information Technology System focus
✅ **Auto Data Loading** - Automatically loads CSV from GitHub Pages
✅ **Responsive** - Works on desktop and mobile
✅ **Smart Clues** - No answer spoilers in descriptions
✅ **Sample Data Fallback** - Works even when CSV can't be loaded

## 🔄 How Data Loading Works
1. **On GitHub Pages**: Automatically loads `men_ent_cleaned.csv` from your repository
2. **Locally**: Uses sample data for demonstration
3. **No manual setup required** - Just deploy and it works!

## 🔧 Customization
- **Colors**: Modify CSS custom properties in `styles.css`
- **Data**: Replace `men_ent_cleaned.csv` with your entity data
- **Branding**: Update title and descriptions in `index.html`

## 📱 Browser Support
- Chrome, Firefox, Safari, Edge
- Mobile browsers
- JavaScript ES6+ required

---

**Ready to deploy!** 🚀
