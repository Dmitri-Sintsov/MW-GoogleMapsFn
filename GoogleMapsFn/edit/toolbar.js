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
 * Map editing dialog helper functions.
 */

( function( $, mw, $h ) {

/**
 * @param mc instanceof mw.gmfn.MapController
 */
mw.gmfn.toolbar = function( mc ) {
	this.mc = mc;
}

// list of prototypes to extend mw.gmfn.toolbar
var _toolbar = {};

/**
 * Generates input wrapper. Used to display input with associated label wrapped into the span.
 * span wrapper is handy as it allows to apply the style (eg. 'display': 'none') to both
 * input and related label.
 * @param wrapperAttrs  attributes of span
 * @param inputAttrs  attributes of input
 * @param text  label.innerText()
 */
_toolbar.generateInputWrapper = function( wrapperAttrs, inputAttrs, text ) {
	// next assignment is necessary, because immediate return of element will be converted to NaN
	if ( typeof inputAttrs.id === 'undefined' ) {
		throw new Error( 'Cannot generate label for input because input.id is not present in Toolbar.generateInputWrapper' );
	}
	var result =
	$h.element( 'span',
		wrapperAttrs,
		new $h.Raw(
			$h.element( 'input', inputAttrs ) +
			$h.element( 'label', {'for': inputAttrs.id}, text )
		)
	);
	return result;
}

_toolbar.generateTable = function( arr ) {
	var table = '';
	var tr;
	var result;
	var tagName;
	var attrs;
	var text;
	for ( var i = 0; i < arr.length; i++ ) {
		tr = '';
		for ( var j = 0; j < arr[i].length; j++ ) {
			if ( arr[i][j] instanceof Array ) {
				tagName = arr[i][j][0];
				attrs = arr[i][j][1];
				text = arr[i][j][2];
			} else {
				tagName = 'td';
				attrs = {};
				text = arr[i][j];
			}
			tr += $h.element( tagName, attrs, text );
		}
		table += $h.element( 'tr', {}, new $h.Raw( tr ) );
	}
	// next assignment is necessary, because immediate return of element will be converted to NaN
	result = $h.element( 'table', {}, new $h.Raw( table ) );
	return result;
}

/**
 * @param attrs attributes of div node
 * @param init variable to place in JSON encoded format into div.innerText()
 * @return html for div node
 */
_toolbar.generateJSON = function( attrs, init ) {
	// next assignment is necessary, because immediate return of element will be converted to NaN
	var result =
	$h.element( 'div',
		attrs,
		$.toJSON( init )
	);
	return result;
}

_toolbar.generate = function() {
	// next assignment is necessary, because immediate return of element will be converted to NaN
	var result =
	$h.element( 'div',
		{'class':'gmfn_toolbar'},
		new $h.Raw(
			this.generateTable( [
				[
					[ 'td', {'colspan': 2}, new $h.Raw( this.generateInputWrapper(
						{'class': 'gmfn_drag_switch'},
						// id is used for label only
						{'type': 'checkbox', 'id': 'gmfn_drag_switch_'+this.mc.Idx, 'tabindex': -2},
						mw.msg( 'gmfn-change-center' )
					) ) ],
					[ 'td', {'colspan': 4}, new $h.Raw( this.generateInputWrapper(
						{'class': 'gmfn_resize_switch'},
						// id is used for label only
						{'type': 'checkbox', 'id': 'gmfn_resize_switch_'+this.mc.Idx, 'tabindex': -1},
						mw.msg( 'gmfn-resize-map' )
					) ) ]
				],
				[
					[ 'th', {}, mw.msg( 'gmfn-edit-lat' ) ],
					[ 'th', {}, mw.msg( 'gmfn-edit-lng' ) ],
					[ 'th', {'colspan': '2'}, mw.msg( 'gmfn-edit-width' ) ],
					[ 'th', {'colspan': '2'}, mw.msg( 'gmfn-edit-height' ) ]
				],
				[
					new $h.Raw( $h.element( 'input',
						{'class': 'gmfn_edit_lat', 'type': 'text'}
					) ),
					new $h.Raw( $h.element( 'input',
						{'class': 'gmfn_edit_lng', 'type': 'text'}
					) ),
					new $h.Raw( $h.element( 'input',
						{'class': 'gmfn_edit_width', 'type': 'text'}
					) ),
					new $h.Raw( this.generateJSON(
						{'class': 'gmfn_units_width'},
						[ // array for Toolbar.createButtonset()
							'px',
							'em',
							'%'
						]
					) ),
					new $h.Raw( $h.element( 'input',
						{'class': 'gmfn_edit_height', 'type': 'text'}
					) ),
					new $h.Raw( this.generateJSON(
						{'class': 'gmfn_units_height'},
						[ // array for Toolbar.createButtonset()
							'px',
							'em',
						]
					) )
				]
			] ) +
			this.generateTable( [
				[
					[ 'th', {}, mw.msg( 'gmfn-edit-align' ) ],
					[ 'th', {}, mw.msg( 'gmfn-edit-zoom' ) ]
				],
				[
					new $h.Raw( this.generateJSON(
						{'class': 'gmfn_edit_align'},
						[ // array for Toolbar.createButtonset()
							mw.msg( 'gmfn-align-default' ),
							mw.msg( 'gmfn-align-left' ),
							mw.msg( 'gmfn-align-right' )
						]
					) ),
					new $h.Raw( this.generateJSON(
						{'class': 'gmfn_edit_zoom'},
						{ // object for Toolbar.createSlider()
							'min':0, 'max':21, 'step':1
						}
					) )
				]
			] ) +
			this.generateTable( [
				[
					[ 'th', {}, mw.msg( 'gmfn-edit-caption' ) ]
				],
				[
					new $h.Raw( $h.element( 'textarea',
						{'class': 'gmfn_edit_caption'}
					) )
				]
			] )
		)
	);
	return result;
}

_toolbar.createSlider = function( $node ) {
	var sliderOptions = $.parseJSON( $node.html() );
	$node.html('')
	.slider( sliderOptions );
}

_toolbar.createButtonset = function( $node, type, prefix ) {
	var buttonSet = $.parseJSON( $node.html() );
	var code = '';
	var buttonName, buttonId;
	for ( var i = 0; i < buttonSet.length; i++ ) {
		buttonName = 'gmfn_btn_' + prefix;
		buttonId = buttonName + '_' + i;
		code +=
		$h.element(	'input',
			{'type': type, 'id': buttonId, 'name': buttonName}
		) +
		$h.element( 'label',
			{'for': buttonId},
			buttonSet[i]
		)
	}
	$node.html( code )
	.buttonset();
	// chaining
	return this;
}

$.extend( mw.gmfn.toolbar.prototype, _toolbar );

/**
 * Do not assign mediaWiki.html and mediaWiki.Raw to different local vars, that would not work,
 * because mw.html and mw.Raw work in conjunction.
 */
} )( jQuery, mediaWiki, mediaWiki.html ); 
