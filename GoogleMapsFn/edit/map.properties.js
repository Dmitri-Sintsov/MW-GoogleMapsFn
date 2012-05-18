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
 * Map properties accessors.
 */

( function( $, mw, $h ) {

// list of prototypes to extend mw.gmfn.MapController
var _MapController = {};

/**
 * Used by map dimension logic.
 * Keys are index of units selection button in dialog's buttonset;
 * values are names of units.
 */
_MapController.unitsButtonOrder = ['px','em','%'];

/**
 * Display / hide dialog with related logic.
 * @param  params object
 *   params.display boolean
 *     true to open dialog, false to close
 *   params.inProgress boolean
 *     optional; whether to switch dialog or not (default: yes)
 */
_MapController.displayDialog = function( params ) {
	if ( params.inProgress === undefined /* default: yes */ ||
			params.inProgress !== true ) {
		this.$dialog.dialog( params.display ? 'open' : 'close' );
	}
	this.$dialogSwitch.attr('checked', params.display );
}

/**
 * Please use this method instead of direct this.map.setCenter()
 * to keep this.lat / this.lng in sync.
 * @param latLng instanceof google.maps.LatLng
 */
_MapController.setMapCenter = function( latLng ) {
	this.lat = latLng.lat();
	this.lng = latLng.lng();
	this.map.setCenter( latLng );
}

/**
 * Update editor properties related to map center according to supplied position.
 * @param  center instanceof google.maps.LatLng
 */
_MapController.viewCenter = function( center ) {
	this.lat = center.lat();
	this.lng = center.lng();
	// eq(0) is required, otherwise marker's lat/lng inputs may be changed as well
	this.$dialog.find('.gmfn_edit_lat').eq(0).valKeepSelection(this.lat);
	this.$dialog.find('.gmfn_edit_lng').eq(0).valKeepSelection(this.lng);
	this.tagHeader.update( {'lat': this.lat, 'lng': this.lng } );
}

/**
 * Get dimension of map for single axe specified.
 * @param  type string
 *   'width' or 'height'
 * @return instanceof mw.gmfn.dimension
 */
_MapController.getCssDimension = function( type ) {
	// Silly browser always returns units in 'px';
	// so we have to use dimension.units separately throughout the code,
	// which is much less reliable than direct manipulation with jQuery.css(type).
	var match = this.$canvas.css(type).match(/(\d+)(|[a-z]+|%)$/);
	if ( match !== null ) {
		return new mw.gmfn.dimension( type, match[1], match[2] );
	}
	throw new Error( 'Unsupported map canvas dimension ' + type + ' css value ' + this.$canvas.css(type) +
		' in MapController.getCssDimension()' );
}

/**
 * Set map units name and value for single dimension.
 * Does NOT actially resize the map itself.
 */
_MapController.setDimension = function( dimObj ) {
	if ( typeof this.dimension[dimObj.type] === 'undefined' ) {
		this.dimension[dimObj.type] = dimObj;
	} else {
		// warning: copy properties or clone and do not mess with references
		this.dimension[dimObj.type].setProps( dimObj );
	}
	return this.dimension[dimObj.type];
}

/**
 * Resize the map's single dimension.
 */
_MapController.updateDimension = function( dimObj ) {
	if ( !(dimObj instanceof mw.gmfn.dimension) ) {
		throw new Error( 'Not an instance of mw.gmfn.dimension supplied as ' +
			'parameter of MapController.updateDimension()' );
	}
	// update tagheader
	var options = {};
	options[dimObj.type] = dimObj.getString();
	this.tagHeader.update(options);
	// resize the map div container
	this.$canvas.css( dimObj.type, dimObj.getString() );
	// trigger event to resize the map
	google.maps.event.trigger( this.map, 'resize' );
	if ( dimObj.type === 'width' ) {
		// width has to be updated for the parent and his parent div;
		// parent's height is auto (no need to update)
		this.$canvas.parent().css( dimObj.type, dimObj.getString() )
		.parent().css( dimObj.type, dimObj.getString() );
	}
}

/**
 * Highlight dialog buttonset according according to units name specified.
 * @param dimObj  instanceof mw.gmfn.dimension
 */
_MapController.updateButtonsetUnits = function( dimObj ) {
	var index = $.inArray( dimObj.units, this.unitsButtonOrder );
	if ( index === -1 ) {
		// Unknown units value was passed
		// That is a serious error.
		throw new Error( 'Unsupported dimension units value:' + dimObj.units +
			' in MapController.updateButtonsetUnits()' );
	}
	// Highlight dialog buttonset according to current units name.
	this.$dialog.find('.gmfn_units_'+dimObj.type+' > input')
	.eq( index ).trigger('click')
	.end().buttonset('refresh');
}

/**
 * Changes external 'div thumb*' size and editor properties related to map size.
 * Does NOT resize the map canvas itself.
 */
_MapController.updateSize = function( width, height ) {
	// synchronousely resize div.thumbinner and div.thumb
	this.$canvas.parent().css('width', width)
	.parent().css('width', width);
	var options = {};
	// update dialog input fields
	this.$dialog.find('.gmfn_edit_width').val(width).end()
	.find('.gmfn_edit_height').val(height);
	// get / set object values of resized dimension for corresponding units
	var widthDim = this.setDimension( this.getCssDimension('width') );
	var heightDim = this.setDimension( this.getCssDimension('height') );
	// update units name display
	this.updateButtonsetUnits( widthDim );
	this.updateButtonsetUnits( heightDim );
	// update the tag header
	options.width = widthDim.getString();
	options.height = heightDim.getString();
	this.tagHeader.update(options);
}

_MapController.captionAccessor = function( caption, className ) {
	var $wrapper = this.$canvas.parent().children('div.thumbcaption').eq(0);
	if ( typeof caption !== 'undefined' ) {
		// set
		$wrapper.text( caption );
		if ( className !== undefined ) {
			$wrapper.addClass( className );
		}
	} else {
		// get
		return $wrapper.text();
	}
}

/**
 * Set or get align of the map.
 */
_MapController.alignAccessor = function( align ) {
	var $wrapper = this.$canvas.parent().parent();
	if ( typeof align !== 'undefined' ) {
		// set
		if ( align === 'left' ) {
			$wrapper.removeClass('tright').addClass('tleft');
		} else {
			// default align="right", the same as for [[image:]]
			$wrapper.removeClass('tleft').addClass('tright');
		}
	} else {
		// get
		if ( $wrapper.hasClass('tright') ) {
			return 'right';
		} else if ( $wrapper.hasClass('tleft') ) {
			return 'left';
		} else {
			// will not display in TagHeader instance
			return null;
		}
	}
}

/**
 * Prepares editor DOM container with hidden dialog.
 */
_MapController.insertEditorContainer = function() {
	var center = this.map.getCenter();
	var dialogId = 'gmfn_dialog' + this.Idx;
	var container =
	$h.element( 'div',
		{'class': 'gmfn_editor'},
		new $h.Raw(
			this.toolbar.generateInputWrapper(
				{'class': 'gmfn_show_code'},
				// id is used for label only
				{'type': 'checkbox', 'id': 'gmfn_show_code_'+this.Idx},
				mw.msg( 'gmfn-show-code' )
			) +
			$h.element( 'div', // this div will contain the visible / hidden interface
				{'class':'gmfn_showhide', 'id': dialogId},
				new $h.Raw(
					this.toolbar.generate() +
					// this div will contain the whole tag preview
					$h.element( 'div',
						{'class': 'gmfn_tag_preview'},
						new $h.Raw(
							$h.element( 'div',
								{'class': 'gmfn_tag_header'}
							) +
							$h.element( 'div', // marker lines holder
								{'class': 'gmfn_lines'}
							) +
							$h.element( 'div',
								{'class': 'gmfn_tag_footer'},
								'}}'
							)
						)
					)
				)
			)
		)
	);
	// console.log(container);
	// console.log('----');
	// Insert editor DOM container after thumb caption.
	$(container).insertAfter( this.$canvas.next() );
	this.$dialog = $('#'+dialogId);
	this.$dialogSwitch = $('#gmfn_show_code_' + this.Idx);
	this.$lines = this.$dialog.find('> div.gmfn_tag_preview').find('> div.gmfn_lines');
	var $tagHeader = this.$dialog.find('> div.gmfn_tag_preview').find('> div.gmfn_tag_header').eq(0);
	// in edit mode canvas caption has to have 'white-space:pre' style
	this.captionAccessor( this.caption, 'gmfn_caption_text' );
	// create tag header
	this.tagHeader = new mw.gmfn.TagHeader(
		$tagHeader,
		{
			'zoom' : this.map.getZoom(),
			/* we do not use float value from var center due to rounding errors */
			'lat' : this.lat /* center.lat() */,
			'lng' : this.lng /* center.lng() */,
			'align': this.alignAccessor(),
			'caption': this.captionAccessor(),
			'width': this.getCssDimension('width').getString(),
			'height': this.getCssDimension('height').getString()
		}
	);
	// IE8 fix
	if ( $.browser.msie && parseInt($.browser.version,10) < 9 ) {
		$tagHeader.css('height', '3em');
	}
	// create buttonsets
	this.toolbar.createButtonset( this.$dialog.find('.gmfn_edit_align'), 'radio', 'align_'+this.Idx )
	.createButtonset( this.$dialog.find('.gmfn_units_width'), 'radio', 'units_width_'+this.Idx )
	.createButtonset( this.$dialog.find('.gmfn_units_height'), 'radio', 'units_height_'+this.Idx );
	this.$dialog.prettyButtons();
}

$.extend( mw.gmfn.MapController.prototype, _MapController );

/**
 * Do not assign mediaWiki.html and mediaWiki.Raw to different local vars, that would not work,
 * because mw.html and mw.Raw work in conjunction.
 */
} )( jQuery, mediaWiki, mediaWiki.html );
