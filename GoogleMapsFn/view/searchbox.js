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
 * SearchBox view module.
 */

(function( $, mw ) {

var $gm;

/**
 * Create new SearchBoxController.
 * @param  parent      instanceof MapController
 *   MapController this SearchBox belongs to
 */
mw.gmfn.SearchBoxController = function ( parent ) {
	$gm = google.maps;
	this.parent = parent;
}

// list of prototypes to extend mw.gmfn.SearchBoxController
var _SearchBoxController = {};

_SearchBoxController.create = function() {
	if ( typeof this.searchBox !== 'undefined' ) {
		return;
	}
	var myself = this;
	this.searchBoxInput = $('<input />')
	.attr('autocomplete', 'off')
	.addClass('gmfn_searchbox_input')
	.get(0);
	this.markers = [];
	this.searchBox = new $gm.places.SearchBox( this.searchBoxInput );
	google.maps.event.addListener(this.searchBox, 'places_changed', function() {
		myself.showPlaces.call(myself);
	});
	this.parent.map.controls[$gm.ControlPosition.TOP_LEFT].push( this.searchBoxInput );
	this.resize();
}

_SearchBoxController.remove = function() {
	if ( typeof this.searchBox === 'undefined' ) {
		return;
	}
	this.parent.map.controls[$gm.ControlPosition.TOP_LEFT].pop();
	google.maps.event.clearListeners(this.searchBox, 'places_changed');
	this.searchBox.unbindAll();
	delete this.searchBox;
	$(this.searchBoxInput).remove();
	delete this.markers;
	delete this.searchBoxInput;
}

_SearchBoxController.resize = function() {
	if ( typeof this.searchBox === 'undefined' ) {
		return;
	}
	// calculate proper width of our SearchBox
	var sbWidth = this.parent.$canvas.width();
	// That's an ugly hack, however this.parent.map.controls[$gm.ControlPosition.TOP_RIGHT]
	// is empty even when map is already loaded: built-in controls are not stored there.
	var $topRightControls = this.parent.$canvas
	.find('div[title]')
	.filter(function(idx) {
		return $(this).css('overflow') === 'hidden';
	});
	if ( $topRightControls.length !== 2 ) {
		sbWidth -= 178;
	} else {
		sbWidth -= $topRightControls.eq(0).width() + $topRightControls.eq(1).width() + 100;
	}
	if ( sbWidth > 600 ) {
		sbWidth = 600;
	} else if ( sbWidth < 200 ) {
		sbWidth = 200;
	}
	$(this.searchBoxInput).width(sbWidth);
}

_SearchBoxController.showPlaces = function() {
	var marker, place;
	var places = this.searchBox.getPlaces();
	// remove already existing SearchBox markers
	for ( var i = 0, marker; marker = this.markers[i]; i++ ) {
		marker.setMap( null );
	}
	// create and add markers for places just found
	this.markers = [];
	var bounds = new $gm.LatLngBounds();
	for ( var i = 0, place; place = places[i]; i++ ) {
		var image = {
			url: place.icon,
			size: new $gm.Size(71, 71),
			origin: new $gm.Point(0, 0),
			anchor: new $gm.Point(17, 34),
			scaledSize: new $gm.Size(25, 25)
		};
		var marker = new $gm.Marker({
			map: this.parent.map,
			icon: image,
			title: place.name,
			position: place.geometry.location
		});
		this.markers.push(marker);
		bounds.extend(place.geometry.location);
	}
	this.parent.map.fitBounds(bounds);
}

$.extend( mw.gmfn.SearchBoxController.prototype, _SearchBoxController );

} )( jQuery, mediaWiki );
