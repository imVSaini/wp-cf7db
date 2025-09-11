<?php
/**
 * Admin Interface Component
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA\Components;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Admin_Interface {

	/**
	 * @var Form_Manager
	 */
	private $form_manager;

	/**
	 * @var Submission_Manager
	 */
	private $submission_manager;

	/**
	 * @var Export_Manager
	 */
	private $export_manager;

	/**
	 * Constructor
	 *
	 * @param Form_Manager $form_manager
	 * @param Submission_Manager $submission_manager
	 * @param Export_Manager $export_manager
	 */
	public function __construct( Form_Manager $form_manager, Submission_Manager $submission_manager, Export_Manager $export_manager ) {
		$this->form_manager = $form_manager;
		$this->submission_manager = $submission_manager;
		$this->export_manager = $export_manager;

		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_scripts' ) );
		add_action( 'wp_ajax_cf7dba_get_forms', array( $this, 'ajax_get_forms' ) );
		add_action( 'wp_ajax_cf7dba_get_form_fields', array( $this, 'ajax_get_form_fields' ) );
		add_action( 'wp_ajax_cf7dba_get_submissions', array( $this, 'ajax_get_submissions' ) );
		add_action( 'wp_ajax_cf7dba_delete_submission', array( $this, 'ajax_delete_submission' ) );
		add_action( 'wp_ajax_cf7dba_export_csv', array( $this, 'ajax_export_csv' ) );
		add_action( 'wp_ajax_cf7dba_save_settings', array( $this, 'ajax_save_settings' ) );
		add_action( 'wp_ajax_cf7dba_get_settings', array( $this, 'ajax_get_settings' ) );
		add_action( 'wp_ajax_cf7dba_save_column_config', array( $this, 'ajax_save_column_config' ) );
		add_action( 'wp_ajax_cf7dba_get_column_config', array( $this, 'ajax_get_column_config' ) );
	}

	/**
	 * Add admin menu
	 */
	public function add_admin_menu() {
		add_menu_page(
			__( 'LeadSync', 'cf7dba' ),
			__( 'LeadSync', 'cf7dba' ),
			'edit_posts', // Editors have this capability
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

		// Check if user has access to the plugin
		if ( ! $this->submission_manager->user_has_access() ) {
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
		// Check if user has access to the plugin
		if ( ! $this->submission_manager->user_has_access() ) {
			wp_die( 
				__( 'You do not have sufficient permissions to access this page.', 'cf7dba' ),
				__( 'Access Denied', 'cf7dba' ),
				array( 'response' => 403 )
			);
		}
		
		?>
		<div class="wrap">
			<!-- <h1><?php // esc_html_e( 'LeadSync', 'cf7dba' ); ?></h1> -->
			<div id="cf7db-admin-app">
				<p>Loading LeadSync...</p>
				<p>If this message persists, please check the browser console for errors.</p>
			</div>
			<!-- Ant Design Message Container -->
			<div id="antd-message-container"></div>
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

		$forms = $this->form_manager->get_forms();
		
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

		$fields = $this->form_manager->get_form_fields( $form_id );
		
		wp_send_json_success( array( 'fields' => $fields ) );
	}

	/**
	 * AJAX: Get submissions
	 */
	public function ajax_get_submissions() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has access to view submissions
		if ( ! $this->submission_manager->user_has_access() ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to view submissions', 'cf7dba' ) ) );
		}

		$args = array(
			'form_id' => sanitize_text_field( $_POST['form_id'] ?? '' ),
			'page' => intval( $_POST['page'] ?? 1 ),
			'per_page' => intval( $_POST['per_page'] ?? 15 ),
			'search' => sanitize_text_field( $_POST['search'] ?? '' ),
			'start_date' => sanitize_text_field( $_POST['start_date'] ?? '' ),
			'end_date' => sanitize_text_field( $_POST['end_date'] ?? '' ),
		);

		$result = $this->submission_manager->get_submissions( $args );
		
		// Return the result with proper structure
		wp_send_json_success( $result );
	}

	/**
	 * AJAX: Delete submission
	 */
	public function ajax_delete_submission() {
		// Start output buffering to catch any errors
		ob_start();
		
		try {
			check_ajax_referer( 'cf7dba_nonce', 'nonce' );

			// Check if submission_manager exists and has the method
			if ( ! isset( $this->submission_manager ) ) {
				wp_send_json_error( array( 'message' => 'Submission manager not available' ) );
			}
			
			if ( ! method_exists( $this->submission_manager, 'user_can_perform_action' ) ) {
				wp_send_json_error( array( 'message' => 'Permission check method not available' ) );
			}

			// Check if user has delete permissions
			$can_delete = $this->submission_manager->user_can_perform_action( 'delete' );
			
			if ( ! $can_delete ) {
				wp_send_json_error( array( 'message' => __( 'You do not have permission to delete submissions', 'cf7dba' ) ) );
			}

			$submission_id = intval( $_POST['submission_id'] ?? 0 );
			
			if ( empty( $submission_id ) ) {
				wp_send_json_error( array( 'message' => __( 'Submission ID is required', 'cf7dba' ) ) );
			}

			// Check if delete_submission method exists
			if ( ! method_exists( $this->submission_manager, 'delete_submission' ) ) {
				wp_send_json_error( array( 'message' => 'Delete method not available' ) );
			}

			$result = $this->submission_manager->delete_submission( $submission_id );
			
			// Clear any output
			ob_clean();
			
			if ( $result ) {
				wp_send_json_success( array( 'message' => __( 'Submission deleted successfully', 'cf7dba' ) ) );
			} else {
				wp_send_json_error( array( 'message' => __( 'Failed to delete submission', 'cf7dba' ) ) );
			}
		} catch ( Exception $e ) {
			ob_get_clean();
			wp_send_json_error( array( 'message' => __( 'An error occurred while deleting the submission', 'cf7dba' ) ) );
		} catch ( Error $e ) {
			ob_get_clean();
			wp_send_json_error( array( 'message' => __( 'A fatal error occurred while deleting the submission', 'cf7dba' ) ) );
		}
	}


	/**
	 * AJAX: Export CSV
	 */
	public function ajax_export_csv() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has export permissions
		if ( ! $this->submission_manager->user_can_perform_action( 'export' ) ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to export data', 'cf7dba' ) ) );
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

		$result = $this->submission_manager->get_submissions( $args );
		
		if ( empty( $result['submissions'] ) ) {
			wp_send_json_error( array( 'message' => __( 'No submissions found to export', 'cf7dba' ) ) );
		}

		$csv_data = $this->export_manager->generate_csv( $result['submissions'], $form_id );
		
		wp_send_json_success( array( 'csv_data' => $csv_data ) );
	}

	/**
	 * AJAX handler for saving settings
	 */
	public function ajax_save_settings() {
		// Check nonce
		if ( ! check_ajax_referer( 'cf7dba_nonce', 'nonce', false ) ) {
			wp_send_json_error( array( 'message' => __( 'Security check failed', 'cf7dba' ) ) );
		}

		// Check if user has permission (only administrators can save settings)
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => __( 'Insufficient permissions', 'cf7dba' ) ) );
		}

		// Parse settings from POST data
		$settings = array();
		if ( isset( $_POST['settings'] ) && is_array( $_POST['settings'] ) ) {
			$settings = $_POST['settings'];
		} else {
			// Handle individual settings fields
			foreach ( $_POST as $key => $value ) {
				if ( strpos( $key, 'settings[' ) === 0 ) {
					$setting_key = str_replace( array( 'settings[', ']' ), '', $key );
					$settings[ $setting_key ] = $value;
				}
			}
		}

		if ( empty( $settings ) ) {
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
				// Properly handle boolean values from frontend
				if ( $value === 'false' || $value === false || $value === '0' || $value === 0 ) {
					$sanitized_settings[ $key ] = false;
				} else {
					$sanitized_settings[ $key ] = true;
				}
			}
		}

		// Save settings using the database operations
		$success = $this->submission_manager->save_settings( $sanitized_settings );

		if ( $success ) {
			wp_send_json_success( array( 'message' => __( 'Settings saved successfully', 'cf7dba' ) ) );
		} else {
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

		// Check if user has access
		if ( ! $this->submission_manager->user_has_access() ) {
			wp_send_json_error( array( 'message' => __( 'Insufficient permissions', 'cf7dba' ) ) );
		}

		// Get settings using the database operations
		$settings = $this->submission_manager->get_settings();
		$defaults = $this->submission_manager->get_default_settings();
		$settings = wp_parse_args( $settings, $defaults );

		wp_send_json_success( array( 'settings' => $settings ) );
	}

	/**
	 * AJAX: Save column configuration
	 */
	public function ajax_save_column_config() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has permission to manage columns
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to manage columns', 'cf7dba' ) ) );
			return;
		}

		$form_id = sanitize_text_field( $_POST['form_id'] ?? '' );
		$column_config = json_decode( stripslashes( $_POST['column_config'] ?? '[]' ), true );

		if ( empty( $form_id ) || ! is_array( $column_config ) ) {
			wp_send_json_error( array( 'message' => __( 'Invalid form ID or column configuration', 'cf7dba' ) ) );
			return;
		}

		$success = $this->submission_manager->save_column_config( $form_id, $column_config );

		if ( $success ) {
			wp_send_json_success( array( 'message' => __( 'Column configuration saved successfully', 'cf7dba' ) ) );
		} else {
			wp_send_json_error( array( 'message' => __( 'Failed to save column configuration', 'cf7dba' ) ) );
		}
	}

	/**
	 * AJAX: Get column configuration
	 */
	public function ajax_get_column_config() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has access to view data
		if ( ! $this->submission_manager->user_has_access() ) {
			wp_send_json_error( array( 'message' => __( 'Insufficient permissions', 'cf7dba' ) ) );
			return;
		}

		$form_id = sanitize_text_field( $_POST['form_id'] ?? '' );

		if ( empty( $form_id ) ) {
			wp_send_json_error( array( 'message' => __( 'Invalid form ID', 'cf7dba' ) ) );
			return;
		}

		$column_config = $this->submission_manager->get_column_config( $form_id );

		wp_send_json_success( array( 'column_config' => $column_config ) );
	}

}
