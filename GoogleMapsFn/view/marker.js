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

/**
 * Marker view module.
 */

(function( $, mw ) {

var $gm;

/**
 * Create new MarkerController.
 * @param  parent      instanceof MapController
 *   MapController this marker belongs to
 * @param  markerIdx   int
 *   unique index of marker in map
 * @param  markerData  object
 *   source markerData
 */
mw.gmfn.MarkerController = function ( parent, markerIdx, markerData ) {
	$gm = google.maps;
	// Init polymorphs.
	if ( parent.edit ) {
		this.edit_setPolymorphs();
	} else {
		this.view_setPolymorphs();
	}
	//
	var myself = this;
	this.parent = parent;
	this.Idx = markerIdx;
	/**
	 * Warning: caret is used only in edit mode {start:int, end:int}
	 * caret.start === -1 means caret must be set to last textarea position;
	 * caret === null means unable to get / set caret (unsupported browser).
	 */
	this.caret = {start: -1, end: -1};
	// marker attributes
	// note: do not forget to update after this.marker.setPosition() was called
	this.lat = markerData.lat;
	this.lng = markerData.lng;
	this.text = markerData.content;
	// Add marker to the parent map
	this.marker = new $gm.Marker({
		position: new $gm.LatLng(this.lat, this.lng),
		map: this.parent.map
	});
	// create infowindow for current marker
	this.iw = new $gm.InfoWindow();
	// Setup marker click handler.
	// Note that the handler is non-jQuery, thus does not accept event.data parameter.
	$gm.event.addListener(this.marker, 'click', function(event) {
		// 'this' is google.maps.Marker instance
		myself.clickHandler.call( myself );
	});
	// Call extra "polymorphic constructor".
	// please keep this line at the end of real constructor.
	this.init();
}

// list of prototypes to extend mw.gmfn.MarkerController
var _MarkerController = {};

_MarkerController.view_setPolymorphs = function() {
	this.clickHandler = this.view_clickHandler;
	this.openWindow = this.view_openWindow;
	this.init = this.view_init;
}

_MarkerController.view_init = function() {
	/* noop */
}

_MarkerController.view_clickHandler = function() {
	this.openWindow();
}

/**
 * Open InfoWindow in view mode.
 */
_MarkerController.view_openWindow = function() {
	this.iw.setContent( this.text );
	this.iw.open( this.parent.map, this.marker  );
}

$.extend( mw.gmfn.MarkerController.prototype, _MarkerController );

} )( jQuery, mediaWiki );
