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
 * Maps edit module startup.
 */

( function() {

// list of prototypes to extend mw.gmfn.MapController
var _MapController = {};

_MapController.edit_setPolymorphs = function() {
	this.bindEditor = this.edit_bindEditor;
}

/**
 * Bind editor logic.
 */
_MapController.edit_bindEditor = function() {
	// dimension instances for 'width' and 'height' will be stored here.
	this.dimension = {};
	this.insertEditorContainer();
	this.bindIdle();
	this.bindSearchBox();
	this.bindDialog();
	this.bindLines();
	this.bindAddMarker();
	this.bindCenter();
	this.bindCoordinate('lat');
	this.bindCoordinate('lng');
	// The order of bindDimension() and bindResizable() is important,
	// because this.bindDimension() populates this.dimension and
	// bindResizable() uses it.
	this.bindDimension('width');
	this.bindDimension('height');
	this.bindResizable();
	this.bindZoom();
	this.bindAlign();
	this.bindCaption();
}

$.extend( mw.gmfn.MapController.prototype, _MapController );

} )();
