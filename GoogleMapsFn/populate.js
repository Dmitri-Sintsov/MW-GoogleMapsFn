/**
 * GoogleMapsFn MediaWiki extension
 * Defines parser function used to control Google maps v3
 *
 * @file
 * @ingroup Extensions
 * @version 0.1.1
 * @author Dmitriy Sintsov <questpc@rambler.ru>
 * @link https://www.mediawiki.org/wiki/Extension:GoogleMapsFn
 * @license http://www.gnu.org/copyleft/gpl.html GNU General Public License 2.0 or later
 */

/**
 * Find out whether the tags and data are defined on page.
 * Additionally loads edit modules, when needed.
 */

(function ($, mw) {

// list of source map parameters defined by parser tag function
var mapDataList = {};
// list of MapController instances
var MapControllers = [];

/**
 * Create MapControllers from mapData available
 */
mw.gmfn.createMapControllers = function() {
	$.each(mapDataList, function( mapIndex, mapData ) {
		MapControllers.push( new mw.gmfn.MapController( mapIndex, mapData ) );
	});
}

/**
 * Populates mapDataList with source map data from
 * HTML 5 data attribute '.gmfn_canvas[gmfn]'
 */
mw.gmfn.getMaps = function() {
	// Extract JSON data from every .gmfn_canvas element HTML5 data attribute
	$('.gmfn_canvas').each(function( i, el ) {
		// Find mapIdx (part of element id)
		var mapIdx = el.id.match(/^gmfn_canvas(\d+)$/);
		if ( mapIdx === null ) {
			return;
		}
		mapIdx = mapIdx[1];
		var mapData = $(el).data( 'gmfn' );
		// Some JSON mapData may do not have markers defined
		if ( !mapData.markers ) {
			mapData.markers = [];
		}
		// Store mapData into the list
		mapDataList[mapIdx] = mapData;
	});

	if ( mapDataList.length == 0 ) {
		// Extension was loaded with no map data available.
		// This should never happen, but who knows.
		return;
	}

	return mw.gmfn.createMapControllers();
}

// dynamically loads google maps v3
$.getScript('http://maps.google.com/maps/api/js?libraries=places&sensor=true&callback=mw.gmfn.getMaps').done( function (script, textStatus) {
}).fail( function (jqxhr, settings, exception) {
        throw new Error( 'Cannot find Google Maps JavaScript API v3. Make sure you have access to internet.' );
});

} ) (jQuery, mediaWiki);
