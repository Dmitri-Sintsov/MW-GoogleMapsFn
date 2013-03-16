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
	// create editor DOM, and map click handler, when needed
	this.bindEditor();
	// Create the collection of markers in this map.
	this.markerControllers = [];
	$.each(mapData.markers, function(markerIdx, markerData) {
		myself.markerControllers.push(
			new mw.gmfn.MarkerController( myself, markerIdx, markerData )
		);
	});
	if ( mapData.searchbox ) {
		this.searchBoxInput = $('<input />')
		.attr('autocomplete', 'off')
		.addClass('gmfn_searchbox_input')
		.get(0);
		this.map.controls[$gm.ControlPosition.TOP_LEFT].push( this.searchBoxInput );
		this.searchBox = new $gm.places.SearchBox( this.searchBoxInput );
	}
}

// list of prototypes to extend mw.gmfn.MapController
var _MapController = {};

_MapController.view_setPolymorphs = function() {
	this.bindEditor = this.view_bindEditor;
}

_MapController.view_bindEditor = function() {
	this.bindIdle();
}

_MapController.resizeSearchBox = function() {
	if ( typeof this.searchBox === 'undefined' ) {
		return;
	}
	// calculate proper width of our SearchBox
	var sbWidth = this.$canvas.width();
	// That's an ugly hack, however this.map.controls[$gm.ControlPosition.TOP_RIGHT]
	// is empty even when map is already loaded - built-in controls are stored there.
	var streetMapBtn = this.$canvas.find('div[title=\'Show street map\']');
	var satelliteMapBtn = this.$canvas.find('div[title=\'Show satellite imagery\']');
	sbWidth -= (streetMapBtn.length > 0) ? streetMapBtn.width() : 0;
	sbWidth -= (satelliteMapBtn.length > 0) ? satelliteMapBtn.width() : 0;
	sbWidth -= 100;
	if ( sbWidth > 600 ) {
		sbWidth = 600;
	} else if ( sbWidth < 200 ) {
		sbWidth = 200;
	}
	$(this.searchBoxInput).width(sbWidth);
}

/**
 * Bind map idle logic (when map is loaded).
 */
_MapController.bindIdle = function() {
	var myself = this;
	google.maps.event.addListener(this.map, 'idle', function() {
		myself.resizeSearchBox.call( myself );
	});
}

$.extend( mw.gmfn.MapController.prototype, _MapController );

} )( jQuery, mediaWiki ); 
