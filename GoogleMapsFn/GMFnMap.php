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
 * Parses and generates the map output, including markers (if any)
 */
class GMFnMap {

	const CSS_CLASS_MATCH = '/^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/';

	/**
	 * Note: whenever updating this list, do not forget to synchronize values with
	 * mw.gmfn.dimension.prototype.mapBounds
	 */
	static private $mapBounds = array(
		'width' =>  array(
			'def' => '800px', # default value
			# intervals of allowed values
			'%' =>   array( 'min' => 1, 'max' => 100 ),
			'px' =>  array( 'min' => 12, 'max' => 1920 ),
			'em' =>  array( 'min' => 1, 'max' => 160 )
		),
		# div.css('height','50%') is broken thus not allowed
		'height' => array(
			'def' => '600px', # default value
			# intervals of allowed values
			'px' =>  array( 'min' => 12, 'max' => 1200 ),
			'em' =>  array( 'min' => 1, 'max' => 100 )
		)
	);

	# map default / min / max zoom
	static private $zoom = array(
		'def' => 15,
		'min' => 0,
		'max' => 21
	);

	protected $mapIndex = null;
	protected $rawMarkers;
	protected $attrs;

	function __construct( $rawMarkers, $attrs, $mapIndex ) {
		$this->rawMarkers = $rawMarkers;
		$this->attrs = $attrs;
		$this->mapIndex = $mapIndex;
	}

	/**
	 * Validate latitude / longitude map attributes.
	 */
	function validateLatLng() {
		$lat = array_key_exists( 'lat', $this->attrs ) ? $this->attrs['lat'] : '?';
		if ( !GMFn::isValidLatitude( $lat ) ) {
			throw new GMFnException( wfMsg( 'gmfn-error-lat', htmlspecialchars( $lat ) ) );
		}
		if ( array_key_exists( 'lng', $this->attrs ) ) {
			$lng = $this->attrs['lng'];
		} elseif ( array_key_exists( 'lon', $this->attrs ) ) {
			// compatibility to alpha versions
			$lng = $this->attrs['lng'] = $this->attrs['lon'];
			unset( $this->attrs['lon'] );
		} else {
			$lng = '?';
		}
		if ( !GMFn::isValidLongitude( $lng ) ) {
			throw new GMFnException( wfMsg( 'gmfn-error-lng', htmlspecialchars( $lng ) ) );
		}
	}

	/**
	 * Returns html repsesentation of current map.
	 */
	function __toString() {
		try {
			$this->validateLatLng();
			# xml attributes are valid, now add markers text;
			# also checks marker text for syntax errors.
			foreach ( $this->rawMarkers as $rawMarker ) {
				GMFnMarkers::add( $rawMarker );
			}
			# generate html output
			return $this->generateOutput();
		} catch( GMFnException $e ) {
			return '<strong class="error">' . $e->getMessage() . '</strong>';
		}
	}

	/**
	 * Sanitizes 'width' or 'height' parser function attribute
	 * in the limited subset of CSS.
	 * Also imposes specified min,max limits of dimension according
	 * to it's CSS units type.
	 * @param $dim string
	 *   attribute key: 'width' or 'height'
	 * @return sanitized CSS dimension value (string)
	 */
	function getDivDimension( $dim ) {
		$matches = array();
		# get a reference to dimension bounds
		$mb = &self::$mapBounds[$dim];
		if ( !array_key_exists( $dim, $this->attrs ) ||
				!preg_match( '/^(\d{1,4})(%|[A-Za-z]+|)$/', $this->attrs[$dim], $matches ) ) {
			# set default value
			return $mb['def'];
		}
		# find out the units type of dimension
		$type = ($matches[2] === '') ? 'px' : $matches[2];
		# whether the specified units type is supported for dimension
		if ( !array_key_exists( $type, $mb ) ) {
			throw new GMFnException( wfMsg( "gmfn-error-{$dim}", $this->attrs[$dim] ) );
		}
		# restrict units value into the bounds for corresponding units type
		if ( $matches[1] < $mb[$type]['min'] ) {
			return $mb[$type]['min'] . $type;
		} elseif ( $matches[1] > $mb[$type]['max'] ) {
			return $mb[$type]['max'] . $type;
		}
		# value is correct, pass it as CSS attr
		return $matches[1] . $type;
	}

	/**
	 * Get current map zoom value from 'zoom' attribute.
	 * @return string
	 *   value of map zoom
	 */
	function getZoom() {
		if ( array_key_exists( 'zoom', $this->attrs ) &&
			is_numeric( $this->attrs['zoom'] ) ) {
			if ( $this->attrs['zoom'] < self::$zoom['min'] ) {
				return self::$zoom['min'];
			}
			if ( $this->attrs['zoom'] > self::$zoom['max'] ) {
				return self::$zoom['max'];
			}
			return intval( $this->attrs['zoom'] );
		}
		return self::$zoom['def'];
	}

	protected function getAttr( $key ) {
		return array_key_exists( $key, $this->attrs ) ? $this->attrs[$key] : '';
	}

	/**
	 * Get div thumb class used for map alignment from 'align' attribute.
	 * @return string
	 *		CSS class name
	 */
	protected function getAlignClass() {
		return ( !array_key_exists( 'align', $this->attrs ) || $this->attrs['align'] === 'right' ) ?
			'tright' : 'tleft';
	}

	/**
	 * Whether the current map is in 'edit' mode.
	 */
	function inEditMode() {
		return array_key_exists( 'edit', $this->attrs ) && $this->attrs['edit'] != false;
	}

	/**
	 * Whether the current map shound display SearchBox.
	 */
	function hasSearchBox() {
		return array_key_exists( 'searchbox', $this->attrs ) && $this->attrs['searchbox'] != false;
	}

	protected function generateOutput() {
		$mapTag = GMFn::MAP_TAG;
		$width = $this->getDivDimension( 'width' );
		$height = $this->getDivDimension( 'height' );
		/* we do not apply floatval() anymore due to base10/base2 inprecise conversion */
		# associative array of html5 data attribute
		$mapData = array(
			'lat' => $this->attrs['lat'],
			'lng' => $this->attrs['lng'],
			'zoom' => $this->getZoom()
		);
		if ( $this->hasSearchBox() ) {
			$mapData['searchbox'] = 1;
		}
		if ( $this->inEditMode() ) {
			// edit mode;
			$mapData['edit'] = 1;
			# protect caption from wikitext transformation by storing it into $mapData[]
			$mapData['caption'] = htmlspecialchars( $this->getAttr( 'caption' ) );
			$captionWrapper = "<div class=\"thumbcaption\"></div>\n";
			$editAttr = ' ' . GMFn::EDIT_ATTR;
		} else {
			// view mode;
			# there is no XSS, because the caption will be transformed from wikitext as
			# the result of parser function
			$caption = $this->getAttr( 'caption' );
			$captionWrapper = ( $caption !== '' ) ?
				"<div class=\"thumbcaption\">{$caption}</div>\n" :
				// when caption is empty in view mode, do not insert caption at all
				// to make borders around map equal
				'';
			$editAttr = '';
		}
		$innerStyle = "width:{$width}; height:{$height}; ";
		$outerStyle = "width:{$width}; height:auto; ";
		$alignClass = $this->getAlignClass();
		$markers = GMFnMarkers::getData( $this->inEditMode() );
		if ( count( $markers ) > 0 ) {
			$mapData['markers'] = $markers;
		}
		$mapDataStr = htmlspecialchars( FormatJson::encode( $mapData ) );
		return <<<EOT
<div class="thumb {$alignClass}" style="{$outerStyle}">
<div class="thumbinner" style="{$outerStyle}">
{$mapTag}{$editAttr} data-gmfn="{$mapDataStr}" id="gmfn_canvas{$this->mapIndex}" style="{$innerStyle}"></div>
{$captionWrapper}</div>
</div>
EOT;
	}

} /* end of GMFnMap class */
