<?php
/**
 * GoogleMapsFn MediaWiki extension
 * Defines parser function used to control Google maps v3
 *
 * @file
 * @ingroup Extensions
 * @version 0.2.0
 * @author Dmitriy Sintsov <questpc@rambler.ru>
 * @link https://www.mediawiki.org/wiki/Extension:GoogleMapsFn
 * @license http://www.gnu.org/copyleft/gpl.html GNU General Public License 2.0 or later
 */

if ( !defined( 'MEDIAWIKI' ) ) {
	die( "This is a MediaWiki extension, not a valid entry point.\n" );
}

/**
 * Parses and collects current map's marker data.
 */
class GMFnMarkers {

	// list of marker data
	static protected $markers = array();

	/**
	 * Convert {{#googlemap}} unnamed parameter into the marker data.
	 * Adds marker data to the list.
	 */
	static function add( $input ) {
		if ( !preg_match( '/^\s*(-?\d+\.\d+)\x20*,\x20*(-?\d+\.\d+)\s+(.+)\s*/s',
			$input,
			$matches ) ) {
			throw new GMFnException( wfMsg( 'gmfn-error-empty-marker-description' ) );
		}
		$markerCount = count( self::$markers );
		# latitude
		if ( !GMFn::isValidLatitude( $matches[1] ) ) {
			throw new GMFnException( wfMsg( 'gmfn-error-lat', htmlspecialchars( $matches[1] ) ) );
		}
		self::$markers[$markerCount] = array( 'lat' => floatval( $matches[1] ) );
		# longitude
		if ( !GMFn::isValidLongitude( $matches[2] ) ) {
			throw new GMFnException( wfMsg( 'gmfn-error-lng', htmlspecialchars( $matches[2] ) ) );
		}
		self::$markers[$markerCount]['lng'] = floatval( $matches[2] );
		# marker description
		self::$markers[$markerCount]['text'] = $matches[3];
	}

	/**
	 * Return markers data (for all markers available)
	 */
	static function getData( $edit ) {
		$result = array();
		if ( count( self::$markers ) == 0 ) {
			return $result;
		}
		foreach ( self::$markers as $marker ) {
			$result[] = array(
				'lat' => $marker['lat'],
				'lng' => $marker['lng'],
				'content' => $edit ? $marker['text'] : GMFn::parseWikiText( $marker['text'] )
			);
		}
		return $result;
	}

} /* end of GMFnMarkers class */
