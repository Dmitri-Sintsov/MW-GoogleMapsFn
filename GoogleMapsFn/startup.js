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
 * Startup code.
 * This code has to be placed into the firstly initialized module.
 */

( function( $, mw ) {

// window.console is unavailable in some browsers when debugging mode is inactive.
// There is no need to use DOM emulated console, real debugger is enough.
if ( window.console === undefined ) {
	window.console = { 'log': function() { /* noop */ } };
}

if ( mw.gmfn === undefined ) {
	// Holder of gmfn extension classes, functions and properties.
	mw.gmfn = {};
} else {
	throw new Error( 'mw.gmfn is already defined. Make sure there are no conflicting extensions.' );
}

/**
 * From http://phpjs.org/functions/is_numeric:449
 */
mw.gmfn.isNumeric = function( mixed_var ) {
	// http://kevin.vanzonneveld.net
	// +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// +   improved by: David
	// +   improved by: taith
	// +   bugfixed by: Tim de Koning
	// +   bugfixed by: WebDevHobo (http://webdevhobo.blogspot.com/)
	// +   bugfixed by: Brett Zamir (http://brett-zamir.me)
	// *     example 1: is_numeric(186.31);
	// *     returns 1: true
	// *     example 2: is_numeric('Kevin van Zonneveld');
	// *     returns 2: false
	// *     example 3: is_numeric('+186.31e2');
	// *     returns 3: true
	// *     example 4: is_numeric('');
	// *     returns 4: false
	// *     example 4: is_numeric([]);
	// *     returns 4: false
	return (typeof(mixed_var) === 'number' || typeof(mixed_var) === 'string') && mixed_var !== '' && !isNaN(mixed_var);
}

mw.gmfn.isValidlat = function( lat ) {
	return mw.gmfn.isNumeric( lat ) && lat >= -90 && lat <= 90;
}

mw.gmfn.isValidlng = function( lng ) {
	return mw.gmfn.isNumeric( lng ) && lng >= -180 && lng <= 180;
}

})( jQuery, mediaWiki );
