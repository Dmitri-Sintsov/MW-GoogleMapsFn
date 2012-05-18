<?php
/**
 * GoogleMapsFn MediaWiki extension
 * Defines parser function used to control Google maps v3
 *
 * @file
 * @ingroup Extensions
 * @version 0.1
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

	static private $zoom = array(
		'def' => 15,
		'min' => 0,
		'max' => 21
	);

	protected $mapIndex = null;
	protected $inputs;
	protected $attrs;

	function __construct( $inputs, $attrs, $mapIndex ) {
		$this->inputs = $inputs;
		$this->attrs = $attrs;
		$this->mapIndex = $mapIndex;
	}

	function __toString() {
		try {
			# validate latitude / longitude
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
			# xml attributes are valid, now check inner text
			foreach ( $this->inputs as $input ) {
				GMFnMarkers::add( $input );
			}
			# generate output
			return $this->generateOutput();
		} catch( GMFnException $e ) {
			return '<strong class="error">' . $e->getMessage() . '</strong>';
		}
	}

	function getDivDimension( $dim ) {
		$matches = array();
		# select dimension
		$mb = &self::$mapBounds[$dim];
		if ( !array_key_exists( $dim, $this->attrs ) ||
				!preg_match( '/^(\d{1,4})(%|[A-Za-z]+|)$/', $this->attrs[$dim], $matches ) ) {
			# set default value
			return $mb['def'];
		}
		# find out the type of dimension
		$type = ($matches[2] === '') ? 'px' : $matches[2];
		# whether the specified type is supported for dimension
		if ( !array_key_exists( $type, $mb ) ) {
			throw new GMFnException( wfMsg( "gmfn-error-{$dim}", $this->attrs[$dim] ) );
		}
		# whether the specified value fits into the bounds for corresponding type
		if ( $matches[1] < $mb[$type]['min'] ) {
			return $mb[$type]['min'] . $type;
		} elseif ( $matches[1] > $mb[$type]['max'] ) {
			return $mb[$type]['max'] . $type;
		}
		# value is correct, pass it as CSS attr
		return $matches[1] . $type;
	}

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

	protected function getAlignClass() {
		return ( !array_key_exists( 'align', $this->attrs ) || $this->attrs['align'] === 'right' ) ?
			'tright' : 'tleft';
	}

	function inEditMode() {
		return array_key_exists( 'edit', $this->attrs ) && $this->attrs['edit'] != false;
	}

	protected function generateOutput() {
		$mapTag = GMFn::MAP_TAG;
		$width = $this->getDivDimension( 'width' );
		$height = $this->getDivDimension( 'height' );
		/* we do not apply floatval() anymore due to rounding errors */
		$mapData = array(
			'lat' => $this->attrs['lat'],
			'lng' => $this->attrs['lng'],
			'zoom' => $this->getZoom()
		);
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
		if ( count( $markers = GMFnMarkers::generate( array_key_exists( 'edit', $this->attrs ) ) ) > 0 ) {
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
