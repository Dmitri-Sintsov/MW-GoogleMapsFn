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
 * Maps view module.
 */

( function( $, mw ) {

var $gm;

/**
 * Create new MapController.
 * @param  mapIdx  int
 *   unique index of map at page
 * @param  mapData  object
 *   source mapData
 */
mw.gmfn.MapController = function( mapIdx, mapData ) {
	$gm = google.maps;
	// Init polymorphs.
	if ( mapData.edit ) {
		this.edit_setPolymorphs();
		this.edit = mapData.edit;
		this.toolbar = new mw.gmfn.toolbar( this );
		this.caption = mapData.caption;
	} else {
		this.view_setPolymorphs();
	}
	//
	var myself = this;
	this.Idx = mapIdx;
	this.$canvas = $('#gmfn_canvas' + this.Idx);
	/**
	 * lat / lng is stored separately to prevent display of rounding errors during inprecise
	 * conversion of base2 to base10 floating point numbers for initial mapData values taken
	 * from parser function.
	 * note: do not forget to synchronize values after this.map.setCenter() was called
	 */
	this.lat = mapData.lat;
	this.lng = mapData.lng;
	// Create the map
	this.map = new $gm.Map( this.$canvas.get(0), {
		// we store zoom only in map
		zoom: mapData.zoom,
		center: new $gm.LatLng(this.lat, this.lng),
		mapTypeId: $gm.MapTypeId.ROADMAP
	});
	this.hasSearchBox = mapData.searchbox;
	// create editor DOM, and map click handler, when needed
	this.bindEditor();
	// Create the collection of markers in this map.
	this.markerControllers = [];
	$.each(mapData.markers, function(markerIdx, markerData) {
		myself.markerControllers.push(
			new mw.gmfn.MarkerController( myself, markerIdx, markerData )
		);
	});
}

// list of prototypes to extend mw.gmfn.MapController
var _MapController = {};

_MapController.view_setPolymorphs = function() {
	this.bindEditor = this.view_bindEditor;
}

_MapController.view_bindEditor = function() {
	this.bindIdle();
}

/**
 * Bind map idle logic (when map is loaded).
 */
_MapController.bindIdle = function() {
	// Do not show searchbox right now, otherwise flickering may be seen
	// during searchbox resize in 'idle' event handler.
	this.searchBox = new mw.gmfn.SearchBoxController(this);
	var myself = this.searchBox;
	google.maps.event.addListenerOnce(this.map, 'idle', function() {
		if ( myself.parent.hasSearchBox ) {
			myself.create.call(myself);
		}
	});
}

$.extend( mw.gmfn.MapController.prototype, _MapController );

} )( jQuery, mediaWiki ); 
