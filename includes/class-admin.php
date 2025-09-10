<?php
/**
 * Admin Interface
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Admin {

	/**
	 * @var Database
	 */
	private $database;

	/**
	 * @var Exporter
	 */
	private $exporter;

	/**
	 * Constructor
	 *
	 * @param Database $database
	 * @param Exporter $exporter
	 */
	public function __construct( Database $database, Exporter $exporter ) {
		$this->database = $database;
		$this->exporter = $exporter;

		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );
		add_action( 'wp_ajax_cf7dba_get_forms', array( $this, 'ajax_get_forms' ) );
		add_action( 'wp_ajax_cf7dba_get_form_fields', array( $this, 'ajax_get_form_fields' ) );
		add_action( 'wp_ajax_cf7dba_get_submissions', array( $this, 'ajax_get_submissions' ) );
		add_action( 'wp_ajax_cf7dba_delete_submission', array( $this, 'ajax_delete_submission' ) );
		add_action( 'wp_ajax_cf7dba_export_csv', array( $this, 'ajax_export_csv' ) );
		add_action( 'wp_ajax_cf7dba_save_settings', array( $this, 'ajax_save_settings' ) );
		add_action( 'wp_ajax_cf7dba_get_settings', array( $this, 'ajax_get_settings' ) );
		add_action( 'wp_ajax_cf7dba_test_ajax', array( $this, 'ajax_test_ajax' ) );
	}

	/**
	 * Add admin menu
	 */
	public function add_admin_menu() {
		add_menu_page(
			__( 'Contact Form 7 Database', 'cf7dba' ),
			__( 'CF7 Database', 'cf7dba' ),
			'manage_options',
			'cf7dba-dashboard',
			array( $this, 'admin_page' ),
			'dashicons-database-view',
			30
		);
	}

	/**
	 * Enqueue admin scripts and styles
	 *
	 * @param string $hook
	 */
	public function enqueue_admin_scripts( $hook ) {
		if ( $hook !== 'toplevel_page_cf7dba-dashboard' ) {
			return;
		}

		// Enqueue built assets
		wp_enqueue_script(
			'cf7dba-admin',
			CF7DBA_PLUGIN_URL . 'build/js/admin.js',
			array(),
			CF7DBA_VERSION,
			true
		);

		wp_enqueue_style(
			'cf7dba-admin',
			CF7DBA_PLUGIN_URL . 'build/css/style.css',
			array(),
			CF7DBA_VERSION
		);

		// Localize script with AJAX data
		wp_localize_script( 'cf7dba-admin', 'cf7dba_ajax', array(
			'ajax_url' => admin_url( 'admin-ajax.php' ),
			'nonce' => wp_create_nonce( 'cf7dba_nonce' ),
			'rest_url' => rest_url( 'cf7dba/v1/' ),
			'rest_nonce' => wp_create_nonce( 'wp_rest' ),
			'canManageOptions' => current_user_can( 'manage_options' ),
		) );
	}

	/**
	 * Admin page content
	 */
	public function admin_page() {
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Contact Form 7 Database', 'cf7dba' ); ?></h1>
			<div id="cf7db-admin-app">
				<p>Loading Contact Form 7 Database...</p>
				<p>If this message persists, please check the browser console for errors.</p>
			</div>
		</div>
		<?php
	}

	/**
	 * AJAX: Get forms
	 */
	public function ajax_get_forms() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if Contact Form 7 is active
		if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
			wp_send_json_error( array( 'message' => 'Contact Form 7 is not active' ) );
			return;
		}

		$forms = $this->database->get_forms();
		
		// Log for debugging
		error_log( 'CF7DBA: Fetched forms: ' . print_r( $forms, true ) );
		
		wp_send_json_success( $forms );
	}

	/**
	 * AJAX: Get form fields
	 */
	public function ajax_get_form_fields() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		$form_id = sanitize_text_field( $_POST['form_id'] ?? '' );
		
		if ( empty( $form_id ) ) {
			wp_send_json_error( array( 'message' => __( 'Form ID is required', 'cf7dba' ) ) );
		}

		$fields = $this->database->get_form_fields( $form_id );
		
		// Log for debugging
		error_log( 'CF7DBA: Fetched form fields for form ' . $form_id . ': ' . print_r( $fields, true ) );
		
		wp_send_json_success( array( 'fields' => $fields ) );
	}

	/**
	 * AJAX: Get submissions
	 */
	public function ajax_get_submissions() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		$args = array(
			'form_id' => sanitize_text_field( $_POST['form_id'] ?? '' ),
			'page' => intval( $_POST['page'] ?? 1 ),
			'per_page' => intval( $_POST['per_page'] ?? 15 ),
			'search' => sanitize_text_field( $_POST['search'] ?? '' ),
			'start_date' => sanitize_text_field( $_POST['start_date'] ?? '' ),
			'end_date' => sanitize_text_field( $_POST['end_date'] ?? '' ),
		);

		// Debug logging for date filtering
		error_log( 'CF7DBA: Date filtering debug - start_date: ' . $args['start_date'] . ', end_date: ' . $args['end_date'] );
		error_log( 'CF7DBA: All POST data: ' . print_r( $_POST, true ) );

		$result = $this->database->get_submissions( $args );
		
		// Return the result with proper structure
		wp_send_json_success( $result );
	}

	/**
	 * AJAX: Delete submission
	 */
	public function ajax_delete_submission() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has permission to delete
		if ( ! $this->database->user_can_perform_action( 'delete' ) ) {
			wp_send_json_error( array( 'message' => __( 'Insufficient permissions to delete submissions', 'cf7dba' ) ) );
		}

		$submission_id = intval( $_POST['submission_id'] ?? 0 );
		
		// Debug logging
		error_log( 'CF7DBA: Delete submission request - ID: ' . $submission_id );
		error_log( 'CF7DBA: POST data: ' . print_r( $_POST, true ) );
		
		if ( empty( $submission_id ) ) {
			error_log( 'CF7DBA: Delete failed - No submission ID provided' );
			wp_send_json_error( array( 'message' => __( 'Submission ID is required', 'cf7dba' ) ) );
		}

		$result = $this->database->delete_submission( $submission_id );
		
		error_log( 'CF7DBA: Delete result: ' . ( $result ? 'SUCCESS' : 'FAILED' ) );
		
		if ( $result ) {
			wp_send_json_success( array( 'message' => __( 'Submission deleted successfully', 'cf7dba' ) ) );
		} else {
			wp_send_json_error( array( 'message' => __( 'Failed to delete submission', 'cf7dba' ) ) );
		}
	}

	/**
	 * AJAX: Export CSV
	 */
	public function ajax_export_csv() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has permission to export
		if ( ! $this->database->user_can_perform_action( 'export' ) ) {
			wp_send_json_error( array( 'message' => __( 'Insufficient permissions to export data', 'cf7dba' ) ) );
		}

		$form_id = sanitize_text_field( $_POST['form_id'] ?? '' );
		$start_date = sanitize_text_field( $_POST['start_date'] ?? '' );
		$end_date = sanitize_text_field( $_POST['end_date'] ?? '' );

		$args = array(
			'form_id' => $form_id,
			'start_date' => $start_date,
			'end_date' => $end_date,
			'per_page' => -1, // Get all records
		);

		$result = $this->database->get_submissions( $args );
		
		if ( empty( $result['submissions'] ) ) {
			wp_send_json_error( array( 'message' => __( 'No submissions found to export', 'cf7dba' ) ) );
		}

		$csv_data = $this->exporter->generate_csv( $result['submissions'], $form_id );
		
		wp_send_json_success( array( 'csv_data' => $csv_data ) );
	}

	/**
	 * AJAX handler for saving settings
	 */
	public function ajax_save_settings() {
		// Debug logging first
		error_log( 'CF7DBA: Settings save request started' );
		error_log( 'CF7DBA: POST data: ' . print_r( $_POST, true ) );
		error_log( 'CF7DBA: REQUEST data: ' . print_r( $_REQUEST, true ) );
		error_log( 'CF7DBA: Current user ID: ' . get_current_user_id() );
		error_log( 'CF7DBA: User capabilities: ' . print_r( wp_get_current_user()->allcaps, true ) );
		
		// Check nonce
		$nonce_check = check_ajax_referer( 'cf7dba_nonce', 'nonce', false );
		error_log( 'CF7DBA: Nonce check result: ' . ( $nonce_check ? 'PASSED' : 'FAILED' ) );
		
		if ( ! $nonce_check ) {
			error_log( 'CF7DBA: Nonce verification failed' );
			wp_send_json_error( array( 'message' => __( 'Security check failed', 'cf7dba' ) ) );
		}

		// Check if user has permission (only administrators can save settings)
		if ( ! current_user_can( 'manage_options' ) ) {
			error_log( 'CF7DBA: User does not have manage_options capability' );
			wp_send_json_error( array( 'message' => __( 'Insufficient permissions', 'cf7dba' ) ) );
		}

		// Get settings data - handle both formats
		$settings = array();
		
		// Check if settings are in $_POST['settings'] array format
		if ( isset( $_POST['settings'] ) && is_array( $_POST['settings'] ) ) {
			$settings = $_POST['settings'];
		}
		// Check if settings are in individual fields format (settings[key] = value)
		else {
			foreach ( $_POST as $key => $value ) {
				if ( strpos( $key, 'settings[' ) === 0 ) {
					$setting_key = str_replace( array( 'settings[', ']' ), '', $key );
					$settings[ $setting_key ] = $value;
				}
			}
		}
		
		error_log( 'CF7DBA: Parsed settings: ' . print_r( $settings, true ) );
		
		if ( empty( $settings ) ) {
			error_log( 'CF7DBA: Settings save failed - No settings data provided' );
			wp_send_json_error( array( 'message' => __( 'No settings data provided', 'cf7dba' ) ) );
		}

		// Sanitize settings (skip Advanced Settings for now)
		$sanitized_settings = array();
		$allowed_keys = array(
			'editorAccess', 'authorAccess',
			'editorAllowEdit', 'editorAllowDelete', 'editorAllowExport',
			'authorAllowEdit', 'authorAllowDelete', 'authorAllowExport'
		);

		foreach ( $settings as $key => $value ) {
			if ( in_array( $key, $allowed_keys ) ) {
				$sanitized_settings[ $key ] = (bool) $value;
			}
		}

		error_log( 'CF7DBA: Sanitized settings: ' . print_r( $sanitized_settings, true ) );

		// Save settings
		$success = $this->database->save_settings( $sanitized_settings );

		if ( $success ) {
			error_log( 'CF7DBA: Settings saved successfully' );
			wp_send_json_success( array( 'message' => __( 'Settings saved successfully', 'cf7dba' ) ) );
		} else {
			error_log( 'CF7DBA: Failed to save settings to database' );
			wp_send_json_error( array( 'message' => __( 'Failed to save settings', 'cf7dba' ) ) );
		}
	}

	/**
	 * AJAX handler for getting settings
	 */
	public function ajax_get_settings() {
		// Check nonce
		if ( ! check_ajax_referer( 'cf7dba_nonce', 'nonce', false ) ) {
			wp_send_json_error( array( 'message' => __( 'Security check failed', 'cf7dba' ) ) );
		}

		// Check if user has permission
		if ( ! $this->database->user_has_access() ) {
			wp_send_json_error( array( 'message' => __( 'Insufficient permissions', 'cf7dba' ) ) );
		}

		// Get settings
		$settings = $this->database->get_settings();
		$defaults = $this->database->get_default_settings();
		$settings = wp_parse_args( $settings, $defaults );

		wp_send_json_success( array( 'settings' => $settings ) );
	}

	/**
	 * AJAX test endpoint
	 */
	public function ajax_test_ajax() {
		error_log( 'CF7DBA: Test AJAX endpoint reached' );
		error_log( 'CF7DBA: POST data in test: ' . print_r( $_POST, true ) );
		error_log( 'CF7DBA: REQUEST data in test: ' . print_r( $_REQUEST, true ) );
		
		// Check nonce
		$nonce_check = check_ajax_referer( 'cf7dba_nonce', 'nonce', false );
		error_log( 'CF7DBA: Test nonce check result: ' . ( $nonce_check ? 'PASSED' : 'FAILED' ) );
		
		if ( ! $nonce_check ) {
			error_log( 'CF7DBA: Test nonce verification failed' );
			wp_send_json_error( array( 'message' => __( 'Security check failed', 'cf7dba' ) ) );
		}
		
		wp_send_json_success( array( 'message' => 'AJAX is working' ) );
	}
}
