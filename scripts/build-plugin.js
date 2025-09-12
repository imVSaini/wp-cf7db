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
  'readme.txt',
  'LICENSE'
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
Tags: contact-form-7, contact-form-7-database, cf7-database, form-submissions, database, submissions, admin, multi-step, export, csv, leadsync, migration, cfdb7
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 8.0
Stable tag: ${PLUGIN_VERSION}
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

LeadSync - Save Contact Form 7 submissions (including multi-step) into a custom database table with modern admin UI, column management, and CSV export. Perfect for Contact Form 7 Database management.

== Description ==

LeadSync is the ultimate Contact Form 7 submission management solution that transforms how you handle form data. Whether you're managing simple contact forms or complex multi-step processes, LeadSync provides everything you need to capture, organize, and export your form submissions with professional-grade tools and an intuitive interface.

**🚀 Key Features:**

* **📝 Multi-step Form Support** - Capture submissions from complex multi-step Contact Form 7 forms with complete data integrity
* **🎛️ Dynamic Column Management** - Drag-and-drop column reordering, show/hide columns, custom titles, and flexible data display
* **🔍 Advanced Filtering & Search** - Powerful search functionality, date range filtering, form-specific views, and real-time filtering
* **📊 CSV Export System** - Export submissions with dynamic columns, filtering options, and customizable data formatting
* **⚡ Modern Admin Interface** - React-based UI with TypeScript for optimal performance and maintainability
* **🔐 IP Tracking & User Management** - Automatic IP address capture, user ID tracking, and submission metadata
* **🔄 CFDB7 Migration Tools** - Seamless migration from Contact Form CFDB7 plugin with data backup and cleanup
* **📱 Responsive Design** - Mobile-friendly interface that works perfectly on all screen sizes
* **🛡️ Security First** - Built with WordPress security best practices, nonce verification, and input sanitization
* **⚙️ Professional Architecture** - Clean, maintainable code with proper namespacing and modern development practices

**🎯 Perfect For:**
* WordPress developers managing multiple Contact Form 7 forms
* Business owners needing detailed form submission analytics
* Marketing teams requiring lead management and export capabilities
* Anyone looking to replace or upgrade from Contact Form CFDB7

**💡 Why Choose LeadSync?**
* **Complete Form Management** - Handle all your Contact Form 7 submissions in one powerful dashboard
* **Zero Learning Curve** - Intuitive interface that anyone can use without technical knowledge
* **Advanced Data Control** - Customize exactly what data you see and how it's displayed
* **Seamless Migration** - Easy transition from Contact Form CFDB7 with data backup and cleanup
* **Professional Export Tools** - Export your data exactly how you need it with custom formatting

== Installation ==

1. **Upload Plugin**: Upload the plugin files to the \`/wp-content/plugins/leadsync\` directory, or install the plugin through the WordPress plugins screen directly.
2. **Activate Plugin**: Activate the plugin through the 'Plugins' screen in WordPress
3. **Install Contact Form 7**: Ensure Contact Form 7 is installed and active (required dependency)
4. **Access Admin Interface**: Navigate to 'LeadSync' in the WordPress admin menu to start managing your form submissions

**System Requirements:**
* WordPress 5.0 or higher
* PHP 8.0 or higher
* Contact Form 7 plugin (active)
* MySQL 5.6 or higher

== Frequently Asked Questions ==

= How does LeadSync differ from Contact Form CFDB7? =

LeadSync offers a modern React-based interface, better performance, advanced filtering, dynamic column management, and seamless migration tools. It's built with modern web technologies and follows WordPress best practices.

= Can I migrate my existing Contact Form CFDB7 data? =

Yes! LeadSync includes comprehensive migration tools to seamlessly transfer your existing CFDB7 data with backup and cleanup options.

= Does LeadSync support multi-step Contact Form 7 forms? =

Absolutely! LeadSync fully supports multi-step Contact Form 7 forms and captures all submission data with complete integrity.

= Can I customize which columns are displayed? =

Yes! LeadSync provides a powerful column management system where you can show/hide columns, reorder them, and set custom titles.

= Is the data exportable? =

Yes! You can export submissions to CSV with your custom column configuration and filtering options applied.

= Is LeadSync mobile-friendly? =

Yes! The admin interface is fully responsive and works perfectly on all devices and screen sizes.

== Screenshots ==

1. Modern admin interface with submission management
2. Dynamic column management system
3. Advanced filtering and search capabilities
4. CSV export with custom column configuration
5. CFDB7 migration wizard
6. Responsive mobile interface

== Changelog ==

= ${PLUGIN_VERSION} =
* **Initial Release** - Complete LeadSync plugin with all core features
* **Multi-step Form Support** - Full support for complex Contact Form 7 multi-step forms
* **Dynamic Column Management** - Drag-and-drop reordering, show/hide, custom titles
* **React Admin Interface** - Modern TypeScript-based UI with Ant Design components
* **CSV Export System** - Advanced export with column configuration and filtering
* **IP Tracking & User Management** - Automatic IP and user ID capture
* **CFDB7 Migration Tools** - Complete migration system with backup and cleanup
* **Security Implementation** - WordPress security best practices, nonce verification
* **Responsive Design** - Mobile-friendly interface for all screen sizes
* **Professional Architecture** - Clean code structure with CF7DBA namespace
* **Database Optimization** - Advanced schema with proper indexing and relationships
* **Auto-hiding Scrollbars** - Enhanced UX with modern scrollbar styling

== Upgrade Notice ==

= ${PLUGIN_VERSION} =
Initial release of LeadSync with comprehensive Contact Form 7 submission management features. Perfect for upgrading from Contact Form CFDB7 or starting fresh with modern form submission management.

== Support ==

For support, feature requests, or bug reports, please visit the [plugin support forum](https://wordpress.org/support/plugin/leadsync/) or check the [documentation](https://wordpress.org/plugins/leadsync/).

== Development ==

LeadSync is actively developed and maintained. The source code is available on [GitHub](https://github.com/vaibhavsaini07/leadsync) for contributions and development.

**Contributing:**
* Report bugs and request features
* Submit pull requests
* Help with documentation
* Test new releases

== Privacy Policy ==

LeadSync stores form submission data in your WordPress database. No data is sent to external servers. All data remains under your control and follows your website's privacy policy.

**Data Stored:**
* Form submission data (as configured)
* IP addresses (optional)
* User IDs (if logged in)
* Submission timestamps
* Form metadata

**Data Export:**
* All data can be exported via CSV
* Data can be migrated to other systems
* Complete data portability

== What Makes LeadSync Special ==

**🎯 Complete Solution:**
* Everything you need to manage Contact Form 7 submissions in one plugin
* No need for multiple tools or complex setups
* Works with any Contact Form 7 form, simple or complex

**⚡ Performance & Reliability:**
* Lightning-fast loading and data processing
* Optimized for high-volume form submissions
* Reliable data storage with automatic backups
* Works seamlessly with your existing WordPress site

**🔒 Security & Privacy:**
* All data stays on your server - no external data sharing
* WordPress security best practices built-in
* Complete control over your form submission data
* GDPR-compliant data handling

**📱 Universal Compatibility:**
* Works on any device - desktop, tablet, or mobile
* Compatible with all modern WordPress themes
* Integrates seamlessly with Contact Form 7
* No conflicts with other plugins

**System Requirements:**
* WordPress 5.0 or higher
* PHP 8.0 or higher
* Contact Form 7 plugin (active)
* Any modern web browser
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
