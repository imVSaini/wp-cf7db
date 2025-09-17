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
	 * @var Migration_Manager
	 */
	private $migration_manager;

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
		$this->migration_manager = new Migration_Manager();

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
		add_action( 'wp_ajax_cf7dba_save_table_settings', array( $this, 'ajax_save_table_settings' ) );
		add_action( 'wp_ajax_cf7dba_get_table_settings', array( $this, 'ajax_get_table_settings' ) );
		add_action( 'wp_ajax_cf7dba_check_migration', array( $this, 'ajax_check_migration' ) );
		add_action( 'wp_ajax_cf7dba_migrate_data', array( $this, 'ajax_migrate_data' ) );
		add_action( 'wp_ajax_cf7dba_export_cfdb7_backup', array( $this, 'ajax_export_cfdb7_backup' ) );
		add_action( 'wp_ajax_cf7dba_cleanup_cfdb7', array( $this, 'ajax_cleanup_cfdb7' ) );
		add_action( 'wp_ajax_cf7dba_debug_migration', array( $this, 'ajax_debug_migration' ) );
	}

	/**
	 * Add admin menu
	 */
	public function add_admin_menu() {
		add_menu_page(
			__( 'LeadSync', 'leadsync' ),
			__( 'LeadSync', 'leadsync' ),
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
			'leadsync-admin',
			CF7DBA_PLUGIN_URL . 'build/js/leadsync-admin.js',
			array(),
			CF7DBA_VERSION,
			true
		);

		wp_enqueue_style(
			'leadsync-admin',
			CF7DBA_PLUGIN_URL . 'build/css/leadsync-admin.css',
			array(),
			CF7DBA_VERSION
		);

		// Localize script with AJAX data
		wp_localize_script( 'leadsync-admin', 'cf7dba_ajax', array(
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
				__( 'You do not have sufficient permissions to access this page.', 'leadsync' ),
				__( 'Access Denied', 'leadsync' ),
				array( 'response' => 403 )
			);
		}
		
		?>
		<div class="wrap">
			<!-- <h1><?php // esc_html_e( 'LeadSync', 'leadsync' ); ?></h1> -->
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
			wp_send_json_error( array( 'message' => __( 'Form ID is required', 'leadsync' ) ) );
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
			wp_send_json_error( array( 'message' => __( 'You do not have permission to view submissions', 'leadsync' ) ) );
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
				wp_send_json_error( array( 'message' => __( 'You do not have permission to delete submissions', 'leadsync' ) ) );
			}

			$submission_id = intval( $_POST['submission_id'] ?? 0 );
			
			if ( empty( $submission_id ) ) {
				wp_send_json_error( array( 'message' => __( 'Submission ID is required', 'leadsync' ) ) );
			}

			// Check if delete_submission method exists
			if ( ! method_exists( $this->submission_manager, 'delete_submission' ) ) {
				wp_send_json_error( array( 'message' => 'Delete method not available' ) );
			}

			$result = $this->submission_manager->delete_submission( $submission_id );
			
			// Clear any output
			ob_clean();
			
			if ( $result ) {
				wp_send_json_success( array( 'message' => __( 'Submission deleted successfully', 'leadsync' ) ) );
			} else {
				wp_send_json_error( array( 'message' => __( 'Failed to delete submission', 'leadsync' ) ) );
			}
		} catch ( \Exception $e ) {
			ob_get_clean();
			wp_send_json_error( array( 'message' => __( 'An error occurred while deleting the submission', 'leadsync' ) ) );
		} catch ( \Error $e ) {
			ob_get_clean();
			wp_send_json_error( array( 'message' => __( 'A fatal error occurred while deleting the submission', 'leadsync' ) ) );
		}
	}


	/**
	 * AJAX: Export CSV
	 */
	public function ajax_export_csv() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has export permissions
		if ( ! $this->submission_manager->user_can_perform_action( 'export' ) ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to export data', 'leadsync' ) ) );
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
			wp_send_json_error( array( 'message' => __( 'No submissions found to export', 'leadsync' ) ) );
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
			wp_send_json_error( array( 'message' => __( 'Security check failed', 'leadsync' ) ) );
		}

		// Check if user has permission (only administrators can save settings)
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( array( 'message' => __( 'Insufficient permissions', 'leadsync' ) ) );
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
			wp_send_json_error( array( 'message' => __( 'No settings data provided', 'leadsync' ) ) );
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
			wp_send_json_success( array( 'message' => __( 'Settings saved successfully', 'leadsync' ) ) );
		} else {
			wp_send_json_error( array( 'message' => __( 'Failed to save settings', 'leadsync' ) ) );
		}
	}

	/**
	 * AJAX handler for getting settings
	 */
	public function ajax_get_settings() {
		// Check nonce
		if ( ! check_ajax_referer( 'cf7dba_nonce', 'nonce', false ) ) {
			wp_send_json_error( array( 'message' => __( 'Security check failed', 'leadsync' ) ) );
		}

		// Check if user has access
		if ( ! $this->submission_manager->user_has_access() ) {
			wp_send_json_error( array( 'message' => __( 'Insufficient permissions', 'leadsync' ) ) );
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

		$form_id = sanitize_text_field( $_POST['form_id'] ?? '' );
		$column_config = json_decode( stripslashes( $_POST['column_config'] ?? '[]' ), true );

		if ( empty( $form_id ) || ! is_array( $column_config ) ) {
			wp_send_json_error( array( 'message' => __( 'Invalid form ID or column configuration', 'leadsync' ) ) );
			return;
		}

		$success = $this->submission_manager->save_column_config( $form_id, $column_config );

		if ( $success ) {
			wp_send_json_success( array( 'message' => __( 'Column configuration saved successfully', 'leadsync' ) ) );
		} else {
			wp_send_json_error( array( 'message' => __( 'Failed to save column configuration', 'leadsync' ) ) );
		}
	}

	/**
	 * AJAX: Get column configuration
	 */
	public function ajax_get_column_config() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		$form_id = sanitize_text_field( $_POST['form_id'] ?? '' );

		if ( empty( $form_id ) ) {
			wp_send_json_error( array( 'message' => __( 'Invalid form ID', 'leadsync' ) ) );
			return;
		}

		// Get form fields for dynamic default generation
		$form_fields = array();
		if ( class_exists( 'WPCF7_ContactForm' ) ) {
			/** @var \WPCF7_ContactForm $contact_form */
			$contact_form = \WPCF7_ContactForm::get_instance( $form_id );
			if ( $contact_form ) {
				$form_fields = $this->get_form_fields_from_cf7( $contact_form );
			}
		}

		$column_config = $this->submission_manager->get_column_config( $form_id, $form_fields );

		wp_send_json_success( array( 'column_config' => $column_config ) );
	}

	/**
	 * Extract form fields from CF7 contact form
	 *
	 * @param \WPCF7_ContactForm $contact_form
	 * @return array
	 */
	private function get_form_fields_from_cf7( $contact_form ) {
		$form_fields = array();
		
		if ( ! $contact_form ) {
			return $form_fields;
		}

		// Get form content
		$form_content = $contact_form->prop( 'form' );
		
		// Parse form tags using CF7's built-in parser
		$form_tags = $contact_form->scan_form_tags();
		
		foreach ( $form_tags as $tag ) {
			$field_name = $tag->name;
			$field_type = $tag->type;
			
			// Skip system fields and non-input fields
			if ( empty( $field_name ) || in_array( $field_type, array( 'submit', 'reset', 'button' ) ) ) {
				continue;
			}
			
			// Get field label from tag options or use name
			$field_label = '';
			if ( isset( $tag->options ) && is_array( $tag->options ) ) {
				foreach ( $tag->options as $option ) {
					if ( strpos( $option, 'label:' ) === 0 ) {
						$field_label = substr( $option, 6 );
						break;
					}
				}
			}
			
			$form_fields[] = array(
				'name' => $field_name,
				'label' => $field_label,
				'type' => $field_type
			);
		}
		
		return $form_fields;
	}

	/**
	 * AJAX: Save table settings
	 */
	public function ajax_save_table_settings() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		$table_settings_raw = stripslashes( $_POST['table_settings'] ?? '{}' );
		$table_settings = json_decode( $table_settings_raw, true );

		if ( ! is_array( $table_settings ) ) {
			wp_send_json_error( array( 'message' => __( 'Invalid table settings', 'leadsync' ) ) );
			return;
		}

		$success = $this->submission_manager->save_table_settings( $table_settings );

		if ( $success ) {
			wp_send_json_success( array( 'message' => __( 'Table settings saved successfully', 'leadsync' ) ) );
		} else {
			wp_send_json_error( array( 'message' => __( 'Failed to save table settings', 'leadsync' ) ) );
		}
	}

	/**
	 * AJAX: Get table settings
	 */
	public function ajax_get_table_settings() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		$settings = $this->submission_manager->get_table_settings();
		wp_send_json_success( array( 'table_settings' => $settings ) );
	}


	/**
	 * AJAX: Check migration status
	 */
	public function ajax_check_migration() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has access to manage data
		if ( ! $this->submission_manager->user_can_perform_action( 'manage' ) ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to manage data', 'leadsync' ) ) );
			return;
		}

		$cfdb7_exists = $this->migration_manager->cfdb7_data_exists();
		$cfdb7_count = $this->migration_manager->get_cfdb7_data_count();
		$progress = $this->migration_manager->get_migration_progress();

		wp_send_json_success( array(
			'cfdb7_exists' => $cfdb7_exists,
			'cfdb7_count' => $cfdb7_count,
			'progress' => $progress
		) );
	}

	/**
	 * AJAX: Migrate data from CFDB7
	 */
	public function ajax_migrate_data() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has access to manage data
		if ( ! $this->submission_manager->user_can_perform_action( 'manage' ) ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to manage data', 'leadsync' ) ) );
			return;
		}

		$batch_size = (int) ( $_POST['batch_size'] ?? 100 );
		$offset = (int) ( $_POST['offset'] ?? 0 );

		$result = $this->migration_manager->migrate_cfdb7_data( $batch_size, $offset );

		if ( $result['success'] ) {
			wp_send_json_success( $result );
		} else {
			wp_send_json_error( $result );
		}
	}

	/**
	 * AJAX: Export CFDB7 backup
	 */
	public function ajax_export_cfdb7_backup() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has access to manage data
		if ( ! $this->submission_manager->user_can_perform_action( 'manage' ) ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to manage data', 'leadsync' ) ) );
			return;
		}

		$result = $this->migration_manager->export_cfdb7_data_to_csv();

		if ( $result && isset( $result['file_url'] ) ) {
			wp_send_json_success( array( 
				'message' => __( 'CFDB7 data exported successfully', 'leadsync' ),
				'filepath' => $result['file_url'],
				'filename' => $result['filename']
			) );
		} else {
			wp_send_json_error( array( 'message' => __( 'Failed to export CFDB7 data', 'leadsync' ) ) );
		}
	}

	/**
	 * AJAX: Cleanup CFDB7 data
	 */
	public function ajax_cleanup_cfdb7() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has access to manage data
		if ( ! $this->submission_manager->user_can_perform_action( 'manage' ) ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to manage data', 'leadsync' ) ) );
			return;
		}

		$success = $this->migration_manager->cleanup_cfdb7_data();

		if ( $success ) {
			wp_send_json_success( array( 'message' => __( 'CFDB7 data cleaned up successfully', 'leadsync' ) ) );
		} else {
			wp_send_json_error( array( 'message' => __( 'Failed to cleanup CFDB7 data or migration not complete', 'leadsync' ) ) );
		}
	}

	/**
	 * AJAX: Debug migration information
	 */
	public function ajax_debug_migration() {
		check_ajax_referer( 'cf7dba_nonce', 'nonce' );

		// Check if user has access to manage data
		if ( ! $this->submission_manager->user_can_perform_action( 'manage' ) ) {
			wp_send_json_error( array( 'message' => __( 'You do not have permission to manage data', 'leadsync' ) ) );
			return;
		}

		$debug_info = $this->migration_manager->get_debug_info();
		wp_send_json_success( $debug_info );
	}

}
