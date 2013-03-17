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
 * Stores xml attributes of tag and generates the header string.
 */

( function( $, mw ) {

mw.gmfn.TagHeader = function( $node, options ) {
	this.$node = $node;
	this.options = {};
	// set default option values
	this.setOptions( {}, true );
	// set passed option values
	this.setOptions( options );
	// visualize options
	this.update();
}

// list of prototypes to extend mw.gmfn.TagHeader
var _TagHeader = {};

_TagHeader.defaultOptions = {
	// null value means that attribute will not be displayed
	'lat': { 'value': null, 'nl': false },
	'lng': { 'value': null, 'nl': false },
	'zoom': { 'value': null, 'nl': false },
	'align': { 'value': null, 'nl': false },
	'width': { 'value': null, 'nl': false },
	'height': { 'value': null, 'nl': false },
	'searchbox': { 'value': null, 'nl': false },
	'edit': { 'value': '1', 'nl': false },
	'caption': { 'value': null, 'nl': true }
}

_TagHeader.setOptions = function( options, setDefault ) {
	for ( var key in this.defaultOptions ) {
		if ( typeof options[key] !== 'undefined' ) {
			this.options[key] = options[key];
		} else {
			if ( setDefault ) {
				this.options[key] = this.defaultOptions[key].value;
			}
		}
	}
}

/**
 * Note: IE8 does not like jQuery.extend() of prototype toString(),
 * returns '[object Object]'.
 * Replace back to toString() when IE8 will become obsolete
 */
_TagHeader.getString = function() {
	var result = '';
	for ( var attr in this.options ) {
		if ( this.options[attr] !== null ) {
			if ( this.defaultOptions[attr].nl ) {
				result += '\n';
			}
			if ( result != '' && result != '\n' ) {
				result += '|';
			}
			result += attr + '=' + this.options[attr];
		}
	}
	return '{{#googlemap:'  + result;
}

_TagHeader.update = function( options ) {
	if ( options !== undefined ) {
		this.setOptions( options );
	}
	this.$node.text( this.getString() );
}

$.extend( mw.gmfn.TagHeader.prototype, _TagHeader );

} )( jQuery, mediaWiki ); 
