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
 * Map markers collection.
 */

( function( $, mw ) {

// list of prototypes to extend mw.gmfn.MapController
var _MapController = {};

_MapController.addMarker = function( event ) {
	// create new marker and fire click on it
	// set map center by click event position
	this.setMapCenter( event.latLng );
	// create new instance of marker
	var markerData = {'content': '', 'lat': event.latLng.lat(), 'lng': event.latLng.lng()};
	var mc = new mw.gmfn.MarkerController( this, this.markerControllers.length, markerData );
	this.markerControllers.push( mc );
	mc.doClick();
}

/**
 * Get jQuery editline object for specified marker in collection.
 */
_MapController.getLine = function( markerIdx ) {
	return this.$lines.find('> div').eq(markerIdx);
}

/**
 * Set html content of editline for specified marker in collection.
 */
_MapController.setLine = function( markerIdx, html ) {
	this.$lines.find('> div').eq(markerIdx).html( html );
}

/**
 * Get top scrollable vertical offset of editline
 * for specified marker in collection.
 */
_MapController.getVerticalOffset = function( markerIdx ) {
	if ( markerIdx === 0 ) {
		return 0;
	}
	return this.getLine(markerIdx).position().top - this.getLine(0).position().top;
}

/**
 * Get bottom scrollable vertical offset of editline
 * for specified marker in collection.
 */
_MapController.getLastLineOffset = function( markerIdx ) {
	var currDelta = this.getVerticalOffset( markerIdx );
	var currHeight = this.getLine(markerIdx).height();
	if ( currHeight < this.$lines.height() ) {
		// current marker line does not vertically overflow this.$lines
		return currDelta;
	}
	// current marker line vertically overflows this.$lines
	return currDelta + currHeight - this.$lines.height();
}

_MapController.scrollToBegin = function( markerIdx ) {
	this.$lines.scrollTop( this.getVerticalOffset( markerIdx ) );
}

_MapController.scrollToEnd = function( markerIdx ) {
	this.$lines.scrollTop( this.getLastLineOffset( markerIdx ) );
}

/**
 * Turn off editMode for all markers except for specified markerIdx
 * @param markerIdx  int
 *   index of marker object in this.markerControllers
 *   specify negative value to turn off editMode for all markers
 */
_MapController.markersEditMode = function( markerIdx ) {
	for ( var i = 0; i < this.markerControllers.length; i++ ) {
		if ( i !== markerIdx ) {
			this.markerControllers[i].setEditMode({ 'editMode': false, 'setWindow': true});
		}
	}
}

/**
 * Remove specified marker from markers collection.
 */
_MapController.removeMarker = function( markerIdx ) {
	// close editMode for removed marker
	this.markerControllers[markerIdx].setEditMode({ 'editMode': false, 'setWindow': true });
	// remove visual representation of marker
	this.markerControllers[markerIdx].remove();
	// reindex the markers with higher indexes
	for ( var i = markerIdx + 1; i < this.markerControllers.length; i++ ) {
		this.markerControllers[i].reindex( i - 1 );
	}
	// actually remove the marker object from markers collection
	this.markerControllers.splice( markerIdx, 1 );
}

$.extend( mw.gmfn.MapController.prototype, _MapController );

} )( jQuery, mediaWiki ); 
