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

/**
 * Represents horizontal or vertical dimension of map (axe).
 */

( function( $, mw ) {

mw.gmfn.dimension = function( type, value, units ) {
	this.type = type;
	this.value = value;
	this.units = units;
}

// list of prototypes to extend mw.gmfn.dimension
var _dimension = {};

_dimension.PxToEmRatio = 12;

/**
 * Note: whenever updating this list, do not forget to synchronize values with GMFnMap::$mapBounds
 */
_dimension.mapBounds = {
	'width': {
		'%':   {'min': 1, 'max': 100},
		'px':  {'min': _dimension.PxToEmRatio, 'max': 1920},
		'em':  {'min': 1, 'max': 1920 / _dimension.PxToEmRatio}
	},
	'height': {
		'px':  {'min': _dimension.PxToEmRatio, 'max': 1200},
		'em':  {'min': 1, 'max': 1200 / _dimension.PxToEmRatio}
	}
};

_dimension.setProps = function( dimObj ) {
	if ( dimObj.type !== this.type ) {
		throw new Error( 'Incompatible type passed into dimension.setProps(), value:' + dimObj.type +
			' required:' + this.type );
	}
	this.value = dimObj.value;
	this.units = dimObj.units;
}

/**
 * Note: IE8 does not like jQuery.extend() of prototype toString(),
 * returns '[object Object]'.
 * Replace back to toString() when IE8 will become obsolete
 */
_dimension.getString = function() {
	return '' + this.value + this.units;
}

_dimension.toUnits = function( newUnits ) {
	var newValue = this.value;
	if ( this.units === newUnits ) {
		// units were not changed, value is not recalculated
		return false;
	}
	switch ( this.units+'_'+newUnits ) {
	case 'px_em':
		newValue /= this.PxToEmRatio; break;
	case 'px_%':
		break;
	case 'em_px':
		newValue *= this.PxToEmRatio; break;
	case 'em_%':
		break;
	case '%_px':
		break;
	case '%_em':
		break;
	}
	// update value with new units constrains
	this.restrictValue( newUnits, newValue );
	return true;
}

_dimension.isValidValue = function( value ) {
	return mw.gmfn.isNumeric( value ) &&
		value >= this.mapBounds[this.type][this.units].min &&
		value <= this.mapBounds[this.type][this.units].max;
}

_dimension.restrictValue = function( newUnits, newValue ) {
	// update units;
	this.units = newUnits;
	// restrict value to bounds
	if ( newValue < this.mapBounds[this.type][newUnits].min ) {
		this.value = this.mapBounds[this.type][newUnits].min;
		return;
	}
	if ( newValue > this.mapBounds[this.type][newUnits].max ) {
		this.value = this.mapBounds[this.type][newUnits].max;
		return;
	}
	this.value = newValue;
}

_dimension.toValue = function( newValue ) {
	if ( this.isValidValue( newValue ) && this.value !== newValue ) {
		this.value = newValue;
		// true, when value is valid and was updated
		return true;
	}
	// false otherwise
	return false;
}

$.extend( mw.gmfn.dimension.prototype, _dimension );

} )( jQuery, mediaWiki ); 
