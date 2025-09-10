<?php
/**
 * CSV Exporter
 *
 * @package CF7DBA
 * @since 1.0.0
 */

namespace CF7DBA;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Exporter {

	/**
	 * @var Database
	 */
	private $database;

	/**
	 * Constructor
	 *
	 * @param Database $database
	 */
	public function __construct( Database $database ) {
		$this->database = $database;
	}

	/**
	 * Generate CSV data from submissions
	 *
	 * @param array $submissions
	 * @return string
	 */
	public function generate_csv( $submissions ) {
		if ( empty( $submissions ) ) {
			return '';
		}

		// Get all unique field names from submissions
		$all_fields = array();
		foreach ( $submissions as $submission ) {
			if ( isset( $submission['form_data'] ) && is_array( $submission['form_data'] ) ) {
				$all_fields = array_merge( $all_fields, array_keys( $submission['form_data'] ) );
			}
		}
		$all_fields = array_unique( $all_fields );

		// Start output buffering
		ob_start();

		// Create CSV header
		$headers = array(
			'ID',
			'Form ID',
			'Form Title',
			'Submit IP',
			'Submit Date',
			'Submit User ID',
		);

		// Add dynamic form fields
		foreach ( $all_fields as $field ) {
			$headers[] = ucwords( str_replace( array( '_', '-' ), ' ', $field ) );
		}

		// Output headers
		$this->output_csv_row( $headers );

		// Output data rows
		foreach ( $submissions as $submission ) {
			$row = array(
				$submission['id'],
				$submission['form_id'],
				$submission['form_title'],
				$submission['submit_ip'] ?? '',
				$submission['submit_datetime'],
				$submission['submit_user_id'] ?? '',
			);

			// Add form data fields
			$form_data = isset( $submission['form_data'] ) ? $submission['form_data'] : array();
			foreach ( $all_fields as $field ) {
				$value = isset( $form_data[ $field ] ) ? $form_data[ $field ] : '';
				
				// Handle array values (like checkboxes)
				if ( is_array( $value ) ) {
					$value = implode( ', ', $value );
				}
				
				$row[] = $value;
			}

			$this->output_csv_row( $row );
		}

		return ob_get_clean();
	}

	/**
	 * Output a CSV row
	 *
	 * @param array $row
	 */
	private function output_csv_row( $row ) {
		$output = fopen( 'php://temp', 'r+' );
		fputcsv( $output, $row );
		rewind( $output );
		echo stream_get_contents( $output );
		fclose( $output );
	}

	/**
	 * Download CSV file
	 *
	 * @param array $submissions
	 * @param string $filename
	 */
	public function download_csv( $submissions, $filename = 'cf7-submissions.csv' ) {
		$csv_data = $this->generate_csv( $submissions );

		// Set headers for file download
		header( 'Content-Type: text/csv' );
		header( 'Content-Disposition: attachment; filename="' . $filename . '"' );
		header( 'Content-Length: ' . strlen( $csv_data ) );
		header( 'Cache-Control: no-cache, must-revalidate' );
		header( 'Expires: Sat, 26 Jul 1997 05:00:00 GMT' );

		echo $csv_data;
		exit;
	}

	/**
	 * Export submissions by form ID
	 *
	 * @param string $form_id
	 * @param string $start_date
	 * @param string $end_date
	 * @return string
	 */
	public function export_form_submissions( $form_id, $start_date = '', $end_date = '' ) {
		$args = array(
			'form_id' => $form_id,
			'start_date' => $start_date,
			'end_date' => $end_date,
			'per_page' => -1, // Get all records
		);

		$result = $this->database->get_submissions( $args );
		
		return $this->generate_csv( $result['submissions'] );
	}

	/**
	 * Get export statistics
	 *
	 * @param array $submissions
	 * @return array
	 */
	public function get_export_stats( $submissions ) {
		$stats = array(
			'total_submissions' => count( $submissions ),
			'date_range' => array(
				'start' => null,
				'end' => null,
			),
			'forms' => array(),
		);

		if ( empty( $submissions ) ) {
			return $stats;
		}

		$dates = array();
		foreach ( $submissions as $submission ) {
			$dates[] = $submission['submit_datetime'];
			
			$form_id = $submission['form_id'];
			if ( ! isset( $stats['forms'][ $form_id ] ) ) {
				$stats['forms'][ $form_id ] = array(
					'form_id' => $form_id,
					'form_title' => $submission['form_title'],
					'count' => 0,
				);
			}
			$stats['forms'][ $form_id ]['count']++;
		}

		if ( ! empty( $dates ) ) {
			$stats['date_range']['start'] = min( $dates );
			$stats['date_range']['end'] = max( $dates );
		}

		return $stats;
	}
}
