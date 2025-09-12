import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { execSync } from 'child_process';
import process from 'process';

// Configuration
const PLUGIN_NAME = 'leadsync';
const PLUGIN_VERSION = '1.0.0';
const OUTPUT_DIR = 'plugin';
const BUILD_DIR = 'build';

// Files and directories to include in the plugin
const INCLUDE_FILES = [
  'leadsync.php',
  'includes/',
  'languages/',
  'readme.txt'
];


// Files and directories to exclude
const EXCLUDE_PATTERNS = [
  'node_modules/',
  'src/',
  'scripts/',
  'dist/',
  '.git/',
  '.vscode/',
  '*.log',
  '*.zip',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
  '.eslintrc.cjs',
  '.gitignore',
  'README.md'
];

function createDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.endsWith('/')) {
      return filePath.includes(pattern);
    }
    if (pattern.startsWith('*.')) {
      const ext = pattern.substring(1);
      return filePath.endsWith(ext);
    }
    return filePath.includes(pattern);
  });
}

function validatePluginStructure() {
  console.log('Validating plugin structure...');
  
  const requiredFiles = [
    'leadsync.php',
    'includes/class-activator.php',
    'includes/class-database.php',
    'includes/class-cf7-hooks.php',
    'build/js/leadsync-admin.js',
    'build/css/leadsync-admin.css'
  ];
  
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing required files:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    return false;
  }
  
  console.log('✅ All required files present');
  
  // Validate PHP classes have correct namespace
  const phpFiles = [
    'includes/class-activator.php',
    'includes/class-database.php', 
    'includes/class-cf7-hooks.php'
  ];
  
  for (const file of phpFiles) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes('namespace CF7DBA')) {
      console.error(`❌ ${file} missing CF7DBA namespace`);
      return false;
    }
  }
  
  console.log('✅ PHP classes have correct namespace');
  
  // Validate React build files
  const buildFiles = ['build/js/leadsync-admin.js', 'build/css/leadsync-admin.css'];
  for (const file of buildFiles) {
    const stats = fs.statSync(file);
    if (stats.size === 0) {
      console.error(`❌ ${file} is empty`);
      return false;
    }
  }
  
  console.log('✅ Build files are valid');
  return true;
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (shouldExclude(srcPath)) {
      continue;
    }

    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

function createPluginZip() {
  // Clean previous builds
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    console.log('Cleaned previous plugin builds');
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipFileName = `${PLUGIN_NAME}-v${PLUGIN_VERSION}-${timestamp}.zip`;
  const zipPath = path.join(OUTPUT_DIR, zipFileName);
  
  // Create output directory
  createDirectory(OUTPUT_DIR);
  
  // Create temporary plugin directory
  const tempPluginDir = path.join(OUTPUT_DIR, PLUGIN_NAME);
  createDirectory(tempPluginDir);
  
  console.log('Building WordPress plugin...');
  
  // Copy main plugin file
  if (fs.existsSync('leadsync.php')) {
    fs.copyFileSync('leadsync.php', path.join(tempPluginDir, 'leadsync.php'));
    console.log('Copied main plugin file');
  }
  
  // Copy include files and directories
  for (const item of INCLUDE_FILES) {
    const srcPath = item;
    const destPath = path.join(tempPluginDir, item);
    
    if (fs.existsSync(srcPath)) {
      if (fs.statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied: ${srcPath}`);
      }
    }
  }
  
  // Copy build directory (React app)
  if (fs.existsSync(BUILD_DIR)) {
    copyDirectory(BUILD_DIR, path.join(tempPluginDir, BUILD_DIR));
    console.log('Copied build directory');
  }
  
  // Copy assets directory if it exists
  if (fs.existsSync('assets')) {
    copyDirectory('assets', path.join(tempPluginDir, 'assets'));
    console.log('Copied assets directory');
  }
  
  // Create languages directory if it doesn't exist
  const languagesDir = path.join(tempPluginDir, 'languages');
  if (!fs.existsSync(languagesDir)) {
    createDirectory(languagesDir);
    console.log('Created languages directory');
  }
  
  // Create readme.txt if it doesn't exist
  const readmePath = path.join(tempPluginDir, 'readme.txt');
  if (!fs.existsSync(readmePath)) {
    const readmeContent = `=== LeadSync ===
Contributors: vaibhavsaini07
Plugin URI: https://wordpress.org/plugins/leadsync/
Tags: contact-form-7, contact-form-7-database, cf7-database, form-submissions, database, submissions, admin, multi-step, export, csv, leadsync
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 8.0
Stable tag: ${PLUGIN_VERSION}
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

LeadSync - Save Contact Form 7 submissions (including multi-step) into a custom database table with modern admin UI, column management, and CSV export. Perfect for Contact Form 7 Database management.

== Description ==

LeadSync provides a comprehensive solution for managing Contact Form 7 submissions with a modern React-based admin interface. Built with TypeScript, React, and Ant Design for optimal performance and user experience.

**Key Features:**
* **Multi-step Form Support** - Capture submissions from complex multi-step Contact Form 7 forms
* **Dynamic Column Management** - Drag-and-drop column reordering, show/hide columns, custom titles
* **Advanced Filtering** - Search, date range filtering, form-specific views
* **CSV Export** - Export submissions with dynamic columns and filtering
* **Modern Admin Interface** - React-based UI with responsive design
* **IP Tracking** - Automatic IP address and user ID capture
* **Professional Code Structure** - Clean, maintainable code with proper namespacing

== Installation ==

1. Upload the plugin files to the /wp-content/plugins/leadsync directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the 'Plugins' screen in WordPress
3. Ensure Contact Form 7 is installed and active
4. Access the admin interface via 'LeadSync' in the WordPress admin menu

== Changelog ==

= ${PLUGIN_VERSION} =
* Initial release with advanced features
* Multi-step Contact Form 7 support
* Dynamic column management system
* React admin interface with TypeScript
* CSV export with filtering
* IP tracking and user identification
* Professional code structure with CF7DBA namespace
* Advanced database schema with proper indexing
* Responsive design for all screen sizes

== Upgrade Notice ==

= ${PLUGIN_VERSION} =
Initial release of the advanced plugin with comprehensive features.
`;
    
    fs.writeFileSync(readmePath, readmeContent);
    console.log('Created readme.txt');
  }
  
  // Create zip file
  console.log('Creating plugin zip file...');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
  });
  
  output.on('close', () => {
    console.log(`Plugin zip created successfully: ${zipPath}`);
    console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    
    // Clean up temporary directory
    fs.rmSync(tempPluginDir, { recursive: true, force: true });
    console.log('Cleaned up temporary files');
  });
  
  archive.on('error', (err) => {
    throw err;
  });
  
  archive.pipe(output);
  archive.directory(tempPluginDir, PLUGIN_NAME);
  archive.finalize();
}

async function main() {
  console.log('🚀 Building LeadSync Plugin');
  console.log('====================================================');
  
  // Validate plugin structure first
  if (!validatePluginStructure()) {
    console.error('❌ Plugin structure validation failed. Please fix the issues above.');
    process.exit(1);
  }
  
  // Check if build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('Error: Build directory does not exist. Please run "pnpm build" first.');
    process.exit(1);
  }

  // Check if main plugin file exists
  if (!fs.existsSync('leadsync.php')) {
    console.error('Error: Main plugin file does not exist.');
    process.exit(1);
  }

  // Install archiver if not available
  try {
    await import('archiver');
  } catch (error) {
    console.error('Error: archiver package not found. Installing...');
    try {
      execSync('pnpm add archiver', { stdio: 'inherit' });
      console.log('archiver installed successfully');
    } catch (installError) {
      console.error('Failed to install archiver:', installError.message);
      process.exit(1);
    }
  }

  // Create the plugin
  createPluginZip();
  
  console.log('✅ Plugin build completed successfully!');
  console.log('📦 Plugin ready for WordPress installation');
}

// Run the main function
main().catch(console.error);
