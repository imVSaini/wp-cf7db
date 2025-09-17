<?php
/**
 * Plugin Name:       LeadSync
 * Plugin URI:        https://wordpress.org/plugins/leadsync/
 * Description:       LeadSync - Save Contact Form 7 submissions (including multi-step) into a custom database table with modern admin UI, column management, and CSV export. Perfect for Contact Form 7 Database management.
 * Version:           1.0.0
 * Author:            Vaibhav Kumar Saini
 * Author URI:        https://www.linkedin.com/in/vaibhavsaini07/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       leadsync
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

spl_autoload_register( function ( $class ) {
	if ( strpos( $class, 'CF7DBA\\' ) !== 0 ) {
		return;
	}
	
	// Handle components namespace
	if ( strpos( $class, 'CF7DBA\\Components\\' ) === 0 ) {
		$relative = strtolower( str_replace( [ 'CF7DBA\\Components\\', '_' ], [ '', '-' ], $class ) );
		$path = plugin_dir_path( __FILE__ ) . 'includes/components/class-' . $relative . '.php';
		if ( file_exists( $path ) ) {
			require_once $path;
		}
		return;
	}
	
	// Handle main classes
	$relative = strtolower( str_replace( [ 'CF7DBA\\', '_' ], [ '', '-' ], $class ) );
	$path     = plugin_dir_path( __FILE__ ) . 'includes/class-' . $relative . '.php';
	if ( file_exists( $path ) ) {
		require_once $path;
	}
} );

if ( ! defined( 'CF7DBA_VERSION' ) ) {
	define( 'CF7DBA_VERSION', '1.0.0' );
}
if ( ! defined( 'CF7DBA_PLUGIN_FILE' ) ) {
	define( 'CF7DBA_PLUGIN_FILE', __FILE__ );
}
if ( ! defined( 'CF7DBA_PLUGIN_DIR' ) ) {
	define( 'CF7DBA_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}
if ( ! defined( 'CF7DBA_PLUGIN_URL' ) ) {
	define( 'CF7DBA_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
}

register_activation_hook( __FILE__, function () {
	CF7DBA\Activator::activate();
} );

function cf7dba_missing_cf7_notice() {
	if ( current_user_can( 'activate_plugins' ) ) {
		$class   = 'notice notice-error';
		$message = esc_html__( 'LeadSync requires Contact Form 7 to be installed and active.', 'leadsync' );
		printf( '<div class="%1$s"><p>%2$s</p></div>', esc_attr( $class ), $message );
	}
}

add_action( 'plugins_loaded', function () {
	// Load plugin text domain
	load_plugin_textdomain( 'leadsync', false, dirname( plugin_basename( __FILE__ ) ) . '/languages' );
	
	if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
		add_action( 'admin_notices', 'cf7dba_missing_cf7_notice' );
		return;
	}

	// Run database migrations if needed
	CF7DBA\Activator::maybe_add_submit_ip_column();
	CF7DBA\Activator::maybe_add_idempotency_key();

	// Initialize components
	$database_operations = new CF7DBA\Components\Database_Operations();
	$form_manager = new CF7DBA\Components\Form_Manager( $database_operations );
	$submission_manager = new CF7DBA\Components\Submission_Manager( $database_operations );
	$export_manager = new CF7DBA\Components\Export_Manager();
	
	// Initialize main components
	$admin_interface = new CF7DBA\Components\Admin_Interface( $form_manager, $submission_manager, $export_manager );
	$cf7_hooks = new CF7DBA\Components\CF7_Hooks( $submission_manager );

} );