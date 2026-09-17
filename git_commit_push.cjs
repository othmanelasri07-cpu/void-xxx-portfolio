const { execSync } = require('child_process');
const cwd = 'C:/Users/proga/OneDrive/Documents/Portofolio';

execSync('git add -A', { cwd, stdio: 'inherit' });
execSync('git commit -m "feat: add YouTube Data API v3 key for live channel stats"', { cwd, stdio: 'inherit' });
execSync('git push origin main', { cwd, stdio: 'inherit' });
console.log('✅ Pushed to GitHub');