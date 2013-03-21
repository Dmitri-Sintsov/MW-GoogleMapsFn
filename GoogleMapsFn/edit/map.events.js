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
 * Map edit events.
 */

( function( $, mw ) {

// list of prototypes to extend mw.gmfn.MapController
var _MapController = {};

/**
 * Bind map zoom logic.
 */
_MapController.bindZoom = function() {
	var myself = this;
	var $editZoom = this.$dialog.find('.gmfn_edit_zoom');
	this.toolbar.createSlider( $editZoom );
	// zoom via slider
	$editZoom.slider( 'option', 'value', this.map.getZoom() )
	.bind( 'slide', function(event, ui) {
		// note that this also will fire next listener,
		// so there is no need to call tagHeader.update()
		myself.map.setZoom( ui.value );
	} );
	google.maps.event.addListener(this.map, 'zoom_changed', function() {
		var zoom = myself.map.getZoom();
		$editZoom.slider( 'option', 'value', zoom );
		myself.tagHeader.update( {'zoom': zoom } );
	});
}

_MapController.bindAlign = function() {
	var myself = this;
	var $editAlignBtns = this.$dialog.find('.gmfn_edit_align > input');
	// highlight button according to current gmfn tag align
	var align = this.alignAccessor();
	var aligns = [null,'left','right'];
	$editAlignBtns.eq( $.inArray( align, aligns ) ).trigger('click')
	.end().buttonset('refresh')
	// modify map align on input change
	.change(function(ev) {
		var match = $(this).attr('id').match(/\d+$/);
		if ( match !== null ) {
			match = aligns[match[0]];
			// visually align the map
			myself.alignAccessor( match );
			// update and display tag header "align" attribute
			myself.tagHeader.update({ 'align': match });
		}
	} );
}

/**
 * Event logic for changing of map center via dialog input fields.
 * Bound separately for each coordinate.
 * @param  coord  string
 *   'lat' or 'lng'
 */
_MapController.bindCoordinate = function( coord ) {
	var myself = this;
	var center = this.map.getCenter();
	// Place initial value of coordinate into input.
	// Initially, float values from map.getCenter() are not used due to rounding errors,
	// however they will be used when this.lat / this.lng will be overwritten by functions.
	// eq(0) is required, otherwise marker's lat/lng inputs may be changed as side-effect.
	this.$dialog.find('.gmfn_edit_'+coord).eq(0)
	.val( this[coord] /* center[coord]() */ )
	// update center when input fields are edited directly
	.attr('tipsy', ' ')
	.tipsy({title: 'tipsy'})
	.bind('change keyup', function(ev) {
		if ( mw.gmfn['isValid'+coord]( $(this).val() ) ) {
			myself[coord] = $(this).val();
			if ( coord === 'lat' ) {
				center = new google.maps.LatLng( parseFloat( myself[coord] ), myself.map.getCenter().lng() );
			} else {
				// coord === 'lng'
				center = new google.maps.LatLng( myself.map.getCenter().lat(), parseFloat( myself[coord] ) );
			}
			myself.setMapCenter( center );
			var options = {};
			// Initially, float values from map.getCenter() are not used due to rounding errors,
			// however they will be used when this.lat / this.lng will be overwritten by functions.
			options[coord] = myself[coord] /* center[coord]() */;
			myself.tagHeader.update( options );
			// .attr('tipsy','') produces 'Undefined' hint in IE8.
			// Thus, the empty string was replaced to single space everywhere.
			$(this).attr('tipsy',' ')
			.tipsy('hide');
		} else {
			// invalid value of coordinate
			$(this).attr('tipsy',mw.msg('gmfn-error-'+coord, $(this).val() ))
			.tipsy('show');
		}
	});
}

_MapController.bindResizable = function() {
	var myself = this;
	var mapBounds = mw.gmfn.dimension.prototype.mapBounds;
	$('#gmfn_resize_switch_'+this.Idx).change(function(ev) {
		if ( ev.target.checked ) {
			myself.$canvas.addClass( 'gmfn_resizable' )
			.resizable({
				'minWidth': mapBounds.width.px.min,
				'maxWidth': mapBounds.width.px.max,
				'minHeight': mapBounds.height.px.min,
				'maxHeight': mapBounds.height.px.max,
				'helper': 'gmfn_resizable',
				'handles': 'all'
			});
		} else {
			// Do not use .resizable( 'disable' ) anymore,
			// because in Chrome it highlights the map in some cases.
			myself.$canvas.resizable( 'destroy' )
			.removeClass( 'gmfn_resizable' );
		}
	});
	this.$canvas.bind('resize resizestop', function(event, ui) {
		if ( ui === undefined ) {
			// IE8 does not have ui defined when 'resize' is triggered by
			// this.bindDimension()
			return;
		}
		// Update the whole set of map properties related to it's size.
		myself.updateSize(ui.size.width, ui.size.height);
		if ( event.type === 'resizestop' ) {
			// update the map
			google.maps.event.trigger( myself.map, 'resize' );
			myself.searchBox.resize.call( myself.searchBox );
		}
	});
}

_MapController.bindDimension = function( type ) {
	var myself = this;
	var $valInput = this.$dialog.find('.gmfn_edit_'+type);
	var $unitsBtns = this.$dialog.find('.gmfn_units_'+type+' > input');
	// dimension is just a reference to this.dimension[type]
	var dimension = this.setDimension( this.getCssDimension( type ) );
	// display current units
	this.updateButtonsetUnits( dimension );
	// change dimension units when one of buttonset units buttons is pressed
	$unitsBtns.bind('change', function(ev) {
		// place index of button clicked into match[0]
		var match = $(this).attr('id').match(/\d+$/);
		if ( match !== null ) {
			if ( dimension.toUnits( myself.unitsButtonOrder[match[0]] ) ) {
				// set current dialog input value
				$valInput.val( dimension.value );
				// units were changed, update the map dimension
				myself.updateDimension( dimension );
			}
		}
	} );
	// set initial dialog input value
	$valInput.val( dimension.value )
	.attr('tipsy',' ')
	.tipsy({title: 'tipsy'})
	// modify map dimension on input change
	.bind('change keyup', function(ev) {
		if ( dimension.isValidValue( $(this).val() ) ) {
			if ( dimension.toValue( $(this).val() ) ) {
				// Dimension value was changed; resize the map.
				myself.updateDimension( dimension );
			}
			$(this).attr('tipsy',' ')
			.tipsy('hide');
		} else {
			// Invalid dimension specified.
			$(this).attr('tipsy',mw.msg('gmfn-error-'+dimension.type, $(this).val() ))
			.tipsy('show');
		}
	} );
}

_MapController.bindCaption = function() {
	var myself = this;
	this.$dialog.find('.gmfn_edit_caption').text( this.captionAccessor() )
	.bind('change keyup', function(ev) {
		myself.captionAccessor( $(this).val() );
		myself.tagHeader.update({ 'caption': $(this).val() });
	});
}

_MapController.bindCenter = function() {
	var myself = this;
	var dragSwitchSel = '#gmfn_drag_switch_' + this.Idx;
	// when drag switch is turn on, update center
	$(dragSwitchSel).change(function(ev) {
		if ( ev.target.checked ) {
			myself.viewCenter( myself.map.getCenter() );
		}
	});
	// conditionally update center
	google.maps.event.addListener(this.map, 'center_changed', function() {
		if ( $(dragSwitchSel).attr('checked') ) {
			myself.viewCenter( this.getCenter() );
		}
	});
}

_MapController.bindEditSwitch = function() {
	var myself = this;
	this.$editSwitch = $('#gmfn_edit_switch_' + this.Idx);
	this.$editSwitch
	.change(function(ev) {
		var options = ev.target.checked ?
			{'edit' : 1} : {'edit' : null};
		myself.tagHeader.update( options );
	})
}

_MapController.bindSearchBox = function() {
	var myself = this;
	var searchBox = myself.searchBox;
	$('#gmfn_searchbox_switch_' + this.Idx)
	.change(function(ev) {
		var options = {};
		if ( ev.target.checked ) {
			searchBox.create.call(searchBox);
			options['searchbox'] = 1;
		} else {
			searchBox.remove.call(searchBox);
			options['searchbox'] = null;
		}
		myself.tagHeader.update( options );
	})
	.prop('checked',this.hasSearchBox);
}

_MapController.bindAddMarker = function() {
	var myself = this;
	// Setup map click event
	google.maps.event.addListener(this.map, 'click', function(ev) {
		myself.addMarker.call( myself, ev);
	});
}

_MapController.bindDialog = function() {
	var myself = this;
	this.$dialog.dialog({ autoOpen: false, width: 'auto', height: 'auto' });
	// Setup show / hide dialog checkbox event.
	this.$dialogSwitch.change(function(ev) {
		myself.displayDialog({ 'display': ev.target.checked });
	});
	// Update show / hide checkbox when dialog is closed.
	this.$dialog.bind('dialogclose', function(event,ui) {
		if ( myself.$editSwitch.prop('checked') ) {
			// turn off editMode for all markers
			myself.markersEditMode( -1 );
		}
		myself.displayDialog({ 'display': false, 'inProgress': true });
	});
}

/**
 * Bind marker lines logic.
 */
_MapController.bindLines = function() {
	var myself = this;
	this.$dialog.find('> div.gmfn_tag_preview').bind('copy', function(ev) {
		// When the tag preview is being copied, switch editMode of markers to false,
		// otherwise the values of marker lat / lng will not be copied into
		// the system clipboard.
		myself.markersEditMode( -1 );
	});
}

$.extend( mw.gmfn.MapController.prototype, _MapController );

} )( jQuery, mediaWiki );
