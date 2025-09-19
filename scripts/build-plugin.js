import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import process from 'process';

// Plugin configuration
const PLUGIN_NAME = 'leadsync';
const PLUGIN_VERSION = '1.0.0';
const BUILD_DIR = 'plugin';
const ZIP_NAME = `${PLUGIN_NAME}-v${PLUGIN_VERSION}.zip`;


async function buildPlugin() {
  console.log('🚀 Building WordPress plugin...');
  
  try {
    // Clean previous builds
    if (await fs.pathExists(BUILD_DIR)) {
      await fs.remove(BUILD_DIR);
      console.log('✅ Cleaned previous plugin builds');
    }
    
    // Create plugin directory
    await fs.ensureDir(BUILD_DIR);
    
    // Create zip file
    const output = fs.createWriteStream(path.join(BUILD_DIR, ZIP_NAME));
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive events
    output.on('close', () => {
      console.log(`✅ Plugin built successfully!`);
      console.log(`📦 Plugin zip: ${path.join(BUILD_DIR, ZIP_NAME)}`);
      console.log(`📏 Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
      
      // Show final plugin contents
      console.log('\n📦 Plugin contents:');
      console.log('   - Main plugin file: leadsync.php');
      console.log('   - PHP classes: includes/');
      console.log('   - React admin UI: build/');
      console.log('   - Documentation: readme.txt');
      console.log('   - License: LICENSE');
    });

    archive.on('error', (err) => {
      throw err;
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add files to archive
    console.log('📁 Adding files to plugin zip...');
    
    // Add main plugin files
    const rootFiles = [
      'leadsync.php',
      'readme.txt',
      'LICENSE'
    ];
    
    for (const file of rootFiles) {
      if (await fs.pathExists(file)) {
        archive.file(file, { name: file });
        console.log(`  ✓ Added: ${file}`);
      }
    }

    // Add directories
    const directories = [
      'includes',
      'languages',
      'build'
    ];

    for (const dir of directories) {
      if (await fs.pathExists(dir)) {
        archive.directory(dir, dir);
        console.log(`  ✓ Added directory: ${dir}/`);
      }
    }

    // Finalize the archive
    await archive.finalize();
    
    console.log('\n🎉 Plugin build complete!');
    console.log(`📦 Install the plugin by uploading: ${ZIP_NAME}`);
    console.log('📍 Location: plugin/ directory');
    
  } catch (error) {
    console.error('❌ Error building plugin:', error);
    process.exit(1);
  }
}

// Run the build
buildPlugin();