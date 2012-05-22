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
 * Marker edit module.
 */

( function( $, mw, $h ) {

var $gm;

// list of prototypes to extend mw.gmfn.MarkerController
var _MarkerController = {};

_MarkerController.edit_setPolymorphs = function() {
	$gm = google.maps;
	this.clickHandler = this.edit_clickHandler;
	this.openWindow = this.edit_openWindow;
	this.init = this.edit_init;
	// by default, assume that marker description text was clicked in editline
	this.clickIdx = 'text';
}

_MarkerController.edit_init = function() {
	// default editline mode is 'view'
	this.editMode = false;
	// create tag text line for marker
	this.appendEditLine();
}

/**
 * Called when index of marker in parent's collection was changed
 * because the marker with lower index was removed from collection.
 */
_MarkerController.reindex = function( newIdx ) {
	this.Idx = newIdx;
}

/**
 * Line getter / setter (accessor)
 * @param  html  string
 *   optional html to place into editline (setter)
 * @return string
 *   optional jQuery editline object for current marker
 */
_MarkerController.$line = function( html ) {
	if ( html === undefined ) {
		return this.parent.getLine( this.Idx );
	} else {
		this.parent.setLine( this.Idx, html );
	}
}

/**
 * Generates jQuery-safe unique DOM id for marker's InfoWindow textarea
 * @param  pos instanceof google.maps.LatLng
 *   desired marker position
 */
_MarkerController.generateTextareaId = function( pos ) {
	// position object is used because this.lat / this.lng might not have
	// rounding errors initially (source tag strings)
	return ('gmfn_text_'+pos.lat()+'_'+pos.lng())
	// replace "jQuery-unfriendly" characters to text strings
	.replace( /(\+|\-|\.)/g, function( match ) {
		switch (match) {
			case '+': return 'plus';
			case '-': return 'minus';
			case '.': return 'dot';
		}
	});
}

/**
 * Get current marker InfoWindow textarea jQuery object
 */
_MarkerController.$textarea = function() {
	return this.parent.$canvas.find('#'+this.textareaId);
}

/**
 * Fires 'click' event on current marker
 * @param  clickIdx  string
 *   optional index of line element to set focus on it
 */
_MarkerController.doClick = function( clickIdx ) {
	this.clickIdx = (clickIdx === undefined) ? 'text' : clickIdx;
	$gm.event.trigger( this.marker, 'click' );
}

/**
 * Set description text of current marker's editline.
 * @param  text  string
 *   wikitext to set
 */
_MarkerController.changeText = function( text ) {
	this.caret = this.$textarea().getSelection();
	// escape parameter separator '|' in wikitext to prevent description breakup
	var sanitizer = mw.gmfn.ParameterSanitizer( text );
	text = sanitizer.text;
	if ( this.text !== text ) {
		this.text = text;
		this.setEditLine();
		if ( sanitizer.error !== null ) {
			this.$line().attr('tipsy',sanitizer.error);
		}
	}
	if ( this.caret.end === this.$textarea().val().length ) {
		// when the cursor is at last character of InfoWindow textarea,
		// scroll lines to the end of current description line
		this.scrollToEnd();
	}
}

/**
 * Set editline element focus or InfoWindow textarea focus according to this.clickIdx
 */
_MarkerController.setFocus = function() {
	if ( this.clickIdx === 'text' ) {
		// if user clicked on text, give focus to the InfoWindow
		this.$textarea().focus()
		// do not use setSelection when coord is clicked,
		// otherwise input focus will be lost
		.setSelection(this.caret);
	} else {
		// if user clicked on coord, give focus to the input
		this.$line().find('.gmfn_edit_'+this.clickIdx).focus();
	}
}

/**
 * marker InfoWindow textarea event handling
 */
_MarkerController.bindTextarea = function() {
	var myself = this;
	if ( this.$textarea().get(0) === undefined ) {
		console.log('MarkerController.bindTextarea, id='+this.textareaId+' is undefined');
		return;
	}
	if ( this.caret.start === -1 ) {
		this.caret.start = this.caret.end = this.$textarea().get(0).value.length;
	}
	// window.setTimeout( this.setFocus(), 500 );
	this.setFocus();
	this.$textarea().bind( 'change keyup', function(ev){
		myself.changeText.call( myself, ev.currentTarget.value );
	});
}

_MarkerController.edit_openWindow = function() {
	var myself = this;
	// turn off editMode for all markers except the current;
	// ensures only one InfoWindow is open.
	this.parent.markersEditMode( this.Idx );
	// scroll map lines to the begin of current marker's editline
	this.scrollToBegin();
	// DOM object holder of the map the current marker belongs to
	var div = this.marker.getMap().getDiv();
	// set this.textareaId, so future calls to this.$textarea() will work correctly
	this.textareaId = this.generateTextareaId( this.marker.getPosition() );
	var content =
	$h.element( 'textarea',
		{'id': this.textareaId, 'class': 'gmfn_text'},
		this.text
	);
	this.iw.setContent( content );
	this.iw.open( this.parent.map, this.marker  );
	// open map editor dialog
	this.parent.displayDialog({ 'display': true });
	// infowinfow content textarea logic can be bound only when dom is ready
	$gm.event.addListener( this.iw, 'domready', function () {
		myself.setEditLine();
		myself.bindTextarea( myself );
	});
	$gm.event.addListener( this.iw, 'closeclick', function () {
		// InfoWindow is already being closed, do not pass 'setWindow'
		myself.setEditMode({ 'editMode': false });
	});
}

_MarkerController.closeWindow = function() {
	if ( this.iw !== undefined ) {
		this.iw.close();
	}
}

/**
 * Open or close InfoWindow according to this.editMode
 */
_MarkerController.setWindow = function() {
	if ( this.editMode ) {
		this.openWindow();
	} else {
		// note: To check uniqueness of generated this.textareaId, comment out the next line.
		// In production next line should be uncommented.
		this.closeWindow();
	}
}

/**
 * Scroll to marker's editline first vertical position.
 */
_MarkerController.scrollToBegin = function() {
	this.parent.scrollToBegin( this.Idx );
}

/**
 * Scroll to marker's editline last vertical position.
 */
_MarkerController.scrollToEnd = function() {
	this.parent.scrollToEnd( this.Idx );
}

/**
 * Click handler of current marker.
 */
_MarkerController.edit_clickHandler = function() {
	// inverse editMode for current marker
	this.setEditMode({ 'editMode': !this.editMode, 'setWindow': true });
}

/**
 * Generates html string of current marker's editline according to this.editMode
 */
_MarkerController.generateEditLine = function() {
	var line;
	if ( this.editMode ) {
		line =
		$h.element( 'input', // lat
			{'class': 'gmfn_edit_lat', 'type': 'text'}
		) + ', ' +
		$h.element( 'input', // lng
			{'class': 'gmfn_edit_lng', 'type': 'text'}
		) +
		$h.element( 'input', // close button
			{'class': 'gmfn_remove_marker', 'type': 'button', 'value': 'X'}
		) + ' ' +
		$h.element( 'span', // text
			{'class': 'gmfn_marker_text'}
		);
	} else {
		line =
		$h.element( 'span', // lat
			{'class': 'gmfn_edit_lat'}
		) + ', ' +
		$h.element( 'span', // lng
			{'class': 'gmfn_edit_lng'}
		) + ' ' +
		$h.element( 'span', // text
			{'class': 'gmfn_marker_text'}
		);
	}
	return line;
}

/**
 * Set pipe separator for current line.
 */
_MarkerController.setPipeSeparator = function() {
	if ( this.$line().find(':first-child').hasClass( 'gmfn_pipe_separator' ) ) {
		// already has pipe separator
		return;
	}
	this.$line().prepend(
		$h.element( 'span',
			{'class': 'gmfn_pipe_separator'},
			'|'
		)
	);
}

/**
 * Append new edit line to parent container.
 */
_MarkerController.appendEditLine = function() {
	// append the line without text nodes
	this.parent.$dialog.find('> div.gmfn_tag_preview').find('> div.gmfn_lines')
	.append(
		$h.element( 'div',
			{},
			new $h.Raw( this.generateEditLine() )
		)
	);
	this.setPipeSeparator();
	this.$line().tipsy({
		gravity: 'nw',
		title: 'tipsy',
		offset: 15
	});
	// populate line children elements text modes
	this.setEditLine();
	// bind events logic to text line
	this.bindEditLine();
}

/**
 * Removes the marker. Parent has to take care of removing from map marker's collection.
 */
_MarkerController.remove = function() {
	// clear tipsy hint
	this.$line().tipsy('hide');
	// remove edit line
	this.$line().remove();
	// remove the marker itself
	this.marker.setMap( null );
}

/**
 * Updates state of marker object according to current google.maps.Marker position.
 * Optionally set position of current google.maps.Marker position
 * @param  pos  instanceof google.maps.LatLng
 *   optional new position of current marker
 */
_MarkerController.updatePosition = function( pos ) {
	if ( pos === undefined ) {
		pos = this.marker.getPosition();
	} else {
		this.marker.setPosition( pos );
	}
	this.lat = pos.lat();
	this.lng = pos.lng();
	// update id of InfoWindow textarea DOM object which has one to one relationship
	// with current marker position
	this.$textarea().attr('id',this.generateTextareaId( pos ) );
	// update this.textareaId, so future calls to this.$textarea() will work correctly
	this.textareaId = this.generateTextareaId( pos );
	// chaining
	return this;
}

/**
 * Dragging of current marker event logic.
 */
_MarkerController.bindDrag = function() {
	var myself = this;
	$gm.event.addListener(this.marker, 'drag', function() {
		myself.updatePosition().setEditLine();
	});
	$gm.event.addListener(this.marker, 'dragend', function() {
		myself.updatePosition().setEditLine();
	});
}

/**
 * Bind 'lat' or 'lng' editline input fields event logic.
 * @param  coord  string
 *   'lat' or 'lng'
 */
_MarkerController.bindCoordinate = function( coord ) {
	var myself = this;
	this.$line().find('.gmfn_edit_'+coord)
	.attr('tipsy', ' ')
	.tipsy({title: 'tipsy'})
	.bind('change keyup', function(ev) {
		// check, whether supplied input value is correct for current coord
		if ( mw.gmfn['isValid'+coord]( $(this).val() ) ) {
			myself[coord] = $(this).val();
			var pos = myself.marker.getPosition();
			if ( coord === 'lat' ) {
				pos = new $gm.LatLng( parseFloat( myself[coord] ), pos.lng() );
			} else {
				// coord === 'lng'
				pos = new $gm.LatLng( pos.lat(), parseFloat( myself[coord] ) );
			}
			myself.updatePosition( pos );
			// .attr('tipsy','') produces 'Undefined' hint in IE8.
			// Thus, the empty string was replaced to single space everywhere.
			$(this).attr('tipsy',' ')
			.tipsy('hide');
		} else {
			$(this).attr('tipsy',mw.msg('gmfn-error-'+coord, $(this).val() ))
			.tipsy('show');
		}
	});
}

/**
 * Turn on / off editMode of current marker.
 * @param  params  object
 *   params.editMode boolean
 *     whether to turn on / off editMode
 *   params.setWindow boolean
 *     optional; whether also to close or open InfoWindow according to editMode (default: no)
 */
_MarkerController.setEditMode = function( params ) {
	if ( params.editMode === this.editMode ) {
		return;
	}
	this.editMode = params.editMode;
	if ( !this.editMode ) {
		// check whether there was '.gmfn_remove_marker' children in current editline
		// (editline was in active editMode)
		var $removeMarker = this.$line().find('.gmfn_remove_marker');
		if ( $removeMarker.size() > 0 ) {
			// remove tipsy hint so it will not hang alone
			$removeMarker.tipsy('hide');
		}
	}
	// populate line inner HTML
	this.$line( this.generateEditLine() );
	this.setPipeSeparator();
	// set line lat / lng / description (text) values
	this.setEditLine();
	// enable or disable marker dragging
	this.marker.setDraggable( this.editMode );
	if ( params.setWindow !== undefined /* default: no */ &&
			params.setWindow === true ) {
		this.setWindow();
	}
	if ( !this.editMode ) {
		this.$line().removeClass('gmfn_edited_line')
		return;
	}
	// this.editMode === true
	this.$line().addClass('gmfn_edited_line')
	.prettyButtons().end()
	// add remove marker button
	.find('.gmfn_remove_marker')
	.attr('tipsy', mw.msg('gmfn-remove-marker')).tipsy({'title': 'tipsy'})
	.button();
	/* bind events */
	this.bindDrag();
	this.bindCoordinate( 'lat' );
	this.bindCoordinate( 'lng' );
}

/**
 * Bind event logic for marker line editor.
 * Please call only once.
 */
_MarkerController.bindEditLine = function() {
	var myself = this;
	var clickIdx;
	this.$line().click( function(ev) {
		// do not propagate the event, we do not need to this.doClick() multiple times,
		// as it would always give the focus to InfoWindow textarea
		ev.stopPropagation();
		if ( $(ev.target).is( 'input' ) ) {
			if ( $(ev.target).hasClass('gmfn_remove_marker') ) {
				myself.parent.removeMarker( myself.Idx );
			}
			// prevent close of editMode when click target was input (eg. lat / lng inputs)
			return;
		}
		clickIdx = 'text';
		if ( $(ev.target).hasClass('gmfn_edit_lat') ) {
			clickIdx = 'lat';
		} else if ( $(ev.target).hasClass('gmfn_edit_lng') ) {
			clickIdx = 'lng';
		}
		myself.doClick(clickIdx);
	}).mouseenter( function(ev) {
		ev.stopPropagation();
		myself.$line().addClass('gmfn_current_line');
	}).mouseleave( function(ev) {
		ev.stopPropagation();
		myself.$line().removeClass('gmfn_current_line');
	});
}

/**
 * Set / update values of marker's edit line.
 */
_MarkerController.setEditLine = function() {
	var tipsyMsgKey;
	if ( this.editMode ) {
		tipsyMsgKey = 'gmfn-view-marker';
		this.$line().find('.gmfn_edit_lat').valKeepSelection( this.lat ).end()
		.find('.gmfn_edit_lng').valKeepSelection( this.lng );
	} else {
		tipsyMsgKey = 'gmfn-edit-marker';
		this.$line().find('.gmfn_edit_lat').text( this.lat ).end()
		.find('.gmfn_edit_lng').text( this.lng );
	}
	this.$line().find('.gmfn_marker_text').text( this.text ).end()
	.attr('tipsy', mw.msg( tipsyMsgKey ) );
}

$.extend( mw.gmfn.MarkerController.prototype, _MarkerController );

/**
 * Do not assign mediaWiki.html and mediaWiki.Raw to different local vars, that would not work,
 * because mw.html and mw.Raw work in conjunction.
 */
} )( jQuery, mediaWiki, mediaWiki.html ); 
