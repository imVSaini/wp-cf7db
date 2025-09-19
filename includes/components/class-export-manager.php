<?php
/**
 * Export Manager Component
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA\Components;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Export_Manager {

	/**
	 * @var Database_Operations
	 */
	private $database_operations;

	/**
	 * Constructor
	 */
	public function __construct() {
		$this->database_operations = new Database_Operations();
	}

	/**
	 * Generate CSV data from submissions using column configuration
	 *
	 * @param array $submissions
	 * @param string $form_id
	 * @return string
	 */
	public function generate_csv( $submissions, $form_id = '' ) {
		if ( empty( $submissions ) ) {
			return '';
		}

		// Extract form fields from submissions to pass to get_column_config
		$form_fields = array();
		$all_fields = array();
		foreach ( $submissions as $submission ) {
			if ( isset( $submission['form_data'] ) && is_array( $submission['form_data'] ) ) {
				$all_fields = array_merge( $all_fields, array_keys( $submission['form_data'] ) );
			}
		}
		$all_fields = array_unique( $all_fields );
		
		// Convert form fields to the format expected by get_column_config
		foreach ( $all_fields as $field ) {
			$form_fields[] = array(
				'name' => $field,
				'label' => ucwords( str_replace( array( '_', '-' ), ' ', $field ) )
			);
		}

		// Get column configuration from database if form_id is provided
		$column_config = array();
		if ( ! empty( $form_id ) ) {
			$column_config = $this->database_operations->get_column_config( $form_id, $form_fields );
		}

		// If no column config found, create fallback config from submissions
		if ( empty( $column_config ) ) {
			// Create basic column config from extracted fields
			$column_config = array();
			
			// Add metadata fields first with proper default visibility
			$metadata_fields = array(
				'id' => array('title' => __( 'ID', 'leadsync' ), 'visible' => true),
				'submit_ip' => array('title' => __( 'Submit IP', 'leadsync' ), 'visible' => false),
				'submit_datetime' => array('title' => __( 'Submit Time', 'leadsync' ), 'visible' => true),
				'submit_user_id' => array('title' => __( 'User ID', 'leadsync' ), 'visible' => false)
			);
			
			foreach ( $metadata_fields as $key => $config ) {
				$column_config[] = array(
					'key' => $key,
					'title' => $config['title'],
					'visible' => $config['visible'],
					'order' => count( $column_config ),
					'isMetadata' => true
				);
			}
			
			// Add form data fields
			foreach ( $all_fields as $field ) {
				$column_config[] = array(
					'key' => $field,
					'title' => ucwords( str_replace( array( '_', '-' ), ' ', $field ) ),
					'visible' => true,
					'order' => count( $column_config ),
					'isMetadata' => false
				);
			}
		}

		// Filter only visible columns
		$visible_columns = array_filter( $column_config, function( $col ) {
			return $col['visible'] === true;
		});

		// Sort by order
		usort( $visible_columns, function( $a, $b ) {
			return ( $a['order'] ?? 0 ) - ( $b['order'] ?? 0 );
		});

		// Start CSV output
		$output = fopen( 'php://temp', 'r+' );

		// CSV headers - use only visible columns from config
		$headers = array();
		foreach ( $visible_columns as $column ) {
			$headers[] = $column['title'] ?? $column['key'];
		}
		fputcsv( $output, $headers );

		// CSV data rows
		foreach ( $submissions as $submission ) {
			$row = array();

			// Add data for each visible column based on column configuration
			foreach ( $visible_columns as $column ) {
				$field_key = $column['key'];
				$value = '';

				// Handle metadata fields
				if ( $field_key === 'id' ) {
					$value = $submission['id'] ?? '';
				} elseif ( $field_key === 'submit_ip' ) {
					$value = $submission['submit_ip'] ?? '';
				} elseif ( $field_key === 'submit_datetime' ) {
					$value = $submission['submit_datetime'] ?? '';
				} elseif ( $field_key === 'submit_user_id' ) {
					$value = $submission['submit_user_id'] ?? '';
				} else {
					// Handle form data fields
					if ( isset( $submission['form_data'][ $field_key ] ) ) {
						$field_value = $submission['form_data'][ $field_key ];
						if ( is_array( $field_value ) ) {
							$value = implode( ', ', $field_value );
						} else {
							$value = (string) $field_value;
						}
					}
				}

				$row[] = $value;
			}

			fputcsv( $output, $row );
		}

		// Get CSV content
		rewind( $output );
		$csv_content = stream_get_contents( $output );
		fclose( $output );

		return $csv_content;
	}

	/**
	 * Download CSV file
	 *
	 * @param string $csv_content
	 * @param string $filename
	 */
	public function download_csv( $csv_content, $filename = 'cf7-submissions.csv' ) {
		header( 'Content-Type: text/csv' );
		header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
		header( 'Content-Length: ' . strlen( $csv_content ) );
		echo $csv_content;
		exit;
	}
}
